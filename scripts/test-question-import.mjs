import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
mkdirSync('.qa/import-tests',{recursive:true});
const valid = { 'Matemáticas': [[1,'¿Cuánto es 2 + 2?',['4','5','6','7'],'Dos más dos es cuatro.']] };
function run(name,data) {
  const input=`.qa/import-tests/${name}.json`;
  const output=`.qa/import-tests/${name}.sql`;
  writeFileSync(input,JSON.stringify(data));
  return { ...spawnSync(process.execPath,['scripts/import-questions.mjs',input,output],{encoding:'utf8'}),output };
}
test('genera SQL con opciones y respuesta protegidas en servidor',() => {
  const result=run('valid',valid);
  assert.equal(result.status,0,result.stderr);
  assert.match(readFileSync(result.output,'utf8'),/insert into public.questions/);
});
for (const [name,modify] of [
  ['duplicate-options', data => {data['Matemáticas'][0][2][1]='4';}],
  ['duplicate-prompts', data => {data['Matemáticas'].push(structuredClone(data['Matemáticas'][0]));}],
  ['bad-difficulty', data => {data['Matemáticas'][0][0]=4;}],
  ['missing-explanation', data => {data['Matemáticas'][0][3]='';}],
  ['bad-category', data => {data.Other=data['Matemáticas'];delete data['Matemáticas'];}],
  ['three-options', data => {data['Matemáticas'][0][2].pop();}],
]) test(`rechaza ${name}`,() => {const data=structuredClone(valid);modify(data);assert.notEqual(run(name,data).status,0);});
test('banco inicial: 99 enunciados, 3 por dificultad y categoría',() => {
  const source=JSON.parse(readFileSync('data/questions/starter.json','utf8').replace(/^\uFEFF/,''));
  assert.equal(Object.keys(source).length,11);
  assert.equal(Object.values(source).flat().length,99);
  for(const rows of Object.values(source)) for(const level of [1,2,3]) assert.equal(rows.filter(row=>row[0]===level).length,3);
});
test('expansión: 33 preguntas nuevas, equilibradas y sin duplicados con el banco inicial',()=>{
 const starter=JSON.parse(readFileSync('data/questions/starter.json','utf8').replace(/^\uFEFF/,''));
 const expansion=JSON.parse(readFileSync('data/questions/expansion.json','utf8'));
 const merged=Object.fromEntries(Object.entries(starter).map(([category,rows])=>[category,rows.concat(expansion[category])]));
 assert.equal(Object.values(expansion).flat().length,33);
 for(const rows of Object.values(merged))for(const level of [1,2,3])assert.equal(rows.filter(row=>row[0]===level).length,4);
 const result=run('expanded-bank',merged);assert.equal(result.status,0,result.stderr);
});
