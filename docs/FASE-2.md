# Fase 2 — Autenticación

## Implementación

- Android: registro por correo y contraseña, inicio de sesión, restauración de sesión y cierre de sesión de este dispositivo.
- Renovación del token al volver a primer plano y pausa de renovación en segundo plano.
- El registro sin sesión pide confirmar el correo y luego iniciar sesión manualmente. Si el enlace abre una página local no disponible, vuelve a la app e intenta iniciar sesión: la confirmación puede haberse completado antes de la redirección.
- Perfil y progreso leídos desde Supabase, con opción de reintento y sin escribir XP desde el cliente.
- Reloj: acceso con una cuenta existente, consulta de perfil y cierre de su propia sesión sin cerrar la del teléfono.
- Carga, errores en español y bloqueo de envíos repetidos mientras hay una solicitud pendiente.

Se usa el esquema de Fase 1: el trigger crea perfil y progreso al registrar una cuenta. No hace falta volver a ejecutar la migración inicial. El nombre inicial es «Aventurero». No hay todavía edición de nombre, recuperación de contraseña, combate ni sincronización de batalla.

## Arranque

Terminal Android:

```powershell
Set-Location 'C:\Users\araly\Downloads\FocusBattle\mobile'
npx expo start --lan
```

Terminal reloj:

```powershell
Set-Location 'C:\Users\araly\Downloads\FocusBattle\watch'
npm run dev -- --host 127.0.0.1
```

Si ya están abiertos, recarga las aplicaciones. Si no se actualizan, detén con Ctrl+C y ejecuta esos comandos.

## Pruebas manuales obligatorias

1. Android: pulsa «Soy nuevo · Crear cuenta». Usa un correo real al que tengas acceso y una contraseña de al menos ocho caracteres. No compartas la contraseña con el asistente.
2. Confirma el correo recibido. Vuelve a Android, cambia a «Iniciar sesión» y entra. Si hay un límite de envío, espera antes de reintentar; no desactives la confirmación para eludirlo.
3. Comprueba «Aventurero», nivel 1, 0 XP, 0 victorias, 0 derrotas y 1 enemigo disponible.
4. Cierra completamente la app y vuelve a abrir: debe recuperar la sesión. Ponla en segundo plano y vuelve a abrirla más tarde; «Actualizar perfil» debe seguir funcionando.
5. Abre el reloj, entra con la misma cuenta y comprueba el mismo progreso. Recarga la página: debe recuperar la sesión.
6. Cierra sesión del reloj: Android debe conservar su sesión. Cierra sesión de Android y comprueba que vuelve al formulario y no muestra el perfil anterior.
7. Prueba contraseña incorrecta y correo sin confirmar: debe aparecer un error y permitir reintentar. No debe mostrar el perfil de otro usuario.
8. Desconecta la red y actualiza el perfil: debe aparecer un error y permitir reintentar al recuperar conexión.
9. Para comprobar las políticas de dos usuarios, ejecuta `supabase/tests/phase2_rls.sql` completo en SQL Editor. Inserta dos cuentas temporales dentro de una transacción, simula los roles y revierte todo al final. Debe devolver el resultado de éxito. Si ocurre un error, ejecuta `ROLLBACK;` y comparte el error sin credenciales. Esta prueba comprueba permisos de base de datos; no sustituye el registro y login reales.

## Estado de verificación

Verificado desde la laptop el 6 de noviembre de 2026:

- Android: TypeScript y lint aprobados.
- Reloj: TypeScript y compilación Vite aprobados.
- Consulta real al proyecto remoto: categorías (11) y enemigos (3) accesibles como catálogo; perfiles y progreso rechazados sin sesión con HTTP 401.
- Para repetir esa última comprobación desde la raíz: `node scripts/check-public-access.mjs`. Solo hace lecturas y no imprime claves ni datos de usuarios.

La confirmación de correos, la persistencia en Android físico y el flujo visual requieren pruebas del usuario. Las pruebas SQL se entregan para ejecutar en el proyecto remoto; no se han ejecutado desde esta laptop porque solo disponemos de una clave pública. No se avanza a Fase 3 sin confirmar los resultados.

Referencias: https://supabase.com/docs/guides/auth/quickstarts/react-native y https://docs.expo.dev/versions/v58.0.0/.
