# Revisión de sincronización del reloj

Se mantiene Supabase Realtime para cambios inmediatos en `battles`, `player_progress` y `profiles`, filtrados por usuario. Cada aviso provoca una consulta coherente a `get_watch_state`, evitando mezclar HP de una pelea con XP de otra respuesta.

## Correcciones

- Si el último evento se pierde, una comprobación HTTP cada cinco segundos con la página visible recupera el estado, sin esperar otra acción. Ese tiempo es la frecuencia de comprobación, no una garantía de latencia de red.
- La comprobación periódica no invalida consultas lentas. Los eventos reales sí solicitan una nueva lectura y descartan la respuesta previa si quedó anticuada.
- Al volver a la página, restaurarla desde la caché del navegador o recuperar internet, se solicita recrear la suscripción y leer un estado completo. Al enfocar la ventana también se consulta.
- Se hace una primera lectura aunque la autenticación del canal todavía no termine. «En directo» requiere una consulta exitosa con el canal suscrito.
- Cerrar sesión o cambiar de suscripción cancela lecturas, temporizadores, escuchas y el canal anterior. Respuestas de otro usuario se rechazan.
- Se conserva el modo campamento cuando la batalla recibida terminó; su evento anterior no se presenta como combate activo.

## Verificación realizada

- 15 pruebas Node aprobadas entre acceso, cargador y controlador de sincronización. El transporte Supabase y los eventos del navegador se simulan: daños, preguntas, curación, XP, evento final perdido, nueva batalla, consulta lenta, suspensión, recuperación y limpieza.
- Compilación TypeScript/Vite y lint del reloj aprobados.
- PostgreSQL local comprueba la consulta y el aislamiento por usuario, más rivales v4, HP, final con XP/victorias y sustitución por la siguiente batalla.

Estas pruebas no certifican el WebSocket del proyecto remoto ni el navegador físico del reloj. Para comprobarlo, recargar la página con la misma cuenta del celular; realizar un ataque, responder una pregunta, observar una recuperación enemiga, terminar y comenzar otra pelea. El reloj debe coincidir en HP y turno, pasar al campamento y después mostrar el rival nuevo.

No requiere un SQL nuevo para esta corrección: utiliza la función y publicación de la migración 005 y los rivales de la 009 si ya están instalados. La prueba física de pérdida de conexión sigue fuera de la demostración según lo acordado.

Referencia consultada: https://supabase.com/docs/guides/realtime/postgres-changes.
