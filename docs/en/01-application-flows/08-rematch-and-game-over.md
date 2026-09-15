# Rematch And Game Over

## Purpose

This document explains how an online game ends, how the result is shown to both players, and how a rematch request works.

## Detecting The End Through Chess Rules

After accepting a move, `InMemoryOnlineRoomService` rebuilds the chess state with the updated history.

`GameState` recalculates the result and can declare:

- checkmate
- stalemate
- insufficient-material draw
- threefold-repetition draw

If the result is no longer `ongoing`, the backend creates a new `OnlineRoom` snapshot with:

- `status: finished`
- the complete move history
- the clock stopped
- `finishedAt` set to the time it ended

This snapshot is stored and published to both clients through STOMP.

## Detecting The End On Time

Time can also end a game. The backend stores the active clock color, base times, and `clockUpdatedAt`.

When retrieving a room or processing a move, `materializeRoomState()` subtracts the elapsed time from that timestamp. If the active clock reaches zero, it:

- sets the remaining time to `0`
- assigns `timeoutWinner` to the opposite color
- changes the room status to `finished`
- clears the active clock and its timestamp
- sets `finishedAt`
- stores and publishes the finished snapshot

There is no periodic backend process that checks clocks every second. The game end on time is therefore currently materialized when a relevant operation reaches the server, such as a REST retrieval or a move attempt.

## Client Update

Each browser receives the finished snapshot through the REST response to its own action or through the room's STOMP topic.

`OnlineGameService.applyRoom()`:

- replaces the local history and rebuilds `GameState`
- updates clock data and the result
- plays the end sound if a terminal move has just arrived
- activates `showGameOverDialog` if the room has `finished` status or the chess state is no longer ongoing

The board is locked because `canInteractWithBoard()` only allows play in `ready` or `playing` rooms with an ongoing game.

## Result Message

The game-over dialog receives its message from `getResultMessage()`.

Results are displayed as follows:

| Situation | Message |
| --- | --- |
| Checkmate | `WHITE WON` or `BLACK WON` |
| Time expired | `WHITE WON ON TIME` or `BLACK WON ON TIME` |
| Stalemate | `STALEMATE` |
| Insufficient material | `DRAW (INSUFFICIENT MATERIAL)` |
| Threefold repetition | `DRAW (THREEFOLD REPETITION)` |

## Game-Over Dialog

`GameComponent` displays `game-over-dialog` when `showGameOverDialog` is true.

The dialog includes:

- the game result
- a rematch status message, when one exists
- a button to request or accept a rematch
- a `QUIT` button to return to the main screen

It can also be closed by clicking outside the dialog. That action only hides the dialog in that browser; it does not change the room's `finished` state in the backend.

## Rematch Request

In an online game, the restart button does not create a new local game. `GameComponent.onRestart()` delegates to `OnlineGameService.resetGame()`, which only acts if the room has finished and the player has not requested a rematch yet.

The service sends:

`POST /api/online/rooms/{code}/rematch`

with this body:

```json
{
  "playerId": "player_xxxx"
}
```

While it waits for the response, `isRequestingRematch` disables the button to prevent repeated requests.

## First Acceptance

When the first player requests a rematch, the backend:

- checks that the room exists
- checks that the player belongs to it
- checks that the game has finished
- marks `whiteRequestedRematch` or `blackRequestedRematch`
- keeps the room in `finished` status
- retains the moves and result of the previous game
- publishes the updated snapshot

Both clients receive that update. The player who requested it sees `Waiting for your opponent...`; the other sees `Your opponent requested a rematch.` and can accept through the same button.

## Restart After The Second Acceptance

When both players have requested a rematch, the backend resets the same room instead of creating a new code.

Colors are swapped automatically: the player who played White moves to Black, and vice versa. The user cannot choose a color during a rematch.

The new-game snapshot contains:

- the same room code and time-control configuration
- `status: ready`
- the same player identifiers with swapped colors
- times reset to the configured values
- an empty move list
- an inactive clock
- reset `timeoutWinner`, rematch requests, `startedAt`, and `finishedAt`

The backend stores and publishes this snapshot. The first rematch move changes the room to `playing` again.

## Color Change In The Frontend

When it receives the reset rematch, `OnlineRoomService` finds the stored `playerId` in the new room and updates `playerSide` in `localStorage` with the new color assigned by the backend.

`OnlineGameService` then rebuilds the initial board from the empty history and clears selection, promotion, and the game-over dialog. The board's automatic orientation uses the new color unless the user has chosen a manual rotation. The player who is now White can make the first move.

## Rematch Errors

The backend responds with `ok: false` when it cannot process the request:

| Error | Meaning | Displayed message |
| --- | --- | --- |
| `notFound` | The room no longer exists. | `The room no longer exists.` |
| `notParticipant` | The `playerId` does not belong to the room. | `This session is not part of the room.` |
| `notFinished` | The game is still in progress. | `The current game is still in progress.` |

If HTTP communication fails, the application displays `Could not send the rematch request to the server.`. In both cases, the error sound plays and the finished game does not change.
