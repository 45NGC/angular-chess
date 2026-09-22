# Frontend: `core/`

## Objetivo

`src/app/core/` reúne la lógica de ajedrez y tiempo que no necesita componentes Angular, servicios HTTP, diálogos ni acceso al DOM. Sus cuatro áreas son:

```text
core/
├── board/       Representación del tablero, piezas, casillas y FEN
├── constants/   Valores fijos de las reglas y del reloj
├── rules/       Movimientos legales, estado de partida y tablas
└── time/        Reloj local y formato de tiempo
```

Los servicios de juego usan este núcleo para coordinar una partida; los componentes solo transforman las acciones del usuario y el estado resultante en interfaz visual.

## Dependencias Internas

La dirección principal de dependencias es:

```text
board/ + constants/
        ↓
      rules/
        ↓
services/ de juego
        ↓
      ui/
```

`time/` se usa principalmente por `LocalGameService` y por los componentes que muestran el reloj. Ningún archivo de `core/` importa Angular, RxJS, `HttpClient` ni un componente de interfaz.

## `core/board`

Esta carpeta define cómo se representa una posición de ajedrez. No decide qué jugadas son legales; ofrece los datos y operaciones básicas que las reglas necesitan.

| Archivo | Responsabilidad |
| --- | --- |
| `piece.ts` | Tipos `Piece`, `PieceType` y `PieceColor`, además de `isWhite()` e `isBlack()`. |
| `square.ts` | Tablero de 8x8, conversión entre coordenadas e índice y casillas de referencia. |
| `board.ts` | Clase `Board`: piezas, derechos de enroque, objetivo de captura al paso y clonación. |
| `fen.ts` | Carga y generación de posiciones en formato FEN. |

### Casillas E Índices

El tablero se almacena como un array de 64 posiciones. Cada casilla usa un índice entre `0` y `63`:

```text
8 | 56 57 58 59 60 61 62 63
7 | 48 49 50 51 52 53 54 55
  | ...
1 |  0  1  2  3  4  5  6  7
    a  b  c  d  e  f  g  h
```

`toIndex(rank, file)` convierte coordenadas internas en ese índice, y `fromIndex(square)` realiza la operación inversa. El rango interno `0` representa la primera fila de blancas, por lo que `e2` corresponde a `12`.

### Estado Del Tablero

`Board` guarda:

- `squares`, con una pieza o `null` por cada casilla
- `enPassantTarget`, la casilla que puede capturar un peón en la siguiente jugada
- `castlingRights`, con los derechos corto y largo de cada color

`clone()` crea copias independientes de las casillas y de los metadatos. Esto es importante porque las reglas simulan movimientos sin modificar la posición que el usuario está viendo.

`updateCastlingRights()` elimina derechos cuando se mueve un rey o una torre desde su casilla inicial. La comprobación de si el enroque es posible se realiza después en `LegalMoveFinder`.

### FEN

`loadFEN()` carga la colocación de piezas de un FEN en un `Board`. La posición inicial está definida en `INITIAL_POSITION_FEN`.

`toFEN(board, turn)` genera un FEN que incluye colocación, turno, derechos de enroque y objetivo de captura al paso. Los campos de medio movimiento y número de jugada se fijan actualmente en `0 1`, porque no se llevan esas cuentas. Este FEN también se usa para enviar la posición a Stockfish y para identificar posiciones en la regla de triple repetición.

## `core/rules`

Esta carpeta implementa las reglas de ajedrez sobre `Board`. La secuencia central es:

1. `LegalMoveFinder` genera jugadas candidatas para una pieza.
2. `MoveSimulator` aplica cada candidata sobre una copia del tablero.
3. `AttackedSquares` comprueba si el rey propio queda atacado.
4. Solo las candidatas que no dejan al rey en jaque son legales.
5. `GameState` aplica una jugada aceptada, cambia el turno y recalcula el resultado.

| Archivo | Responsabilidad |
| --- | --- |
| `move.ts` | Contrato `Move`, con origen, destino y datos opcionales de promoción, enroque, captura al paso y avance doble. |
| `attacked-squares.ts` | Calcula las casillas atacadas por un color y determina si un rey está en jaque. |
| `legal-move-finder.ts` | Genera y filtra los movimientos legales de una pieza. |
| `move-simulator.ts` | Devuelve un `Board` clonado tras aplicar una jugada. |
| `game-state.ts` | Mantiene tablero, turno, resultado y posiciones repetidas. |
| `draw-rules.ts` | Detecta las posiciones de material insuficiente que la aplicación considera tablas. |
| `move-history.ts` | Reconstruye un `GameState` desde la posición inicial y una lista de movimientos. |

### Ataques, Jugadas Candidatas Y Jugadas Legales

`AttackedSquares` no genera jugadas: calcula casillas bajo ataque. Esta distinción es necesaria para el jaque y para el enroque, donde el rey no puede atravesar una casilla atacada.

`LegalMoveFinder` genera primero jugadas pseudo-legales según el tipo de pieza. Después simula cada una y descarta las que dejan al rey del mismo color en jaque. Gestiona:

- recorrido de caballos, rey y piezas deslizantes
- avance, captura, avance doble y promoción de peones
- captura al paso
- enroque corto y largo, comprobando derechos, torre, casillas libres y casillas seguras

`GameState.applyMove()` no vuelve a comprobar que la jugada sea legal. Recibe una `Move` que ya ha sido elegida de los resultados de `LegalMoveFinder`, o de un historial previamente aceptado por el backend. Por eso, el modo online valida de nuevo las jugadas en Spring Boot antes de añadirlas al historial compartido.

### Simulación Y Estado De Partida

`MoveSimulator.simulate()` clona el tablero, limpia el objetivo de captura al paso anterior y aplica el movimiento. También mueve la torre en un enroque, elimina el peón capturado al paso, registra el objetivo tras un avance doble y sustituye el peón por la pieza elegida en una promoción.

Después de la simulación, `GameState` actualiza los derechos de enroque, cambia el turno y calcula el resultado. Puede producir:

- `ongoing`
- jaque mate
- ahogado
- tablas por material insuficiente
- tablas por triple repetición
- `timeout`, asignado por el reloj local o por el snapshot online

La triple repetición se cuenta usando los cuatro primeros campos de FEN: posición, turno, derechos de enroque y captura al paso. `draw-rules.ts` aplica un conjunto conservador de casos de material insuficiente. La regla de los cincuenta movimientos y las tablas por acuerdo mutuo no están implementadas.

### Historial

`buildGameStateFromMoves()` crea un tablero inicial, carga el FEN de salida y aplica cada `Move` en orden. Lo usan los servicios para deshacer y rehacer en modos local y contra IA, y para reconstruir la copia de una sala online a partir de `room.moves`.

Reconstruir desde historial evita guardar varias fuentes de verdad para una misma partida, aunque no sustituye la validación autoritativa que hace el backend antes de aceptar movimientos online.

## `core/time`

Esta carpeta contiene el reloj del modo local y funciones de presentación de tiempo.

| Archivo | Responsabilidad |
| --- | --- |
| `local-clock.ts` | Clase `LocalClock`, con tiempo de blancas y negras, incremento, turno activo y callback de timeout. |
| `time.utils.ts` | Formatea milisegundos como `MM:SS` y muestra décimas bajo 15 segundos. |

`LocalClock` se configura con minutos base e incrementos por separado para cada color. Solo se habilita si al menos un lado tiene tiempo base finito. Al cambiar de turno:

1. descuenta el tiempo transcurrido del jugador activo
2. añade el incremento al jugador que acaba de mover, si tiene reloj finito
3. activa el reloj del rival

Usa `performance.now()` cuando está disponible, con `Date.now()` como alternativa, y actualiza su estado cada 100 ms mediante `window.setInterval()`. Al llegar a cero detiene el intervalo y llama al callback con el color ganador. Por tanto, `LocalClock` no depende de Angular, pero sí de las APIs temporales del navegador.

El reloj online no reutiliza esta clase: el backend calcula el tiempo válido y `OnlineGameService` solo proyecta visualmente el tiempo entre snapshots. El funcionamiento completo se documenta en `09-manejo-de-tiempo.md`.

## `core/constants`

Las constantes evitan dispersar valores fijos por las reglas y los servicios.

| Archivo | Contenido |
| --- | --- |
| `chess.constants.ts` | Posición inicial FEN, filas relevantes de peones, casillas de enroque y vectores de movimiento para piezas. |
| `time.constants.ts` | Umbral de 15 segundos para el sonido de poco tiempo. |

Los vectores de caballos, rey, alfiles, torres y damas se reutilizan tanto al generar movimientos como al calcular ataques. Mantenerlos en un único módulo ayuda a que esas dos operaciones usen la misma geometría de tablero.

## Relación Con Servicios Y UI

La interfaz no debería modificar `Board` directamente ni contener reglas de ajedrez. Su papel es obtener clics, arrastres y selecciones; `GameplayService` convierte esas acciones en una casilla y consulta `LegalMoveFinder`.

Los servicios concretos deciden qué hacer con una jugada legal:

- `LocalGameService` la aplica y controla `LocalClock`
- `AiGameService` la aplica y solicita la respuesta de Stockfish cuando corresponde
- `OnlineGameService` la envía al backend y espera un snapshot aceptado antes de reconstruir el estado

Esta separación permite probar `core/` con Vitest sin crear componentes Angular, reutilizar las mismas reglas entre modos y mantener la validación de negocio de la interfaz separada de la representación visual.

## Pruebas

Los archivos `*.spec.ts` de cada subcarpeta cubren la representación del tablero, FEN, ataques, movimientos legales, simulación, finales, tablas y reloj local. Son pruebas unitarias: no levantan Angular ni el backend.
