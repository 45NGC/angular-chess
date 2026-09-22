# Frontend: `core/`

## Purpose

`src/app/core/` contains the chess and time logic that does not need Angular components, HTTP services, dialogs, or DOM access. Its four areas are:

```text
core/
├── board/       Board, piece, square, and FEN representation
├── constants/   Fixed values for rules and the clock
├── rules/       Legal moves, game state, and draws
└── time/        Local clock and time formatting
```

Game services use this core to coordinate a game; components only turn user actions and the resulting state into a visual interface.

## Internal Dependencies

The main dependency direction is:

```text
board/ + constants/
        ↓
      rules/
        ↓
game services
        ↓
      ui/
```

`time/` is mainly used by `LocalGameService` and the components that display the clock. No file in `core/` imports Angular, RxJS, `HttpClient`, or an interface component.

## `core/board`

This folder defines how a chess position is represented. It does not decide which moves are legal; it provides the data and basic operations needed by the rules.

| File | Responsibility |
| --- | --- |
| `piece.ts` | `Piece`, `PieceType`, and `PieceColor` types, plus `isWhite()` and `isBlack()`. |
| `square.ts` | 8x8 board dimensions, coordinate-to-index conversion, and reference squares. |
| `board.ts` | `Board` class: pieces, castling rights, en passant target, and cloning. |
| `fen.ts` | Loading and generating positions in FEN format. |

### Squares And Indices

The board is stored as an array of 64 positions. Every square uses an index from `0` to `63`:

```text
8 | 56 57 58 59 60 61 62 63
7 | 48 49 50 51 52 53 54 55
  | ...
1 |  0  1  2  3  4  5  6  7
    a  b  c  d  e  f  g  h
```

`toIndex(rank, file)` converts internal coordinates to that index, and `fromIndex(square)` performs the reverse operation. Internal rank `0` represents white's first rank, so `e2` corresponds to `12`.

### Board State

`Board` stores:

- `squares`, with a piece or `null` for every square
- `enPassantTarget`, the square a pawn may capture on the next move
- `castlingRights`, with king-side and queen-side rights for each color

`clone()` creates independent copies of the squares and metadata. This is important because the rules simulate moves without changing the position currently shown to the user.

`updateCastlingRights()` removes rights when a king or a rook moves from its initial square. The check that castling is possible is later performed by `LegalMoveFinder`.

### FEN

`loadFEN()` loads the piece placement from a FEN into a `Board`. The initial position is defined in `INITIAL_POSITION_FEN`.

`toFEN(board, turn)` generates a FEN containing piece placement, turn, castling rights, and en passant target. The halfmove and fullmove fields are currently set to `0 1` because those counts are not tracked. This FEN is also used to send the position to Stockfish and to identify positions for the threefold repetition rule.

## `core/rules`

This folder implements chess rules on top of `Board`. The central sequence is:

1. `LegalMoveFinder` generates candidate moves for a piece.
2. `MoveSimulator` applies each candidate to a board copy.
3. `AttackedSquares` checks whether the player's own king is attacked.
4. Only candidates that do not leave the king in check are legal.
5. `GameState` applies an accepted move, changes the turn, and recalculates the result.

| File | Responsibility |
| --- | --- |
| `move.ts` | `Move` contract, with origin, destination, and optional promotion, castling, en passant, and double-push data. |
| `attacked-squares.ts` | Calculates squares attacked by a color and determines whether a king is in check. |
| `legal-move-finder.ts` | Generates and filters a piece's legal moves. |
| `move-simulator.ts` | Returns a cloned `Board` after applying a move. |
| `game-state.ts` | Maintains board, turn, result, and repeated positions. |
| `draw-rules.ts` | Detects insufficient-material positions that the application considers draws. |
| `move-history.ts` | Rebuilds a `GameState` from the initial position and a move list. |

### Attacks, Candidate Moves, And Legal Moves

`AttackedSquares` does not generate moves: it calculates squares under attack. This distinction is necessary for check and castling, where the king cannot cross an attacked square.

`LegalMoveFinder` first generates pseudo-legal moves according to the piece type. It then simulates each one and discards moves that leave the king of the same color in check. It handles:

- knight, king, and sliding-piece movement
- pawn movement, captures, double pushes, and promotions
- en passant
- king-side and queen-side castling, checking rights, rook, empty squares, and safe squares

`GameState.applyMove()` does not check whether the move is legal again. It receives a `Move` that has already been chosen from `LegalMoveFinder` results, or from a history previously accepted by the backend. For that reason, online mode validates moves again in Spring Boot before adding them to the shared history.

### Simulation And Game State

`MoveSimulator.simulate()` clones the board, clears the previous en passant target, and applies the move. It also moves the rook during castling, removes the pawn captured en passant, records the target after a double push, and replaces a pawn with the selected piece during promotion.

After simulation, `GameState` updates castling rights, changes the turn, and calculates the result. It can produce:

- `ongoing`
- checkmate
- stalemate
- draw by insufficient material
- draw by threefold repetition
- `timeout`, assigned by the local clock or an online snapshot

Threefold repetition is counted using the first four FEN fields: placement, turn, castling rights, and en passant target. `draw-rules.ts` applies a conservative set of insufficient-material cases. The fifty-move rule and draws by mutual agreement are not implemented.

### History

`buildGameStateFromMoves()` creates an initial board, loads the starting FEN, and applies every `Move` in order. Services use it to undo and redo in local and AI modes, and to rebuild the copy of an online room from `room.moves`.

Rebuilding from history avoids keeping multiple sources of truth for the same game, although it does not replace the authoritative validation performed by the backend before accepting online moves.

## `core/time`

This folder contains the clock for local mode and time presentation functions.

| File | Responsibility |
| --- | --- |
| `local-clock.ts` | `LocalClock` class, with white and black time, increment, active turn, and timeout callback. |
| `time.utils.ts` | Formats milliseconds as `MM:SS` and displays tenths below 15 seconds. |

`LocalClock` is configured with separate base minutes and increments for each color. It is only enabled when at least one side has finite base time. When turns change:

1. It deducts elapsed time from the active player.
2. It adds the increment to the player who just moved, if that player has a finite clock.
3. It activates the opponent's clock.

It uses `performance.now()` when available, with `Date.now()` as a fallback, and updates its state every 100 ms through `window.setInterval()`. When time reaches zero, it stops the interval and calls the callback with the winning color. Therefore, `LocalClock` does not depend on Angular, but it does depend on browser timing APIs.

The online clock does not reuse this class: the backend calculates valid time, and `OnlineGameService` only projects time visually between snapshots. The complete behavior is documented in `09-time-management.md`.

## `core/constants`

Constants prevent fixed values from being scattered through rules and services.

| File | Contents |
| --- | --- |
| `chess.constants.ts` | Initial FEN position, relevant pawn ranks, castling squares, and piece movement vectors. |
| `time.constants.ts` | 15-second threshold for the low-time sound. |

Knight, king, bishop, rook, and queen vectors are reused when generating moves and calculating attacks. Keeping them in one module helps both operations use the same board geometry.

## Relationship With Services And UI

The interface should not modify `Board` directly or contain chess rules. Its role is to receive clicks, drags, and selections; `GameplayService` converts those actions into a square and consults `LegalMoveFinder`.

Concrete services decide what to do with a legal move:

- `LocalGameService` applies it and controls `LocalClock`
- `AiGameService` applies it and requests a Stockfish response when appropriate
- `OnlineGameService` sends it to the backend and waits for an accepted snapshot before rebuilding state

This separation allows `core/` to be tested with Vitest without creating Angular components, reuses the same rules across modes, and keeps game business validation separate from visual representation.

## Tests

The `*.spec.ts` files in each subfolder cover board representation, FEN, attacks, legal moves, simulation, game endings, draws, and the local clock. They are unit tests: they do not start Angular or the backend.
