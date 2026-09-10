# Envío De Movimientos Online

## Objetivo

Este documento explica qué ocurre cuando un jugador mueve una pieza en modo online: la validación local para la interfaz, el envío al backend, la validación autoritativa y la propagación del estado aceptado a los dos clientes.

## Interacción Del Jugador

El jugador puede mover una pieza haciendo clic en las casillas o arrastrándola hasta su destino. En ambos casos, `GameComponent` termina delegando la interacción en `handleSquareClick()` del servicio de juego.

En modo online, `OnlineGameService` solo permite interactuar si:

- la sala está en estado `ready` o `playing`
- la partida de ajedrez sigue en curso
- es el turno del jugador local
- el reloj local mostrado no ha llegado a cero para ese jugador

Esto evita acciones evidentes que no deberían poder iniciarse desde la interfaz, pero no sustituye la comprobación del servidor.

## Validación Local

La lógica compartida de `GameplayService` usa `LegalMoveFinder` sobre el snapshot local para:

- seleccionar únicamente piezas del color al que le toca mover
- calcular y mostrar destinos legales
- rechazar un destino no permitido con un sonido de error
- abrir el diálogo de promoción cuando hay varias jugadas posibles al mismo destino

Si el jugador cancela una promoción, no se envía ningún movimiento.

Aunque el cliente conoce las reglas de ajedrez, esta validación solo mejora la experiencia de usuario. El snapshot podría estar desactualizado o un cliente modificado podría llamar al endpoint directamente, así que el backend vuelve a validar todo.

## Sin Actualización Optimista

Cuando el usuario elige un destino legal, `OnlineGameService` no aplica la jugada sobre su `GameState` local.

En su lugar:

1. Envía la petición al backend.
2. Limpia la selección visual.
3. Espera el snapshot de respuesta aceptado por el servidor.

Por tanto, el tablero solo cambia cuando llega una actualización de sala válida. Esto evita que el cliente muestre una posición que el backend pueda rechazar.

## Petición De Movimiento

`OnlineRoomService.submitMove()` envía:

`POST /api/online/rooms/{code}/moves`

con el identificador de la sesión y la jugada seleccionada:

```json
{
  "playerId": "player_xxxx",
  "move": {
    "from": 12,
    "to": 28
  }
}
```

Una jugada también puede incluir `promotion`, `enPassant`, `castling` o `doublePush` cuando corresponda. El DTO del backend valida que exista `playerId`, que exista `move` y que las casillas `from` y `to` estén entre `0` y `63`.

## Validación Autoritativa En El Backend

`OnlineRoomController` entrega la petición a `InMemoryOnlineRoomService.submitMove()`.

El backend realiza estas comprobaciones:

1. Normaliza el código y busca la sala.
2. Materializa el reloj con el tiempo actual; si alguien ha agotado su tiempo, actualiza y publica la sala terminada.
3. Comprueba que la sala no haya terminado.
4. Comprueba que `playerId` pertenece a uno de los dos jugadores.
5. Comprueba que estén presentes ambos jugadores.
6. Reconstruye el estado de ajedrez desde el historial almacenado en la sala.
7. Comprueba que sea el turno del color de ese jugador.
8. Calcula de nuevo los movimientos legales para la casilla de origen.
9. Busca una jugada legal con el mismo origen, destino y promoción solicitada.

Solo si todas las comprobaciones pasan, el backend acepta el movimiento.

## Jugada Canónica Del Servidor

El cliente puede incluir metadatos como enroque, captura al paso o avance doble de peón, pero el backend no confía en esos flags.

Tras encontrar una jugada legal por origen, destino y promoción, usa la versión calculada por su propio `LegalMoveFinder`. Esa jugada canónica contiene los datos correctos para enroque, captura al paso, promoción o avance doble.

Así, la lista de movimientos guardada en la sala procede de la lógica del servidor y no de los detalles enviados por el navegador.

## Estado Tras Una Jugada Aceptada

Al aceptar una jugada, el backend:

- añade la jugada canónica al historial de la sala
- reconstruye el nuevo estado de ajedrez para comprobar jaque mate, ahogado o tablas
- aplica el incremento y cambia el reloj activo cuando corresponde
- cambia el estado de la sala a `playing` o `finished`
- guarda el nuevo snapshot en el repositorio en memoria
- publica el snapshot en `/topic/online/rooms/{code}`
- devuelve el mismo snapshot en la respuesta REST

El primer movimiento aceptado establece `startedAt`. Si la partida termina por reglas de ajedrez o por tiempo, también establece `finishedAt` y el ganador por tiempo cuando existe.

## Propagación A Ambos Clientes

El cliente que envió la jugada recibe el snapshot en la respuesta REST. `OnlineRoomService` lo guarda inmediatamente en su estado reactivo.

En paralelo, el backend publica ese mismo snapshot por STOMP. El rival lo recibe en su suscripción al topic de la sala.

En ambos navegadores, `OnlineGameService.applyRoom()`:

- reemplaza el historial local con `room.moves`
- reconstruye el tablero desde ese historial
- actualiza turnos, reloj, resultado y diálogo de fin
- reproduce el sonido apropiado para el nuevo movimiento
- solicita a Angular que actualice la interfaz

El cliente que movió puede recibir el mismo snapshot tanto por REST como por WebSocket. Como el historial ya tiene la misma longitud en la segunda actualización, no vuelve a tratarlo como un movimiento nuevo.

## Errores De Movimiento

Si la petición llega correctamente al backend pero no puede aceptarse, responde con `ok: false`:

| Error | Significado | Mensaje mostrado |
| --- | --- | --- |
| `notFound` | La sala ya no existe. | `The room no longer exists.` |
| `notParticipant` | El `playerId` no pertenece a la sala. | `This session is not part of the room.` |
| `illegalMove` | La jugada no es legal o la sala no tiene dos jugadores. | `That move is not legal.` |
| `notYourTurn` | El jugador intenta mover fuera de turno. | `It is not your turn.` |
| `finished` | La partida ya terminó, incluso por tiempo. | `The game has already finished.` |

El frontend mantiene la posición anterior, muestra el error en el banner online y reproduce el sonido de error.

Si la petición HTTP falla, muestra `Could not send the move to the server.` y tampoco modifica el tablero.

## Limitación Actual

No existe un estado explícito de "movimiento en envío" que bloquee el tablero hasta recibir la respuesta. Un usuario podría intentar otra jugada antes de que llegue el primer snapshot.

El backend evita que eso produzca una partida inconsistente: procesa las jugadas de forma sincronizada y rechazará la segunda si ya no es el turno del jugador. Aun así, añadir un estado de envío en el frontend mejoraría la claridad de la interfaz y evitaría peticiones innecesarias.
