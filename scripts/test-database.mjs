// PostgreSQL WASM aislado: no abre conexiones ni usa las claves de Supabase.
import { readFileSync } from 'node:fs';
import { PGlite } from '../.qa/node_modules/@electric-sql/pglite/dist/index.js';
const db = new PGlite();
try {
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create table auth.users(id uuid primary key,email text);
    create function auth.uid() returns uuid language sql stable as
      'select nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid';
    grant usage on schema auth,public to anon,authenticated;
    grant execute on function auth.uid() to anon,authenticated;
  `);
  for (const file of ['202611060001_foundations.sql','202611060002_preferences.sql','202611060003_combat.sql']) {
    await db.exec(readFileSync(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8'));
    console.log(`Migración válida: ${file}`);
  }
  for (const file of ['phase2_rls.sql','phase3_preferences.sql','phase4_combat.sql']) {
    await db.exec(readFileSync(new URL(`../supabase/tests/${file}`, import.meta.url), 'utf8'));
    console.log(`Aprobado en PostgreSQL local: ${file}`);
  }
  await db.exec(readFileSync(new URL('../supabase/migrations/202611060004_questions.sql',import.meta.url),'utf8'));
  console.log('Migración válida: preguntas');
  await db.exec(readFileSync(new URL('../supabase/seed/20261106_questions.sql',import.meta.url),'utf8'));
  const count = await db.query('select count(*)::integer as count from public.questions');
  console.log(`Banco insertado en PostgreSQL local: ${count.rows[0].count} preguntas`);
  await db.exec(readFileSync(new URL('../supabase/tests/phase5_questions.sql',import.meta.url),'utf8'));
  console.log('Aprobado en PostgreSQL local: phase5_questions.sql');
  await db.exec('create publication supabase_realtime');
  await db.exec(readFileSync(new URL('../supabase/migrations/202611070005_watch_realtime.sql',import.meta.url),'utf8'));
  await db.exec(readFileSync(new URL('../supabase/tests/phase6_watch.sql',import.meta.url),'utf8'));
  console.log('Aprobado en PostgreSQL local: phase6_watch.sql (sin WebSocket)');
  await db.exec(readFileSync(new URL('../supabase/migrations/202611070006_statistics.sql',import.meta.url),'utf8'));
  await db.exec(readFileSync(new URL('../supabase/tests/phase7_statistics.sql',import.meta.url),'utf8'));
  console.log('Aprobado en PostgreSQL local: phase7_statistics.sql');
  await db.exec(readFileSync(new URL('../supabase/migrations/202611070007_gameplay.sql',import.meta.url),'utf8'));
  await db.exec(readFileSync(new URL('../supabase/tests/gameplay_v2.sql',import.meta.url),'utf8'));
  console.log('Aprobado en PostgreSQL local: gameplay_v2.sql');
  await db.exec(readFileSync(new URL('../supabase/migrations/202611070008_skills_medals.sql',import.meta.url),'utf8'));
  await db.exec(readFileSync(new URL('../supabase/tests/gameplay_v3.sql',import.meta.url),'utf8'));
  console.log('Aprobado en PostgreSQL local: gameplay_v3.sql');
  const expansion=readFileSync(new URL('../supabase/seed/20261109_expansion.sql',import.meta.url),'utf8');
  await db.exec(expansion);
  await db.exec(expansion);
  const expanded=await db.query('select count(*)::integer as count from public.questions');
  if(expanded.rows[0].count!==132)throw new Error('La expansión debe dejar 132 preguntas sin duplicar al reimportar');
  console.log('Expansión válida e idempotente: 132 preguntas en PostgreSQL local');
  await db.exec(readFileSync(new URL('../supabase/migrations/202611090009_villains.sql',import.meta.url),'utf8'));
  await db.exec(readFileSync(new URL('../supabase/tests/gameplay_v4.sql',import.meta.url),'utf8'));
  console.log('Aprobado: campaña de seis rivales, XP de revancha, idempotencia y curación v4');
  await db.exec(readFileSync(new URL('../supabase/tests/watch_v4.sql',import.meta.url),'utf8'));
  console.log('Aprobado: reloj con rivales v4, HP, cierre, XP y siguiente pelea');
} catch (error) {
  console.error(error.message);
  if (error.where) console.error(error.where);
  if (error.position) console.error(`SQL position: ${error.position}`);
  process.exitCode = 1;
} finally { await db.close(); }
