# Online Room Creation

## Purpose

This document describes what happens when a user creates an online room: configuration in the lobby, the REST request to the backend, creation of the shared state, and subscription to its updates.

## Entering The Lobby

From `HomeComponent`, clicking `Online` opens `online-lobby-dialog`.

The lobby offers two separate flows:

- create a new game and generate a code
- join an existing room with a code

This document covers the first flow.

## Room Configuration

Clicking `SET UP AND GENERATE CODE` opens `online-game-settings-dialog`.

The host can configure:

- White's base time and increment
- Black's base time and increment
- their color preference: white, black, or random

After confirmation, the dialog returns an `OnlineGameSettings` object. `HomeComponent` stores that configuration as the last one used, and the lobby starts creating the room.

While the request is in progress, `isSubmitting` prevents multiple creation requests from being sent at the same time.

## Room Creation REST Request

`OnlineLobbyDialogComponent` delegates the operation to `OnlineRoomService.createRoom(settings)`.

The service sends:

`POST /api/online/rooms`

with this format:

```json
{
  "settings": {
    "timeControlSettings": {
      "white": { "baseMinutes": 5, "incrementSeconds": 0 },
      "black": { "baseMinutes": 5, "incrementSeconds": 0 }
    },
    "hostSidePreference": "random"
  }
}
```

The base URL comes from `environment.onlineBackend.apiBaseUrl`. In development, it is built with the frontend's current host and port `8080`.

## Backend Creation

`OnlineRoomController` receives the request in Spring Boot and delegates it to `InMemoryOnlineRoomService`.

The service:

- validates that the received configuration is present
- resolves the host's color based on their preference; the server decides it when random is selected
- generates a player identifier
- generates a unique six-character code
- creates a room with `waiting` status
- stores the room in `InMemoryOnlineRoomRepository`
- publishes a room update through WebSocket

The code uses letters and numbers selected to avoid ambiguous characters. Before using it, the service checks that it does not already exist in the repository.

Because the repository is in memory, the room only exists while the Spring Boot process is running. Restarting the backend removes created rooms.

## Initial Room State

A newly created room contains:

- a single player: the host
- the color assigned to that player
- the selected time-control configuration
- initial times calculated from the configured minutes
- an empty move list
- `waiting` status

The clock is not active yet. The game does not start until a second player joins and the first move is sent.

## Frontend Response

The backend returns two main values:

```json
{
  "room": {
    "code": "ABC123",
    "status": "waiting"
  },
  "session": {
    "roomCode": "ABC123",
    "playerId": "player_xxxx",
    "playerSide": "white"
  }
}
```

`room` is the current room snapshot. `session` identifies the player who just created it and is later used to enter and participate in the online game.

## Storing The Session

When `OnlineRoomService` receives a successful response, it:

- updates the room's reactive in-memory state
- stores the session in `localStorage`
- starts listening to the room's WebSocket topic

The storage key follows this format:

`angular-chess.online-session.{roomCode}`

The value contains `roomCode`, `playerId`, and `playerSide`.

This is not an authentication system. It is lightweight persistence that allows the browser to rebuild the player's local identity when returning to the online route or after a refresh.

## Subscribing To Updates

After creating the room, the lobby calls `watchRoom(code)`.

This method does two things:

1. It requests the current snapshot with `GET /api/online/rooms/{code}`.
2. It connects to the `/ws` STOMP endpoint and subscribes to `/topic/online/rooms/{code}`.

The REST request provides an initial state even if no real-time event has arrived yet. Topic messages contain a `room` object, and each one replaces the snapshot stored in the frontend.

The client avoids creating duplicate subscriptions for the same room. If the connection drops, the STOMP client tries to reconnect and the lobby shows a notice; the room that was already created is not lost because of this.

## Host Waiting State

After creating the room, the lobby shows:

- the generated code to share
- the configured time control
- the host's preferred color and final assigned color
- `Waiting for opponent` status

The application does not navigate to `GameComponent` yet. The host stays in the lobby until receiving a snapshot with `ready` or `playing` status.

This normally happens when another user joins the room. The subscription updates the state, and the lobby then navigates to:

`/game/online`

with `code`, `playerId`, and `side` as query params.

## Possible Errors

If the `POST` request fails, the lobby shows a message that the room could not be created and suggests checking that the backend is running.

A failed WebSocket connection does not automatically invalidate a room that was already created. The user receives a notice that real-time updates are unavailable; when the connection recovers, the client subscribes again and the lobby can automatically detect when the opponent joins.
