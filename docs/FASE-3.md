# Fase 3 — Intereses y dificultad

## Activar en Supabase

Ejecuta una sola vez el contenido completo de `supabase/migrations/202611060002_preferences.sql` en SQL Editor, en el mismo proyecto. No repitas la migración de Fase 1.

Esta migración agrega `profiles.question_mode`, con Adaptativo por defecto para perfiles actuales y nuevos. La RPC `save_learning_preferences` valida categorías, modo e identidad, bloquea la fila del perfil y reemplaza los intereses y el modo de manera atómica. Solo acepta preferencias del usuario autenticado; no acepta un ID de otro jugador. Las tablas siguen sin permitir escrituras directas del cliente. Repetir un guardado con la misma selección produce el mismo estado.

## Ejecutar y probar

Si Expo sigue abierto, recarga la app. Si necesitas iniciarlo:

```powershell
Set-Location 'C:\Users\araly\Downloads\FocusBattle\mobile'
npx expo start --lan
```

1. Inicia sesión y desplázate hasta «Mis intereses». Deben aparecer las 11 categorías y Adaptativo seleccionado inicialmente.
2. Sin categorías seleccionadas, el botón de guardar debe estar deshabilitado. Selecciona una o varias.
3. Elige Fácil, Normal, Difícil o Adaptativo y pulsa «Guardar preferencias». Espera la confirmación del servidor.
4. Cierra completamente la app y ábrela: intereses y modo deben conservarse. Repite con otro modo y una selección diferente.
5. Quita todas las categorías: no debe permitir guardar. La selección anterior debe seguir en el servidor.
6. Desconecta Internet y prueba guardar: no debe confirmar un guardado. Reconecta y vuelve a guardar la selección. Si el servidor procesó una solicitud cuya respuesta se perdió, repetirla no duplica registros.
7. Cierra sesión e ingresa con otra cuenta: debe mostrar las preferencias de esa cuenta, sin heredar la selección anterior.
8. Ejecuta `supabase/tests/phase3_preferences.sql` completo en SQL Editor. Debe devolver el mensaje de éxito. Verifica los cuatro modos, selección mínima, categorías inválidas, deduplicación, aislamiento y permisos. Todo se revierte. Si falla, ejecuta `ROLLBACK;` y comparte el error.

## Alcance y verificación

Esta fase guarda preferencias y explica las distribuciones previstas. La selección de preguntas, las rachas adaptativas y el combate se implementarán en fases posteriores. La dificultad no modifica enemigos.

Las pruebas SQL y la persistencia en el dispositivo requieren ejecución en Supabase y Android. No se han verificado con una sesión del usuario desde la laptop. No avanzar de fase sin confirmación.

Comprobaciones locales del 6 de noviembre de 2026: `npx tsc --noEmit` y `npx expo lint` aprobados. El reloj no se modificó en esta fase.

Referencia de permisos y funciones: https://supabase.com/docs/guides/database/functions.
