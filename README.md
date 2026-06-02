# 🌍 Language / Idioma

- [English](README.md)
- [Español](README_es.md)

---

# ♟️ Angular Chess

`Angular Chess` is a browser-based chess application built with Angular 21. It includes a local two-player mode, an AI mode powered by Stockfish running in a Web Worker, configurable clocks, move history navigation, and a chess engine separated from the UI.

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

### Board and gameplay UX

- Click-to-move and drag-and-drop piece movement
- Legal move highlighting
- Last move highlighting
- Check highlight on the king square
- Manual board rotation
- Auto-rotate board in local mode
- Pause / resume support
- Move history navigation with undo and redo
- Review mode after game over
- Move, capture, check, error, low-time, and end sounds

### Time controls

- Independent clock settings for White and Black
- Base time options from `1` to `30` minutes
- Unlimited time option
- Per-move increment support
- Timeout detection

## Architecture

The project is split into two main parts:

- `src/app/core`: chess rules, board model, move simulation, game state, draw detection, FEN helpers, and local clock logic
- `src/app/ui`: Angular standalone components for the home screen, board, dialogs, clocks, controls, and overlays

Game services orchestrate each mode:

- `LocalGameService` manages local play, clocks, pause/resume, and history navigation
- `AiGameService` manages human-vs-AI games and communicates with Stockfish through `StockfishService`

## Project Status

Implemented:

- Chess engine with legal move validation
- Local play
- AI play with Stockfish
- Clock controls and timeout handling
- Undo / redo navigation
- Board rotation and auto-rotation
- Sound feedback
- Automated unit tests for core chess logic

Not implemented yet:

- `Online` mode
- Draw by 50-move rule
- Draw by mutual agreement

## Tech Stack

- Angular 21
- TypeScript
- RxJS
- Stockfish 18 via Web Worker + WASM
- Vitest for unit tests

## Getting Started

### Requirements

- Node.js
- npm

### Install

```bash
npm install
```

### Run in development

```bash
npm start
```

Open `http://localhost:4200/`.

### Build

```bash
npm run build
```

### Run tests

```bash
npm test
```

## Notes

- The home screen still shows an `Online` button, but that mode is not currently implemented.
- AI runs entirely in the browser using the bundled Stockfish worker assets.
