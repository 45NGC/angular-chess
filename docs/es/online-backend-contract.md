# Contrato Del Backend Online

Este archivo define el primer contrato de backend para el modo online.

## Que significa "backend contract"

Un contrato de backend es el acuerdo entre frontend y backend sobre:

- que endpoints o eventos websocket existen
- que datos envia el frontend
- que datos devuelve el backend
- que codigos de error o estados de error son posibles

En la practica, responde a esto:

- "Que llama el frontend?"
- "Que JSON envia?"
- "Que JSON recibe de vuelta?"

El objetivo es que frontend y backend evolucionen sin tener que adivinar.

## Modelo Inicial De Sala

El modelo principal de sala usado por ambos lados es `OnlineRoom`.

Tipos relevantes del frontend:

- `OnlineRoom`
- `OnlineRoomSession`
- `OnlineGameSettings`
- `Move`

Ver:

- `src/app/interfaces/online-room.interface.ts`
- `src/app/interfaces/online-game-settings.interface.ts`
- `src/app/interfaces/online-backend-contract.interface.ts`

## Endpoints REST

### `POST /api/online/rooms`

Crea una sala.

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

Se une a una sala existente.

Request body:

```json
{
  "code": "ABC123"
}
```

Response body en caso de exito:

```json
{
  "ok": true,
  "room": {},
  "session": {}
}
```

Response body en caso de error:

```json
{
  "ok": false,
  "error": "notFound"
}
```

Errores posibles:

- `notFound`
- `full`
- `finished`

### `GET /api/online/rooms/{code}`

Devuelve el snapshot actual de la sala.

Response body:

```json
{
  "room": {}
}
```

Si la sala no existe:

```json
{
  "room": null
}
```

### `POST /api/online/rooms/{code}/moves`

Envia un movimiento.

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

Response body en caso de exito:

```json
{
  "ok": true,
  "room": {}
}
```

Response body en caso de error:

```json
{
  "ok": false,
  "error": "notYourTurn"
}
```

Errores posibles:

- `notFound`
- `notParticipant`
- `notYourTurn`
- `finished`

## Eventos WebSocket / SSE

Para Spring Boot, el siguiente paso recomendado es:

- empezar con REST para crear sala, unirse y enviar movimiento
- anadir WebSocket o SSE para actualizaciones en tiempo real

Payload sugerido del evento:

```json
{
  "type": "roomUpdated",
  "room": {}
}
```

Tipos de evento sugeridos:

- `roomCreated`
- `roomUpdated`
- `roomReady`
- `gameStarted`
- `moveSubmitted`
- `gameFinished`

## Mapeo Sugerido En Spring Boot

Una estructura simple podria ser:

- `OnlineRoomController`
- `OnlineRoomService`
- `OnlineRoomRepository`
- `OnlineMoveValidator`
- publicador websocket para actualizaciones de sala

## Objetivo De Integracion Del Frontend

Con el tiempo, el `OnlineRoomService` del frontend deberia dejar de estar en memoria y pasar a llamar a este contrato de backend:

- `createRoom(settings)`
- `joinRoom(code)`
- `getRoom(code)` o suscribirse a actualizaciones de sala
- `submitMove(code, playerId, move)`
