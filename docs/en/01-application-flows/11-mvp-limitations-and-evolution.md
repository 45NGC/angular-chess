# MVP Limitations And Evolution

## Purpose

This document places the current scope of the application in context and describes the changes required to turn online mode into a more complete platform. It is not a mandatory implementation plan: it helps explain the dependencies between improvements and decide what makes sense to add in a future project.

## What The MVP Already Solves

The application already covers the essentials needed to play:

- local games in one browser
- games against Stockfish running on the client
- online rooms for two players using a shared code
- authoritative move and clock validation on the backend
- snapshot synchronization through REST and WebSocket/STOMP
- game over, time controls, and rematches

This scope is enough to demonstrate the relationship between Angular and Spring Boot. The limitations appear when trying to retain games, reliably identify people, or serve many users at the same time.

## Data Persistence

`InMemoryOnlineRoomRepository` currently stores rooms in a `ConcurrentHashMap`. The data only exists while the Spring Boot process is running:

- restarting the backend deletes all rooms and games
- there is no history that can be viewed after a game finishes
- rooms cannot be recovered from another backend instance

The first natural evolution would be to use a database. At a minimum, it would need to persist:

- the room and its status
- the players assigned to white and black
- the time control, clock, and result
- the moves, including their order and time played
- rematch requests and relevant timestamps

It is not necessary to store the complete board after every move: it can be rebuilt from the move history, as the backend does today. To improve loading long games, position snapshots could be stored periodically as a later optimization.

When introducing persistence, transactions and concurrency control should also be defined. Two moves sent almost at the same time must still produce one valid state, even if there are multiple server instances in the future.

## Users, Authentication, And Sessions

Today, a player is identified by a backend-generated `playerId` stored in `localStorage`. The client sends it with every request. It is useful for the MVP, but it does not securely identify a person or prevent someone who obtains the value from trying to act as that player.

An account system would require, at minimum:

- a persistent user entity with a visible name and credentials or another identity provider
- sign-up and sign-in flows, or OAuth authentication
- passwords stored using a suitable hashing algorithm if managed locally
- a secure session token, preferably in an `HttpOnly` and `Secure` cookie
- authorization on every endpoint to verify that the authenticated user participates in the room
- session logout, renewal, and revocation

With authentication, identity should not travel as a freely supplied `playerId` in the URL or request body. The backend would obtain the user from the authenticated session and decide which actions they may perform.

## Reconnection And Game Continuity

The STOMP client automatically tries to reconnect, but reconnecting does not by itself download a new REST snapshot. As a result, updates can be missed while the WebSocket connection is down.

For a more robust online experience, these improvements would be needed:

- request the room's current snapshot after reconnecting
- restore a game after a page reload using the authenticated session and persisted state
- reflect each player's actual presence and distinguish a temporary disconnection from abandonment
- define how long a player can remain disconnected before losing or cancelling the game
- show a clear reconnection state and prevent moves while the session is not reconciled

It would also be useful to include a room version or sequence in every snapshot. The client could detect stale states, and the backend could explicitly reject an action based on an outdated version.

## Online Clock And Consistency

The backend already calculates valid time, but it currently materializes a timeout when a room is queried or a move is received. If neither operation occurs, a room can temporarily remain in `playing` even though the visible clock has reached zero.

A reasonable improvement would be a server task that checks active games and publishes timeouts. Alongside it, the following would be useful:

- block a move in the frontend while it is being sent
- make move requests idempotent with a request identifier
- record action order and explicitly handle network retries
- use server time as the sole reference for results and ratings

These measures do not change the chess rules, but they reduce ambiguity when there is latency, duplicated tabs, or reconnections.

## Security And Service Protection

Authoritative move validation is a good foundation, but it does not cover every need of a publicly exposed service. In addition to authentication, the following should be considered:

- serve the frontend and backend over HTTPS
- configure CORS per environment and avoid development origins in production
- protect REST endpoints and the WebSocket connection with the same user identity
- rate limit room creation, joins, and moves to reduce abuse
- validate request size and format limits
- record anomalous attempts without exposing internal details to the client
- keep secrets and sensitive configuration outside source code

It is not necessary to implement every one of these measures to continue learning, but they should be addressed before publishing a version accessible to third parties.

## Elo, History, And Matchmaking

An Elo system depends on every game reliably belonging to two accounts and on its result remaining stored. For that reason, it should not be the first step before users and persistence.

Adding rated games would require decisions about:

- which games count for rating and which are casual
- initial rating, update formula, and treatment of abandonment
- rules for draws, timeouts, and disconnections
- game history and rating changes per user
- protection against manipulated results between accounts

Matchmaking would add a waiting queue that pairs users by rating range, time control, and, if relevant, region. It would also need maximum wait times and criteria for gradually widening the accepted Elo range.

Related features could include profiles, user search, replayable history, PGN export, spectating, post-game analysis, and draws by mutual agreement or the fifty-move rule. These are product improvements, not requirements for the basic online flow to work.

## Scaling And Operations

The in-memory repository and Spring's simple STOMP broker work correctly on a single instance. If multiple backend instances were run, each one would have its own rooms and WebSocket messages, so players might not see the same state.

Scaling the service would require sharing the resources that are currently local to the process:

- a shared database for rooms, users, and games
- a shared message broker instead of Spring's simple broker
- a strategy to route or distribute WebSocket connections
- locks or version control for updates to a room
- scheduled cleanup of abandoned rooms and history retention policies

Structured logs, metrics, health checks, alerts, and request tracing would also be useful. These tools make it possible to detect synchronization errors, performance problems, or abuse once the system is no longer only local.

## Quality And Internationalization

The main logic already has tests, but the previous improvements should be accompanied by integration tests for REST, WebSocket, persistence, authentication, and reconnection. End-to-end tests with two browsers would also be useful to cover the real flows of an online game.

Interface text is written directly in components and services. To support more languages, it would need to be extracted into a translation system, stable keys would need to be defined, and date, time, and accessibility formats would need adapting. This improvement is independent of persistence, although it is easier to maintain before the number of messages grows significantly.

## Suggested Evolution Order

If the goal were to turn this project into a foundation for a larger online application, an order with clear dependencies would be:

1. Persist rooms and games, keeping the current online contract whenever possible.
2. Add users, authentication, and authorization for actions in each room.
3. Improve reconnection, presence, post-disconnection synchronization, and authoritative timeout handling.
4. Add user history and persistent casual games.
5. Introduce Elo and matchmaking based on results associated with authenticated accounts.
6. Prepare deployment, observability, security, and scaling before opening the service to more users.

Translations, visual improvements, and additional draw rules can be developed in parallel because they do not directly depend on the previous steps.

## Summary

The MVP already has a useful separation between client and server and a valid foundation for two-player online games. To evolve it, the priorities should not be Elo or matchmaking, but persistence, secure identity, and game continuity. From there, reliable history makes competitive features possible, and stronger infrastructure makes it possible to offer them safely and at scale.
