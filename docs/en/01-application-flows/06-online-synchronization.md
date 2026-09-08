# Online Synchronization

## Purpose

This document explains how a room's state stays synchronized between two browsers: the initial REST snapshot, real-time WebSocket/STOMP updates, and interface updates.

## Source Of Shared State

In an online game, the backend maintains the room's shared state. The frontend keeps a reactive copy of that state for display, but it does not decide by itself which changes are valid for every player.

The synchronization unit is `OnlineRoom`. Each snapshot contains, among other data:

- the room code and status
- both players and their colors
- the clock configuration and state
- the move history
- rematch requests

Rather than sending partial changes, the backend publishes a complete room snapshot after every relevant change.

## Frontend State

`OnlineRoomService` is a global Angular service. It keeps one `BehaviorSubject` per room code in a `Map`.

This allows multiple consumers in the same browser, such as the lobby and `OnlineGameService`, to observe a single reactive copy of the snapshot. When the service receives a new room, it calls `updateRoom(room)`, and every subscriber for that room receives the updated value.

Before publishing the new value, the service checks whether the player stored in `localStorage` has changed color in the room. If so, it updates `playerSide` in the stored session. This keeps the session consistent when a rematch swaps colors.

## Initial REST Snapshot

The `watchRoom(code)` method is used when entering a room or when creating `OnlineGameService`.

Before relying on WebSocket, it performs:

`GET /api/online/rooms/{code}`

The response provides the room's current snapshot. This is important because a client may enter after events have already been published or may be restoring a session after a refresh.

If the backend returns a room, the frontend updates the `BehaviorSubject`. If it returns `room: null` or the request fails, it publishes `null` for that room.

Successful responses for room creation, joining, submitting a move, or requesting a rematch also include a snapshot. `OnlineRoomService` applies them directly, so the client that starts an action does not need to wait for the WebSocket event to update itself.

## WebSocket And STOMP Connection

Alongside the REST snapshot, `watchRoom(code)` registers the room for real-time updates.

The frontend creates a single STOMP client for the browser and connects to:

`/ws`

When the connection is available, it subscribes to the room-specific topic:

`/topic/online/rooms/{code}`

The service avoids creating duplicate subscriptions for the same code. If several rooms are registered, the same STOMP client can maintain one topic for each of them.

## Received Events

STOMP messages have this structure:

```json
{
  "room": {
    "code": "ABC123"
  }
}
```

When it receives a message, `OnlineRoomService`:

1. Parses the message body from JSON.
2. Extracts the `room` snapshot.
3. Updates the corresponding `BehaviorSubject`.

Malformed messages are ignored so an incorrect frame does not stop the room listener.

## Backend Publishing

Spring Boot exposes the `/ws` STOMP endpoint and enables the simple broker for destinations beginning with `/topic`.

`StompOnlineRoomTopicPublisher` publishes every snapshot through `SimpMessagingTemplate` to:

`/topic/online/rooms/{code}`

`InMemoryOnlineRoomService` publishes an update when:

- a room is created
- the second player joins
- a move is accepted
- room state changes while being retrieved, for example when an expired clock is materialized
- a rematch request is registered or the room is reset for a rematch

Clients do not send moves through WebSocket. Actions that change the game are sent through REST; WebSocket only distributes the state accepted by the backend.

## Updating `OnlineGameService`

`OnlineGameService` subscribes to `watchRoom(session.roomCode)` when it is constructed.

For every snapshot, `applyRoom()`:

- updates the room status and time control
- checks whether the player's identifier still has the same color
- updates the clock's base values and timestamp
- converts `room.moves` into the local history
- rebuilds `GameState` from that history
- updates or clears selection and pending promotion when they are no longer valid
- shows the game-over dialog if the room or chess state has finished
- plays the sound for the latest received move when appropriate

The service does not apply moves independently on each client. Rebuilding the board from the received history ensures that both use the same sequence accepted by the server.

At the end of every update, it requests Angular change detection. `GameComponent` reads the board, clocks, and the remaining service getters again to reflect the new state on screen.

## Clock Synchronization

The snapshot contains `whiteTimeMs`, `blackTimeMs`, `activeClockColor`, and `clockUpdatedAt`.

The backend stores these values. To display a clock that advances between snapshots, `OnlineGameService` calculates the locally elapsed time from `clockUpdatedAt` while the room has `playing` status.

This allows both browsers to show a smooth clock without the server publishing an event every second. The backend materializes the actual time again when it processes a relevant operation, such as retrieving a room or submitting a move.

## Example: Update After A Move

The normal flow for an accepted move is:

1. A player sends a move through REST.
2. The backend validates it and creates a new `OnlineRoom` with the updated move, turn, and clock.
3. The backend stores that snapshot and publishes it through STOMP.
4. The player who moved updates their state from the REST response.
5. The opponent receives the same snapshot through the STOMP topic.
6. Both `OnlineGameService` instances rebuild the same board and update the interface.

Move validation and submission are described in `07-online-move-submission.md`.

## Reconnection And Current Limitations

If the connection closes, the client shows `disconnected` status and tries to reconnect every five seconds. Once reconnected, it subscribes again to the registered topics.

REST and WebSocket complement each other, but the system still has a limitation: after a WebSocket reconnection, it does not automatically request a new REST snapshot. If an update was missed while the channel was disconnected, the state is reconciled when another relevant REST call is made or when `watchRoom(code)` runs again.
