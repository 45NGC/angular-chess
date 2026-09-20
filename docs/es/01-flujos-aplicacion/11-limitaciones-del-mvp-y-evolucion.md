# Limitaciones Del MVP Y Evolución

## Objetivo

Este documento sitúa el alcance actual de la aplicación y describe qué cambios serían necesarios para convertir el modo online en una plataforma más completa. No es un plan obligatorio de implementación: sirve para entender las dependencias entre mejoras y decidir qué tiene sentido añadir en un proyecto futuro.

## Qué Resuelve El MVP

La aplicación ya cubre los elementos esenciales para jugar:

- partidas locales en un navegador
- partidas contra Stockfish ejecutado en el cliente
- salas online para dos jugadores mediante un código compartido
- validación autoritativa de movimientos y reloj en el backend
- sincronización de snapshots mediante REST y WebSocket/STOMP
- final de partida, controles de tiempo y revancha

Este alcance es suficiente para demostrar la relación entre Angular y Spring Boot. Las limitaciones aparecen al intentar conservar partidas, identificar personas de forma fiable o atender a muchos usuarios simultáneamente.

## Persistencia De Datos

Actualmente `InMemoryOnlineRoomRepository` guarda las salas en un `ConcurrentHashMap`. Los datos solo viven mientras el proceso de Spring Boot está activo:

- reiniciar el backend elimina todas las salas y partidas
- no hay historial consultable tras finalizar una partida
- no se pueden recuperar salas desde otra instancia del backend

La primera evolución natural sería usar una base de datos. Como mínimo habría que persistir:

- la sala y su estado
- los jugadores asignados a blancas y negras
- la configuración de tiempo, el reloj y el resultado
- los movimientos, con su orden y momento de juego
- las solicitudes de revancha y las fechas relevantes

No es obligatorio guardar el tablero completo después de cada movimiento: se puede reconstruir desde el historial, como hace hoy el backend. Para mejorar la carga de partidas largas, se podrían guardar snapshots de posición de forma periódica como optimización posterior.

Al introducir persistencia también conviene definir transacciones y control de concurrencia. Dos movimientos enviados casi a la vez deben seguir produciendo un único estado válido, incluso si en el futuro hay varias instancias de servidor.

## Usuarios, Autenticación Y Sesiones

Hoy un jugador se identifica con un `playerId` generado por el backend y guardado en `localStorage`. El cliente lo envía en cada petición. Es útil para el MVP, pero no identifica de forma segura a una persona ni evita que alguien que obtenga ese valor intente actuar como ese jugador.

Un sistema de cuentas requeriría, como mínimo:

- entidad de usuario persistente con nombre visible y credenciales u otro proveedor de identidad
- registro e inicio de sesión, o autenticación mediante OAuth
- contraseñas almacenadas con un algoritmo de hash adecuado si se gestionan localmente
- un token de sesión seguro, preferiblemente en una cookie `HttpOnly` y `Secure`
- autorización en cada endpoint para comprobar que el usuario autenticado participa en la sala
- cierre, renovación y revocación de sesiones

Con autenticación, la identidad no debería viajar como un `playerId` libre en la URL o en el cuerpo de una petición. El backend obtendría al usuario de la sesión autenticada y decidiría qué acciones puede realizar.

## Reconexión Y Continuidad De Partida

El cliente STOMP intenta reconectarse automáticamente, pero una reconexión no descarga por sí sola un snapshot REST nuevo. Por tanto, puede haber actualizaciones perdidas mientras el WebSocket está caído.

Para una experiencia online más robusta harían falta estas mejoras:

- solicitar el snapshot actual de la sala después de reconectar
- restaurar una partida al recargar la página usando la sesión autenticada y el estado persistido
- reflejar la presencia real de cada jugador y distinguir entre desconexión temporal y abandono
- definir cuánto tiempo puede permanecer desconectado un jugador antes de perder o cancelar la partida
- mostrar un estado claro de reconexión y evitar movimientos mientras la sesión no esté conciliada

También sería útil incluir una versión o secuencia de la sala en cada snapshot. El cliente podría detectar estados antiguos y el backend podría rechazar de forma explícita una acción basada en una versión desactualizada.

## Reloj Y Consistencia Online

El backend ya calcula el tiempo válido, pero hoy materializa un timeout al consultar una sala o recibir un movimiento. Si no llega ninguna de esas operaciones, una sala puede seguir temporalmente en `playing` aunque el reloj visible haya llegado a cero.

Una evolución razonable sería añadir una tarea del servidor que revise las partidas activas y publique los timeouts. Junto a ella, convendría:

- bloquear una jugada en el frontend mientras se está enviando
- hacer las solicitudes de movimiento idempotentes mediante un identificador de petición
- registrar el orden de las acciones y tratar explícitamente los reintentos de red
- usar la hora del servidor como única referencia para resultados y ratings

Estas medidas no cambian las reglas de ajedrez, pero reducen las ambigüedades cuando hay latencia, pestañas duplicadas o reconexiones.

## Seguridad Y Protección Del Servicio

La validación autoritativa de movimientos es una buena base, pero no cubre todas las necesidades de un servicio expuesto públicamente. Además de la autenticación, habría que considerar:

- servir frontend y backend mediante HTTPS
- configurar CORS por entorno y no dejar orígenes de desarrollo en producción
- proteger los endpoints y la conexión WebSocket con la misma identidad de usuario
- limitar la frecuencia de creación de salas, uniones y movimientos para reducir abuso
- validar límites de tamaño y formato de peticiones
- registrar intentos anómalos sin exponer detalles internos al cliente
- guardar secretos y configuraciones sensibles fuera del código fuente

No sería necesario incorporar todas estas medidas para seguir aprendiendo, pero sí antes de publicar una versión accesible a terceros.

## Elo, Historial Y Matchmaking

Un sistema de Elo depende de que cada partida pertenezca de forma fiable a dos cuentas y de que su resultado permanezca guardado. Por eso no debería ser el primer paso antes de usuarios y persistencia.

Para añadir partidas clasificatorias haría falta decidir:

- qué partidas cuentan para rating y cuáles son amistosas
- rating inicial, fórmula de actualización y tratamiento de abandonos
- reglas para tablas, tiempo y desconexiones
- historial de partidas y cambios de rating por usuario
- protección frente a resultados manipulados entre cuentas

El matchmaking añadiría una cola de espera que empareje usuarios por rango de rating, control de tiempo y, si fuera relevante, región. También necesitaría tiempos máximos de espera y criterios para ampliar gradualmente el rango de Elo aceptado.

Como funcionalidades relacionadas, se podrían incorporar perfiles, búsqueda de usuarios, historial reproducible, exportación PGN, espectador, análisis posterior y tablas por acuerdo mutuo o por la regla de los cincuenta movimientos. Estas son mejoras de producto, no requisitos para que el flujo online básico funcione.

## Escalado Y Operación

El repositorio en memoria y el broker STOMP simple funcionan correctamente en una única instancia. Si se ejecutaran varias instancias del backend, cada una tendría sus propias salas y sus propios mensajes WebSocket, por lo que los jugadores podrían no ver el mismo estado.

Para escalar el servicio habría que compartir los recursos que hoy son locales al proceso:

- base de datos común para salas, usuarios y partidas
- broker de mensajería compartido en lugar del broker simple de Spring
- estrategia para enrutar o distribuir conexiones WebSocket
- bloqueos o control de versiones en las actualizaciones de una sala
- limpieza programada de salas abandonadas y políticas de retención de historial

También convendría añadir logs estructurados, métricas, comprobaciones de salud, alertas y trazabilidad de peticiones. Estas herramientas permiten detectar errores de sincronización, problemas de rendimiento o abuso cuando el sistema deja de ser solo local.

## Calidad E Internacionalización

La lógica principal ya tiene pruebas, pero las evoluciones anteriores deberían ir acompañadas de pruebas de integración para REST, WebSocket, persistencia, autenticación y reconexión. También serían útiles pruebas de extremo a extremo con dos navegadores para cubrir los flujos reales de una partida online.

Los textos de la interfaz están escritos directamente en componentes y servicios. Para soportar más idiomas habría que extraerlos a un sistema de traducciones, definir claves estables y adaptar formatos de fecha, hora y accesibilidad. Esa mejora es independiente de la persistencia, aunque resulta más fácil mantenerla antes de que aumente mucho el número de mensajes.

## Orden De Evolución Sugerido

Si el objetivo fuera convertir este proyecto en una base para una aplicación online mayor, un orden con dependencias claras sería:

1. Persistir salas y partidas, manteniendo el contrato online actual siempre que sea posible.
2. Añadir usuarios, autenticación y autorización de las acciones de cada sala.
3. Mejorar la reconexión, presencia, sincronización posterior a una caída y gestión autoritativa de timeouts.
4. Añadir historial de usuario y partidas amistosas persistentes.
5. Incorporar Elo y matchmaking sobre resultados asociados a cuentas autenticadas.
6. Preparar despliegue, observabilidad, seguridad y escalado antes de abrir el servicio a más usuarios.

Las traducciones, mejoras visuales y nuevas reglas de tablas pueden desarrollarse en paralelo, porque no dependen directamente de los pasos anteriores.

## Resumen

El MVP ya tiene una separación útil entre cliente y servidor y una base válida para partidas online de dos jugadores. Para evolucionarlo, las prioridades no deberían ser Elo ni matchmaking, sino persistencia, identidad segura y continuidad de una partida. A partir de ahí, el historial fiable permite construir características competitivas y el refuerzo de infraestructura permite ofrecerlas de forma segura y escalable.
