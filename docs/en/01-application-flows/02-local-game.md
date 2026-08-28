# Local Game

## Goal

This document describes the full flow of a local game: how the mode is selected, how the initial state is created, how board interaction works, how a move is validated, and how the end of the game is detected.

## Entering Local Mode

The local game starts in `HomeComponent`.

When the user clicks `Local`, the application does not navigate directly to the game screen. It first opens the time control settings dialog.

That dialog allows the user to choose:

- base time for White
- increment for White
- base time for Black
- increment for Black

When the user confirms, the application navigates to:

`/game/local`

with these query params:

- `baseW`
- `incW`
- `baseB`
- `incB`

## Creating The Game Service

When `GameComponent` starts, it reads:

- the `mode` route parameter
- the time-related query params

If `mode` is `local`, `GameComponent` creates an instance of `LocalGameService` and passes it the parsed `TimeControl` object.

That service is responsible for maintaining the local game state.

## State Initialization

`LocalGameService` calls `resetGame()` in its constructor.

That method does several things:

- creates a new `Board`
- loads the initial chess position from `INITIAL_POSITION_FEN`
- creates a `GameState` with that board
- resets selection, the promotion dialog, and game-over state
- resets move history
- resets the local clock

The result is a new game with White to move and the board in the standard initial position.

## What The Local State Stores

During a local game, the relevant state lives mainly in two places:

- `GameState`, which represents the board, the current turn, and the game result
- `LocalGameService`, which also stores selection, visible legal moves, history, pause state, clock state, and review mode

This means the local game does not depend on the backend. Everything needed to play is handled on the client.

It also means this mode is especially flexible: it behaves more like a friendly game between two people in front of the same board than like a server-controlled match. While the game is still active, both players share the same client and can continue playing on the same device.

## Board Interaction

Visual interaction happens in `GameComponent`, but move logic is delegated to the game service.

The user can move pieces in two ways:

- by clicking squares
- by dragging and dropping pieces

In both cases, the flow ends up reaching `handleSquareClick()` in the base service.

## Piece Selection

If no square is currently selected and the user clicks a piece of the side to move:

- that square becomes the selected square
- its legal moves are calculated
- those legal moves are shown on the board

If the user clicks a different piece of the same color during that turn, the selection switches to the new piece.

If the user clicks a square that is not a legal move, the selection is cleared and the error sound is played.

## Legal Move Calculation

Legal moves are calculated with `LegalMoveFinder`.

The process is:

1. Pseudo-legal moves are generated according to the piece type.
2. Each candidate move is simulated on a temporary board.
3. Moves that leave the player's own king in check are discarded.

This produces the final list of allowed moves for the selected piece.

This logic supports:

- normal moves
- captures
- castling
- en passant
- promotions

## Executing A Move

When the user clicks a valid destination square, the service tries to resolve the move.

There are two cases:

- if there is only one possible move to that square, it is executed directly
- if there are several, it means the move is a promotion and the piece-selection dialog is opened

Once the move is fully resolved, `LocalGameService` applies it to the current state.

## What Happens When A Move Is Applied

When a move is applied, `LocalGameService`:

- stores the move in history
- invalidates any possible redo branch
- applies the move to `GameState`
- changes the turn
- updates the clock
- plays the appropriate sound
- checks whether the game has ended

The sound depends on the result of the move:

- check sound if the opponent is left in check
- capture sound if a piece was captured
- normal move sound in all other cases

## How `GameState` Is Updated

Inside `GameState`, `applyMove()`:

- gets the piece from the origin square
- simulates the resulting board with `MoveSimulator`
- updates castling rights
- replaces the current board with the new one
- changes the turn
- records the new position
- recalculates the game result

The state also tracks repeated positions so it can detect draws by threefold repetition.

## Promotion

Promotion has a special flow.

If a pawn move reaches the last rank and several promotion choices are possible, the service does not execute the move yet. Instead, it:

- stores the candidate moves in `pendingPromotionMoves`
- shows the promotion dialog

When the user chooses queen, rook, bishop, or knight:

- the corresponding move is recovered
- the move is executed
- the dialog is closed

The dialog can also be closed without choosing a piece.

In that case:

- no move is executed
- the pending promotion is cleared
- the current selection is cleared
- the user can start the move again from the board

## Clock In Local Games

The local game uses `LocalClock`.

Its general behavior is:

- it is configured when the game is created or reset
- it does not start running until the first move is made
- after each valid move, the active turn changes
- if an increment exists, it is added to the player who just moved

If both base times are `0`, the game is treated as a game without clocks.

In addition, when a player's remaining time goes below the low-time threshold, a warning sound is played.

## Pause And History Navigation

Local mode supports two additional behaviors:

- pausing and resuming the game
- undoing and redoing moves

If the game is paused:

- board interaction is blocked
- the current selection is cleared
- the clock stops

If the user navigates through move history:

- the state is rebuilt from the move list
- the clock stops advancing
- the game enters a history review flow

This avoids mixing a live game with a manually reconstructed position.

From the user's point of view, this makes local mode fairly permissive. Moves can be reviewed, a sequence can be undone and replayed, which fits well with a casual game where two people may want to correct a move or inspect what would have happened from an earlier position.

## End-Of-Game Detection

After each move, `GameState` recalculates the result.

The game can end by:

- checkmate
- stalemate
- draw by insufficient material
- draw by threefold repetition
- timeout

If the result is no longer `ongoing`, `LocalGameService`:

- plays the end sound
- stops the clock
- activates the game-over state
- shows the corresponding dialog

## Review Mode

Once the game ends, the service enters `reviewOnly`.

This means:

- new moves can no longer be created
- history navigation is still allowed
- the game-over dialog can be closed without reactivating the game

This behavior clearly separates an active game from one that has already finished.

## Exit Or Restart

From the local game screen, the user can:

- restart the game
- close the game-over dialog
- return to the home screen

Restarting creates the board, state, history, and clock again from scratch.

Exiting navigates back to:

`/`

## Summary

The local game runs entirely in the browser. `GameComponent` handles visual interaction, while `LocalGameService`, `GameplayService`, `MoveNavigableGame`, and `GameState` coordinate the actual game logic, move validation, clock behavior, and game-end handling.
