# Startup And Navigation

## Goal

This document describes how the Angular application starts, which routes exist, and how navigation works from the home screen to a game depending on the selected mode.

## Application Startup

The application starts in `src/main.ts`, where Angular boots the root component through `bootstrapApplication`.

That startup uses `appConfig`, which registers three main pieces:

- the router
- the HTTP client
- the browser's global error listeners

The root `App` component does not contain business logic. Its template only renders a `router-outlet`, so all navigation is delegated to the routing system.

## Defined Routes

The application has a very simple route structure:

- `/` shows the home screen
- `/game/:mode` shows the game screen
- any other route redirects to `/`

This means the user's whole functional entry point goes through `HomeComponent`, and `GameComponent` reuses the same screen for the three game modes.

## Home Screen

The home screen shows three actions:

- `Local`
- `Online`
- `AI`

Clicking any of them does not always trigger immediate navigation. In some cases, a dialog opens first to collect configuration.

## Navigation By Mode

### Local Mode

When the user clicks `Local`, the application does not enter the game route immediately. It first opens the time control settings dialog.

When the user confirms, it navigates to:

`/game/local`

with these query params:

- `baseTimeWhite`
- `incrementWhite`
- `baseTimeBlack`
- `incrementBlack`

These values represent the base time and increment for White and Black.

### AI Mode

When the user clicks `AI`, the AI game settings dialog opens first.

When the user confirms, it navigates to:

`/game/ai`

with these query params:

- `difficulty`
- `color`

`difficulty` indicates the AI level and `color` the side chosen by the player.

### Online Mode

When the user clicks `Online`, the application does not navigate directly to the game screen either. It first opens `online-lobby-dialog`, which acts as an intermediate step.

From that lobby the user can:

- create a room
- join an existing room

Navigation to the online game only happens when a valid session already exists and the room is ready to play or already in progress.

At that point the application navigates to:

`/game/online`

with these query params:

- `code`
- `playerId`
- `side`

These parameters identify the room and the player inside it.

## What `GameComponent` Does On Entry

`GameComponent` does not assume a single entry flow. On startup, it observes both:

- the route param `mode`
- the query params

With that information it rebuilds the game context and decides which game service must be created.

## Mode Resolution

The `game/:mode` route can activate three behaviors:

- `local` creates `LocalGameService`
- `ai` creates `AiGameService`
- `online` creates `OnlineGameService`

If the mode is not valid, the component does not create a game service and logs an error to the console.

## Parameter Interpretation

### Local Mode Parameters

The values `baseTimeWhite`, `incrementWhite`, `baseTimeBlack`, and `incrementBlack` are transformed into a `TimeControl` object.

If they are missing or invalid, the component falls back to safe values:

- base time `0`
- increment `0`

In practice, that means a game without a clock for that side.

### AI Mode Parameters

The values `difficulty` and `color` are validated before the service is created.

If they do not match the expected values, these defaults are used:

- `difficulty = beginner`
- `color = random`

### Online Mode Parameters

To enter an online game, `GameComponent` tries to rebuild an `OnlineRoomSession`.

It can do that in two ways:

- using `code`, `playerId`, and `side` from the URL
- restoring a stored session from `localStorage` for that room

If it cannot rebuild a valid session, it cannot initialize online mode.

## Lightweight Online Navigation Persistence

Online mode has one special detail: part of the navigation depends on a client-side stored session.

After creating or joining a room, the frontend stores the session in `localStorage`. This allows the component to try to restore the player's context if the user comes back to the online game route with the correct room code.

This is not full authentication, but it is a simple way to preserve continuity between screens or page reloads.

## Relation Between Navigation And State

In this application, the route alone does not fully describe the game. The route indicates the general mode, but the specific details travel through query params or are rebuilt from local state.

Because of that:

- `/game/local` needs time parameters
- `/game/ai` needs difficulty and color parameters
- `/game/online` needs room and player identity

Navigation and state initialization are tightly coupled.

## Leaving The Game Screen

Returning to the home screen is handled by a simple navigation to:

`/`

This can happen, for example, when the user exits from the game over dialog or from the pause overlay.

## Summary

Angular startup is minimal, and the project's navigation relies on very few routes. Most of the logic lives in how `HomeComponent`, `online-lobby-dialog`, and `GameComponent` work together to turn a user choice into a correctly initialized game.
