# Error Handling

## Purpose

This document describes the invalid situations and technical failures handled by the application, where they are detected, and how they are communicated to the user. Most explicit error handling is in online mode because it is the only mode that depends on communication between the browser and the server.

## Error Types

In practice, the application distinguishes three groups:

| Type | Where it is detected | Current handling |
| --- | --- | --- |
| Invalid interaction | Frontend | The action is blocked, the selection is cleared, or an error sound is played. |
| Online business rule | Backend | REST response with `ok: false` and a known error code. |
| Technical failure | Network, WebSocket, Stockfish, or internal error | Visible notice in some flows, browser console output, or a generic HTTP response. |

Expected online failures do not use HTTP error status codes. The backend responds with HTTP `200` and a body such as:

```json
{
  "ok": false,
  "error": "notYourTurn"
}
```

The frontend uses that code to choose the displayed message. If the request does not reach the backend, RxJS enters the `error` callback and a generic connection message is shown.

## Errors During Local And AI Games

`GameplayService` calculates legal moves before applying a move. As a result, an invalid interaction does not normally produce an exception or on-screen text:

- a piece that does not belong to the current turn cannot be selected
- a move cannot be made to a square outside the legal destinations
- play is disabled when the game is finished, paused, or its history is being reviewed
- no move is sent when the promotion dialog is cancelled

When an invalid destination is attempted after selecting a piece, the local and AI services play the error sound and clear the selection.

In game-vs-AI mode, if Stockfish does not start, does not respond before its timeout, or returns a move that cannot be interpreted, `AiGameService` discards that response and writes a warning to the console. The user does not yet receive a message or an explicit option to retry the calculation.

## Validations Before Joining A Room

`OnlineLobbyDialogComponent` validates some cases before making a request:

| Situation | Displayed message |
| --- | --- |
| Code is not six valid characters | `Enter a valid 6-character code.` |
| Attempt to join the room created by the same user | `You are already the host of this room.` |

The code is normalized while the user types and any previous message is cleared. During room creation or joining, `isSubmitting` disables the buttons to prevent duplicate requests.

If the backend receives the join request but cannot complete it, it returns one of these errors:

| Code | Backend cause | Displayed message |
| --- | --- | --- |
| `notFound` | No room exists with that code. | `Room not found.` |
| `full` | Both white and black already have players. | `This room is already full.` |
| `finished` | The room has ended and does not accept new players. | `This room has already finished.` |

An HTTP failure while creating a room displays `Could not create the room. Check that the backend is running.`. When joining, it displays `Could not reach the backend. Check that Spring Boot is running.`.

## Errors When Submitting A Move

The frontend prevents obvious actions, but the backend validates the move again to keep the room state consistent. `InMemoryOnlineRoomService` checks that the room exists, that `playerId` belongs to it, whose turn it is, that both players are present, and whether the move is legal by rebuilding the game from its history.

If one of those checks fails, it responds with `ok: false`:

| Code | Displayed message |
| --- | --- |
| `notFound` | `The room no longer exists.` |
| `notParticipant` | `This session is not part of the room.` |
| `illegalMove` | `That move is not legal.` |
| `notYourTurn` | `It is not your turn.` |
| `finished` | `The game has already finished.` |

`OnlineGameService` keeps the previous board, stores the text in `lastSubmissionError`, and plays the error sound. `GameComponent` displays that text in a red banner above the game. If the HTTP request fails, the message is `Could not send the move to the server.`.

## Rematch Errors

The rematch request is also validated by the backend. Only a participant can request it, and only when the room has finished.

| Code | Displayed message |
| --- | --- |
| `notFound` | `The room no longer exists.` |
| `notParticipant` | `This session is not part of the room.` |
| `notFinished` | `The current game is still in progress.` |

The message appears in the same game error banner and the error sound is played. If HTTP communication fails, `Could not send the rematch request to the server.` is displayed.

## Connection And Live Updates

`OnlineRoomService` maintains a STOMP connection to receive room snapshots. When it cannot connect, the channel returns an error, or the connection is lost, it publishes a status message such as:

- `Live updates are temporarily unavailable.`
- `Could not connect to the live update server.`
- `The live update channel returned an error.`
- `Connection lost. Trying to reconnect...`

The lobby and game screen show these messages as notices. The STOMP client automatically tries to reconnect every five seconds.

Losing the WebSocket connection does not necessarily prevent REST requests, but the client stops receiving changes made by the opponent until it reconnects. If a STOMP frame contains invalid JSON, it is ignored so that the room subscription remains open.

The initial room load uses a REST request. If that request fails or does not return a room, `OnlineRoomService` emits `null` in its reactive state. There is currently no specific message or retry button for this case.

## Backend HTTP Validation

The creation, join, move, and rematch DTOs use Bean Validation. For example, the backend requires `playerId`, a move with squares between `0` and `63`, a complete time configuration, and non-negative times.

A request that does not meet these constraints never reaches the room service: Spring Boot generates its validation HTTP response. The project does not have a `@ControllerAdvice` that converts these technical errors into its own format, and the frontend does not display their details specifically.

Unexpected server exceptions, such as programming errors, also have no custom handler. They are resolved through Spring Boot's default error response.

## Current MVP Limitations

- Interface messages are written directly in English, and there is no internationalization layer or shared error catalog yet.
- There is no HTTP interceptor or global component that standardizes network, validation, and server failures.
- The move or rematch error state only stores the latest message and is cleared when a new valid room snapshot arrives.
- The initial REST request for a room can fail silently from the user's perspective.
- Stockfish reports failures in the console, without visible recovery in the interface.
- Rooms are stored in memory. If the backend restarts, they disappear and clients receive `notFound` when trying to use them again.
- The backend does not materialize a timeout through a periodic task; it needs a room query or move attempt to detect the timeout conclusively.

## Summary

The MVP prevents many invalid actions directly in the interface and reserves the final decision for the backend in online games. Room, move, and rematch business errors have defined codes and visible messages. Technical failures are already partially communicated, but a shared strategy for responses, translations, recovery, and error presentation is still missing.
