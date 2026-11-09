# Fase 5 — Preguntas y efectos de combate

## Activación en Supabase

En SQL Editor ejecuta estos dos archivos completos, **en este orden**:

1. `supabase/migrations/202611060004_questions.sql` — una sola vez, después de las migraciones anteriores.
2. `supabase/seed/20261106_questions.sql` — carga del banco inicial. Termina mostrando los recuentos por categoría y dificultad: deben ser 3 por grupo, 99 preguntas en total en un proyecto sin otros lotes.

No repitas las migraciones anteriores. La carga del banco sí admite repetición sin duplicar sus IDs. La existencia de los archivos no significa que el contenido esté ya insertado en el proyecto remoto.

Recarga Expo Go. Si el servidor está detenido:

```powershell
Set-Location 'C:\Users\araly\Downloads\FocusBattle\mobile'
npx expo start --lan
```

## Comportamiento

- Cada segunda acción válida aplica primero su efecto y, si el enemigo sigue vivo, asigna una pregunta antes del contraataque. Un golpe letal termina inmediatamente, sin pregunta ni contraataque.
- Mientras hay pregunta pendiente se bloquean ataque, defensa y curación. La pregunta queda guardada para continuar al reabrir.
- Las respuestas se validan en PostgreSQL, con bloqueo de filas e identificadores de operación. No se permite responder dos veces. Un reintento de la misma solicitud recupera el estado sin aplicar otro contraataque.
- Acierto: +15 al siguiente ataque, sin acumulación. Error: +10 al contraataque que estaba esperando. La defensa reduce a la mitad el daño después de sumar la penalización y redondea hacia arriba.
- Tras contestar se muestran respuesta correcta, explicación y resultado. La explicación también se puede recuperar al reabrir la app.
- Solo aparecen categorías guardadas al iniciar esa batalla. El modo también se fija al iniciar, por lo que cambiar preferencias afecta a batallas nuevas.
- Las categorías disponibles se equilibran según las preguntas ya presentadas en la batalla. Dentro de la dificultad elegida se priorizan preguntas menos vistas. No se repiten preguntas en una batalla.
- Fácil: 80 % fáciles y 20 % medias; Normal: 40/50/10; Difícil: 20 % medias y 80 % difíciles. Son probabilidades de selección, no cuotas exactas en muestras pequeñas.
- Adaptativo: progreso independiente por categoría, desde fácil. Tres aciertos consecutivos suben un nivel y dos errores consecutivos bajan uno, con límites fácil/difícil. La racha correspondiente se reinicia al cambiar de nivel. Los contadores persisten entre partidas y se actualizan también en los modos fijos.
- Si se agota la dificultad deseada, se usa otra disponible del interés elegido. Si se agota una categoría, se usan otras seleccionadas; al agotar todas, el combate continúa sin desafíos nuevos.
- Aciertos y errores de la batalla aparecen junto a HP y en resultados.

Las tablas `questions` y `battle_questions` no permiten lectura directa al cliente. La RPC de consulta solo expone opciones de la pregunta asignada y no devuelve la solución o explicación antes de responder. Las funciones internas no tienen permisos de ejecución para usuarios.

## Prueba rápida

1. En «Mis intereses» selecciona Matemáticas y Adaptativo. Guarda. Inicia una nueva batalla contra Slime.
2. Ataca una vez: jugador 92 HP, enemigo 30 HP.
3. Ataca otra vez: enemigo 15 HP y jugador **todavía 92 HP**. Aparece una pregunta; el contraataque está esperando.
4. Cierra completamente la app y vuelve. «Continuar partida» debe recuperar la misma pregunta sin respuesta revelada.
5. Responde correctamente: jugador 84 HP, explicación visible y beneficio +15. El siguiente ataque hace 30 de daño y gana sin contraataque.
6. En otra batalla responde incorrectamente al primer desafío tras dos ataques: jugador 74 HP, respuesta correcta y explicación visibles. El siguiente ataque de 15 gana.
7. Prueba defender como segunda acción: el daño del contraataque se reduce después de aplicar cualquier penalización.
8. Desconecta la red al responder. No debe permitir otra acción o respuesta distinta mientras falta confirmación. Reconecta y usa «Reintentar solicitud». Incluso tras reiniciar, no debe duplicar estadísticas ni contraataques.

Para pruebas completas ejecuta en SQL Editor `supabase/tests/phase5_questions.sql`. Dentro de una transacción crea contenido controlado y usuarios temporales, verifica reglas, adaptación, agotamiento, respuestas protegidas y aislamiento, y revierte todo al final. Si falla, ejecuta `ROLLBACK;` y comparte el error.

## Verificación y pendientes

Comprobado localmente en PostgreSQL mediante PGlite:

- Migración de preguntas aplicada y **99 preguntas realmente insertadas en ese entorno local**.
- Preguntas cada dos acciones, sin contraataque anticipado, bloqueo de acciones pendientes y explicación posterior.
- Respuesta duplicada rechazada; reintento idempotente sin otro contraataque.
- Beneficio sin acumulación, penalización con defensa, rachas por categoría y agotamiento sin repetición.
- Sin lectura directa de soluciones ni acceso a preguntas o estadísticas ajenas.
- Derrota provocada por una respuesta incorrecta, sin duplicar pérdidas al reintentar y conservando la explicación.
- Las pruebas de Fases 2–4 se siguen ejecutando antes de instalar el motor nuevo.
- Ocho pruebas del importador: formato válido, opciones duplicadas, enunciados duplicados, dificultad inválida, explicación vacía, categoría desconocida, número de opciones y distribución inicial.

El PostgreSQL local usa una simulación mínima de identidad y roles; no prueba Supabase Auth ni la concurrencia entre conexiones reales. Activar en Supabase y comprobar el flujo en Android sigue pendiente de la prueba del usuario. El objetivo ampliado de 550 preguntas, estadísticas visuales y Realtime del reloj siguen pendientes. No avanzar de fase sin confirmación.

También aprobaron TypeScript, lint móvil y exportación del bundle Android. Esa exportación no es una APK ni una prueba en un dispositivo.

Consulta [el formato y las referencias del banco](../data/questions/README.md) para ampliar contenido sin modificar React.
