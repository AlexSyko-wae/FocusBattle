# FocusBattle

RPG educativo para Android con **Expo Go**, seis villanos, preguntas por intereses, experiencia, medallas y una pantalla web de smartwatch sincronizada.

El celular utiliza Expo Router y React Native; el reloj utiliza React y Vite. El backend utiliza Supabase Auth, PostgreSQL, RPC y Realtime. La presentación se realiza con Expo Go; la APK queda para después.

## Ejecutar el proyecto

Requisitos: Node.js 24, npm, Expo Go en Android y un proyecto Supabase.

1. Instalar dependencias con `npm ci` dentro de `mobile/` y de `watch/`.
2. Copiar `mobile/.env.example` a `mobile/.env` y `watch/.env.example` a `watch/.env`. Completar la URL y la clave pública de Supabase. No utilizar claves privadas ni `service_role` en los clientes.
3. En Supabase SQL Editor, ejecutar los archivos de `supabase/migrations/` en orden de nombre, del 001 al 009. Después ejecutar los dos archivos de `supabase/seed/`: banco inicial y expansión. Esto instala 132 preguntas. La configuración de confirmación de correo se gestiona en Supabase Auth.
4. Desde `mobile/`, ejecutar `npm start` y abrir el QR con Expo Go. Mantener computadora y teléfono en la misma red.
5. Desde `watch/`, ejecutar `npm run dev -- --host 0.0.0.0`. Abrir la dirección de red que muestra Vite en el dispositivo del reloj e iniciar sesión con la misma cuenta del celular.

Los archivos `.env`, las dependencias y las compilaciones están excluidos del repositorio. Las preguntas y respuestas del banco se importan a la base de datos; no se empaquetan en el cliente.

## Juego

Selecciona intereses y dificultad de preguntas, elige un rival y combina ataque, defensa, curación y especiales. Los enemigos anuncian sus intenciones y se desbloquean en orden. La primera victoria contra cada uno da 50 XP; una revancha ganada con reglas v4 da 10 XP.

Consulta [villanos y reglas v4](docs/VILLANOS-V4.md), [mejoras visuales y preguntas](docs/MEJORAS-PRESENTACION.md), [sincronización del reloj](docs/REVISION-RELOJ.md) y [habilidades y medallas](docs/GAMEPLAY-V3.md).

## Comprobaciones

En `mobile/`: `npx tsc --noEmit` y `npm run lint`. En `watch/`: `npm run build` y `npm run lint`.

Desde la raíz: `node --test scripts/test-question-import.mjs scripts/test-watch-login.mjs scripts/test-watch-sync.mjs scripts/test-watch-realtime.mjs scripts/test-pixel-art.mjs`.

Las pruebas PostgreSQL se ejecutan con `node scripts/test-database.mjs`. Primero instalar su dependencia local con `npm install --prefix .qa --no-save @electric-sql/pglite`. No requieren credenciales de Supabase ni modifican el proyecto remoto.

La prueba física de pérdida y recuperación de conexión del reloj sigue pendiente y está fuera de la demostración acordada.

Consulta las fases anteriores: [preparación](docs/FASE-1.md), [autenticación](docs/FASE-2.md), [preferencias](docs/FASE-3.md), [combate](docs/FASE-4.md), [preguntas y banco inicial](docs/FASE-5.md) y [sincronización del reloj](docs/FASE-6.md). Cada fase requiere activar su SQL en Supabase y verificarla en los dispositivos.
