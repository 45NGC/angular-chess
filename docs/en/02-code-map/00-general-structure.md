# General Structure

## Purpose

This document provides an initial map of the two repositories that make up the application. The files in `01-application-flows` explain what happens during each action; this folder explains where the responsible code is located.

## The Two Repositories

The project is split into two applications that can run independently:

| Repository | Main technology | Role |
| --- | --- | --- |
| `angular-chess` | Angular, TypeScript, and RxJS | Interface, local and AI game logic, and the online mode client. |
| `springboot-chess` | Spring Boot and Java | REST API, WebSocket/STOMP, room state, and authoritative validation for online games. |

The frontend does not need the backend for local and AI modes. Online mode does need both processes to be running because the browser queries and updates rooms through the backend.

## Relationship Between Them

Communication uses two channels:

- REST to create rooms, join them, obtain their snapshot, submit moves, and request rematches
- WebSocket with STOMP to receive updated snapshots of a room

During development, Angular is normally served at `http://localhost:4200` and Spring Boot runs on port `8080`. `angular-chess/src/environments/environment.shared.ts` builds the backend REST and WebSocket URLs. `springboot-chess/src/main/resources/application.properties` defines, among other settings, the CORS allowed origin.

The backend does not depend on Angular code. The frontend knows the contract of its endpoints and messages, but does not import Java classes. This allows each project to be run, tested, and deployed independently.

## Chess Logic On Both Sides

Both repositories contain chess logic:

- the frontend uses it to show legal destinations, respond immediately to user interaction, and manage games without a server
- the backend rebuilds the game and calculates legal moves to decide whether an online action is valid

This duplication is deliberate in the MVP. The client improves the user experience, but the server does not trust it. An online move is only stored when the backend logic also accepts it.

## `angular-chess` Structure

```text
angular-chess/
├── docs/                 General project documentation in Spanish and English
├── public/               Public resources, such as the favicon
├── src/
│   ├── app/              Angular application code
│   ├── assets/           Pieces, sounds, and Stockfish files
│   └── environments/     Backend connection configuration
├── angular.json          Angular CLI configuration
├── package.json          npm dependencies and scripts
├── README.md             English introduction
└── README_es.md          Spanish introduction
```

The main areas inside `src/app/` are:

| Folder | Responsibility |
| --- | --- |
| `core/` | Pure board logic, rules, FEN, game state, and local clock. |
| `interfaces/` | TypeScript contracts shared by components and services. |
| `services/` | Coordination of game modes, Stockfish, sound, and online communication. |
| `ui/` | Angular components for the home screen, game, board, and dialogs. |

## `springboot-chess` Structure

```text
springboot-chess/
├── docs/                 Backend contract-specific documentation
├── src/
│   ├── main/
│   │   ├── java/com/angularchess/backend/
│   │   │   ├── chess/    Server-side chess rules and models
│   │   │   ├── config/   CORS and WebSocket/STOMP configuration
│   │   │   └── online/   Rooms, API, in-memory storage, and event publishing
│   │   └── resources/    Spring Boot configuration properties
│   └── test/             Backend tests
├── pom.xml               Maven dependencies and configuration
├── mvnw                  Maven Wrapper for Unix systems
└── README.md             Backend introduction and execution instructions
```

The `online/` package is organized by responsibility:

| Folder | Responsibility |
| --- | --- |
| `controller/` | REST endpoints that receive frontend requests. |
| `dto/` | Request, response, and published event payloads. |
| `model/` | Room, player, time, move models, and online mode enums. |
| `repository/` | Storage abstraction and its current in-memory implementation. |
| `service/` | Room, move, clock, and rematch business rules. |
| `websocket/` | Publishing room snapshots to STOMP topics. |

## Documentation And Starting Point

General documentation is centralized in `angular-chess/docs/`:

```text
docs/
├── es/
│   ├── 01-flujos-aplicacion/
│   └── 02-mapa-codigo/
└── en/
    ├── 01-application-flows/
    └── 02-code-map/
```

The specific online communication contract is available as `online-backend-contract.md` in the documentation of both repositories. It is useful to consult it together with the documents for `online/controller`, `online/dto`, and `OnlineRoomService` when following an end-to-end request.

## Running In Development

Each repository has its own commands and dependencies:

| Project | Installation | Development | Tests |
| --- | --- | --- | --- |
| `angular-chess` | `npm install` | `npm start` | `npm test` |
| `springboot-chess` | Maven Wrapper included | `./mvnw spring-boot:run` | `./mvnw test` |

Both projects need to run to test online mode. Running only the frontend is enough to develop the board, rules, local mode, or Stockfish integration.

## Continuing The Code Map

The following files will describe the frontend by area and then the backend by package. The proposed order makes it possible to start with the game logic and Angular services before reviewing the server implementation.
