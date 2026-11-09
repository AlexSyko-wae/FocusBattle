# Expansión de villanos · reglas v4

Ejecutar una vez `supabase/migrations/202611090009_villains.sql` en Supabase SQL Editor, después de la migración 008. Recargar Expo Go. No hace falta APK. La expansión de preguntas es un archivo separado y no es requisito de esta migración.

## Rivales

| Rival | Dificultad | HP | Ataque base | Curación cada 4 turnos |
| --- | --- | --- | --- | --- |
| Slime | Fácil | 75 | 8 | Hasta 12 HP |
| Fantasma | Normal | 105 | 10 | Hasta 12 HP |
| Guardián | Difícil | 135 | 12 | Hasta 12 HP |
| Murciélago del Caos | Difícil | 150 | 8 | Hasta 12 HP |
| Hechicero del Olvido | Experto | 165 | 10 | Hasta 16 HP |
| Dragón de la Distracción | Jefe final | 190 | 12 | Hasta 20 HP |

La dificultad aparece en la selección y durante el combate. Es una valoración del rival independiente de la dificultad de preguntas elegida por el usuario. Los rivales nuevos tienen sprites y frases propios.

La recuperación se anuncia como intención. Ocurre al contraatacar: si hay pregunta pendiente, espera su respuesta. No supera el máximo de HP y no revive a un enemigo vencido. Al recuperarse, el rival hace un ataque débil. El Hechicero también usa evasión; el especial la ignora.

## XP y desbloqueos

- Primera victoria contra cada rival: 50 XP.
- Cada revancha ganada con reglas v4: 10 XP.
- Derrota: 0 XP. No se dan premios retroactivos por batallas antiguas.
- Reintentar la misma solicitud no duplica la recompensa. Los controles permanecen en el servidor y usan el bloqueo y registro de operaciones existentes.
- Los rivales se desbloquean en orden hasta el sexto. Si ya habías vencido al Guardián al instalar la migración, se habilita el Murciélago.
- Las partidas anteriores conservan patrones y premios. Termínalas antes de probar una nueva v4. Una victoria antigua del Guardián que ocurra después de instalar la expansión puede requerir otra victoria con reglas nuevas para abrir el cuarto rival.
- Las seis medallas existentes se conservan, incluida la de los tres rivales originales. Los récords pasan a comparar solo partidas v4 para mantener reglas iguales.

## Verificación

Pruebas PostgreSQL locales: los seis enemigos son ganables con decisiones de defensa, curación y especiales; primera victoria de cada uno suma 300 XP; revancha suma 10 sin duplicarse al reintentar; enemigos bloqueados no pueden iniciarse; curación de los seis respeta el máximo; golpe letal impide regeneración; funciones internas inaccesibles al cliente; partidas v3 conservan intención y premio.

Pendiente de comprobar en el teléfono: aspecto de sprites, legibilidad de dificultad en ambas orientaciones y curación anunciada con sincronización del reloj.
