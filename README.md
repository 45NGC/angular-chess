# 🌍 Language / Idioma

- [English](README.md)
- [Español](README_es.md)

---

# ♟️ Angular Chess

This Angular project implements the core rules of chess and provides a local two-player interface. The engine is completely decoupled from the UI, making it easy to extend with AI or online multiplayer.

**Implemented mechanics:**

- Full legal move generation for all pieces  
- Turn-based play with automatic turn switching  
- Check, checkmate and stalemate detection  
- Castling (kingside and queenside)  
- Pawn promotion (with interactive dialog)  
- En passant captures  
- Move validation and simulation  
- Attacked squares calculation  

**Mechanics yet to be implemented to fully comply with official chess rules:**

- Draw by threefold repetition  
- Draw by insufficient material  
- Draw by the 50‑move rule  
- Draw by perpetual check (covered by threefold repetition in practice)  
- Draw by mutual agreement  

---

## How does it work?

The project is built with Angular and runs entirely in the browser. The chess logic resides in the `core` module, which is independent of the UI. The UI components (`ui/game`) render an interactive board and handle user clicks. When a piece is selected, the legal moves are highlighted using the `legal-move-finder` service. After a move is made, the `move-simulator` and `game-state` services update the board and evaluate the new position.

Promotion and game‑over dialogs are implemented as Angular components and appear when needed.

---

## Project Status

**Implemented mechanics:**
- [x] Piece movement & legal move generation
- [x] Check and checkmate detection
- [x] Castling
- [x] En passant
- [x] Pawn promotion (with dialog)
- [x] Stalemate
- [x] Attacked squares calculation
- [x] Move simulation & validation
- [x] Interactive visual board
- [x] Local two‑player mode

**Future implementations:**
- [ ] Remaining draw conditions (threefold repetition, 50‑move rule, etc.)
- [ ] AI opponent (random moves first, then minimax)
- [ ] Online multiplayer via WebSockets (Socket.IO)
- [ ] Game history and replay
- [ ] Adjustable time controls

---

## Technologies used

- Angular (TypeScript)  
- RxJS for state management  
- HTML5 / CSS3  
- Unit tests with Jasmine (see `.spec.ts` files)

---

## Getting Started

1. Clone the repository.  
2. Run `npm install` to install dependencies.  
3. Run `ng serve` for a development server.  
4. Navigate to `http://localhost:4200/`.  
