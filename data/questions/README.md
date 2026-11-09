# Banco inicial

Contenido original en español: 99 preguntas, 9 por categoría (3 fáciles, 3 medias y 3 difíciles). No son 550 preguntas. La dificultad es una clasificación editorial inicial, ajustable tras uso real.

Formato JSON de importación: cada categoría contiene filas `[dificultad, enunciado, cuatro_opciones, explicación]`. **La primera opción del archivo fuente es la correcta.** El importador rota las opciones de forma determinista y calcula el índice correcto para el servidor. No se importa este archivo desde React ni se incluye en assets móviles o web.

Desde la raíz:

```powershell
node scripts/import-questions.mjs
node --test scripts/test-question-import.mjs
```

Para otro lote, utiliza el mismo formato y rutas de entrada/salida explícitas:

```powershell
node scripts/import-questions.mjs data/questions/otro-lote.json supabase/seed/otro-lote.sql
```

El importador rechaza categorías desconocidas, dificultades inválidas, opciones vacías o duplicadas, enunciados repetidos y explicaciones vacías. Genera SQL transaccional con IDs estables por enunciado y categoría. Reimportar actualiza esos IDs sin duplicarlos. Las preguntas asignadas a una batalla conservan una copia para que una corrección del banco no cambie la respuesta durante esa batalla. Las comprobaciones de formato no demuestran por sí solas exactitud factual; revisar contenido antes de ampliar el banco.

El contenido inicial usa datos estables, operaciones comprobables y conceptos introductorios. Se revisaron respuestas y explicaciones al preparar el lote. Para las reglas de fútbol se tomó como referencia IFAB 2026/27: [fuera de juego](https://theifab.com/laws/latest/offside/), [campo y punto penal](https://www.theifab.com/laws/latest/the-field-of-play/) y [reglamento completo](https://downloads.theifab.com/downloads/laws-of-the-game-202627-single-pages?l=en). El sonido diegético corresponde al mundo de la historia, según el material educativo de [WJEC](https://resource.download.wjec.co.uk/vtc/2025-26/mfw/mfw25-26_26-1/pdf/en/1-1-1_how-film-creates-meaning-for-audiences-b.pdf). Los ámbitos de UNESCO se contrastaron con sus [campos de especialidad](https://www.unesco.org/en/expertise).

El SQL de carga termina con una consulta de recuentos. Solo después de ejecutarlo y comprobar esos recuentos se puede afirmar que las 99 preguntas están insertadas en el proyecto remoto.
