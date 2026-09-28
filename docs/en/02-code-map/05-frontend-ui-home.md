# Frontend: `ui/home/`

## Purpose

`src/app/ui/home/` contains the home screen and the components that prepare a game before entering `GameComponent`. Its responsibility is to present modes, collect configuration, and coordinate navigation; it does not create boards or apply chess rules.

```text
ui/home/
├── ai-mode-settings-dialog/
├── local-game-settings-dialog/
├── online-game-settings-dialog/
├── online-lobby-dialog/
├── time-control-settings-form/
├── home.component.ts
├── home.component.html
└── home.component.css
```

## `HomeComponent`

`home.component.ts` is the component for the root `/` route. It shows three buttons: `Local`, `Online`, and `AI`.

Selecting one does not navigate immediately; instead, it activates the corresponding dialog:

| Mode | Activated state | Displayed component |
| --- | --- | --- |
| Local | `showTimeControlDialog` | `LocalGameSettingsDialogComponent` |
| Game vs AI | `showAiModeDialog` | `AiModeSettingsDialogComponent` |
| Online | `showOnlineLobbyDialog` | `OnlineLobbyDialogComponent` |

The template uses `@if` blocks to create each dialog only while its boolean is active. Dialogs are rendered as overlays on the home screen, not as new routes.

### Remembered Configuration

While `HomeComponent` remains alive, it keeps the last selection in three properties:

- `lastTimeControl`
- `lastAiMode`
- `lastOnlineGameSettings`

Each dialog receives that value through `@Input`, so closing and reopening it displays the previous selection. This memory only lives in the component; it is not stored in `localStorage` and does not change a game that has already started.

The initial values are five minutes with no increment for both colors, `beginner` difficulty with a random AI color, and the `random` preference for the online host.

## Leaving For A Game

Dialogs emit typed values to their parent component through `EventEmitter`. `HomeComponent` turns those values into navigation:

```text
Settings dialog
        │ emits configuration
        ↓
HomeComponent saves the last selection
        │ creates query params when needed
        ↓
/game/local  or  /game/ai
        ↓
GameComponent creates the game service
```

For local mode, `onTimeControlConfirm()` navigates to `/game/local` with:

- `baseTimeWhite`
- `incrementWhite`
- `baseTimeBlack`
- `incrementBlack`

For AI mode, `onAiModeConfirm()` navigates to `/game/ai` with `difficulty` and `color`.

Online mode is different: the lobby creates or joins a room before navigation. When it receives a snapshot with `ready` or `playing` status, it navigates to `/game/online` with `code`, `playerId`, and `side`.

## Reusable Time Form

`time-control-settings-form/` is the component shared by the local and online dialogs. It works with the `TimeControl` contract:

```ts
{
  white: { baseMinutes, incrementSeconds },
  black: { baseMinutes, incrementSeconds }
}
```

It receives `initial` and emits `settingsChange` whenever an option changes. When it receives the input, it clones the white and black values. Therefore, selecting an option inside the form does not directly modify the object owned by its parent component.

The visible options are:

| Type | Values |
| --- | --- |
| Base time | `1`, `2`, `3`, `5`, `10`, `15`, `20`, `30` minutes, or `0` for unlimited. |
| Increment | `0`, `1`, `2`, `3`, `5`, `10`, `15`, or `20` seconds. |

The form allows a different configuration for each color and displays an updated summary. It does not decide which mode receives the time control or start any clock.

## Local Game Dialog

`local-game-settings-dialog/` wraps the time form with a title, overlay, and `START` and `CANCEL` buttons.

Its `currentSettings` state starts as a copy of `initial` and is replaced whenever it receives `settingsChange` from the form. On confirmation, it emits the full `TimeControl`; on cancellation, it only emits `cancel`.

The overlay closes the dialog when clicked outside its container. The container stops click propagation so modifying options does not close the dialog accidentally.

## Game-Vs-AI Dialog

`ai-mode-settings-dialog/` configures the two `AiModeSettings` values:

| Option | Values |
| --- | --- |
| Difficulty | `beginner`, `intermediate`, `advanced`, `expert`. |
| Player color | `white`, `black`, `random`. |

The component uses `OnPush` change detection. It keeps `selectedDifficulty` and `selectedPlayerColor`, displays a summary of the selection, and emits both values on confirmation.

The template declares `role="dialog"`, `aria-modal="true"`, an associated title, and `aria-pressed` on selectable options. In addition to cancelling with the button or by clicking outside, it listens for `Escape` through `@HostListener` to close the dialog.

The approximate values shown next to each difficulty, such as `~800` or `~2000`, are interface labels. `AiModeSettingsDialogComponent` does not calculate Elo or communicate with Stockfish.

## Configuration Before Creating A Room

`online-game-settings-dialog/` combines the shared time form with the host color preference.

The preference can be `white`, `black`, or `random`. On confirmation, the component creates an `OnlineGameSettings` object with:

```ts
{
  timeControlSettings,
  hostSidePreference
}
```

It also receives the `disabled` input. When the lobby is creating a room, this input disables options and buttons to prevent changes or duplicate submissions. Like the local dialog, it works with copies of received values and only emits its configuration; it does not call the backend directly.

## `OnlineLobbyDialogComponent`

`online-lobby-dialog/` is the only `ui/home` component that directly communicates with online-mode services. It presents two panels inside the same overlay:

- creating a room with settings and a shareable code
- joining a room with a six-character code

It also conditionally contains `OnlineGameSettingsDialogComponent`, opened from the creation panel.

### Lobby State

The component keeps:

| Property | Purpose |
| --- | --- |
| `joinCode` and `joinError` | Normalized input content and visible join error. |
| `activeRoom` and `activeSession` | Snapshot and session of the created or joined room. |
| `activeFlow` | Distinguishes whether the user created or joined the room. |
| `isSubmitting` | Locks buttons while a request is active. |
| `connectionState` and `connectionMessage` | STOMP status used to display connection notices. |

In its constructor, it subscribes to `OnlineRoomService.watchConnectionState()` and `watchConnectionMessage()`. In `ngOnDestroy()`, it releases those subscriptions and the room-specific subscription.

### Creating A Room

When the online settings dialog is confirmed, the lobby:

1. Emits `settingsChange` so `HomeComponent` remembers the selection.
2. Sets `isSubmitting` and closes the internal dialog.
3. Calls `OnlineRoomService.createRoom(settings)`.
4. Saves the received `room` and `session`, then starts watching the room.
5. Displays the code, time control, preference, assigned color, and current status.

If the HTTP request fails, it shows `Could not create the room. Check that the backend is running.`. The definitive code comes from the backend response; the component does not generate it locally.

### Joining A Room

While the user types, `onJoinCodeInput()` delegates to `OnlineRoomCodeService.normalizeCode()`: it converts the value to uppercase, removes invalid characters, and limits it to six positions. It also clears any previous error.

When `CONTINUE` is clicked, the component checks:

- that the code has six valid characters
- that it is not the same room the user just created

It then calls `OnlineRoomService.joinRoom()`. If the backend response has `ok: false`, it converts `notFound`, `full`, or `finished` into visible text. HTTP failures display a generic connection message.

After joining successfully, it saves the session, starts watching the room, and displays a summary equivalent to the creation summary.

### Waiting And Navigation

`watchRoom(code)` replaces the previous subscription and watches the reactive `OnlineRoom` for that code. Every snapshot updates the lobby summary.

While a created room is `waiting`, the host remains in the lobby. When the room reaches `ready` or `playing`, and there is an active session, the component navigates to the online screen. The same criterion allows the joining player to enter immediately after receiving the prepared room.

The snapshot and later changes are received through the REST and STOMP work inside `OnlineRoomService`; the lobby only reacts to the observable exposed by that service.

## Component Relationships

The main communication uses inputs and outputs:

```text
HomeComponent
    │ initial / initialSettings
    ├── LocalGameSettingsDialogComponent
    │       └── TimeControlSettingsFormComponent
    ├── AiModeSettingsDialogComponent
    └── OnlineLobbyDialogComponent
            └── OnlineGameSettingsDialogComponent
                    └── TimeControlSettingsFormComponent
```

Children receive configuration data through `@Input` and return actions through `@Output`. This makes it possible to reuse the time form and keep navigation centralized in `HomeComponent`, except for the online transition, which depends on the actual room state.

## Styles And Current Limits

Each component has its own CSS file alongside its template. This keeps the styles for overlays, panels, controls, and forms close to the structure they modify.

The visible text on the home screen and its dialogs is written directly in templates and components, currently in English. There is no translation layer yet, so adding languages would require extracting these strings into internationalization keys.

## Tests

`online-lobby-dialog.component.spec.ts` covers three behaviors of the most connected component:

- clearing a previous error while entering a code
- showing `Room not found.` and restoring the loading state after a join error
- showing the notice when live updates are unavailable

The other `ui/home` components do not yet have dedicated unit tests. Their logic mainly relies on simple configuration contracts and Angular events.
