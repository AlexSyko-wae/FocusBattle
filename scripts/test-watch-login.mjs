import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateLogin } from '../watch/src/services/login-validation.ts';
test('avisa cuando falta el correo',()=>assert.match(validateLogin('','password123'),/correo/));
test('avisa cuando el formato del correo es inválido',()=>assert.match(validateLogin('nombre','password123'),/válido/));
test('avisa cuando falta contraseña',()=>assert.match(validateLogin('nombre@example.com',''),/contraseña/));
test('acepta correo válido con espacios exteriores sin modificar la contraseña',()=>assert.equal(validateLogin(' nombre@example.com ',' password123 '),null));
test('el formulario permite llegar a los mensajes de validación de la aplicación',()=>{
  const source=readFileSync('watch/src/App.tsx','utf8');
  assert.match(source,/<form noValidate/);
  assert.match(source,/<button type="submit"/);
  assert.match(source,/id="login-message"/);
});
