# Partida Contra IA

## Objetivo

Este documento describe el flujo de una partida contra la IA: desde la configuración inicial hasta el cálculo y aplicación de los movimientos de Stockfish.

En este modo no interviene el backend. La partida, las reglas y el motor de ajedrez se ejecutan en el navegador del usuario.

## Configuración Inicial

Desde `HomeComponent`, al pulsar `AI` se abre `ai-mode-settings-dialog`.

El usuario puede elegir:

- la dificultad: `beginner`, `intermediate`, `advanced` o `expert`
- el color con el que quiere jugar: blancas, negras o aleatorio

Al confirmar, la aplicación navega a:

`/game/ai`

con estos query params:

- `difficulty`
- `color`

Si faltan o no son válidos, `GameComponent` usa `beginner` como dificultad y `random` como color.

## Creación De La Partida

Al entrar en la ruta, `GameComponent` crea una instancia de `AiGameService`.

El servicio:

- resuelve el color del jugador; si es aleatorio, lo elige en ese momento
- asigna el color contrario a la IA
- crea el tablero en la posición inicial
- inicializa `GameState` y el historial de movimientos
- crea su propio `StockfishService`

La orientación inicial del tablero coincide con el color del jugador.

Si el jugador escoge negras, la IA tiene el primer turno. Por ello, tras inicializar la partida se programa directamente su primer movimiento.

## Turno Del Jugador

El usuario solo puede interactuar con el tablero cuando:

- la partida sigue en curso
- no está pausada
- no se está revisando el historial tras el final de la partida
- el turno actual corresponde al color del jugador

La selección de piezas, el cálculo de movimientos legales y la promoción usan la misma lógica compartida que el modo local. La diferencia es que, después de una jugada válida del usuario, el turno pasa a la IA.


## Preparación Del Movimiento De La IA

Después de la jugada humana, `AiGameService` espera 250 ms antes de pedir una respuesta. Este retraso permite que la interfaz llegue a mostrar el movimiento del jugador antes de que aparezca la respuesta de la IA.

Antes de consultar el motor, el servicio comprueba que:

- la partida no está pausada ni terminada
- no se está navegando por el historial
- es el turno de la IA
- no hay una promoción pendiente

Si se cumplen esas condiciones, convierte la posición actual a formato FEN y la entrega a `StockfishService`.

## Ejecución De Stockfish En El Navegador

`StockfishService` crea un `Web Worker` a partir de `assets/stockfish/stockfish.js`.

El worker permite ejecutar el motor sin bloquear la interfaz mientras analiza la posición. La comunicación se realiza mediante el protocolo UCI:

1. Se inicializa el motor con `uci` y se espera `uciok`.
2. Se comprueba que está listo con `isready` y `readyok`.
3. Se configura el nivel mediante `Skill Level`.
4. Se envía la posición actual en formato FEN.
5. Se solicita una jugada con un tiempo máximo de cálculo.
6. Stockfish responde con `bestmove` en formato UCI, por ejemplo `e2e4`.

Las consultas se encolan para que el mismo worker no procese varias órdenes incompatibles a la vez.

## Dificultad

La dificultad no modifica las reglas de la partida. Ajusta dos parámetros con los que se consulta a Stockfish:

| Dificultad | Skill Level | Tiempo de cálculo |
| --- | ---: | ---: |
| `beginner` | 1 | 700 ms |
| `intermediate` | 6 | 1100 ms |
| `advanced` | 12 | 1600 ms |
| `expert` | 20 | 2000 ms |

Los valores mostrados en el diálogo como `~800`, `~1200`, `~1600` y `~2000` son una referencia visual para el usuario, no una clasificación Elo verificada.

## Aplicación De La Respuesta

La respuesta de Stockfish llega como texto UCI. `AiGameService` la transforma a un objeto `Move` que la lógica de la aplicación entiende.

Durante esa conversión se identifican, cuando corresponden:

- promociones
- enroques
- capturas al paso

Antes de aplicar la respuesta, el servicio verifica que sigue siendo válida para la petición actual. Cada petición tiene un identificador; si la partida se ha reiniciado, pausado o modificado mientras Stockfish calculaba, esa respuesta se ignora.

Cuando la jugada es válida, se aplica sobre `GameState`, se añade al historial, se reproduce el sonido adecuado y se comprueba si ha terminado la partida.

## Pausa Y Navegación Del Historial

El modo contra IA permite pausar y navegar por el historial de movimientos.

Al pausar:

- se bloquea el tablero
- se limpia la selección actual
- se cancela la respuesta programada de la IA
- se invalida cualquier cálculo en curso y se envía `stop` a Stockfish

Al deshacer o rehacer, se reconstruye la posición desde el historial. Antes de ello también se detiene Stockfish para que no aplique una jugada sobre una posición que ya no existe.

Si se rehace hasta la posición más reciente y vuelve a ser turno de la IA, el servicio puede programar de nuevo su movimiento. Si el usuario crea una jugada nueva después de deshacer, se descarta el historial que se podía rehacer y la IA responde a la nueva posición.

Este comportamiento hace posible revisar o corregir jugadas durante una partida de práctica, aunque no representa una partida competitiva estricta.

## Sin Reloj

Actualmente las partidas contra IA no usan control de tiempo. `AiGameService` no crea un `LocalClock`, por lo que no se muestran relojes ni una partida puede terminar por tiempo en este modo.

## Fin, Reinicio Y Salida

Después de cada jugada, `GameState` comprueba el resultado. La partida puede terminar por jaque mate, ahogado, tablas por material insuficiente o tablas por triple repetición.

Al terminar:

- se reproduce el sonido de fin
- se muestra el diálogo con el resultado
- la partida pasa a modo de revisión, sin permitir nuevas jugadas
- el historial sigue disponible para recorrer la partida

Reiniciar crea un tablero y un historial nuevos, invalida cualquier respuesta pendiente de la IA y vuelve a programar un movimiento de Stockfish si la IA juega con blancas.

Al salir de la pantalla de juego, `GameComponent` destruye el servicio. Esto termina el `Web Worker` de Stockfish y libera sus listeners.
