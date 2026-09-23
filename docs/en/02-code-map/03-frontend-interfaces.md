# Frontend: `interfaces/`

## Purpose

`src/app/interfaces/` defines the TypeScript contracts exchanged by components, services, and online communication. It contains no executable logic: it describes the expected shape of data and operations so that Angular parts can collaborate without depending on implementation details.

```text
interfaces/
├── ai-mode.interface.ts
├── game-service.interface.ts
├── online-backend-contract.interface.ts
├── online-game-draft.interface.ts
├── online-game-settings.interface.ts
├── online-room.interface.ts
└── time-control.interface.ts
```

A TypeScript interface exists during compilation, not while the application runs in the browser. Therefore, it helps detect incompatibilities during development, but it does not replace form validation, chess rules, or backend validation.

## Game Configuration Types

Three files describe the configuration selected before starting each mode:

| File | Contracts | Main use |
| --- | --- | --- |
| `time-control.interface.ts` | `SideTimeControl`, `TimeControl` | Local and online clock configuration. |
| `ai-mode.interface.ts` | `AiDifficulty`, `PlayerColor`, `AiModeSettings` | Difficulty and color for a game against AI. |
| `online-game-settings.interface.ts` | `OnlineGameSettings` | Time control and online host color preference. |

`TimeControl` keeps an independent configuration for white and black:

```ts
{
  white: { baseMinutes, incrementSeconds },
  black: { baseMinutes, incrementSeconds }
}
```

The same contract passes from `TimeControlSettingsFormComponent` to the local and online dialogs, and then to `LocalGameService` or the backend. This prevents each mode from having a different time structure.

`AiModeSettings` restricts difficulty to `beginner`, `intermediate`, `advanced`, or `expert`, and color to `white`, `black`, or `random`. `OnlineGameSettings` reuses `PlayerColor` for `hostSidePreference`, because the host preference also accepts those three values.

## `IGameService`: Shared Game Screen Contract

`game-service.interface.ts` contains `IGameService`, the central contract between `GameComponent` and the services that represent a game:

```text
GameComponent
     │ uses IGameService
     ├── LocalGameService
     ├── AiGameService
     └── OnlineGameService
```

The component stores its active service as `IGameService | null`. This lets it read common data without needing a different template for each mode:

- `state`, `selectedSquare`, and `legalMoves`
- promotion and game-over dialogs
- `handleSquareClick()`, `onPromotionSelected()`, and `clearSelection()`
- `resetGame()`, `closeGameOverDialog()`, and `getResultMessage()`

Capabilities that do not exist in every mode are declared as optional:

| Optional capability | Available in |
| --- | --- |
| Pause and resume | Local and game-vs-AI modes. |
| History, undo, redo, and review | Local and game-vs-AI modes. |
| Clock data | Local and online modes. |
| `destroy()` | Services that need to release timers, workers, or subscriptions. |

For example, `GameComponent` checks whether `pause` and `resume` are functions before displaying pause controls, and uses optional chaining for history buttons. This allows online mode to omit those functions without requiring the component to know the implementation of the other two modes.

`GameplayService` implements the shared behavior of this contract. `LocalGameService`, `AiGameService`, and `OnlineGameService` complete it with their own responsibilities. For online-only elements, such as connection or rematch messages, `GameComponent` also uses `instanceof OnlineGameService`; the rest of the screen continues to depend on the shared contract.

## Online Room Model

`online-room.interface.ts` describes the shared state of a room and the results of online actions.

| Contract | Responsibility |
| --- | --- |
| `OnlineRoom` | Full room snapshot: players, status, clock, history, rematch, and timestamps. |
| `OnlineRoomPlayer` | A participant's identifier, color, presence, and join time. |
| `OnlineMoveRecord` | An accepted move, the color that played it, and its time played. |
| `OnlineRoomSession` | Local player context: room code, `playerId`, and color. |
| `OnlineRoomStatus` | `waiting`, `ready`, `playing`, and `finished` states. |
| `OnlineRoomSide` | A room slot color: `white` or `black`. |

`OnlineRoom` is the synchronization unit. `OnlineRoomService` keeps one `BehaviorSubject<OnlineRoom | null>` per code, and `OnlineGameService` rebuilds the board from `room.moves` when it receives a new snapshot.

`OnlineRoomSession` is stored in `localStorage` to restore local identity after navigation or a reload. It is an MVP continuity contract, not a secure authentication credential.

### Success And Error Results

The same file defines discriminated unions for joining, moves, and rematches:

```ts
type SubmitOnlineMoveResult =
  | { ok: true; room: OnlineRoom }
  | { ok: false; error: SubmitOnlineMoveError };
```

After checking `result.ok`, TypeScript knows whether there is a valid `room` or an error code. This prevents accidentally accessing both fields at the same time and requires handling the errors defined by the contract.

The available codes are literal types, not free text. For example, a move can return `notFound`, `notParticipant`, `illegalMove`, `notYourTurn`, or `finished`. `OnlineGameService` translates each code into the message shown by the interface.

## HTTP And WebSocket Contract

`online-backend-contract.interface.ts` defines the REST payloads used by `OnlineRoomService`:

| Operation | Request | Response |
| --- | --- | --- |
| Create room | `CreateOnlineRoomRequest` | `CreateOnlineRoomResponse` |
| Join room | `JoinOnlineRoomRequest` | `JoinOnlineRoomResponse` |
| Fetch room | No body | `GetOnlineRoomResponse` |
| Submit move | `SubmitOnlineMoveRequest` | `SubmitOnlineMoveResponse` |
| Request rematch | `RequestOnlineRematchRequest` | `RequestOnlineRematchResponse` |

`OnlineRoomService` uses these types as `HttpClient` generic parameters, for example `http.post<SubmitOnlineMoveResponse>(...)`. Therefore, the service receives a typed result before deciding whether to update the snapshot or communicate an error.

Move requests reuse `Move`, which lives in `core/rules/` because it also represents a local move. This ensures that the shape sent by the browser to the backend matches the shape used by the board, history, and game services.

The backend defines equivalent Java records in `online/dto` and `online/model`. There is no shared type package between TypeScript and Java: compatibility relies on keeping the same JSON names and structures in both repositories, alongside tests and contract documentation.

### Current STOMP Snapshot

The file also declares `OnlineRoomEvent` and `OnlineRoomEventType`, with possible types such as `roomUpdated` or `gameFinished`. These types do not participate in the current STOMP flow.

The backend currently publishes `OnlineRoomUpdateEvent`, whose body contains only:

```ts
{ room: OnlineRoom }
```

`OnlineRoomService` interprets that format through its local `OnlineRoomUpdateEvent` interface. If a `type` field were added to STOMP messages in the future, `OnlineRoomEvent` could become the active contract; until then, it represents a possible event envelope, not the one used by the application.

## Unused Online Draft

`online-game-draft.interface.ts` defines `OnlineGameDraft`, made up of a code, a `TimeControl`, and the creation date. It is not imported by the application's current flow.

It could serve as a basis for storing a form or pending room before creating it, but options are currently kept directly in home components and in `OnlineGameSettings`.

## How They Decouple The Code

Interfaces reduce coupling in several places:

- A configuration component emits `TimeControl` or `AiModeSettings` without knowing who will consume the data.
- `HomeComponent` and dialogs exchange `OnlineGameSettings` without calling the backend directly.
- `GameComponent` uses `IGameService` without containing three game implementations.
- `OnlineRoomService` encapsulates REST and STOMP, exposing `OnlineRoom` and typed results to the rest of the frontend.
- Online services work with room models instead of depending on untyped JSON distributed through components.

The result does not eliminate every dependency: concrete services still know the chess rules, and the online contract must evolve together with the backend. It does concentrate those dependencies into small, explicit contracts instead of spreading arbitrary properties and strings through the application.

## When Changing An Online Contract

A change to an `OnlineRoom` field, REST request, or error code requires reviewing, at minimum:

1. The corresponding TypeScript interface.
2. `OnlineRoomService` and the consumers of the data.
3. The equivalent Java record or DTO in `springboot-chess`.
4. The backend logic that creates, validates, or publishes the value.
5. Tests and `online-backend-contract.md`.

Following this path reduces the risk that the frontend compiles with a structure the backend no longer sends, or that the backend accepts a value the client does not handle.

## Type Limitations

TypeScript disappears when it compiles to JavaScript. A modified browser, malformed network response, or manual request can ignore these interfaces. For that reason:

- forms limit the options the interface can select
- chess logic calculates legal moves
- Spring Boot validates DTOs and validates online moves again

Interfaces improve clarity and detect integration errors early, but security and final validity remain in runtime checks.
