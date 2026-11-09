# Fase 4 — Selección de enemigos y combate básico

## Activar

En Supabase → SQL Editor ejecuta **una sola vez** `supabase/migrations/202611060003_combat.sql`. Requiere las migraciones de Fase 1 y Fase 3 ya ejecutadas. No repitas esas migraciones anteriores.

Recarga Expo Go. Para iniciar el servidor si está detenido:

```powershell
Set-Location 'C:\Users\araly\Downloads\FocusBattle\mobile'
npx expo start --lan
```

## Implementación

- Arena con sprites originales construidos con cuadrados, barras de HP, turnos, curaciones y último evento.
- Tres enemigos con 45/60/80 HP y 8/12/16 de ataque; desbloqueo progresivo y posibilidad de repetir.
- Atacar: 15 de daño. Defender: recibe la mitad del siguiente contraataque, redondeando hacia arriba. Curarse: hasta 20 HP, máximo 100, dos usos, prohibido con HP completo.
- El enemigo contraataca después de cada acción válida si sigue vivo. Un golpe letal termina inmediatamente la batalla.
- Victoria, derrota, recompensa única de 50 XP por enemigo y progreso persistido. Nivel = floor(XP/100)+1. La repetición suma victorias, pero no repite la recompensa inicial. Derrota: 0 XP.
- «Campaña completada» al derrotar al tercer enemigo.
- Una sola batalla activa por jugador. «Continuar partida» recupera el estado desde Supabase.
- Cada acción se procesa dentro de una transacción con bloqueos. Un identificador de operación impide duplicar solicitudes. El turno esperado rechaza acciones sobre estados antiguos, incluso desde dos clientes.
- El identificador y contenido de una solicitud pendiente se guardan localmente **antes** de enviarlos. Si se pierde la respuesta, se bloquean nuevas acciones y se permite reintentar la misma solicitud, incluso tras reiniciar la app.
- El cliente no puede escribir directamente HP, XP, resultados ni premios. Solo puede leer sus batallas y ejecutar RPC autenticadas. Las preferencias guardadas se copian a cada batalla.

Todavía no hay preguntas ni sincronización Realtime del reloj. Los campos de beneficio y penalización están preparados, pero no hay forma de obtenerlos desde la interfaz en esta fase.

## Prueba rápida en Android

1. Guarda al menos un interés y una dificultad. Abre la Arena. Solo Slime debe estar disponible para un jugador nuevo.
2. Pulsa «Nueva batalla» en Slime: jugador 100 HP, enemigo 45 HP, 2 curaciones, turno 1. «Curarse» está deshabilitado.
3. Ataca: jugador 92 HP, enemigo 30 HP, turno 2.
4. Cierra completamente la app y vuelve a abrirla. Pulsa «Continuar partida»: debe conservar exactamente esos valores.
5. Ataca dos veces más: victoria con jugador 84 HP, enemigo 0 HP y +50 XP. El último ataque no debe causar contraataque. Se desbloquea Fantasma.
6. Pulsa «Reintentar enemigo» y gana otra vez: debe otorgar 0 XP adicionales. Las victorias sí aumentan.
7. En una nueva batalla Slime, defiende como primera acción: HP 96. Cúrate: llega a 100 antes del contraataque y termina en 92, con una curación restante. Cúrate de nuevo: termina en 92, sin curaciones. No permite una tercera.
8. Derrota a Fantasma y Guardián. Sin curaciones ni defensa y atacando siempre, ambos son ganables en este combate básico. XP total tras primeras victorias: 150; nivel 2.
9. Para probar derrota contra Guardián: defiende 7 veces y luego ataca 3 veces. Debe terminar en derrota, 0 HP y 0 XP adicionales. Permite reintentar.
10. Desconecta la red y pulsa una acción. Tras el error no debe descontar HP localmente ni permitir otra acción diferente. Reconecta y pulsa «Reintentar solicitud»: debe aplicarse como máximo una vez.
11. Repite cerrando la app mientras hay una solicitud sin confirmar. Al volver, debe ofrecer reintentar la misma solicitud antes de continuar.
12. Con otra cuenta no deben aparecer las batallas del usuario anterior.

## Pruebas SQL y verificaciones

En SQL Editor, después de la migración, ejecuta `supabase/tests/phase4_combat.sql` completo. Inserta usuarios temporales y revierte todos los datos al terminar. Verifica daño, curaciones, defensa, redondeo, efectos preparados, victoria sin contraataque, derrota, premios, desbloqueos, operaciones duplicadas, turnos antiguos y aislamiento. Si falla, ejecuta `ROLLBACK;` y comparte el error.

El 6 de noviembre de 2026 se ejecutaron las tres migraciones y las pruebas SQL de Fases 2, 3 y 4 en PostgreSQL local mediante PGlite: **aprobadas**. Ese entorno sustituye `auth.users` y `auth.uid()` con un esquema mínimo para simular usuarios y roles; no es una conexión al proyecto real ni una prueba del servicio Auth de Supabase. No simula concurrencia entre conexiones.

También aprobados: TypeScript (`npx tsc --noEmit`), lint (`npx expo lint`) y exportación del bundle Android (`npx expo export --platform android`). El bundle no es una APK ni una instalación en dispositivo.

Para repetir la verificación local desde la raíz:

```powershell
Set-Location 'C:\Users\araly\Downloads\FocusBattle'
npm install --prefix .qa --no-save --package-lock=false @electric-sql/pglite
node scripts/test-database.mjs
```

La migración remota, la presentación en pantalla, la recuperación en el teléfono, el transporte RPC de Supabase y la concurrencia real requieren pruebas en el proyecto y dispositivo. No se declara la fase funcionalmente terminada hasta verificarlas. No avanzar de fase sin confirmación del usuario.
