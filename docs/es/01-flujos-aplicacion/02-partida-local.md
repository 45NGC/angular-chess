# Partida Local

## Objetivo

Este documento describe el flujo completo de una partida local: cómo se selecciona el modo, cómo se crea el estado inicial, cómo se interactúa con el tablero, cómo se valida una jugada y cómo se detecta el final de la partida.

## Entrada Al Modo Local

La partida local comienza en `HomeComponent`.

Cuando el usuario pulsa `Local`, la aplicación no navega directamente a la pantalla de juego. Primero abre el diálogo de configuración de tiempo.

Ese diálogo permite elegir:

- tiempo base para blancas
- incremento para blancas
- tiempo base para negras
- incremento para negras

Cuando el usuario confirma, la aplicación navega a:

`/game/local`

con estos query params:

- `baseW`
- `incW`
- `baseB`
- `incB`

## Creación Del Servicio De Juego

Al entrar en `GameComponent`, el componente lee:

- el parámetro de ruta `mode`
- los query params de tiempo

Si `mode` vale `local`, `GameComponent` crea una instancia de `LocalGameService` y le pasa el objeto `TimeControl` ya interpretado.

Ese servicio es el responsable de mantener el estado de la partida local.

## Inicialización Del Estado

`LocalGameService` llama a `resetGame()` en su construcción.

Ese método hace varias cosas:

- crea un `Board` nuevo
- carga la posición inicial de ajedrez desde `INITIAL_POSITION_FEN`
- crea un `GameState` con ese tablero
- resetea selección, diálogo de promoción y estado de fin de partida
- reinicia el historial de movimientos
- reinicia el reloj local

El resultado es una partida nueva con turno de blancas y el tablero en la posición inicial clásica.

## Qué Guarda El Estado Local

Durante una partida local, el estado relevante vive en dos piezas principales:

- `GameState`, que representa el tablero, el turno y el resultado de la partida
- `LocalGameService`, que además mantiene selección, movimientos legales visibles, historial, pausa, reloj y modo de revisión

Esto significa que la partida local no depende del backend. Todo lo necesario para jugar se resuelve en cliente.

También implica que este modo es especialmente flexible: se parece más a una partida amistosa entre dos personas delante de un tablero que a una partida estrictamente bloqueada por servidor. Mientras la partida sigue activa, ambos jugadores comparten el mismo cliente y pueden continuar jugando en el mismo dispositivo.

## Interacción Con El Tablero

La interacción visual ocurre en `GameComponent`, pero la lógica de la jugada se delega al servicio de juego.

El usuario puede mover de dos formas:

- haciendo clic en casillas
- arrastrando y soltando piezas

En ambos casos, el flujo acaba llegando a `handleSquareClick()` del servicio base.

## Selección De Pieza

Si no hay ninguna casilla seleccionada y el usuario pulsa una pieza del color al que le toca mover:

- esa casilla pasa a ser la seleccionada
- se calculan sus movimientos legales
- esos movimientos se muestran en el tablero

Si el usuario pulsa una pieza distinta de su mismo color durante su turno, la selección cambia a esa nueva pieza.

Si pulsa una casilla que no corresponde a una jugada legal, la selección se limpia y se reproduce el sonido de error.

## Cálculo De Movimientos Legales

Los movimientos legales se calculan con `LegalMoveFinder`.

El proceso es:

1. Se generan movimientos pseudo-legales según el tipo de pieza.
2. Para cada movimiento candidato se simula el tablero resultante.
3. Se descartan los movimientos que dejen al rey propio en jaque.

Así se obtiene la lista final de jugadas permitidas para la pieza seleccionada.

Este cálculo soporta:

- movimientos normales
- capturas
- enroques
- captura al paso
- promociones

## Ejecución De Una Jugada

Cuando el usuario pulsa una casilla destino válida, el servicio intenta resolver la jugada.

Hay dos casos:

- si solo existe una jugada posible hacia esa casilla, se ejecuta directamente
- si existen varias, significa que se trata de una promoción y se abre el diálogo de selección de pieza

Cuando la jugada ya está resuelta, `LocalGameService` la aplica sobre el estado actual.

## Qué Ocurre Al Aplicar Un Movimiento

Al aplicar una jugada, `LocalGameService`:

- guarda el movimiento en el historial
- invalida cualquier posible rehacer anterior
- aplica el movimiento sobre `GameState`
- cambia el turno
- actualiza el reloj
- reproduce el sonido correspondiente
- comprueba si la partida ha terminado

El sonido depende del resultado de la jugada:

- sonido de jaque si el rival queda en jaque
- sonido de captura si se ha capturado una pieza
- sonido normal de movimiento en el resto de casos

## Cómo Se Actualiza `GameState`

Dentro de `GameState`, `applyMove()`:

- obtiene la pieza de origen
- simula el tablero resultante con `MoveSimulator`
- actualiza derechos de enroque
- sustituye el tablero actual por el nuevo
- cambia el turno
- registra la nueva posición
- recalcula el resultado de la partida

Además, el estado registra repeticiones de posición para poder detectar tablas por triple repetición.

## Promoción

La promoción tiene un flujo especial.

Si una jugada de peón llega a la última fila y hay varias promociones posibles, el servicio no ejecuta la jugada todavía. En su lugar:

- guarda las jugadas candidatas en `pendingPromotionMoves`
- muestra el diálogo de promoción

Cuando el usuario elige dama, torre, alfil o caballo:

- se recupera la jugada concreta correspondiente
- se ejecuta
- se cierra el diálogo

El diálogo también puede cerrarse sin elegir ninguna pieza.

En ese caso:

- no se ejecuta ninguna jugada
- se limpia la promoción pendiente
- se limpia la selección actual
- el usuario puede volver a empezar la jugada desde el tablero

## Reloj En Partida Local

La partida local usa `LocalClock`.

Su comportamiento general es este:

- se configura al crear o reiniciar la partida
- no empieza a correr hasta que se hace el primer movimiento
- tras cada jugada válida, cambia el turno activo
- si hay incremento, se suma al jugador que acaba de mover

Si ambos tiempos base son `0`, la partida se considera sin reloj.

Además, cuando un jugador baja del umbral de poco tiempo, se reproduce un sonido de aviso.

## Pausa Y Navegación De Historial

El modo local soporta dos comportamientos adicionales:

- pausar y reanudar la partida
- deshacer y rehacer movimientos

Si la partida se pausa:

- se bloquea la interacción con el tablero
- se limpia la selección actual
- el reloj se detiene

Si el usuario navega por el historial:

- se reconstruye el estado desde la lista de movimientos
- el reloj deja de avanzar
- la partida entra en una lógica de revisión del historial

Esto evita mezclar una partida activa con una posición reconstruida manualmente.

Desde el punto de vista del usuario, esto hace que el modo local sea bastante permisivo. Se pueden revisar jugadas, deshacer una secuencia y rehacerla, lo que encaja bien con una partida casual en la que dos personas quieren corregir una jugada o revisar qué habría pasado en una posición anterior.

## Detección Del Fin De La Partida

Después de cada movimiento, `GameState` recalcula el resultado.

La partida puede terminar por:

- jaque mate
- ahogado
- tablas por material insuficiente
- tablas por triple repetición
- tiempo

Si el resultado deja de ser `ongoing`, `LocalGameService`:

- reproduce el sonido de fin
- detiene el reloj
- activa el estado de fin de partida
- muestra el diálogo correspondiente

## Modo De Revisión

Una vez terminada la partida, el servicio entra en `reviewOnly`.

Eso significa que:

- ya no se pueden crear jugadas nuevas
- sí se puede navegar por el historial
- el diálogo de fin de partida puede cerrarse sin reactivar la partida

Este comportamiento separa claramente una partida activa de una partida ya terminada.

## Salida O Reinicio

Desde la pantalla de juego local, el usuario puede:

- reiniciar la partida
- cerrar el diálogo de fin de partida
- salir a la pantalla principal

Reiniciar vuelve a crear el tablero, el estado, el historial y el reloj desde cero.

Salir navega de nuevo a:

`/`

## Resumen

La partida local se resuelve completamente en el navegador. `GameComponent` se encarga de la interacción visual, mientras que `LocalGameService`, `GameplayService`, `MoveNavigableGame` y `GameState` coordinan la lógica real de la partida, la validación de jugadas, el reloj y el final del juego.
