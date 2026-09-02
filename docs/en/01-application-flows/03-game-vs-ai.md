# Game Against AI

## Purpose

This document describes the flow of a game against the AI, from the initial configuration to the calculation and application of Stockfish moves.

The backend does not take part in this mode. The game, its rules, and the chess engine all run in the user's browser.

## Initial Configuration

From `HomeComponent`, clicking `AI` opens `ai-mode-settings-dialog`.

The user can choose:

- the difficulty: `beginner`, `intermediate`, `advanced`, or `expert`
- the color they want to play: white, black, or random

After confirmation, the application navigates to:

`/game/ai`

with these query params:

- `difficulty`
- `color`

If they are missing or invalid, `GameComponent` uses `beginner` as the difficulty and `random` as the color.

## Game Creation

When entering the route, `GameComponent` creates an `AiGameService` instance.

The service:

- resolves the player's color; if it is random, it selects one at that point
- assigns the opposite color to the AI
- creates the board in the initial position
- initializes `GameState` and the move history
- creates its own `StockfishService`

The board's initial orientation matches the player's color.

If the player chooses black, the AI has the first turn. Its first move is therefore scheduled as soon as the game is initialized.

## Player Turn

The user can only interact with the board when:

- the game is still ongoing
- it is not paused
- the history is not being reviewed after the game has ended
- the current turn belongs to the player's color

Piece selection, legal move calculation, and promotion use the same shared logic as local mode. The difference is that, after a valid player move, the turn passes to the AI.

## Preparing The AI Move

After the player's move, `AiGameService` waits 250 ms before requesting a response. This delay lets the interface render the player's move before the AI response appears.

Before querying the engine, the service checks that:

- the game is not paused or finished
- the history is not being reviewed
- it is the AI's turn
- there is no pending promotion

If those conditions are met, it converts the current position to FEN and passes it to `StockfishService`.

## Running Stockfish In The Browser

`StockfishService` creates a `Web Worker` from `assets/stockfish/stockfish.js`.

The worker runs the engine without blocking the interface while it analyzes a position. Communication uses the UCI protocol:

1. The engine is initialized with `uci`, then waits for `uciok`.
2. It checks that the engine is ready with `isready` and `readyok`.
3. It configures the level through `Skill Level`.
4. It sends the current position in FEN format.
5. It requests a move with a maximum calculation time.
6. Stockfish returns `bestmove` in UCI format, for example `e2e4`.

Requests are queued so the same worker does not process incompatible commands at the same time.

## Difficulty

Difficulty does not alter the rules of the game. It adjusts two parameters used when querying Stockfish:

| Difficulty | Skill Level | Calculation time |
| --- | ---: | ---: |
| `beginner` | 1 | 700 ms |
| `intermediate` | 6 | 1100 ms |
| `advanced` | 12 | 1600 ms |
| `expert` | 20 | 2000 ms |

The `~800`, `~1200`, `~1600`, and `~2000` values displayed in the dialog are a visual reference for the user, not a verified Elo rating.

## Applying The Response

Stockfish returns its response as UCI text. `AiGameService` converts it into a `Move` object understood by the application's game logic.

During that conversion, it identifies the following when applicable:

- promotions
- castling
- en passant captures

Before applying the response, the service verifies that it is still valid for the current request. Each request has an identifier; if the game was restarted, paused, or changed while Stockfish was calculating, the response is ignored.

When the move is valid, it is applied to `GameState`, added to the history, played with the appropriate sound, and checked for a game-ending result.

## Pause And History Navigation

The game-against-AI mode supports pausing and navigating the move history.

When paused:

- the board is locked
- the current selection is cleared
- the scheduled AI response is cancelled
- any in-progress calculation is invalidated and `stop` is sent to Stockfish

When undoing or redoing, the position is rebuilt from the history. Stockfish is also stopped beforehand so it cannot apply a move to a position that no longer exists.

If the user redoes moves up to the latest position and it is the AI's turn again, the service can schedule its move again. If the user creates a new move after undoing, the redoable history is discarded and the AI responds to the new position.

This behavior makes it possible to review or correct moves during a practice game, although it does not represent a strictly competitive game.

## No Clock

Games against the AI currently do not use time controls. `AiGameService` does not create a `LocalClock`, so clocks are not displayed and a game cannot end on time in this mode.

## End, Restart, And Exit

After every move, `GameState` checks the result. The game can end by checkmate, stalemate, insufficient-material draw, or threefold-repetition draw.

When the game ends:

- the end sound plays
- the result dialog is displayed
- the game enters review mode and no new moves can be made
- the history remains available to review the game

Restarting creates a new board and history, invalidates any pending AI response, and schedules a Stockfish move again if the AI plays white.

When leaving the game screen, `GameComponent` destroys the service. This terminates Stockfish's `Web Worker` and removes its listeners.
