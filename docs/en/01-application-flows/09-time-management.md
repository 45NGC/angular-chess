# Time Management

## Purpose

This document explains how clocks are configured and calculated, how increments are applied, and the differences between local, AI, and online modes.

## Time Control Configuration

The shared model is `TimeControl`, with an independent configuration for each color:

```ts
{
  white: { baseMinutes, incrementSeconds },
  black: { baseMinutes, incrementSeconds }
}
```

The form allows each side to choose:

- a base time of `1`, `2`, `3`, `5`, `10`, `15`, `20`, or `30` minutes
- unlimited time, represented by `baseMinutes: 0`
- an increment of `0`, `1`, `2`, `3`, `5`, `10`, `15`, or `20` seconds

White and black can use different time controls. For example, a game can give white five minutes and black three minutes, or unlimited time to one of the sides.

The form limits the visible options, although the backend accepts any non-negative value received through the contract.

## Comparison Between Modes

| Mode | Who calculates the time | Is there a game clock? | Can it end on time? |
| --- | --- | --- | --- |
| Local | `LocalClock` in the browser | Optional | Yes |
| Vs AI | Nobody | No | No |
| Online | Spring Boot backend | Optional | Yes |

In online mode, the frontend calculates a visual clock projection between updates, but the backend retains the values considered valid for the game.

In local and online modes, the clock is only displayed when at least one side has a finite base time. If both sides have `baseMinutes: 0`, both have unlimited time and the UI does not render the clock component. If only one side has unlimited time, the clock is displayed and that side is shown with `∞`.

## Local Game

`LocalGameService` creates a `LocalClock` and configures it when the game starts or restarts.

The local clock uses `performance.now()` when available and updates its state every 100 ms. The browser itself keeps track of white's and black's time, as well as the active color.

The clock does not start when the board loads. After the first valid move:

1. The move is applied.
2. The increment is added to the player who just moved, if they have a finite base time.
3. The opponent's clock starts running.

The same cycle repeats on subsequent moves: time is deducted from the active player, their increment is added after completing the move, and the opposing clock becomes active.

If both base times are `0`, the clock is disabled. If only one is `0`, that side is considered unlimited and the other side's clock continues to run.

## Pause, History, And Local Game Over

Only local mode allows the clock to be paused. When paused, `LocalGameService` stores the active color and stops `LocalClock`; when resumed, it starts it again if the game is still ongoing.

Navigating backward or forward through the move history also stops the clock. If the user makes a new move from a reviewed position, the clock is activated again for the opponent after that move.

When the clock reaches zero, `LocalClock` stops its interval and notifies `LocalGameService` of the winning color. The service marks the result as `timeout`, plays the game-over sound, and displays the result dialog.

Additionally, when the time first drops below 15 seconds in a local game, a low-time sound is played.

## Game Vs AI

The game-vs-AI mode does not create a `LocalClock` or receive a `TimeControl` configuration. Therefore, it does not display clocks and a game against Stockfish cannot end on time.

The AI difficulty does define a calculation limit for Stockfish, between 700 ms and 2000 ms depending on the level. This value only limits how long the engine analyzes before choosing a move; it does not represent available time for white or black in the game.

Pausing a game against AI cancels or stops Stockfish's pending calculation, but there is no game clock to stop.

## Online Game: Authoritative State

When an online room is created, the backend converts the configured minutes to milliseconds and stores the following values in `OnlineRoom`:

- `whiteTimeMs` and `blackTimeMs`
- `activeClockColor`
- `clockUpdatedAt`
- `timeoutWinner`, when present

Before the first move, `activeClockColor` is `null` and the clock is not running. When the backend accepts a move, it adds the increment to the player who moved, if their base time is finite, and activates the opponent's clock.

The backend uses its own `Clock` to calculate elapsed time. When processing a room query or a move, it subtracts that time from the active color and stores a new snapshot if the value changed.

Therefore, even if each browser has a different local time, the amounts that determine whether a move is accepted or a game ends come from the server.

## Online Visual Clock

`OnlineGameService` receives the backend values and, while the room is in `playing`, calculates the visible time by locally subtracting the elapsed time since `clockUpdatedAt`.

`GameComponent` forces a visual update every 100 ms when a time control is enabled and the game is not paused. This makes the clock appear continuous without requiring the backend to publish a message every second.

When a new REST or STOMP snapshot arrives, the client replaces its base values with those sent by the backend. This allows the server to correct any accumulated differences in the local display.

Online mode does not offer pausing, because stopping time unilaterally in one browser would not be valid for a shared game.

## Online Timeout

When materializing the clock, if the active color's time reaches zero, the backend:

- sets that time to `0`
- assigns the opposing winner in `timeoutWinner`
- changes the room to `finished`
- stops the clock and stores `finishedAt`
- publishes the updated snapshot

The frontend blocks the player whose visual clock has already reached zero, but the backend does not yet have a periodic task that materializes a timeout on its own. If no REST query or move attempt arrives, a room can temporarily remain in `playing` even though a visible clock has reached zero.

This is a current MVP limitation. One possible improvement would be a server task that checks active rooms or periodic REST reconciliation from the clients.

## Increments In The Three Modes

The increment is added after every valid move by the player who moved:

- in local mode, `LocalClock.switchTurn()` performs it
- in online mode, `InMemoryOnlineRoomService.advanceClockAfterAcceptedMove()` performs it
- in game-vs-AI mode there is no game increment because there is no clock

In local and online modes, the increment is also applied after the first move. Sides with unlimited time do not receive an increment because they do not need to accumulate time.

## Summary

Local mode prioritizes a flexible experience in a single browser and calculates all time on the client. Game-vs-AI mode has no game clock. Online mode delegates valid timekeeping to the backend and uses the browser only to display a smooth countdown between snapshots.
