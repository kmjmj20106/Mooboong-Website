import { AsyncLocalStorage } from 'node:async_hooks';
import { readFile } from 'node:fs/promises';
import { openDatabase, defaultSettings } from './db.mjs';

// SQLite is retained for local use. Hosted deployments use PostgreSQL only.
export function wrapSqlite(raw) {
  const context = new AsyncLocalStorage();
  let queue = Promise.resolve();
  return {
    dialect: 'sqlite',
    prepare: sql => raw.prepare(sql),
    exec: sql => raw.exec(sql),
    close: () => raw.close(),
    async withRequest(work) {
      const previous = queue; let release;
      queue = new Promise(resolve => { release = resolve; });
      await previous;
      try { return await work(); } finally { release(); }
    },
    async transaction(work) {
      if (context.getStore()) return work();
      raw.exec('BEGIN IMMEDIATE');
      try { const result = await context.run(true, work); raw.exec('COMMIT'); return result; }
      catch (error) { raw.exec('ROLLBACK'); throw error; }
    },
  };
}

const nowSql = `to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;
const generatedIds = new Set(['teams','bookings','posts','audit_log','attachments']);
export function postgresSql(sql, returnId = false) {
  sql = sql.replace(/strftime\('%Y-%m-%dT%H:%M:%fZ','now'\)/g, nowSql);
  const ignore = /^INSERT OR IGNORE /i.test(sql.trim());
  sql = sql.replace(/INSERT OR IGNORE INTO/gi, 'INSERT INTO');
  sql = sql.replace(/AS (teamId|teamName)\b/g, 'AS "$1"');
  // SQL is application-owned. Replace positional placeholders outside quoted literals.
  let index = 0, quoted = false, output = '';
  for (let i=0; i<sql.length; i++) {
    if (sql[i] === "'") {
      output += sql[i];
      if (quoted && sql[i+1] === "'") { output += sql[++i]; continue; }
      quoted = !quoted;
    } else output += sql[i] === '?' && !quoted ? '$' + (++index) : sql[i];
  }
  output = output.trim().replace(/;$/, '');
  if (ignore) output += ' ON CONFLICT DO NOTHING';
  const table = output.match(/^INSERT INTO\s+(\w+)/i)?.[1];
  if (returnId && generatedIds.has(table)) output += ' RETURNING id';
  return output;
}

export function postgresAdapter(pool) {
  const context = new AsyncLocalStorage();
  const initializedClients = new WeakSet();
  async function acquire() {
    const client = await pool.connect();
    try {
      // A Session pooler preserves this setting for the lifetime of the connection.
      // Reconnected clients are new objects and are initialized again.
      if (!initializedClients.has(client)) {
        await client.query('SET search_path TO mooboong, pg_catalog');
        initializedClients.add(client);
      }
      return client;
    }
    catch (error) { client.release(); throw error; }
  }
  async function query(sql, values = []) {
    const active = context.getStore();
    if (active) return active.query(sql, values);
    const client = await acquire();
    try { return await client.query(sql, values); } finally { client.release(); }
  }
  function rows(result) {
    return result.rows.map(row => Object.fromEntries(Object.entries(row).map(([key,value]) => {
      // PostgreSQL bigint/count/numeric are strings by default; API consumers use numbers.
      if (['id','team_id','teamId','n','hours','minutes','size','expires_at','created_at'].includes(key) && typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value)) value = Number(value);
      return [key,value];
    })));
  }
  return {
    dialect:'postgres',
    prepare(sql) {
      return {
        async all(...values) { return rows(await query(postgresSql(sql), values)); },
        async get(...values) { return (await this.all(...values))[0]; },
        async run(...values) {
          const result = await query(postgresSql(sql, true), values);
          return { changes: result.rowCount ?? result.affectedRows, lastInsertRowid: result.rows[0]?.id };
        },
      };
    },
    exec: sql => query(sql),
    withRequest: work => work(),
    async transaction(work) {
      if (context.getStore()) return work();
      const client = await acquire();
      try {
        await client.query('BEGIN');
        // All app mutations that validate shared state use this cross-instance lock.
        await client.query('SELECT pg_advisory_xact_lock(64822109)');
        const result = await context.run(client, work);
        await client.query('COMMIT');
        return result;
      } catch (error) { await client.query('ROLLBACK').catch(()=>{}); throw error; }
      finally { client.release(); }
    },
    close: () => pool.end(),
  };
}

export async function initializePostgres(db) {
  const schema = await readFile(new URL('../schema.sql', import.meta.url), 'utf8');
  await db.transaction(async () => {
    await db.exec(schema);
    for (const [key,value] of Object.entries(defaultSettings)) {
      await db.prepare('INSERT OR IGNORE INTO settings(key,value) VALUES (?,?)').run(key,JSON.stringify(value));
    }
  });
}

export async function connectDatabase(directory) {
  if (!process.env.DATABASE_URL) {
    if (process.env.RENDER || process.env.NODE_ENV === 'production') throw new Error('DATABASE_URL이 없습니다. Supabase의 Session pooler 연결 주소를 Render 환경변수에 넣어 주세요.');
    return wrapSqlite(openDatabase(directory));
  }
  const url = new URL(process.env.DATABASE_URL);
  if (!['postgres:','postgresql:'].includes(url.protocol)) throw new Error('DATABASE_URL은 PostgreSQL 연결 주소여야 합니다.');
  const local = ['localhost','127.0.0.1','[::1]'].includes(url.hostname);
  // Configure TLS explicitly rather than allowing URL options to disable verification.
  for (const key of ['sslmode','sslcert','sslkey','sslrootcert']) url.searchParams.delete(key);
  const { Pool } = await import('pg');
  const ca = process.env.PGSSLROOTCERT ? await readFile(process.env.PGSSLROOTCERT,'utf8') : undefined;
  const pool = new Pool({ connectionString:url.href, ssl:local ? false : {rejectUnauthorized:true,...(ca?{ca}:{})}, max:5, connectionTimeoutMillis:15000, idleTimeoutMillis:30000 });
  pool.on('error', error => console.error('Database connection error:',error.code||error.name));
  const db = postgresAdapter(pool);
  try { await initializePostgres(db); return db; }
  catch (error) { await pool.end(); throw error; }
}
