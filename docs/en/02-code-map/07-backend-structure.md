# Backend: General Structure

## Purpose

The backend is in the `springboot-chess` repository, under `src/main/java/com/angularchess/backend/`. It is a Spring Boot application that provides online game rooms: it receives REST requests, keeps each room's state, validates moves with chess logic, and publishes updates through WebSocket/STOMP.

```text
src/main/java/com/angularchess/backend/
├── SpringbootChessApplication.java
├── chess/
│   ├── board/
│   ├── model/
│   └── rules/
├── config/
│   ├── WebConfig.java
│   ├── WebSocketConfig.java
│   └── WebSocketDestinations.java
└── online/
    ├── controller/
    ├── dto/
    ├── model/
    ├── repository/
    ├── service/
    └── websocket/
```

`SpringbootChessApplication` is the entry point. The `@SpringBootApplication` annotation starts the Spring container, detects components in subpackages, and applies the automatic configuration of dependencies defined in `pom.xml`.

## Package Relationships

The main dependency flow goes from communication layers to domain logic:

```text
REST request
     ↓
online/controller
     ↓
online/service
     ├── online/repository
     ├── online/websocket
     └── chess
```

`chess` is independent of Spring, HTTP, and WebSocket. `online` uses that logic to verify moves in a remote game. `config` contains no rules or rooms: it configures how clients can reach the `online` layers.

## `chess/`

`chess/` contains the reusable chess logic the backend needs to be authoritative in online games. It does not know about players, room codes, REST requests, or STOMP.

| Package | Responsibility |
| --- | --- |
| `chess/board/` | Board representation, FEN parsing, squares, and castling rights. |
| `chess/model/` | Shared domain types: pieces, colors, results, and draw reasons. |
| `chess/rules/` | Game state, legal move generation, attacked squares, simulation, history, and draw rules. |

For example, when receiving an online move, the service rebuilds a `GameState` from the room history and uses `LegalMoveFinder` to verify that the submitted move is legal. This separation makes the same logic usable without starting Spring and prevents the HTTP controller from needing to know chess rules.

## `config/`

`config/` contains application-wide configuration.

### `WebConfig`

`WebConfig` configures CORS for `/api/**` routes. It permits `GET`, `POST`, and `OPTIONS` methods from the origins defined in `app.cors.allowed-origins`; unless configured otherwise, it uses `http://localhost:4200`, where the Angular frontend runs during development.

### `WebSocketConfig`

`WebSocketConfig` enables Spring's message broker and registers the `/ws` STOMP endpoint. It also permits the same origins configured for CORS.

The simple broker publishes destinations under `/topic`; `/app` is reserved as the application destination prefix. The client subscribes to topics rather than running room logic by sending STOMP messages to the backend.

### `WebSocketDestinations`

`WebSocketDestinations` centralizes the `/topic`, `/app`, and `/ws` constants. Configuration and publishing classes can reuse them without duplicating protocol literals.

## `online/`

`online/` implements the remote-game use case. It maintains two-player rooms, their moves, clocks, results, and rematch requests.

| Package | Responsibility |
| --- | --- |
| `controller/` | REST endpoints under `/api/online/rooms`. Delegates without containing game rules. |
| `dto/` | Input, output, and event contracts serialized for the client. |
| `model/` | Online domain model: room, players, session, move, time, colors, statuses, and typed errors. |
| `repository/` | Abstraction to save and retrieve rooms, with the current in-memory implementation. |
| `service/` | Create, join, retrieve, move, and rematch operations; validates and updates state. |
| `websocket/` | Per-room topic construction and STOMP update publishing. |

### Controller And DTOs

`OnlineRoomController` exposes five operations: creating a room, joining it, retrieving its snapshot, submitting a move, and requesting a rematch. It receives `dto/` objects annotated with `@Valid` and delegates each operation to `OnlineRoomService`.

DTOs separate what crosses the network from internal classes. Join, move-submission, and rematch responses can include typed domain errors, such as a missing room, finished game, illegal move, or incorrect turn.

### Services

`OnlineRoomService` defines the contract for online operations. `InMemoryOnlineRoomService` is the `@Service` implementation that Spring injects into the controller.

This class coordinates the complete flow: it normalizes codes with `OnlineRoomCodeService`, generates the player's session, rebuilds chess state, validates the move, updates the clock, saves the new snapshot, and notifies clients. Its public operations are `synchronized` so room updates do not interleave within the same backend instance.

### In-Memory Repository

`OnlineRoomRepository` allows the service to avoid depending directly on a persistence technology. The current implementation, `InMemoryOnlineRoomRepository`, uses a `ConcurrentHashMap` with rooms indexed by code.

This means rooms only exist while the Spring Boot process is running. Restarting the backend removes games, and rooms are not shared across multiple server instances. In a later database-backed evolution, the repository contract could be retained while replacing this implementation.

### STOMP Publishing

`OnlineRoomTopicPublisher` is another abstraction used by the service. `StompOnlineRoomTopicPublisher` uses `SimpMessagingTemplate` to send an `OnlineRoomUpdateEvent` to the room topic:

```text
/topic/online/rooms/{roomCode}
```

The service publishes the snapshot after creating, joining, updating, or resetting a room. The frontend receives that event through the STOMP subscription managed by Angular's `OnlineRoomService`.

## Runtime Configuration

`src/main/resources/application.properties` defines the application name and the default allowed CORS origin. The project uses Java 21 and Spring Boot starters for validation, MVC, and WebSocket, declared in `pom.xml`.

There are currently no dedicated packages for users, authentication, security, databases, or persistence. These are coherent limits for the current MVP and natural extension points for a later evolution.
