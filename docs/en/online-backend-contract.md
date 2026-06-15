# Online Backend Contract

This file defines the first backend contract for the online mode.

## What "backend contract" means

A backend contract is the agreement between frontend and backend about:

- which endpoints or websocket events exist
- what data the frontend sends
- what data the backend returns
- what error codes or error states are possible

In practice, it answers:

- "What does the frontend call?"
- "What JSON does it send?"
- "What JSON does it receive back?"

The goal is to let frontend and backend evolve without guessing.

## Initial Room Model

The main room model used by both sides is `OnlineRoom`.

Relevant frontend types:

- `OnlineRoom`
- `OnlineRoomSession`
- `OnlineGameSettings`
- `Move`

See:

- `src/app/interfaces/online-room.interface.ts`
- `src/app/interfaces/online-game-settings.interface.ts`
- `src/app/interfaces/online-backend-contract.interface.ts`

## REST Endpoints

### `POST /api/online/rooms`

Creates a room.

Request body:

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

Response body:

```json
{
  "room": {
    "code": "ABC123",
    "status": "waiting",
    "whitePlayer": null,
    "blackPlayer": {
      "id": "player_xxxx",
      "side": "black",
      "presence": "connected",
      "joinedAt": 1710000000000
    },
    "timeControlSettings": {
      "white": { "baseMinutes": 5, "incrementSeconds": 0 },
      "black": { "baseMinutes": 5, "incrementSeconds": 0 }
    },
    "moves": [],
    "createdAt": 1710000000000,
    "startedAt": null,
    "finishedAt": null
  },
  "session": {
    "roomCode": "ABC123",
    "playerId": "player_xxxx",
    "playerSide": "black"
  }
}
```

### `POST /api/online/rooms/{code}/join`

Joins an existing room.

Request body:

```json
{
  "code": "ABC123"
}
```

Response body on success:

```json
{
  "ok": true,
  "room": {},
  "session": {}
}
```

Response body on failure:

```json
{
  "ok": false,
  "error": "notFound"
}
```

Possible errors:

- `notFound`
- `full`
- `finished`

### `GET /api/online/rooms/{code}`

Returns the current room snapshot.

Response body:

```json
{
  "room": {}
}
```

If the room does not exist:

```json
{
  "room": null
}
```

### `POST /api/online/rooms/{code}/moves`

Submits one move.

Request body:

```json
{
  "playerId": "player_xxxx",
  "move": {
    "from": 12,
    "to": 28
  }
}
```

Response body on success:

```json
{
  "ok": true,
  "room": {}
}
```

Response body on failure:

```json
{
  "ok": false,
  "error": "notYourTurn"
}
```

Possible errors:

- `notFound`
- `notParticipant`
- `notYourTurn`
- `finished`

## WebSocket / SSE Events

For Spring Boot, the recommended next step is:

- start with REST for create/join/submit move
- add WebSocket or SSE for live room updates

Suggested event payload:

```json
{
  "type": "roomUpdated",
  "room": {}
}
```

Suggested event types:

- `roomCreated`
- `roomUpdated`
- `roomReady`
- `gameStarted`
- `moveSubmitted`
- `gameFinished`

## Suggested Spring Boot Mapping

One simple shape would be:

- `OnlineRoomController`
- `OnlineRoomService`
- `OnlineRoomRepository`
- `OnlineMoveValidator`
- websocket publisher for room updates

## Frontend Integration Goal

Eventually, the frontend `OnlineRoomService` should stop being in-memory and instead call this backend contract:

- `createRoom(settings)`
- `joinRoom(code)`
- `getRoom(code)` or subscribe to room updates
- `submitMove(code, playerId, move)`
