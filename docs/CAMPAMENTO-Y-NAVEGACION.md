# Campamento RPG y navegación

Rediseño de interfaz autorizado el 8 de noviembre de 2026. No requiere SQL nuevo ni dependencias adicionales; utiliza las funciones y tablas de las mejoras anteriores.

## Cambios

- Inicio autenticado con escena de campamento original, héroe de mayor tamaño, fogata, estandarte, montañas y luna. Nombre, nivel y XP tienen jerarquía propia.
- Una acción principal dorada: «Entrar en combate» o «Continuar aventura» si existe batalla activa. Si no hay intereses guardados, lleva primero a preparación.
- Accesos secundarios compactos a Intereses, Medallas y Perfil. Se muestran cantidades consultadas al servidor, sin inventar medallas o categorías si falla la lectura.
- Navegación inferior Campamento / Arena / Perfil con estado seleccionado. Aparece en las pantallas de menú, pero no durante el combate. El acceso a medallas tiene pantalla propia.
- Cabeceras con botón de regreso y estilos consistentes. El correo y controles de sesión ya no dominan el campamento; el cierre de sesión sigue en Perfil.
- Rivales con retratos mayores, rango de campaña, HP, patrón y recompensa. Una recompensa ya reclamada se presenta como revancha, consultando `enemy_rewards` del usuario.
- Preparación visual en dos pasos: afinidades y nivel de desafío. Una sola acción guarda preferencias y, solo tras confirmación del servidor, abre la selección de rival.
- El campamento se distribuye en dos columnas en horizontal y mantiene un ancho de lectura limitado. La configuración de combate horizontal anterior se conserva.

## Comprobar

Recarga Expo Go. Si necesita reinicio:

```powershell
Set-Location 'C:\Users\araly\Downloads\FocusBattle\mobile'
npx expo start --clear --lan
```

1. Inicia sesión y comprueba escena, nombre, nivel y XP.
2. Comprueba los tres destinos de la barra inferior, incluida la pestaña seleccionada.
3. Abre Intereses, cambia una selección y pulsa «Guardar y elegir rival»: solo debe avanzar tras guardar.
4. Inicia una batalla, vuelve al Campamento y comprueba «Continuar aventura». Debe recuperar el estado existente.
5. Entra a Medallas y Perfil y vuelve; comprueba que el combate no tiene barra inferior.
6. Rota el teléfono y revisa campamento, rivales, preparación y batalla sin perder progreso.
7. Con otra cuenta, comprueba que los datos de campamento, medallas y recompensas pertenezcan a esa cuenta.

TypeScript, lint y exportación Android se usan para validar código y empaquetado. La presentación y navegación física requieren comprobación en el teléfono; no se ha realizado una inspección visual de estas pantallas desde la laptop. No se modificaron reglas de combate, XP ni las políticas de seguridad. La APK y la prueba de reconexión del reloj continúan pendientes.
