# Overview

## Application Goal

This application is a web chess project split into two parts:

- an Angular frontend responsible for the interface, user interaction, and a large part of the game logic
- a Spring Boot backend responsible for the online mode and the shared state between players

The project has a clearly educational focus. It is not meant to solve every problem a complete chess platform would need to address, but to serve as a base for understanding how frontend and backend relate to each other in a real web application with state, navigation, HTTP communication, and realtime updates.

## Current Scope

In its current state, the application supports three game modes:

- local play between two players in the same browser
- play against the AI using Stockfish in the frontend
- online play between two players through a shared room managed by the backend

The application also includes several common features across these modes:

- legal move validation
- check, checkmate, and supported draw detection
- configurable time control
- setup dialogs before starting a game
- sounds and visual elements to improve the playing experience

## Frontend Role

Its main responsibilities are:

- showing the home screen and setup dialogs
- navigating between the main screen and the game screen
- rendering the board, pieces, clocks, and overlays
- interpreting user interaction, either by click or drag and drop
- maintaining the state of a local or AI game
- communicating with Stockfish in AI mode
- communicating with the backend in online mode
- reacting to remote state changes during online games

## Backend Role

Its main responsibilities are:

- creating online rooms with a shareable code
- allowing another player to join an existing room
- maintaining the current state of each room
- validating moves sent by clients
- applying accepted changes to the game state
- detecting the end of an online game
- publishing updated room snapshots over WebSocket

## Responsibility Split By Mode

### Local Game

In local mode, everything happens in the browser:

- the user configures the time control
- the frontend creates the game
- the frontend validates moves
- the frontend updates the board and the clocks
- the frontend detects the end of the game

The backend does not take part.

### AI Game

In this mode, almost everything still happens in the browser:

- the player chooses difficulty and color
- the frontend maintains the game state
- Stockfish calculates the AI move inside a Web Worker
- the frontend applies that move and updates the interface

The backend does not take part here either.

### Online Game

In online mode, frontend and backend work together continuously:

- the frontend opens the lobby and allows the user to create or join a room
- the backend creates or retrieves the corresponding room
- the frontend fetches the initial snapshot and subscribes to updates
- the backend publishes changes when the room state changes
- each move accepted by the server is then reflected on both clients

## General User Flow

At a high level, the user's main path is the following:

1. The user enters the home screen.
2. The user chooses a game mode.
3. Depending on the mode, the user configures time, color, or access to an online room.
4. The application navigates to the game screen.
5. The corresponding game service initializes the state.
6. The interface reflects the game and responds to the user's actions.

This general flow is the starting point for the rest of the documents in the `01-application-flows` folder.

## Relevant MVP Decisions

The current state of the project reflects several deliberate MVP decisions:

- there is no registered user system
- there is no persistent database for rooms
- the online backend stores room state in memory while the process is running
- the AI does not run on the server, but in the browser
- the application prioritizes architectural clarity over product complexity

## Current Limitations

As an MVP, the system has several known limitations:

- online rooms are not persistent across backend restarts
- there is no authentication or formal account management
- there is no Elo or matchmaking system
- there is no persistent game history
- online reconnection and session hardening are still areas for improvement
- text internationalization is not yet solved

## Relation To The Rest Of The Documentation

This document serves as the entry point.

The following files in `01-application-flows` go deeper into specific paths, for example:

- how a local game is created
- how Stockfish is integrated in AI mode
- how an online room is created
- how a game is synchronized between two clients
- how moves are sent and errors are handled

Then, the `02-code-map` folder goes one level deeper and describes the project structure folder by folder, connecting each functional flow to its actual implementation.
