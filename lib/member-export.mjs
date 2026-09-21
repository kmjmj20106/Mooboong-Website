import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { listMembers, listTeams } from './member-views.mjs';

export async function exportMembers(db, sort = 'name', order = 'asc') {
  const key = ['name', 'generation', 'session'].includes(sort) ? sort : 'name';
  const direction = order === 'desc' ? -1 : 1;
  // Read both sheets under the same mutation lock; never select password hashes.
  const data = await db.transaction(async () => ({ members: await listMembers(db), teams: await listTeams(db) }));
  data.members.sort((a, b) => direction * (String(a[key] || '').localeCompare(String(b[key] || ''), 'ko', { numeric: true }) || a.name.localeCompare(b.name, 'ko') || a.id.localeCompare(b.id, 'ko')));
  return new Promise((resolve, reject) => {
    const child = execFile(process.env.PYTHON_BIN || 'python3', [fileURLToPath(new URL('./write_members_xlsx.py', import.meta.url))], {
      timeout: 15000, maxBuffer: 16 * 1024 * 1024, encoding: 'buffer', windowsHide: true,
    }, (error, stdout) => {
      if (error) { reject(new Error('멤버 엑셀 파일을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.')); return; }
      resolve(stdout);
    });
    child.stdin.on('error', () => {});
    child.stdin.end(JSON.stringify(data));
  });
}
