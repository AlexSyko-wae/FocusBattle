import { readFileSync } from 'node:fs';
const env = Object.fromEntries(readFileSync(new URL('../watch/.env', import.meta.url), 'utf8')
  .split(/\r?\n/).filter(line => line.includes('=')).map(line => {
    const position = line.indexOf('=');
    return [line.slice(0, position).trim(), line.slice(position + 1).trim()];
  }));
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error('Configura watch/.env antes de ejecutar.');
for (const [table, expectedCount] of [['categories', 11], ['enemies', 3], ['profiles', null], ['player_progress', null]]) {
  const response = await fetch(`${url}/rest/v1/${table}?select=*`, {
    headers: { apikey: key }, signal: AbortSignal.timeout(15000),
  });
  if (expectedCount === null) {
    if (response.status !== 401 && response.status !== 403) throw new Error(`${table}: acceso anónimo no bloqueado como se esperaba (HTTP ${response.status}).`);
    console.log(`${table}: acceso anónimo bloqueado (HTTP ${response.status})`);
  } else {
    if (!response.ok) throw new Error(`${table}: HTTP ${response.status}`);
    const rows = await response.json();
    if (!Array.isArray(rows) || rows.length !== expectedCount) throw new Error(`${table}: cantidad inesperada`);
    console.log(`${table}: ${rows.length} registros públicos de catálogo`);
  }
}
