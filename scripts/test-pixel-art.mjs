import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sprites,pixelPalette} from '../mobile/src/constants/pixel-art.ts';
test('los siete personajes tienen cuadrículas válidas de 16 por 16',()=>{
 assert.equal(Object.keys(sprites).length,7);
 for(const [name,rows] of Object.entries(sprites)){
  assert.equal(rows.length,16,name);
  for(const row of rows){
   assert.equal(row.length,16,`${name}: ${row}`);
   for(const pixel of row)assert.ok(pixel==='.'||pixelPalette[pixel],`${name}: color ${pixel}`);
  }
 }
});
