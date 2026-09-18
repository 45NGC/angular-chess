# Manejo De Errores

## Objetivo

Este documento describe qué situaciones inválidas o fallos técnicos contempla la aplicación, dónde se detectan y cómo se comunican al usuario. La mayor parte del manejo explícito de errores está en el modo online, porque es el único que depende de una comunicación entre navegador y servidor.

## Tipos De Error

La aplicación distingue, de forma práctica, tres grupos:

| Tipo | Dónde se detecta | Tratamiento actual |
| --- | --- | --- |
| Interacción no válida | Frontend | Se bloquea la acción, se limpia la selección o se reproduce un sonido de error. |
| Regla de negocio online | Backend | Respuesta REST con `ok: false` y un código de error conocido. |
| Fallo técnico | Red, WebSocket, Stockfish o error interno | Aviso visible en algunos flujos, consola del navegador o respuesta HTTP genérica. |

Las respuestas funcionales online no usan códigos HTTP de error. El backend responde con HTTP `200` y un cuerpo como este:

```json
{
  "ok": false,
  "error": "notYourTurn"
}
```

El frontend usa ese código para elegir el mensaje mostrado. En cambio, si la petición ni siquiera llega al backend, RxJS entra en el callback `error` y se muestra un mensaje genérico de conexión.

## Errores Durante La Partida Local Y Contra IA

`GameplayService` calcula los movimientos legales antes de aplicar una jugada. Por ello, una interacción inválida normalmente no genera una excepción ni un texto en pantalla:

- no se puede seleccionar una pieza que no corresponde al turno
- no se puede mover a una casilla que no está entre los destinos legales
- no se puede jugar con la partida terminada, pausada o mientras se revisa el historial
- no se envía ninguna jugada si se cancela el diálogo de promoción

Al intentar un destino no válido después de haber seleccionado una pieza, los servicios local y contra IA reproducen el sonido de error y limpian la selección.

En modo contra IA, si Stockfish no se inicia, no responde antes de su límite de espera o devuelve una jugada que no se puede interpretar, `AiGameService` descarta esa respuesta y escribe un aviso en la consola. El usuario no recibe todavía un mensaje ni una opción explícita para reintentar el cálculo.

## Validaciones Antes De Unirse A Una Sala

`OnlineLobbyDialogComponent` valida algunos casos antes de hacer una petición:

| Situación | Mensaje mostrado |
| --- | --- |
| Código distinto de seis caracteres válidos | `Enter a valid 6-character code.` |
| Intento de unirse a la misma sala que el usuario ha creado | `You are already the host of this room.` |

El código se normaliza mientras el usuario escribe y cualquier mensaje previo se borra. Durante la creación o unión, `isSubmitting` desactiva los botones para evitar solicitudes duplicadas.

Si el backend recibe la petición de unión pero no puede completarla, devuelve uno de estos errores:

| Código | Causa en el backend | Mensaje mostrado |
| --- | --- | --- |
| `notFound` | No existe una sala con ese código. | `Room not found.` |
| `full` | Ya hay jugadores en blancas y negras. | `This room is already full.` |
| `finished` | La sala terminó y no admite nuevos jugadores. | `This room has already finished.` |

Un fallo HTTP al crear una sala muestra `Could not create the room. Check that the backend is running.`. Al unirse, muestra `Could not reach the backend. Check that Spring Boot is running.`.

## Errores Al Enviar Una Jugada

El frontend impide acciones evidentes, pero el backend vuelve a validar el movimiento para mantener el estado de la sala consistente. `InMemoryOnlineRoomService` comprueba la existencia de la sala, la pertenencia de `playerId`, el turno, que los dos jugadores estén presentes y la legalidad de la jugada reconstruyendo la partida desde el historial.

Si una de esas comprobaciones falla, responde con `ok: false`:

| Código | Mensaje mostrado |
| --- | --- |
| `notFound` | `The room no longer exists.` |
| `notParticipant` | `This session is not part of the room.` |
| `illegalMove` | `That move is not legal.` |
| `notYourTurn` | `It is not your turn.` |
| `finished` | `The game has already finished.` |

`OnlineGameService` conserva el tablero anterior, guarda el texto en `lastSubmissionError` y reproduce el sonido de error. `GameComponent` muestra ese texto en un banner rojo sobre la partida. Si falla la petición HTTP, el mensaje es `Could not send the move to the server.`.

## Errores De Revancha

La solicitud de revancha también se valida en el backend. Solo puede hacerla un participante y únicamente cuando la sala está terminada.

| Código | Mensaje mostrado |
| --- | --- |
| `notFound` | `The room no longer exists.` |
| `notParticipant` | `This session is not part of the room.` |
| `notFinished` | `The current game is still in progress.` |

El mensaje aparece en el mismo banner de error de la partida y se reproduce el sonido de error. Si falla la comunicación HTTP, se muestra `Could not send the rematch request to the server.`.

## Conexión Y Actualizaciones En Vivo

`OnlineRoomService` mantiene una conexión STOMP para recibir snapshots de la sala. Cuando no puede conectarse, el canal devuelve un error o se pierde la conexión, publica un mensaje de estado como:

- `Live updates are temporarily unavailable.`
- `Could not connect to the live update server.`
- `The live update channel returned an error.`
- `Connection lost. Trying to reconnect...`

El lobby y la pantalla de partida muestran esos mensajes como avisos. El cliente STOMP intenta reconectarse automáticamente cada cinco segundos.

Una pérdida de WebSocket no impide necesariamente las peticiones REST, pero el cliente deja de recibir cambios realizados por el rival hasta reconectar. Si llega un frame STOMP con JSON inválido, se ignora para no cerrar la suscripción de la sala.

La carga inicial de una sala usa una petición REST. Si esa petición falla o no devuelve sala, `OnlineRoomService` emite `null` en su estado reactivo. Actualmente no existe un mensaje específico ni un botón de reintento para este caso.

## Validación HTTP Del Backend

Los DTO de creación, unión, movimiento y revancha usan Bean Validation. Por ejemplo, el backend exige `playerId`, una jugada con casillas entre `0` y `63`, una configuración de tiempo completa y tiempos no negativos.

Una petición que no cumple estas restricciones no llega al servicio de salas: Spring Boot genera su respuesta HTTP de validación. El proyecto no tiene un `@ControllerAdvice` que convierta esos errores técnicos en un formato propio ni el frontend muestra sus detalles de forma específica.

Las excepciones inesperadas del servidor, como un error de programación, tampoco tienen un manejador personalizado. Se resuelven con la respuesta de error predeterminada de Spring Boot.

## Limitaciones Actuales Del MVP

- Los mensajes de la interfaz están escritos directamente en inglés y no existe todavía una capa de internacionalización o un catálogo común de errores.
- No hay un interceptor HTTP ni un componente global que unifique los fallos de red, validación y servidor.
- El estado de error de jugada o revancha solo guarda el último mensaje y se limpia al recibir un nuevo snapshot válido de la sala.
- La consulta REST inicial de una sala puede fallar de forma silenciosa para el usuario.
- Stockfish informa sus fallos en consola, sin recuperación visible en la interfaz.
- Las salas se guardan en memoria. Si el backend se reinicia, desaparecen y los clientes recibirán `notFound` al intentar usarlas de nuevo.
- El backend no materializa el final por tiempo mediante una tarea periódica; necesita una consulta de sala o un intento de movimiento para detectar definitivamente el timeout.

## Resumen

El MVP evita muchas acciones inválidas directamente en la interfaz y reserva al backend la decisión final en partidas online. Los errores funcionales de sala, movimientos y revancha tienen códigos definidos y mensajes visibles. Los fallos técnicos ya se comunican parcialmente, pero todavía falta una estrategia común de respuestas, traducciones, recuperación y presentación de errores.
