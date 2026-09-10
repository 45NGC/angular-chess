# Online Move Submission

## Purpose

This document explains what happens when a player moves a piece in online mode: local validation for the interface, submission to the backend, authoritative validation, and propagation of the accepted state to both clients.

## Player Interaction

The player can move a piece by clicking squares or dragging it to its destination. In both cases, `GameComponent` ultimately delegates the interaction to the game service's `handleSquareClick()`.

In online mode, `OnlineGameService` only allows interaction when:

- the room has `ready` or `playing` status
- the chess game is still ongoing
- it is the local player's turn
- the displayed local clock has not reached zero for that player

This prevents obvious actions that should not be started through the interface, but it does not replace server-side validation.

## Local Validation

The shared `GameplayService` logic uses `LegalMoveFinder` on the local snapshot to:

- select only pieces of the side whose turn it is
- calculate and display legal destinations
- reject an invalid destination with an error sound
- open the promotion dialog when several moves are possible to the same destination

If the player cancels a promotion, no move is sent.

Although the client knows chess rules, this validation only improves the user experience. The snapshot may be outdated, or a modified client may call the endpoint directly, so the backend validates everything again.

## No Optimistic Update

When the user chooses a legal destination, `OnlineGameService` does not apply the move to its local `GameState`.

Instead, it:

1. Sends the request to the backend.
2. Clears the visual selection.
3. Waits for the server-accepted response snapshot.

The board therefore only changes when a valid room update arrives. This prevents the client from displaying a position the backend may reject.

## Move Request

`OnlineRoomService.submitMove()` sends:

`POST /api/online/rooms/{code}/moves`

with the session identifier and the selected move:

```json
{
  "playerId": "player_xxxx",
  "move": {
    "from": 12,
    "to": 28
  }
}
```

A move can also include `promotion`, `enPassant`, `castling`, or `doublePush` when applicable. The backend DTO validates that `playerId` and `move` are present and that `from` and `to` are between `0` and `63`.

## Authoritative Backend Validation

`OnlineRoomController` passes the request to `InMemoryOnlineRoomService.submitMove()`.

The backend performs these checks:

1. It normalizes the code and finds the room.
2. It materializes the clock with the current time; if a player has run out of time, it updates and publishes the finished room.
3. It checks that the room has not finished.
4. It checks that `playerId` belongs to one of the two players.
5. It checks that both players are present.
6. It rebuilds the chess state from the history stored in the room.
7. It checks that it is that player's side to move.
8. It calculates legal moves again for the origin square.
9. It finds a legal move with the requested origin, destination, and promotion.

The backend only accepts the move if every check passes.

## Server-Canonical Move

The client may include metadata such as castling, en passant, or a pawn double push, but the backend does not trust those flags.

After finding a legal move by origin, destination, and promotion, it uses the version calculated by its own `LegalMoveFinder`. This canonical move contains the correct data for castling, en passant, promotion, or a double push.

The move list stored in the room therefore comes from server logic rather than details sent by the browser.

## State After An Accepted Move

When it accepts a move, the backend:

- adds the canonical move to the room history
- rebuilds the new chess state to check checkmate, stalemate, or draws
- applies the increment and switches the active clock when applicable
- changes the room status to `playing` or `finished`
- stores the new snapshot in the in-memory repository
- publishes the snapshot to `/topic/online/rooms/{code}`
- returns the same snapshot in the REST response

The first accepted move sets `startedAt`. If the game ends by chess rules or time, it also sets `finishedAt` and the time winner when one exists.

## Propagation To Both Clients

The client that submitted the move receives the snapshot in the REST response. `OnlineRoomService` immediately stores it in its reactive state.

In parallel, the backend publishes the same snapshot through STOMP. The opponent receives it through their subscription to the room topic.

In both browsers, `OnlineGameService.applyRoom()`:

- replaces the local history with `room.moves`
- rebuilds the board from that history
- updates turns, clock, result, and game-over dialog
- plays the appropriate sound for the new move
- asks Angular to update the interface

The client that moved may receive the same snapshot through both REST and WebSocket. Since the history already has the same length on the second update, it does not treat it as a new move again.

## Move Errors

If the request reaches the backend but cannot be accepted, it responds with `ok: false`:

| Error | Meaning | Displayed message |
| --- | --- | --- |
| `notFound` | The room no longer exists. | `The room no longer exists.` |
| `notParticipant` | The `playerId` does not belong to the room. | `This session is not part of the room.` |
| `illegalMove` | The move is illegal or the room does not have two players. | `That move is not legal.` |
| `notYourTurn` | The player tries to move out of turn. | `It is not your turn.` |
| `finished` | The game has already finished, including on time. | `The game has already finished.` |

The frontend keeps the previous position, displays the error in the online banner, and plays the error sound.

If the HTTP request fails, it displays `Could not send the move to the server.` and does not change the board either.

## Current Limitation

There is no explicit "move being submitted" state that locks the board until a response arrives. A user could try another move before the first snapshot arrives.

The backend prevents this from producing an inconsistent game: it processes moves synchronously and rejects the second one if it is no longer the player's turn. Even so, adding a submission state in the frontend would make the interface clearer and avoid unnecessary requests.
