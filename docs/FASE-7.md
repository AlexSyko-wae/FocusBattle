# Fase 7 — Perfil y estadísticas

Ejecuta una sola vez `supabase/migrations/202611070006_statistics.sql` completo en Supabase → SQL Editor, después de las migraciones anteriores. No repitas el resto ni la carga de preguntas.

Recarga Android y pulsa **Mis estadísticas** en tu perfil. Aparecerá «Tu historia». Puedes cerrarlo con «Cerrar estadísticas».

Si necesitas iniciar Expo:

```powershell
Set-Location 'C:\Users\araly\Downloads\FocusBattle\mobile'
npx expo start --lan
```

## Contenido

- Nombre, nivel, XP acumulada, barra del nivel actual y XP restante para el siguiente.
- Victorias, derrotas, preguntas respondidas, aciertos, errores y precisión general.
- Estado de cada enemigo: bloqueado, disponible o derrotado.
- Las 11 categorías con respuestas, aciertos, errores, precisión, dificultad adaptativa y racha.

La precisión general es `100 × aciertos totales / respuestas totales`, redondeada a un decimal. No es el promedio de porcentajes de las categorías. Una categoría sin respuestas muestra «—» y «Sin respuestas todavía». Las preguntas pendientes aún no cuentan como respondidas.

La función de solo lectura consulta los contadores guardados, sin modificar XP o resultados ni exponer respuestas. Usa RLS y la identidad de la sesión.

## Pruebas en Android

1. Abre «Mis estadísticas» y comprueba que XP, nivel y victorias coincidan con tu perfil.
2. Comprueba que respondidas sea igual a aciertos más errores. Una cuenta sin respuestas debe mostrar 0 y precisión «—».
3. Responde una pregunta en batalla y pulsa «Actualizar estadísticas». Debe aumentar el contador de esa categoría según el resultado.
4. Cierra y vuelve a abrir la sección: debe consultar el progreso actual. Cierra la app y comprueba que se conserva.
5. Comprueba la distinción entre enemigos derrotados y desbloqueados.
6. Entra con otra cuenta: debe mostrar únicamente sus estadísticas.
7. Desconecta Internet y actualiza: debe aparecer un error y permitir reintentar al reconectar.

## Verificación

La prueba `supabase/tests/phase7_statistics.sql` usa datos temporales y revierte todo. Comprueba totales, precisión ponderada, redondeo, nivel, XP restante, rachas, catálogos, estados de enemigos, categorías sin actividad, aislamiento y bloqueo anónimo.

Para repetir localmente desde la raíz: `node scripts/test-database.mjs`. El entorno local simula identidades y roles. La activación remota y presentación en Android requieren comprobación del usuario.

La reconexión real del reloj continúa pendiente para revisar después, según lo acordado. No avanzar de fase sin confirmación.

Verificación local del 7 de noviembre de 2026: pruebas PostgreSQL de Fases 2–7, TypeScript, lint móvil y exportación del bundle Android aprobados. La exportación no constituye una APK ni una prueba visual en dispositivo.
