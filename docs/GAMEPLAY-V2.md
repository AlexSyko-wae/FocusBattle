# Revisión de gameplay e interfaz

Esta mejora fue autorizada después de la Fase 8. Las pruebas finales y la APK siguen pendientes.

## Activar

Ejecuta una sola vez `supabase/migrations/202611070007_gameplay.sql` completo en Supabase → SQL Editor, después de las migraciones anteriores. No vuelvas a ejecutar el resto ni el banco de preguntas.

Recarga Expo Go. Para iniciar si es necesario:

```powershell
Set-Location 'C:\Users\araly\Downloads\FocusBattle\mobile'
npx expo start --lan
```

Las batallas existentes se etiquetan como reglas v1 y conservan sus HP, ataque, preguntas, recompensas e identificadores de operación. Las batallas nuevas usan v2. Termina una partida antigua antes de comenzar una nueva para ver el nuevo equilibrio. Las marcas personales distinguen v2 para no mezclar récords obtenidos con reglas distintas.

## Navegación

- Inicio: resumen del jugador y botón principal Jugar o Continuar partida.
- Preparación: intereses y dificultad de preguntas; guardar antes de elegir rival.
- Selección de rival: retrato, estadísticas, patrón y marcas personales.
- Combate: pantalla propia, intención visible y controles fijados abajo. Al aparecer una pregunta, los controles dejan paso a «Ir al desafío»; ninguna otra acción puede ejecutarse hasta contestar.
- Perfil: estadísticas y cierre de sesión. La sesión se administra en un contexto compartido y las rutas de juego redirigen al inicio si no hay sesión.

## Reglas nuevas

| Rival | HP | Patrón repetido de daño |
|---|---:|---|
| Slime | 75 | 8 → 8 → 14 fuerte |
| Fantasma | 105 | 10 → 20 fuerte |
| Guardián | 135 | 12 → 6 mientras carga → 30 fuerte |

El turno actual muestra el golpe antes de actuar. Cuando hay una pregunta, se conserva ese golpe hasta resolver la respuesta; no se cambia por el siguiente al aumentar el contador de turno.

- Atacar: 15; con beneficio: 30. El beneficio se consume al atacar.
- Defender: reduce el contraataque un 50 %, redondeando hacia arriba. **Defender un golpe fuerte prepara además +15 para el siguiente ataque**; no se acumula con el beneficio de acertar.
- Curarse: hasta 20 HP, máximo 100, dos usos. Conviene hacerlo en golpes suaves, no ante un golpe fuerte.
- Las preguntas siguen cada dos acciones válidas. Una respuesta incorrecta añade 10 al golpe que espera; después se aplica la defensa si existe.
- Golpe letal: termina sin pregunta ni contraataque.
- Se conservan XP, recompensas únicas, nivel y desbloqueos. Cambiar dificultad de preguntas no modifica los patrones enemigos.

La acción confirmada muestra daño o curación junto al personaje y rival. La intención fuerte se destaca con una advertencia; el escudo y ataque potenciado tienen indicadores. Tras contestar se conserva la explicación en una tarjeta compacta, sin repetir las cuatro opciones deshabilitadas.

## Objetivos de repetición

«Tus marcas» muestra por enemigo: HP máximo al ganar, precisión máxima, menor cantidad de errores y menor número de acciones, además de victorias v2. Son mejores valores independientes; no representan necesariamente una misma partida perfecta. Repetir sigue sin dar de nuevo los 50 XP iniciales.

## Verificación realizada

Pruebas en PostgreSQL local (identidad y roles simulados):

- Patrones y golpes anunciados de los tres rivales.
- Intención y defensa conservadas mientras la pregunta está pendiente.
- Defensa de golpe fuerte prepara un beneficio no acumulable.
- Curación, daño confirmado, golpe letal sin contraataque y operaciones repetidas sin duplicar premios.
- Comparación controlada: una estrategia con defensa y curación gana contra Guardián con una pregunta fallada, mientras atacar siempre con ese fallo termina en derrota.
- Campaña completa con preguntas disponibles, respuestas correctas y decisiones basadas en intención: tres victorias y 150 XP.
- Récords independientes, exclusión de reglas v1, aislamiento entre cuentas y bloqueo anónimo.
- Una batalla v1 conserva su daño fijo y HP inicial del diseño anterior.

Repetir desde la raíz:

```powershell
node scripts/test-database.mjs
```

## Comprobar en Android

1. Verifica Inicio → Preparación → Selección → Combate y Perfil, incluido el botón Atrás del teléfono.
2. Una batalla nueva contra Slime debe comenzar con 75 HP e intención de 8. Tras dos ataques: Slime 45 HP y jugador todavía 92 mientras espera la respuesta. Acertar deja al jugador en 84 y anuncia el salto fuerte de 14 para el siguiente turno.
3. Ante un golpe fuerte, defiende y comprueba que el daño se reduce y el siguiente ataque muestra 30.
4. Verifica que los tres controles permanecen accesibles abajo al desplazar el escenario y el registro.
5. Cierra durante una pregunta y recupera la misma intención, defensa y pregunta. Repite con una solicitud sin confirmar.
6. Gana y repite: deben aparecer marcas personales y mantenerse la recompensa de XP única.
7. Comprueba que el reloj sigue reflejando los HP, turno y resultados de estas batallas.

La migración remota, navegación real, tamaño de controles y conexión entre dispositivos requieren prueba del usuario. No se ha realizado una sesión de juego en Android desde la laptop. La reconexión del reloj sigue anotada para revisar después.

También aprobados en esta revisión: TypeScript, lint móvil, exportación Android y compilación del reloj. La exportación no es una APK.
