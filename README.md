# 🌍 Language / Idioma

- [English](README.md)
- [Español](README_es.md)

---

# ♟️ Angular Chess

`Angular Chess` is a browser-based chess application built with Angular 21. It includes local two-player play, an AI mode powered by Stockfish running in a Web Worker, and online games backed by a Spring Boot server with REST and STOMP updates.

## Current Features

### Game rules

- Full legal move generation for all pieces
- Check, checkmate, and stalemate detection
- Kingside and queenside castling
- En passant
- Pawn promotion with piece selection dialog
- Draw by threefold repetition
- Draw by insufficient material

### Play modes

- Local two-player mode
- AI mode with Stockfish
- AI difficulty levels: `beginner`, `intermediate`, `advanced`, `expert`
- Human color selection in AI games: `white`, `black`, or `random`
- Online two-player games through shareable room codes
- Server-authoritative online move validation and real-time room updates

### Board and gameplay UX

- Click-to-move and drag-and-drop piece movement
- Legal move highlighting
- Last move highlighting
- Check highlight on the king square
- Manual board rotation
- Auto-rotate board in local mode
- Pause / resume support in local and AI games
- Move history navigation with undo and redo in local and AI games
- Review mode after local and AI games end
- Move, capture, check, error, low-time, and end sounds

### Time controls

- Independent clock settings for White and Black
- Base time options from `1` to `30` minutes
- Unlimited time option
- Per-move increment support
- Timeout detection
- Backend-synchronized clocks in online games

## Architecture

The frontend is organized into three main areas:

- `src/app/core`: chess rules, board model, move simulation, game state, draw detection, FEN helpers, and local clock logic
- `src/app/ui`: Angular standalone components for the home screen, board, dialogs, clocks, controls, and overlays
- `src/app/services`: orchestration for local, AI, and online games, plus communication with Stockfish and the online backend

Game services orchestrate each mode:

- `LocalGameService` manages local play, clocks, pause/resume, and history navigation
- `AiGameService` manages human-vs-AI games and communicates with Stockfish through `StockfishService`
- `OnlineGameService` renders the server-accepted room state, while `OnlineRoomService` handles REST requests and STOMP subscriptions

The online backend lives in the separate `springboot-chess` repository. It manages rooms in memory, validates moves authoritatively, and publishes full room snapshots through WebSocket.

## Documentation

Detailed application-flow documentation is available in both languages:

- [English application flows](docs/en/01-application-flows/00-overview.md)
- [Flujos de aplicación en español](docs/es/01-flujos-aplicacion/00-vision-general.md)
- [Online backend contract](docs/en/online-backend-contract.md)

## Project Status

Implemented:

- Chess engine with legal move validation
- Local play
- AI play with Stockfish
- Online rooms, authoritative move validation, and STOMP synchronization
- Clock controls and timeout handling
- Undo / redo navigation
- Board rotation and auto-rotation
- Sound feedback
- Automated unit tests for core chess logic

Not implemented yet:

- Persistent room storage
- User authentication and session hardening
- Elo and matchmaking
- Draw by 50-move rule
- Draw by mutual agreement

## Tech Stack

- Angular 21
- TypeScript
- RxJS
- Stockfish 18 via Web Worker + WASM
- Spring Boot backend for online mode
- Vitest for unit tests

## Getting Started

### Requirements

- Node.js
- npm
- Java 21, only for running the online backend

### Install

```bash
npm install
```

### Run in development

```bash
npm start
```

Open `http://localhost:4200/`.

### Run online mode

Online games also require the backend to be running from the sibling `springboot-chess` repository:

```bash
cd ../springboot-chess
./mvnw spring-boot:run
```

By default, the frontend connects to the backend on port `8080`.

### Build

```bash
npm run build
```

### Run tests

```bash
npm test
```

## Notes

- AI runs entirely in the browser using the bundled Stockfish worker assets.
- Online rooms are stored in memory and are lost when the backend restarts.
