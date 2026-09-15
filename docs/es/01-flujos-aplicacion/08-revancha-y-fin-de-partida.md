# Revancha Y Fin De Partida

## Objetivo

Este documento explica cómo termina una partida online, cómo se muestra el resultado a ambos jugadores y cómo funciona la solicitud de revancha.

## Detección Del Fin Por Reglas De Ajedrez

Después de aceptar un movimiento, `InMemoryOnlineRoomService` reconstruye el estado de ajedrez con el historial actualizado.

`GameState` recalcula el resultado y puede declarar:

- jaque mate
- ahogado
- tablas por material insuficiente
- tablas por triple repetición

Si el resultado deja de ser `ongoing`, el backend crea un nuevo snapshot de `OnlineRoom` con:

- `status: finished`
- el historial completo de movimientos
- el reloj detenido
- `finishedAt` con el momento en que terminó

Ese snapshot se guarda y se publica a los dos clientes por STOMP.

## Detección Del Fin Por Tiempo

El tiempo también puede terminar una partida. El backend guarda el color con reloj activo, los tiempos base y `clockUpdatedAt`.

Al consultar una sala o procesar un movimiento, `materializeRoomState()` descuenta el tiempo transcurrido desde esa marca. Si el reloj activo llega a cero:

- establece el tiempo restante en `0`
- asigna `timeoutWinner` al color contrario
- cambia el estado de la sala a `finished`
- limpia el reloj activo y su marca temporal
- establece `finishedAt`
- guarda y publica el snapshot terminado

No hay un proceso periódico en el backend que compruebe relojes cada segundo. Por eso, actualmente el fin por tiempo se materializa cuando llega una operación relevante al servidor, como una consulta REST o un intento de movimiento.

## Actualización Del Cliente

Cada navegador recibe el snapshot terminado por la respuesta REST de su propia acción o por el topic STOMP de la sala.

`OnlineGameService.applyRoom()`:

- reemplaza el historial local y reconstruye `GameState`
- actualiza los datos del reloj y el resultado
- reproduce el sonido de fin si acaba de llegar un movimiento terminal
- activa `showGameOverDialog` si la sala tiene estado `finished` o el estado de ajedrez ya no sigue en curso

El tablero queda bloqueado porque `canInteractWithBoard()` solo permite jugar en salas `ready` o `playing` y con una partida todavía en curso.

## Mensaje De Resultado

El diálogo de fin recibe el mensaje desde `getResultMessage()`.

Los resultados se muestran así:

| Situación | Mensaje |
| --- | --- |
| Jaque mate | `WHITE WON` o `BLACK WON` |
| Tiempo agotado | `WHITE WON ON TIME` o `BLACK WON ON TIME` |
| Ahogado | `STALEMATE` |
| Material insuficiente | `DRAW (INSUFFICIENT MATERIAL)` |
| Triple repetición | `DRAW (THREEFOLD REPETITION)` |

## Diálogo De Fin

`GameComponent` muestra `game-over-dialog` cuando `showGameOverDialog` es verdadero.

El diálogo incluye:

- el resultado de la partida
- un mensaje de estado de revancha, si existe
- un botón para solicitar o aceptar revancha
- un botón `QUIT` para volver a la pantalla principal

También se puede cerrar pulsando fuera del cuadro. Esa acción solo oculta el diálogo en ese navegador; no modifica el estado `finished` de la sala en el backend.

## Solicitud De Revancha

En una partida online, el botón de reinicio no crea una partida local nueva. `GameComponent.onRestart()` delega en `OnlineGameService.resetGame()`, que solo actúa si la sala está terminada y el jugador todavía no ha solicitado revancha.

El servicio envía:

`POST /api/online/rooms/{code}/rematch`

con este cuerpo:

```json
{
  "playerId": "player_xxxx"
}
```

Mientras espera la respuesta, `isRequestingRematch` desactiva el botón para evitar solicitudes repetidas.

## Primera Aceptación

Cuando el primer jugador solicita revancha, el backend:

- comprueba que la sala existe
- comprueba que el jugador pertenece a ella
- comprueba que la partida está terminada
- marca `whiteRequestedRematch` o `blackRequestedRematch`
- mantiene la sala en estado `finished`
- conserva los movimientos y el resultado de la partida anterior
- publica el snapshot actualizado

Los dos clientes reciben esa actualización. El jugador que la pidió ve `Waiting for your opponent...`; el otro ve `Your opponent requested a rematch.` y puede aceptar mediante el mismo botón.

## Reinicio Tras La Segunda Aceptación

Cuando ambos jugadores han solicitado revancha, el backend reinicia la misma sala en lugar de crear un código nuevo.

Los colores se intercambian obligatoriamente: quien jugó con blancas pasa a jugar con negras, y viceversa. El usuario no puede elegir el color durante la revancha.

El snapshot de la nueva partida contiene:

- el mismo código de sala y la misma configuración de tiempo
- `status: ready`
- los mismos identificadores de jugador con colores intercambiados
- tiempos reiniciados a los valores configurados
- lista de movimientos vacía
- reloj inactivo
- `timeoutWinner`, solicitudes de revancha, `startedAt` y `finishedAt` reiniciados

El backend guarda y publica este snapshot. El primer movimiento de la revancha volverá a cambiar la sala a `playing`.

## Cambio De Color En El Frontend

Al recibir la revancha reiniciada, `OnlineRoomService` localiza el `playerId` guardado en la nueva sala y actualiza `playerSide` en `localStorage` con el color nuevo que le ha asignado el backend.

Después, `OnlineGameService` reconstruye el tablero inicial a partir del historial vacío y limpia selección, promoción y diálogo de fin. La orientación automática del tablero pasa a usar el nuevo color, salvo que el usuario haya elegido una rotación manual. El jugador que ahora tiene blancas puede realizar el primer movimiento.

## Errores De Revancha

El backend responde con `ok: false` si no puede procesar la solicitud:

| Error | Significado | Mensaje mostrado |
| --- | --- | --- |
| `notFound` | La sala ya no existe. | `The room no longer exists.` |
| `notParticipant` | El `playerId` no pertenece a la sala. | `This session is not part of the room.` |
| `notFinished` | La partida todavía está en curso. | `The current game is still in progress.` |

Si falla la comunicación HTTP, se muestra `Could not send the rematch request to the server.`. En ambos casos se reproduce el sonido de error y la partida terminada no cambia.
