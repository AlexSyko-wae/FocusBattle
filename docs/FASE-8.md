# Fase 8 — Acabado visual

No requiere ejecutar SQL, reinstalar dependencias ni cambiar claves. Recarga Expo Go para ver la interfaz actualizada. Si necesitas iniciar el servidor:

```powershell
Set-Location 'C:\Users\araly\Downloads\FocusBattle\mobile'
npx expo start --lan
```

## Cambios

- Cuatro sprites originales de 16 × 16: aventurero con espada, Slime, Fantasma y Guardián. Se dibujan con grupos de píxeles del mismo color para reducir el número de vistas.
- Selección de enemigos con retratos, números de rival y estado bloqueado/disponible.
- Escenario de combate con cielo, luna, estrellas, pilares, suelo y sombras. Paleta y nombre distintos para bosque, ruinas y fortaleza.
- Movimiento breve al recibir daño confirmado, mediante transformaciones con controlador nativo. Respeta «Reducir movimiento» y detiene la animación al desmontarse; no hay animaciones continuas.
- Tarjeta de victoria/derrota con XP, aciertos, errores y campaña completada cuando corresponde.
- Cabecera compacta, colores de marca y respuesta visual al pulsar los botones de combate.
- Icono y recurso de inicio originales en `mobile/assets/images/focusbattle-icon.png` y `focusbattle-foreground.png`. Fondo oscuro en la configuración de Expo.

El icono instalado y la pantalla de inicio nativa se comprobarán al generar e instalar la APK; Expo Go no reproduce toda esa configuración como una aplicación independiente.

## Verificación

- TypeScript y lint aprobados.
- Cuatro cuadrículas de 16 × 16 verificadas con colores válidos. Se inspeccionó una imagen de los sprites generada desde sus mismas cuadrículas; eso no es una captura de la aplicación.
- Se realiza exportación del bundle Android para comprobar el empaquetado. Esto no constituye una APK ni una prueba en teléfono.
- No se modificaron reglas de combate, RPC ni tablas en esta fase.

Pendiente de comprobación en Android: que los personajes y textos no se corten, que se distingan los tres escenarios, que la pantalla de resultados sea legible y que el movimiento al recibir daño sea breve y fluido. Probar también el ajuste del sistema para reducir animaciones. La revisión de reconexión del reloj sigue pendiente para después.

No avanzar a la fase de pruebas finales y APK sin confirmación del usuario.
