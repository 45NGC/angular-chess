# Frontend: `services/`

## Objetivo

`src/app/services/` coordina la lógica pura de `core/` con la interfaz, Stockfish y el backend. Los servicios de partida deciden cuándo aplicar una jugada, reproducir un sonido, iniciar un reloj o enviar una petición; las reglas concretas del ajedrez siguen en `core/`.

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

## Ciclo De Vida Y Alcance

No todos los servicios tienen la misma duración:

| Servicio | Duración | Creación |
| --- | --- | --- |
| `LocalGameService` | Una partida local activa. | `GameComponent` crea una instancia al entrar en `/game/local`. |
| `AiGameService` | Una partida contra IA activa. | `GameComponent` crea una instancia al entrar en `/game/ai`. |
| `OnlineGameService` | Una partida online abierta en la pantalla. | `GameComponent` crea una instancia al entrar en `/game/online`. |
| `OnlineRoomService` | Toda la aplicación Angular. | Inyección de dependencia con `providedIn: 'root'`. |
| `OnlineRoomCodeService` | Toda la aplicación Angular. | Inyección de dependencia con `providedIn: 'root'`. |
| `SoundService` | Toda la aplicación Angular. | Inyección de dependencia con `providedIn: 'root'`. |
| `StockfishService` | Una partida contra IA activa. | `AiGameService` crea su propia instancia. |

Cuando cambia el modo de ruta o se destruye `GameComponent`, el componente llama a `destroy()` si el servicio de partida lo implementa. Así, el modo local detiene su reloj, el modo contra IA termina su worker y el modo online cancela su suscripción a la sala.

## Relación Entre Servicios De Partida

Los tres modos cumplen `IGameService`, pero comparten distinto grado de comportamiento:

```text
IGameService
    │
GameplayService
    ├── MoveNavigableGame
    │   ├── LocalGameService
    │   └── AiGameService
    └── OnlineGameService
```

`GameplayService` concentra la interacción común del tablero. `MoveNavigableGame` añade historial, deshacer, rehacer y modo de revisión. El modo online hereda directamente de `GameplayService`, porque el historial de una sala no es editable por un solo cliente.

## `services/shared`

### `GameplayService`

`shared/gameplay-base.ts` es una clase abstracta que implementa la parte común de `IGameService`:

- estado de selección: `selectedSquare` y `legalMoves`
- diálogo y jugadas pendientes de promoción
- diálogo de fin y mensajes de resultado
- conversión de un clic de interfaz en selección o intento de jugada

`handleSquareClick(rank, file)` convierte las coordenadas visuales a una casilla, selecciona una pieza del turno actual y consulta `LegalMoveFinder`. Si el destino tiene una única jugada válida, delega su ejecución a `submitResolvedMove()`. Si hay varias, guarda las promociones candidatas y abre el diálogo.

Las subclases deben definir tres decisiones que cambian según el modo:

| Método abstracto | Decisión |
| --- | --- |
| `canInteractWithBoard()` | Si ese usuario puede iniciar una acción ahora. |
| `handleIllegalMoveTarget()` | Cómo reaccionar a un destino no válido. |
| `submitResolvedMove(move)` | Dónde y cómo se procesa una jugada ya resuelta. |

También incluye hooks opcionales para ajustar la promoción, el resultado por tiempo y la actualización visual. Esto permite compartir el comportamiento de selección sin que la clase base conozca relojes, IA o HTTP.

### `MoveNavigableGame`

`shared/move-navigation.ts` extiende la clase anterior para los modos local y contra IA. Mantiene:

- `moveHistory`, la secuencia que representa la posición actual
- `redoHistory`, las jugadas que se han deshecho
- `reviewOnly`, que bloquea nuevas jugadas al terminar la partida
- el estado del diálogo de fin durante la revisión

Al deshacer o rehacer, reconstruye `GameState` con `buildGameStateFromMoves()` en vez de modificar el tablero de forma inversa. Antes y después de reconstruir llama a hooks que cada modo puede especializar: el modo local detiene el reloj y el modo contra IA cancela el cálculo pendiente de Stockfish.

## `LocalGameService`

`local-game.service.ts` mantiene una partida de dos jugadores en el mismo navegador. Extiende `MoveNavigableGame` y no depende del backend.

Su estado adicional es:

- `TimeControl` y el estado visible del reloj
- una instancia de `LocalClock`
- pausa y color de reloj que debe reanudarse
- indicador de historial que ha congelado el reloj

Al reiniciar, carga `INITIAL_POSITION_FEN`, crea `GameState`, limpia la interacción e historial y configura `LocalClock`. El reloj no comienza hasta la primera jugada válida.

Al recibir una jugada resuelta desde la clase base, el servicio la añade al historial, la aplica sobre `GameState`, cambia el turno de reloj, reproduce el sonido de movimiento, captura o jaque, y marca el fin de partida si corresponde. Cuando un reloj baja por primera vez del umbral configurado, reproduce el sonido de poco tiempo.

`pause()` detiene el reloj y bloquea el tablero; `resume()` lo reinicia para el color que estaba activo. Deshacer o rehacer también detiene el reloj para evitar que una posición de revisión continúe consumiendo tiempo. `destroy()` libera el intervalo de `LocalClock`.

La clase está marcada como inyectable y define el token `LOCAL_TIME_CONTROL`, pero el flujo actual crea la instancia directamente desde `GameComponent` y le pasa el `TimeControl` interpretado desde la URL.

## `AiGameService`

`ai-game.service.ts` extiende `MoveNavigableGame` y añade un rival controlado por Stockfish. Guarda:

- dificultad elegida
- color del jugador y color de la IA
- `StockfishService` propio
- identificador de petición de IA y temporizador de espera de 250 ms
- callback para solicitar detección de cambios en Angular

Solo permite interacción cuando es el turno del jugador humano, la partida sigue en curso y no está pausada ni en revisión. Tras una jugada humana, espera 250 ms y consulta Stockfish si la posición sigue siendo válida.

Antes de aplicar una respuesta del motor, compara su identificador con `aiRequestId`. Reiniciar, pausar, navegar por historial o realizar otra jugada incrementa ese identificador, por lo que una respuesta antigua se ignora. Esta protección evita que Stockfish juegue sobre una posición que ya no existe.

El servicio convierte la respuesta UCI, como `e2e4`, a `Move`. Durante esa conversión detecta promoción, enroque o captura al paso a partir de la posición actual. Después aplica la jugada con el mismo recorrido de historial, sonidos y detección de final que usa el jugador humano.

No crea `LocalClock`: el tiempo de cálculo de Stockfish no es un reloj de partida. Al pausar, navegar o destruir la partida, cancela la acción programada, invalida la petición y solicita `stop` al motor. `destroy()` termina además el worker a través de `StockfishService.destroy()`.

## `StockfishService`

`stockfish.service.ts` encapsula la comunicación con Stockfish y evita que `AiGameService` tenga que conocer el protocolo UCI.

Al recibir la primera petición, crea un `Web Worker` con `assets/stockfish/stockfish.js`. El motor y WASM se ejecutan fuera del hilo principal, por lo que el análisis no bloquea la interfaz.

`getBestMove()` realiza esta secuencia:

1. Inicializa una vez el motor con `uci` y `isready`.
2. Ajusta `Skill Level` entre `0` y `20`.
3. Declara una partida nueva y envía el FEN de la posición.
4. Solicita `go movetime ...`.
5. Espera una línea `bestmove` y devuelve el movimiento UCI, o `null` si es `(none)`.

Las peticiones se encadenan en `queue` para que un único worker no reciba comandos incompatibles al mismo tiempo. Cada espera tiene timeout y limpia su listener al completarse o fallar. `stop()` solicita al motor detener su cálculo actual; `destroy()` termina el worker, elimina listeners y permite crear uno nuevo en una próxima partida.

Si existe `localStorage.debugStockfish = '1'`, las líneas que produce el motor se escriben en la consola para depuración.

## `OnlineGameService`

`online-game.service.ts` representa la partida desde el punto de vista de un jugador conectado. No modifica de forma optimista el tablero ni guarda la sala como autoridad: recibe snapshots a través de `OnlineRoomService`.

Al construirse, recupera la sala disponible, guarda `OnlineRoomSession` y se suscribe a `watchRoom(session.roomCode)`. Cada snapshot se procesa en `applyRoom()`:

- actualiza el color actual del jugador, incluso después de una revancha
- actualiza control de tiempo y valores base del reloj
- convierte `room.moves` en historial local y reconstruye `GameState`
- limpia selección o promoción si ya no son válidas
- muestra el diálogo de fin cuando la sala termina
- reproduce el sonido del último movimiento nuevo

El servicio solo permite mover si la sala está preparada o en juego, el estado de ajedrez sigue activo, es el turno del jugador y su reloj visual no llegó a cero. Una jugada resuelta se envía con `OnlineRoomService.submitMove()`; el tablero solo cambia cuando llega la respuesta o el evento con un snapshot aceptado.

También controla la petición de revancha, sus mensajes de espera y los errores de movimiento o revancha mostrados por `GameComponent` en un banner. Para el reloj, proyecta localmente el tiempo desde `clockUpdatedAt`, pero el valor válido procede del backend. `destroy()` cancela la suscripción RxJS de la sala.

## `OnlineRoomService`

`online-room.service.ts` es el singleton que concentra la comunicación y el estado compartido del modo online en un navegador.

### Estado Local Reactivo

Mantiene un `Map` de `BehaviorSubject<OnlineRoom | null>` indexado por código. El lobby y `OnlineGameService` pueden suscribirse al mismo observable y reciben cada snapshot que el servicio aplica.

Sus métodos públicos para salas son:

| Método | Responsabilidad |
| --- | --- |
| `createRoom()` | Crea la sala, guarda la sesión, actualiza el snapshot y comienza la escucha STOMP. |
| `joinRoom()` | Normaliza el código, se une y realiza las mismas actualizaciones si tiene éxito. |
| `watchRoom()` | Consulta el snapshot REST inicial y registra el topic de la sala. |
| `getRoom()` | Lee el último snapshot ya guardado en memoria. |
| `submitMove()` | Envía una jugada REST y aplica el snapshot si se acepta. |
| `requestRematch()` | Envía la solicitud REST y aplica el snapshot si se acepta. |

Las sesiones se guardan con la clave `angular-chess.online-session.{codigo}` en `localStorage`. Al actualizar una sala, el servicio localiza el `playerId` de una sesión guardada y corrige su color si una revancha lo ha intercambiado.

### REST Y STOMP

El servicio usa `HttpClient` para los endpoints REST y un único `Client` de `@stomp/stompjs` para la conexión WebSocket. Cada sala registrada se suscribe a:

`/topic/online/rooms/{code}`

Cuando llega un mensaje STOMP válido, extrae `{ room }` y lo publica en el `BehaviorSubject` correspondiente. Las respuestas REST correctas se aplican por la misma vía, por lo que el resto de la aplicación no necesita distinguir su origen.

El cliente STOMP se reconecta cada cinco segundos. El servicio publica `OnlineConnectionState` y mensajes de conexión para que el lobby y la pantalla de partida muestren avisos. Si un frame no contiene JSON válido, se ignora para conservar la suscripción activa.

Tras reconectar, vuelve a suscribirse a los topics registrados, pero no pide automáticamente un nuevo snapshot REST. Esta limitación se describe con más detalle en `06-sincronizacion-online.md`.

## `OnlineRoomCodeService`

`online-room-code.service.ts` centraliza la normalización de códigos: convierte a mayúsculas, elimina caracteres que no son letras o números y limita el resultado a seis caracteres. También comprueba que el código normalizado tenga longitud seis.

`OnlineLobbyDialogComponent` usa esta lógica mientras el usuario escribe y `OnlineRoomService` la aplica antes de cada operación. De este modo, el formulario, la URL y las peticiones REST usan el mismo formato.

El servicio también tiene `generateCode()`, pero el flujo actual no lo usa para crear salas: el código definitivo lo genera el backend.

## `SoundService`

`sound.service.ts` centraliza los seis efectos de audio del juego: movimiento, captura, jaque, fin, poco tiempo y error. Al crearse, carga los archivos de `assets/sounds/`.

Cada método público reinicia `currentTime` antes de reproducir el sonido. Esto permite oír el mismo efecto en acciones rápidas consecutivas. Si el navegador bloquea la reproducción o falla el recurso, captura la promesa rechazada y escribe una advertencia en consola, sin interrumpir la partida.

## Relación Con Componentes

`HomeComponent` solo recoge configuración y navega. `GameComponent` elige el servicio de partida según la ruta, reenvía clics, arrastres, promociones, pausa e historial, y lee su estado mediante `IGameService`.

Los servicios mantienen la lógica de coordinación y devuelven datos simples que la plantilla renderiza. Así, un cambio de presentación del tablero no requiere modificar la lógica de Stockfish, del reloj o del protocolo online; del mismo modo, un cambio en la forma de obtener una jugada no obliga a reescribir los componentes visuales.

## Pruebas

Actualmente hay pruebas directas para `OnlineGameService` y `OnlineRoomService`. Verifican, entre otros aspectos, la solicitud de revancha, la reconstrucción tras intercambiar colores y la actualización de la sesión guardada.

La lógica de ajedrez, reloj y reglas especiales que usan los servicios se prueba principalmente en `core/`. Los modos local y contra IA dependen además de temporizadores, audio y worker, por lo que su coordinación no tiene todavía archivos de prueba de servicio específicos.
