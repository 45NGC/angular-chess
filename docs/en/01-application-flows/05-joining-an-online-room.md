# Joining An Online Room

## Purpose

This document describes the flow for joining an existing online room: entering and validating the code, the backend request, possible errors, and transition to an active game.

## Entering The Code

In `online-lobby-dialog`, the user enters a room code in the `Game code` field and clicks `CONTINUE`.

On every change to the field, `OnlineRoomCodeService` normalizes the value:

- converts letters to uppercase
- removes characters that are not letters or numbers
- limits the result to six characters

The application considers a normalized code valid when it has exactly six characters. This validation checks its format but does not yet guarantee that the room exists.

## Frontend Validation

Before sending the request, the lobby checks:

- that no other operation is in progress through `isSubmitting`
- that the code has six characters after normalization
- that the code does not match the room associated with the browser's active session

If the code is invalid, the backend is not called and the application displays `Enter a valid 6-character code.`

If there is already an active session for that code, the request is not sent either. The interface states that the user is already the host of that room; in practice, this check prevents repeating an operation on the current room.

## Joining Request

When validation succeeds, `OnlineLobbyDialogComponent` calls `OnlineRoomService.joinRoom(code)`.

The service normalizes the code again and sends:

`POST /api/online/rooms/{code}/join`

with this body:

```json
{
  "code": "ABC123"
}
```

The code in the route identifies the room to open. The backend also validates that the `code` field in the body is not empty.

## Backend Validation

`OnlineRoomController` receives the request and delegates it to `InMemoryOnlineRoomService`.

The service normalizes the code from the route and checks, in this order:

- that the room exists
- that it has not finished
- that it has a free side for a second player

Color assignment does not depend on a preference from the joining player. The server assigns the only available color:

- if the White player is missing, they receive White
- otherwise, if the Black player is missing, they receive Black

If both slots are occupied, the room is considered full.

## Room Update

When the join is valid, the backend:

- creates a new identifier for the second player
- adds them on the available side
- changes the room status from `waiting` to `ready`
- keeps the time-control configuration and the empty move list
- stores the new snapshot in the in-memory repository
- publishes the update to `/topic/online/rooms/{code}`

The room is ready to play, but it does not change to `playing` until the first move is accepted.

## Successful Response

The backend returns:

```json
{
  "ok": true,
  "room": {
    "code": "ABC123",
    "status": "ready"
  },
  "session": {
    "roomCode": "ABC123",
    "playerId": "player_xxxx",
    "playerSide": "black"
  }
}
```

The session identifies the player who just joined and includes the color assigned by the server.

When it receives a successful response, `OnlineRoomService`:

- updates the in-memory room snapshot
- stores `roomCode`, `playerId`, and `playerSide` in `localStorage`
- starts or reuses the room topic's STOMP subscription

The lobby then stores the session as active and calls `watchRoom(code)`, which also requests a REST snapshot to synchronize the initial state.

## Domain Errors

Expected join errors are not treated as network failures. The backend responds with `ok: false` and an error code:

| Error | Meaning | Displayed message |
| --- | --- | --- |
| `notFound` | No room exists with that code. | `Room not found.` |
| `full` | Both room slots are already occupied. | `This room is already full.` |
| `finished` | The room has already finished. | `This room has already finished.` |

In these cases, the lobby keeps the user on the current screen, displays the relevant message, and allows another code to be entered.

## Communication Failures

If the HTTP request does not reach the backend or fails unexpectedly, the observable enters its error branch. The lobby displays:

`Could not reach the backend. Check that Spring Boot is running.`

The WebSocket connection is handled independently. If it fails, the room may still have been joined successfully through REST, but the user sees a notice that real-time updates are unavailable until the connection recovers.

## Transition To The Game

When the `ready` snapshot is stored, the joining player's subscription receives that update immediately. At the same time, the host receives the event published by the backend through their own subscription.

The lobby navigates when it receives a room with `ready` or `playing` status and an active session exists. The resulting route is:

`/game/online?code=ABC123&playerId=player_xxxx&side=black`

`GameComponent` uses those parameters, or the stored session when needed, to create `OnlineGameService`. From that point, both clients observe the same room snapshot and can continue with the online game flow.
