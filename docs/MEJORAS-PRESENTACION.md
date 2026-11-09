# Mejoras de presentación y juego

## Implementado

- Ataque con avance del héroe; defensa con efecto azul; curación verde; especial con pulso violeta y rótulo. Se activan tras la respuesta confirmada del servidor y respetan la preferencia de movimiento reducido.
- Frases propias del Slime, Fantasma y Guardián: presentación, intención fuerte, recuperación, evasión, vulnerabilidad y resultado.
- Avisos dorados de nuevo nivel, rival desbloqueado y medalla nueva, comparando el progreso antes y después de la victoria. No otorgan recompensas adicionales. Si no se puede consultar la referencia inicial, no se inventa un logro; el resultado y las medallas siguen disponibles.
- Lugares interactivos en el campamento: Arena, Fogata (intereses) y Cofre (medallas), con etiquetas accesibles y acceso a la partida activa.
- 33 preguntas nuevas: una por dificultad en cada una de las once categorías. Explicaciones con razonamiento o distinción frente a errores frecuentes. El banco inicial de 99 no se sustituye.

## Activar las preguntas en Supabase

Abrir `supabase/seed/20261109_expansion.sql`, copiar su contenido en el SQL Editor del proyecto y ejecutarlo. Es un lote adicional idempotente: volver a ejecutarlo no duplica preguntas. Con el banco inicial instalado, el total esperado es 132 (cuatro por categoría y dificultad). Las respuestas permanecen en el servidor.

Regeneración: `node scripts/import-questions.mjs data/questions/expansion.json supabase/seed/20261109_expansion.sql`.

Las preguntas nuevas se seleccionan en los siguientes desafíos; una pregunta pendiente conserva su contenido original.

Referencia de reglas de fútbol: https://www.theifab.com/laws/latest/ y https://theifab.com/laws/latest/the-corner-kick/.

## Verificación

TypeScript y Expo lint aprobados. Nueve pruebas del importador aprobadas, incluida la detección de duplicados entre bancos. Pruebas PostgreSQL locales aprobadas para combate, preguntas, estadísticas y reglas v2/v3; importación doble de la expansión conserva 132 preguntas.

Comprobar en el teléfono: los cuatro efectos, frases de ataques fuertes, lugares del campamento en ambas orientaciones y una victoria que alcance un logro nuevo. Los logros ya conseguidos no deben anunciarse otra vez. La revisión visual en un dispositivo sigue pendiente.

Estas mejoras no requieren generar APK ni modificar las reglas del combate.
