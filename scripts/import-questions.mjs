import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const file = process.argv[2] ?? 'data/questions/starter.json';
const output = process.argv[3] ?? 'supabase/seed/20261106_questions.sql';
const source = JSON.parse(readFileSync(file, 'utf8').replace(/^\uFEFF/,''));
const categories = ['Fútbol','Videojuegos','Películas','Series','Historia','Geografía','Ciencia','Matemáticas','Inglés','Programación','Cultura general'];
const escape = value => `'${value.replaceAll("'", "''")}'`;
const normalize = value => value.normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase('es');
const prompts = new Set();
const values = [];
const counts = {};
for (const [category, rows] of Object.entries(source)) {
  if (!categories.includes(category) || !Array.isArray(rows)) throw new Error(`Categoría inválida: ${category}`);
  counts[category] = [0,0,0];
  for (const row of rows) {
    if (!Array.isArray(row) || row.length !== 4) throw new Error('Formato: [dificultad, enunciado, opciones, explicación]. La primera opción del archivo fuente es la correcta.');
    const [difficulty,prompt,options,explanation] = row;
    if (![1,2,3].includes(difficulty) || typeof prompt !== 'string' || !prompt.trim() || typeof explanation !== 'string' || !explanation.trim()) throw new Error('Dificultad, enunciado o explicación inválidos');
    if (!Array.isArray(options) || options.length!==4 || options.some(value => typeof value!=='string' || !value.trim()) || new Set(options.map(normalize)).size!==4) throw new Error(`Opciones inválidas: ${prompt}`);
    if (prompts.has(normalize(prompt))) throw new Error(`Enunciado duplicado: ${prompt}`);
    prompts.add(normalize(prompt));
    const digest = createHash('sha256').update(`${category}:${normalize(prompt)}`).digest('hex');
    const offset = parseInt(digest.slice(0,2),16)%4;
    const shuffled = options.slice(offset).concat(options.slice(0,offset));
    const correctIndex = (4-offset)%4;
    const id = `fb-${digest.slice(0,24)}`;
    values.push(`(${escape(id)},(select id from public.categories where name=${escape(category)}),${difficulty},${escape(prompt)},array[${shuffled.map(escape).join(',')}],${correctIndex},${escape(explanation)})`);
    counts[category][difficulty-1]++;
  }
}
if (!values.length) throw new Error('Lote vacío');
const sql = `-- Generado desde ${file}. No copiar a los clientes.\nbegin;\ninsert into public.questions(id,category_id,difficulty,prompt,options,correct_index,explanation) values\n${values.join(',\n')}\non conflict(id) do update set category_id=excluded.category_id,difficulty=excluded.difficulty,prompt=excluded.prompt,options=excluded.options,correct_index=excluded.correct_index,explanation=excluded.explanation;\ncommit;\n-- Verificar el contenido real insertado por categoría y dificultad:\nselect c.name,q.difficulty,count(*) from public.questions q join public.categories c on c.id=q.category_id where q.active group by c.name,q.difficulty order by c.name,q.difficulty;\n`;
writeFileSync(output,sql,'utf8');
console.log(JSON.stringify({ questions: values.length, counts, output },null,2));
