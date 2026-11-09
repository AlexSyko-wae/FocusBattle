# Fase 1 — Preparación

El combate, las preguntas, sus RPC y Realtime de batalla pertenecen a fases posteriores. Esta fase prepara las aplicaciones y las primeras tablas; no demuestra todavía un juego funcional. Expo Router usa `mobile/src/app/`, siguiendo la estructura de su plantilla actual.

## Herramientas verificadas

Node 24.13.0, npm 11.6.2, Git 2.53.0 y VS Code 1.145.1. El usuario confirmó Expo Go y cuentas Supabase y Expo.

## Crear desde cero (no repetir en carpetas ya inicializadas)

```powershell
Set-Location 'C:\Users\araly\Downloads'
New-Item -ItemType Directory -Path FocusBattle -Force
Set-Location FocusBattle
npx --yes create-expo-app@latest mobile --template default --no-install --yes
npx --yes create-vite@latest watch --template react-ts --no-interactive
Set-Location mobile
npm install
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage react-native-url-polyfill
Set-Location ..\watch
npm install
npm install @supabase/supabase-js
Set-Location ..
```

## Supabase

1. En https://supabase.com/dashboard crea un proyecto llamado FocusBattle. Guarda la contraseña de base de datos de forma privada y espera que termine de aprovisionarse.
2. Abre SQL Editor. Ejecuta completo `supabase/migrations/202611060001_foundations.sql` una sola vez en ese proyecto nuevo.
3. Verifica en Table Editor: 11 categorías, 3 enemigos y RLS activo en las cinco tablas. No desactives RLS.
4. En la configuración de API o el diálogo Connect copia Project URL y la clave **publishable** (o `anon` heredada). Nunca uses `service_role`, claves secretas ni la contraseña PostgreSQL en las aplicaciones.
5. Copia cada `.env.example` a `.env` en su misma carpeta y sustituye los valores. Las variables EXPO_PUBLIC y VITE son públicas por diseño; RLS protege los datos.
6. Mantén la confirmación de correo activada en Auth. Las pantallas de autenticación se implementarán posteriormente.

## Ejecutar (dos terminales PowerShell)

```powershell
Set-Location 'C:\Users\araly\Downloads\FocusBattle\mobile'
npx expo start --lan
```

Conecta teléfono y laptop a la misma Wi-Fi. Escanea el QR desde Expo Go. Si informa una incompatibilidad de SDK, registra la versión de Expo Go y el SDK de `mobile/package.json` antes de ajustar dependencias. Android permite descargar una versión compatible de Expo Go desde https://expo.dev/go.

```powershell
Set-Location 'C:\Users\araly\Downloads\FocusBattle\watch'
npm run dev -- --host 127.0.0.1
```

Abre la dirección que indique Vite. Detén cada proceso con Ctrl+C. No necesitas Android Studio, Docker ni un emulador.

## Verificación antes de Fase 2

- Ambas aplicaciones abren sin pantalla de error.
- El botón «Probar Supabase» muestra las 11 categorías y los 3 enemigos usando la API. Estos dos catálogos son públicos de solo lectura; los perfiles y el progreso requieren sesión.
- Las tablas existen y tienen RLS activo; las tablas de usuario no admiten escrituras directas del cliente.
- La comprobación autenticada y el aislamiento entre dos usuarios siguen pendientes hasta implementar el inicio de sesión.
- El usuario confirma el resultado en el Android físico y navegador.

No avanzar a Fase 2 sin esa confirmación. No se ha generado una APK ni cargado preguntas en esta fase.
