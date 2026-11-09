# Habilidades, medallas, sonido y horizontal

Mejoras 1–5 autorizadas por el usuario, sin tutorial. Incluye «Mostrar contraseña» en Android y reloj, y orientación horizontal.

## Activación

1. Ejecuta una sola vez `supabase/migrations/202611070008_skills_medals.sql` en SQL Editor. Requiere las migraciones anteriores, incluida `202611070007_gameplay.sql`. No las repitas ni recargues el banco.
2. Reinicia Metro porque cambió la configuración de orientación y se añadió expo-audio:

```powershell
Set-Location 'C:\Users\araly\Downloads\FocusBattle\mobile'
npx expo start --clear --lan
```

3. Cierra y vuelve a abrir el proyecto en Expo Go. Activa la rotación automática del teléfono para jugar en horizontal. Recarga el navegador para actualizar el inicio de sesión del reloj.
4. Inicia una **partida nueva** para usar energía y las mecánicas nuevas. Las batallas ya iniciadas conservan reglas v1/v2 y pueden terminarse normalmente. Sus datos y XP no se borran.

## Reglas v3

- Cada respuesta correcta da 1 energía, máximo 3, además del beneficio de +15 al próximo ataque normal.
- «Especial» consume 2 energía e inflige 45 de daño, ignorando evasión y armadura. No consume el beneficio pendiente del ataque normal. Provoca contraataque y pregunta cuando corresponde, salvo golpe letal. El servidor valida energía, turno e identificador de operación.
- Slime (75 HP): golpes de 8, 8, 14 fuerte y 4 con regeneración de hasta 12 HP. La regeneración ocurre en el contraataque, después de responder si hay desafío; nunca revive un enemigo derrotado.
- Fantasma (105 HP): cada tercer turno anuncia evasión (golpe de 8), reduciendo a la mitad el daño normal entrante, redondeado hacia arriba. Los otros turnos alternan 10/20 según sean impares/pares. El especial ignora la evasión.
- Guardián (135 HP): ciclo de 12, carga de 6 y golpe fuerte de 30. Mientras carga recibe 5 de daño normal adicional; en los otros momentos su armadura resta 5 al daño normal. El especial ignora ambas modificaciones e inflige 45.
- Defender los golpes fuertes sigue preparando un beneficio no acumulable de +15 para el próximo ataque normal.
- El botón de ataque muestra el daño previsto según beneficio, evasión y armadura.

## Interfaz, preguntas y audio

- Pregunta con categoría, dificultad, recompensa y riesgo; la solución sigue oculta hasta responder.
- Tras la respuesta se muestra explicación y «Continuar combate». Los controles vuelven a habilitarse al continuar. Reabrir una explicación no repite el contraataque ni la recompensa.
- En horizontal, escenario y HP ocupan el panel izquierdo; pregunta e intención el derecho. Ambos pueden desplazarse independientemente. Los controles siguen fijados abajo. En vertical estrecho las cuatro acciones se distribuyen en dos filas para conservar zonas táctiles suficientes.
- La configuración deja de bloquear la orientación. Rotar cambia la presentación, no inicia una batalla ni envía una acción.
- Sonidos originales breves para ataque, defensa, curación, acierto, error, especial, victoria y derrota. Se reproducen tras confirmar cambios de estado, sin repetirlos por reintentos idempotentes. El perfil permite silenciarlos y conserva la preferencia local. Se pausan al salir de primer plano.
- El audio usa expo-audio. No se solicita acceso al micrófono ni reproducción o grabación en segundo plano. Los archivos WAV se generan con `python scripts/generate-sounds.py` y se incluyen localmente.
- «Mostrar contraseña» alterna la visibilidad sin alterar su contenido. Se vuelve a ocultar tras un acceso correcto o al cambiar entre registro e inicio en Android.

## Medallas

Se consultan desde perfil y resultados, sin conceder XP adicional ni modificar dificultades:

- Primer triunfo: ganar una batalla.
- Mente despierta: acumular 10 respuestas correctas.
- Sabiduría en combate: ganar con al menos 3 respuestas y 80 % de precisión.
- Poder del conocimiento: ganar utilizando el especial en una batalla v3.
- Guardia impecable: ganar una batalla v3 con 80 HP o más.
- Voluntad inquebrantable: derrotar los tres enemigos.

Son logros derivados de resultados guardados. No se acumulan filas duplicadas al consultar. Las marcas personales se calculan únicamente sobre v3 para comparar partidas con las mismas reglas.

## Pruebas

`node scripts/test-database.mjs` ejecuta todas las migraciones y pruebas en PostgreSQL local con identidades simuladas. El test `supabase/tests/gameplay_v3.sql` comprueba carga y límite de energía, coste del especial, reintentos sin duplicados, regeneración antes/después del desafío, evasión, armadura, vulnerabilidad, golpes letales, campaña ganable, premios únicos, medallas e aislamiento.

Comprobación en Android y navegador todavía necesaria:

1. Mostrar/ocultar contraseña, entrar correctamente y comprobar que no cambia la contraseña escrita.
2. Rotar durante combate, pregunta y explicación, en ambos sentidos, sin perder turno, HP ni pregunta.
3. Acertar dos desafíos, usar especial y comprobar consumo y daño. No debe estar disponible sin energía.
4. Ver las intenciones de regeneración, evasión y vulnerabilidad y comprobar su efecto anunciado.
5. Ver explicación y pulsar Continuar; no debe causar otro contraataque.
6. Escuchar sonidos y silenciarlos desde el perfil; reabrir la app para comprobar la preferencia. Verificar que no suenen en segundo plano.
7. Ganar con especial y consultar la medalla correspondiente; comprobar también una cuenta sin logros.
8. Verificar la sincronización de HP y resultados del reloj. La prueba de reconexión del reloj sigue pendiente para después según lo acordado.

No se ha hecho una prueba física de sonido, rotación ni presentación desde la laptop. La APK continúa pendiente de la fase de entrega.

Comprobaciones locales aprobadas: pruebas PostgreSQL hasta v3 (incluida conservación de reglas v2), TypeScript, lint móvil, compilación del reloj y exportación Android con los ocho sonidos incluidos. La exportación no es una APK.
