# Frontend: `ui/game/`

## Purpose

`src/app/ui/game/` contains the screen where a game is played. `GameComponent` renders the board and coordinates visual controls, but it does not implement chess rules or each mode's state. Instead, it works with the common `IGameService` interface and the active service: `LocalGameService`, `AiGameService`, or `OnlineGameService`.

```text
ui/game/
├── clock/
├── game-over-dialog/
├── move-navigation-buttons/
├── pause-button/
├── pause-overlay/
├── promotion-dialog/
├── restart-button/
├── rotation-button/
├── game.component.ts
├── game.component.html
└── game.component.css
```

## `GameComponent`

`game.component.ts` is the component associated with `/game/:mode` routes. On initialization, it combines the `mode` parameter and the URL query params to create the appropriate service:

| Mode | Used parameters | Created service |
| --- | --- | --- |
| Local | `baseTimeWhite`, `incrementWhite`, `baseTimeBlack`, `incrementBlack` | `LocalGameService` |
| Game vs AI | `difficulty`, `color` | `AiGameService` |
| Online | `code`, `playerId`, `side`, or the stored session | `OnlineGameService` |

Before replacing a service, it calls its `destroy()` method when available and clears any pending drag interaction. If the mode is invalid, or the required online session is missing, it does not create a game and the template displays `Loading...`.

The component exposes through getters the `IGameService` data required by the template: position, turn, selection, legal moves, clock state, promotion, pause, history, and game over. The interface remains the same regardless of the mode, so visual components do not need to know each service's internal logic.

On destruction, it cancels route and connection subscriptions, clears the interval used to refresh the visual clock, and destroys the active game service.

## Board And Interaction

The board does not have a separate component: it is generated in `game.component.html` with two `@for` loops, one for rows and another for squares. Rows and columns come from `ranks` and `files`, which are reversed according to `boardOrientation`.

Each square can display these visual markers:

- light or dark square
- piece and its image from `assets/pieces/`
- selected piece
- origin and destination of the last move
- legal non-capture and capture destinations
- king of the current turn when it is in check

`isKingInCheckSquare()` calculates whether the current side's king is attacked through `AttackedSquares`. It keeps the latest result in a cache associated with the current board and turn to avoid repeating the calculation for all 64 squares during the same rendering pass.

### Click And Drag

Clicking a square calls `gameService.handleSquareClick(rank, file)`. The service decides whether to select a piece, recalculate legal destinations, or attempt the move. Clicking outside the board, clocks, or dialogs clears the current selection.

Pieces can also be dragged:

1. `pointerdown` checks whether the piece can move and selects it, just like a click.
2. After moving more than five pixels, a preview of the piece is displayed under the pointer.
3. On release, `GameComponent` converts the pointer position into a square according to the current orientation.
4. If the destination is in `legalMoves`, it delegates to the service again; otherwise, it plays the error sound.

Dragging is blocked when the game is paused, finished, or being reviewed; when there is a pending promotion; or when the piece does not belong to the current turn. In game-vs-AI mode, only the human color can be dragged, and in online mode only the player's assigned color can be dragged.

## Board Orientation

`RotationButtonComponent` emits the events to rotate the board manually. The initial orientation depends on the mode:

- Local begins with white at the bottom and can enable `AUTO`, which orients the board toward the side to move.
- Game vs AI begins with the selected human color at the bottom.
- Online initially follows the player's assigned color; for example, after a rematch it can adapt to the new color.

A manual rotation preserves that decision. In local mode, rotating manually disables automatic rotation so the user's choice is not overwritten.

## Clock

`ClockComponent` receives milliseconds, increments, active color, orientation, and whether each color has unlimited time. It orders the two clocks so the color at the bottom of the board is also displayed at the bottom.

For an unlimited color, it displays `∞`; otherwise, it uses `formatTime()` and `formatTimeFraction()` to show the main time and fraction. The `active` class is applied to the clock for the side currently consuming time, and the increment is displayed as `+Ns`.

`GameComponent` creates an interval every 100 ms that requests an Angular update while the clock is active and the game is not paused. That interval only refreshes the interface: time calculation belongs to the game service. The template renders `app-clock` when the service exposes `clockEnabled`.

## Promotion

When game logic finds several valid moves to the same destination square, usually from a pawn promotion, the service stores the candidates and activates `showPromotionDialog`.

The template displays `PromotionDialogComponent` in a panel next to the board. It receives the color of the side to move and allows selecting `queen`, `rook`, `bishop`, or `knight`; its images also come from `assets/pieces/`. On selection, `GameComponent` delegates to `onPromotionSelected()`, allowing the service to resolve and send the chosen move.

The `✕` button cancels the dialog. `closePromotionDialog()` discards the candidates and clears the selection, so no move is executed. While the dialog is open, users cannot pause, use undo/redo, or drag pieces.

## Pause

`PauseButtonComponent` is only displayed when the service implements `pause()` and `resume()`: currently in local and game-vs-AI modes, not online. When clicked, `GameComponent` delegates pausing to the service.

When the game is paused, the button is replaced by `PauseOverlayComponent`. The overlay displays:

- current turn and move count
- clocks and `∞` when the clock is enabled
- history in coordinate notation, with castling and promotion adapted
- `RESUME`, `RESTART`, and `QUIT` actions

`RESUME` calls `resume()`, `RESTART` resets the game service, and `QUIT` returns to `/`. The local service stops and restores its clock; the game-vs-AI service invalidates any pending Stockfish calculation. Pause cannot be opened during a promotion or while the normal game-over dialog is displayed.

## Game Over And Rematch

`GameOverDialogComponent` is an overlay that receives the result message from `getResultMessage()`. It displays the `GAME OVER` title, the restart or rematch action, and `QUIT`. Clicking outside the container only closes the dialog; `QUIT` closes it in the service and navigates to the home screen.

The main action uses `RestartButtonComponent`, which only encapsulates a button with a label, disabled state, and `restart` event. Its meaning depends on the mode:

| Mode | `restart` action |
| --- | --- |
| Local | Creates a new game with the same time control. |
| Game vs AI | Restarts with the same AI configuration. |
| Online | Requests a rematch from the backend; it does not reset the board locally. |

In online mode, the dialog also receives request state, dynamic labels such as `REQUEST REMATCH` or `SENDING...`, and messages such as waiting for the opponent's response. Request failures are displayed in the screen's online error banner.

In local and game-vs-AI modes, reaching the end activates review mode. Users can close the dialog and navigate the history, but cannot create new moves from an already finished position.

## Move Navigation

`MoveNavigationButtonsComponent` provides backward and forward buttons. It only appears when the service implements `undoMove()` and `redoMove()`, currently in local and game-vs-AI modes; online games do not allow one client to modify the shared history.

The component receives `canUndo`, `canRedo`, and `disabled`, and only emits events. The logic lives in `MoveNavigableGame`:

- undo moves the last item from `moveHistory` to `redoHistory`
- redo retrieves the next move from `redoHistory`
- it then rebuilds `GameState` from the complete history through `buildGameStateFromMoves()`

Navigation is blocked while paused or when a promotion is pending. Moving through history clears selection and promotion, hides the game-over dialog, and lets the concrete service apply its own adjustments: local mode stops the clock and game-vs-AI mode invalidates pending calculations. After a game ends, this navigation reviews the game without leaving review-only mode.

## Online Notices

In online mode, the top of the board area can display two types of notices:

- STOMP connection state or message warnings, received from `OnlineRoomService`
- errors submitting the latest move or requesting a rematch, exposed by `OnlineGameService`

These notices do not change the board directly. They inform the user that synchronization or a request failed, so they know to wait for an update or retry the available action.

## Tests

`game.component.spec.ts` covers interface-coordination behavior:

- initial online orientation, side changes, and persistent manual rotation
- enabling and cancelling local automatic rotation
- drag restrictions by turn and pause state
- styling legal destinations, captures, and en passant captures
- blocking and delegating undo/redo
- delegating pause and resume
- clearing selection when clicking outside the game area
- leaving from the game-over dialog to the home screen

The auxiliary components do not have individual unit tests. They are presentation components with `@Input` and `@Output`; game logic is tested in services and rule logic in `core/`.
