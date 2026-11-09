import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSnapshotLoader } from '../watch/src/services/snapshot-loader.ts';
const flush = () => new Promise(resolve => setImmediate(resolve));
function deferred() { let resolve; let reject; const promise = new Promise((ok,no) => {resolve=ok;reject=no;}); return {promise,resolve,reject}; }
test('consulta inicial entrega el estado',async () => {
  const results=[]; const loader=createSnapshotLoader(async()=>({hp:92}),data=>results.push(data),()=>assert.fail('error inesperado'));
  loader.request();await flush();assert.deepEqual(results,[{hp:92}]);loader.close();
});
test('agrupa eventos durante consulta y descarta una respuesta antigua',async () => {
  const first=deferred();let calls=0;const results=[];
  const loader=createSnapshotLoader(()=> ++calls===1 ? first.promise : Promise.resolve({hp:84}),data=>results.push(data),()=>assert.fail('error inesperado'));
  loader.request();loader.request();loader.request();first.resolve({hp:92});await flush();
  assert.equal(calls,2);assert.deepEqual(results,[{hp:84}]);loader.close();
});
test('cierre de sesión impide publicar respuestas tardías',async () => {
  const pending=deferred();const results=[];let signal;
  const loader=createSnapshotLoader(s=>{signal=s;return pending.promise;},data=>results.push(data),()=>assert.fail('error tras cierre'));
  loader.request();loader.close();assert.equal(signal.aborted,true);pending.resolve({hp:10});await flush();assert.deepEqual(results,[]);
});
test('error permite recuperar el estado con nueva consulta',async () => {
  let calls=0;let errors=0;const results=[];
  const loader=createSnapshotLoader(async()=>{if(++calls===1)throw new Error('offline');return {hp:70};},data=>results.push(data),()=>errors++);
  loader.request();await flush();loader.request();await flush();assert.equal(errors,1);assert.deepEqual(results,[{hp:70}]);loader.close();
});
