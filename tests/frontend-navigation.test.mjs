import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

test('cached navigation paints before network, preserves unchanged view and ignores logout-era responses',async()=>{
  const source=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
  const code=source.slice(source.indexOf('function renderRoute('),source.indexOf('\nfunction renderMembers('));
  const nodes={'#main':{innerHTML:'previous screen'},'#route-sync':{hidden:true}};
  const old={members:[{id:'a',name:'멤버'}],teams:[]};
  const state={me:{id:'admin',admin:true},request:0,route:'schedule',week:'2026-09-20',renderedKey:'schedule:2026-09-20',cache:new Map([['members',old]])};
  let paints=0,loads=[];
  const context=vm.createContext({S:state,location:{hash:'#members'},names:{members:'멤버',schedule:'예약'},$:s=>nodes[s],setTimeout,clearTimeout,
    shell(){nodes['#main'].innerHTML='initial loading'},
    renderMembers(){paints++;nodes['#main'].innerHTML='member list'},
    api(path){return new Promise(resolve=>loads.push({path,resolve}))},
    renderSchedule(){},renderGuide(){},renderSettings(){},renderPosts(){},refreshMemberTable(){},toast(){},esc:String,button(){return ''},
  });
  vm.runInContext(code,context);
  const first=vm.runInContext('navigate()',context);
  assert.equal(nodes['#main'].innerHTML,'member list','cached content appears while both requests are pending');
  assert.equal(paints,1);
  for(const load of loads)load.resolve(load.path==='/members'?{members:old.members}:{teams:old.teams});
  await first;
  assert.equal(paints,1,'unchanged refresh does not replace the visible DOM');
  loads=[];
  const second=vm.runInContext('navigate()',context);
  assert.equal(nodes['#main'].innerHTML,'member list','same-route reload keeps the current view');
  state.me=null;state.request++;state.cache.clear();nodes['#main'].innerHTML='login';
  for(const load of loads)load.resolve(load.path==='/members'?{members:old.members}:{teams:old.teams});
  await second;
  assert.equal(nodes['#main'].innerHTML,'login');assert.equal(state.cache.size,0);
});
