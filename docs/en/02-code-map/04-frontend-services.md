# Frontend: `services/`

## Purpose

`src/app/services/` coordinates the pure logic in `core/` with the interface, Stockfish, and the backend. Game services decide when to apply a move, play a sound, start a clock, or send a request; the concrete chess rules remain in `core/`.

```text
services/
├── shared/
│   ├── gameplay-base.ts
│   └── move-navigation.ts
├── ai-game.service.ts
├── local-game.service.ts
├── online-game.service.ts
├── online-room-code.service.ts
├── online-room.service.ts
├── sound.service.ts
└── stockfish.service.ts
```

## Lifecycle And Scope

Not all services have the same lifetime:

| Service | Lifetime | Creation |
| --- | --- | --- |
| `LocalGameService` | One active local game. | `GameComponent` creates an instance when entering `/game/local`. |
| `AiGameService` | One active game against AI. | `GameComponent` creates an instance when entering `/game/ai`. |
| `OnlineGameService` | One online game open on the screen. | `GameComponent` creates an instance when entering `/game/online`. |
| `OnlineRoomService` | The entire Angular application. | Dependency injection with `providedIn: 'root'`. |
| `OnlineRoomCodeService` | The entire Angular application. | Dependency injection with `providedIn: 'root'`. |
| `SoundService` | The entire Angular application. | Dependency injection with `providedIn: 'root'`. |
| `StockfishService` | One active game against AI. | `AiGameService` creates its own instance. |

When the route mode changes or `GameComponent` is destroyed, the component calls `destroy()` when the game service implements it. Thus, local mode stops its clock, game-vs-AI mode terminates its worker, and online mode cancels its room subscription.

## Relationship Between Game Services

The three modes fulfill `IGameService`, but they share different degrees of behavior:

```text
IGameService
    │
GameplayService
    ├── MoveNavigableGame
    │   ├── LocalGameService
    │   └── AiGameService
    └── OnlineGameService
```

`GameplayService` centralizes shared board interaction. `MoveNavigableGame` adds history, undo, redo, and review mode. Online mode inherits directly from `GameplayService` because a room's history cannot be edited by a single client.

## `services/shared`

### `GameplayService`

`shared/gameplay-base.ts` is an abstract class that implements the shared part of `IGameService`:

- selection state: `selectedSquare` and `legalMoves`
- promotion dialog and pending moves
- game-over dialog and result messages
- conversion of an interface click into a selection or move attempt

`handleSquareClick(rank, file)` converts visual coordinates into a square, selects a piece of the current turn, and queries `LegalMoveFinder`. If the destination has a single valid move, it delegates execution to `submitResolvedMove()`. If there are several, it stores candidate promotions and opens the dialog.

Subclasses must define three decisions that change by mode:

| Abstract method | Decision |
| --- | --- |
| `canInteractWithBoard()` | Whether that user may start an action now. |
| `handleIllegalMoveTarget()` | How to react to an invalid destination. |
| `submitResolvedMove(move)` | Where and how an already resolved move is processed. |

It also includes optional hooks to adjust promotion, timeout results, and visual updates. This makes it possible to share selection behavior without the base class knowing about clocks, AI, or HTTP.

### `MoveNavigableGame`

`shared/move-navigation.ts` extends the previous class for local and game-vs-AI modes. It maintains:

- `moveHistory`, the sequence representing the current position
- `redoHistory`, the moves that have been undone
- `reviewOnly`, which blocks new moves after the game ends
- game-over dialog state during review

When undoing or redoing, it rebuilds `GameState` with `buildGameStateFromMoves()` instead of reversing the board directly. Before and after rebuilding it calls hooks that each mode can specialize: local mode stops the clock, while game-vs-AI mode cancels Stockfish's pending calculation.

## `LocalGameService`

`local-game.service.ts` maintains a two-player game in the same browser. It extends `MoveNavigableGame` and does not depend on the backend.

Its additional state is:

- `TimeControl` and visible clock state
- one `LocalClock` instance
- pause state and the clock color that should resume
- an indicator that history navigation has frozen the clock

On reset, it loads `INITIAL_POSITION_FEN`, creates `GameState`, clears interaction and history, and configures `LocalClock`. The clock does not start until the first valid move.

When receiving a resolved move from the base class, the service adds it to history, applies it to `GameState`, switches the clock turn, plays the move, capture, or check sound, and marks game over when appropriate. When a clock first drops below the configured threshold, it plays the low-time sound.

`pause()` stops the clock and blocks the board; `resume()` restarts it for the previously active color. Undoing or redoing also stops the clock so that a reviewed position does not keep consuming time. `destroy()` clears the `LocalClock` interval.

The class is marked as injectable and defines the `LOCAL_TIME_CONTROL` token, but the current flow creates the instance directly from `GameComponent` and passes the `TimeControl` parsed from the URL.

## `AiGameService`

`ai-game.service.ts` extends `MoveNavigableGame` and adds a Stockfish-controlled opponent. It stores:

- selected difficulty
- player color and AI color
- its own `StockfishService`
- an AI request identifier and a 250 ms delay timer
- a callback to request Angular change detection

It only allows interaction when it is the human player's turn, the game is ongoing, and it is neither paused nor being reviewed. After a human move, it waits 250 ms and queries Stockfish if the position is still valid.

Before applying an engine response, it compares its identifier with `aiRequestId`. Resetting, pausing, navigating history, or making another move increments that identifier, so an old response is ignored. This protection prevents Stockfish from playing on a position that no longer exists.

The service converts a UCI response, such as `e2e4`, into a `Move`. During conversion, it detects promotion, castling, or en passant from the current position. It then applies the move through the same history, sounds, and game-over path used by the human player.

It does not create a `LocalClock`: Stockfish's calculation time is not a game clock. When pausing, navigating, or destroying the game, it cancels the scheduled action, invalidates the request, and sends `stop` to the engine. `destroy()` also terminates the worker through `StockfishService.destroy()`.

## `StockfishService`

`stockfish.service.ts` encapsulates communication with Stockfish and prevents `AiGameService` from needing to know the UCI protocol.

On its first request, it creates a `Web Worker` with `assets/stockfish/stockfish.js`. The engine and WASM run outside the main thread, so analysis does not block the interface.

`getBestMove()` performs this sequence:

1. Initializes the engine once with `uci` and `isready`.
2. Sets `Skill Level` between `0` and `20`.
3. Declares a new game and sends the position FEN.
4. Requests `go movetime ...`.
5. Waits for a `bestmove` line and returns the UCI move, or `null` when it is `(none)`.

Requests are chained in `queue` so that a single worker does not receive incompatible commands at the same time. Every wait has a timeout and removes its listener when it completes or fails. `stop()` asks the engine to stop its current calculation; `destroy()` terminates the worker, removes listeners, and allows a new one to be created for a later game.

If `localStorage.debugStockfish = '1'` exists, engine output lines are written to the console for debugging.

## `OnlineGameService`

`online-game.service.ts` represents a game from the perspective of a connected player. It does not optimistically modify the board or store the room as the authority: it receives snapshots through `OnlineRoomService`.

When constructed, it retrieves the available room, keeps the `OnlineRoomSession`, and subscribes to `watchRoom(session.roomCode)`. Every snapshot is processed by `applyRoom()`:

- updates the player's current color, including after a rematch
- updates time control and base clock values
- converts `room.moves` into local history and rebuilds `GameState`
- clears selection or promotion when they are no longer valid
- displays the game-over dialog when the room finishes
- plays the sound for the latest new move

The service only allows moving when the room is ready or playing, the chess state is ongoing, it is the player's turn, and their visual clock has not reached zero. A resolved move is sent through `OnlineRoomService.submitMove()`; the board only changes when a response or event arrives with an accepted snapshot.

It also controls the rematch request, its waiting messages, and move or rematch errors displayed by `GameComponent` in a banner. For the clock, it projects time locally from `clockUpdatedAt`, but the valid value comes from the backend. `destroy()` cancels the room RxJS subscription.

## `OnlineRoomService`

`online-room.service.ts` is the singleton that centralizes communication and shared online mode state in one browser.

### Reactive Local State

It maintains a `Map` of `BehaviorSubject<OnlineRoom | null>` indexed by code. The lobby and `OnlineGameService` can subscribe to the same observable and receive every snapshot applied by the service.

Its public room methods are:

| Method | Responsibility |
| --- | --- |
| `createRoom()` | Creates the room, stores the session, updates the snapshot, and starts STOMP listening. |
| `joinRoom()` | Normalizes the code, joins, and performs the same updates on success. |
| `watchRoom()` | Fetches the initial REST snapshot and registers the room topic. |
| `getRoom()` | Reads the latest snapshot already stored in memory. |
| `submitMove()` | Sends a REST move and applies the snapshot when accepted. |
| `requestRematch()` | Sends the REST request and applies the snapshot when accepted. |

Sessions are stored under the `angular-chess.online-session.{code}` key in `localStorage`. When updating a room, the service finds the `playerId` from a stored session and corrects its color if a rematch swapped it.

### REST And STOMP

The service uses `HttpClient` for REST endpoints and a single `Client` from `@stomp/stompjs` for the WebSocket connection. Every registered room subscribes to:

`/topic/online/rooms/{code}`

When a valid STOMP message arrives, it extracts `{ room }` and publishes it in the corresponding `BehaviorSubject`. Successful REST responses are applied through the same path, so the rest of the application does not need to distinguish their origin.

The STOMP client reconnects every five seconds. The service publishes `OnlineConnectionState` and connection messages so the lobby and game screen can display notices. If a frame does not contain valid JSON, it is ignored to keep the active subscription alive.

After reconnecting, it subscribes to registered topics again, but does not automatically request a new REST snapshot. This limitation is described in more detail in `06-online-synchronization.md`.

## `OnlineRoomCodeService`

`online-room-code.service.ts` centralizes code normalization: it converts to uppercase, removes characters that are not letters or numbers, and limits the result to six characters. It also checks that the normalized code has length six.

`OnlineLobbyDialogComponent` uses this logic while the user types, and `OnlineRoomService` applies it before each operation. Therefore, the form, URL, and REST requests use the same format.

The service also has `generateCode()`, but the current flow does not use it to create rooms: the backend generates the final code.

## `SoundService`

`sound.service.ts` centralizes the six game sound effects: move, capture, check, game over, low time, and error. On creation, it loads the files in `assets/sounds/`.

Every public method resets `currentTime` before playing a sound. This allows the same effect to be heard during rapid consecutive actions. If the browser blocks playback or the resource fails, it catches the rejected promise and writes a warning to the console without interrupting the game.

## Relationship With Components

`HomeComponent` only gathers configuration and navigates. `GameComponent` chooses the game service based on the route, forwards clicks, drags, promotions, pause actions, and history actions, and reads state through `IGameService`.

Services retain coordination logic and return simple data rendered by the template. Thus, a board presentation change does not require modifying Stockfish, clock, or online protocol logic; likewise, a change in how a move is obtained does not require rewriting visual components.

## Tests

There are currently direct tests for `OnlineGameService` and `OnlineRoomService`. They verify, among other behavior, rematch requests, rebuilding after colors are swapped, and saved session updates.

Chess logic, clock behavior, and special rules used by services are mainly tested in `core/`. Local and AI modes also depend on timers, audio, and a worker, so their coordination does not yet have dedicated service test files.
