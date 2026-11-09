# Fase 6 — Smartwatch con Realtime

## Activar

Ejecuta una sola vez `supabase/migrations/202611070005_watch_realtime.sql` completo en Supabase → SQL Editor, después de las migraciones anteriores. Crea la consulta `get_watch_state` y añade perfiles, progreso y batallas a la publicación `supabase_realtime`. No publica preguntas ni sus respuestas. Conserva las políticas RLS y los permisos de lectura del usuario.

No repitas las migraciones anteriores ni cargues otra vez el banco para esta fase.

Si los servidores están detenidos, abre dos terminales PowerShell:

```powershell
Set-Location 'C:\Users\araly\Downloads\FocusBattle\mobile'
npx expo start --lan
```

```powershell
Set-Location 'C:\Users\araly\Downloads\FocusBattle\watch'
npm run dev -- --host 127.0.0.1
```

Abre la URL que indique Vite. Inicia sesión en el reloj con la misma cuenta de Android.

## Implementación

- Esfera circular con nombre, nivel, XP, victorias, enemigo, HP de ambos, turno y estado de batalla. El último evento completo aparece debajo para no recortar texto dentro del círculo.
- Suscripción Postgres Changes filtrada al usuario autenticado en `profiles`, `player_progress` y `battles`.
- Cada evento solicita un estado completo al servidor. La consulta usa una sola sentencia SQL para recuperar perfil, progreso y última batalla. La lectura inicial y otra lectura al completar la suscripción evitan perder cambios entre carga y conexión.
- Las consultas simultáneas se agrupan. Si llega un aviso durante una consulta, se descarta esa respuesta y se consulta de nuevo, para evitar mostrar un estado antiguo como último estado.
- Estados: Conectando, En directo, Reconectando, Sin conexión y No se pudo sincronizar. Los datos conservados llevan aviso de posible desactualización cuando no está En directo.
- Reconexión después de fallos y al volver Internet, renovación de la autenticación del canal, consulta al regresar a la pestaña y botón «Reconectar reloj».
- Al cerrar sesión o cambiar de cuenta se elimina el canal, se cancela la consulta y se impide que respuestas tardías muestren datos del usuario anterior.
- No hay botones para atacar, defender, curar, responder o iniciar batallas desde el reloj. Sus solicitudes de juego son únicamente de lectura. Usa la sesión del mismo usuario: esto no constituye un rol distinto de dispositivo a nivel de API.

## Pruebas en el proyecto y dispositivos

1. Tras ejecutar el SQL, recarga el reloj e inicia sesión. Debe mostrar «En directo» y tu progreso. Si no hay ninguna partida, mostrará «Sin batalla todavía»; si ya hay partidas, mostrará la más reciente, incluido su resultado.
2. Inicia una batalla nueva en Android. Sin recargar el navegador, el reloj debe mostrar enemigo, 100 HP del jugador y HP completo del enemigo.
3. Ataca una vez. Contra Slime debe mostrar jugador 92 HP, enemigo 30 HP y turno 2.
4. Ataca de nuevo: el reloj debe indicar «Desafío», enemigo 15 HP y jugador aún en 92 HP hasta que contestes.
5. Responde en Android: debe actualizar HP y último evento. Al ganar, debe mostrar «¡Victoria!», victorias y XP del servidor. Al repetir un enemigo, no debe inventar otros 50 XP.
6. Desconecta Internet de la laptop. Debe indicar falta de conexión o fallo de sincronización y avisar que los datos pueden estar desactualizados. Cambia el estado desde Android con conexión disponible. Reconecta la laptop: el reloj debe recuperar el estado actual sin recargar toda la página.
7. Cierra y vuelve a abrir la pestaña, o vuelve a ella tras tenerla en segundo plano: debe recuperar la última batalla.
8. Cierra sesión del reloj: no deben quedar datos visibles. Entra con otra cuenta: no debe mostrar la batalla del usuario anterior. La sesión Android no debe cerrarse por cerrar la del reloj.

Si no llegan cambios, verifica en Supabase → Database → Publications que `supabase_realtime` incluya `profiles`, `player_progress` y `battles`. Mantén RLS activado. Comprueba que ambas aplicaciones usen el mismo proyecto y la misma cuenta.

## Verificación realizada el 7 de noviembre de 2026

Confirmado por el usuario: el reloj inicia sesión y actualiza los HP automáticamente al atacar desde Android, sin recargar la página.

Pendiente por indicación del usuario para revisar después: desconectar Internet de la laptop, reconectarlo y comprobar que el reloj vuelva a «En directo» y recupere el estado actual sin recargar la página. No se considera probada la reconexión real.

- TypeScript y compilación Vite: aprobados.
- Lint del reloj: aprobado.
- Cuatro pruebas del cargador de estado: consulta inicial, agrupación y descarte de respuestas antiguas, cancelación al cerrar sesión y recuperación después de error.
- Todas las migraciones y pruebas SQL de Fases 2–6: aprobadas en PostgreSQL local mediante PGlite. La Fase 6 comprueba la publicación configurada, HP/evento/turno, pregunta pendiente, falta de soluciones en la respuesta, aislamiento entre usuarios y bloqueo anónimo.

Para repetir desde la raíz:

```powershell
node --test scripts/test-watch-sync.mjs
node scripts/test-database.mjs
```

El entorno local simula identidades y roles y no dispone del servicio Realtime de Supabase. No prueba WebSocket, renovación real de tokens, concurrencia ni la presentación en un navegador. La migración remota y las pruebas de sincronización y reconexión anteriores siguen pendientes de la ejecución del usuario. No avanzar de fase sin confirmación.

Referencia: [Postgres Changes de Supabase](https://supabase.com/docs/guides/realtime/postgres-changes).
