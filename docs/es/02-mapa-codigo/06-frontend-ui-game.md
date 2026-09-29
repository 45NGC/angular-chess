# Frontend: `ui/game/`

## Objetivo

`src/app/ui/game/` contiene la pantalla en la que se juega una partida. `GameComponent` dibuja el tablero y coordina los controles visuales, pero no implementa las reglas de ajedrez ni el estado de cada modo. Para ello trabaja con la interfaz común `IGameService` y el servicio activo: `LocalGameService`, `AiGameService` u `OnlineGameService`.

```text
ui/game/
├── clock/
├── game-over-dialog/
├── move-navigation-buttons/
├── pause-button/
├── pause-overlay/
├── promotion-dialog/
├── restart-button/
├── rotation-button/
├── game.component.ts
├── game.component.html
└── game.component.css
```

## `GameComponent`

`game.component.ts` es el componente asociado a las rutas `/game/:mode`. Al iniciarse, combina el parámetro `mode` y los query params de la URL para crear el servicio adecuado:

| Modo | Parámetros usados | Servicio creado |
| --- | --- | --- |
| Local | `baseTimeWhite`, `incrementWhite`, `baseTimeBlack`, `incrementBlack` | `LocalGameService` |
| Contra IA | `difficulty`, `color` | `AiGameService` |
| Online | `code`, `playerId`, `side` o la sesión guardada | `OnlineGameService` |

Antes de sustituir un servicio, llama a su `destroy()` si existe y limpia cualquier interacción de arrastre pendiente. Si el modo no es válido, o falta la sesión necesaria para online, no crea una partida y la plantilla muestra `Loading...`.

El componente expone mediante getters los datos de `IGameService` que necesita la plantilla: posición, turno, selección, movimientos legales, estado del reloj, promoción, pausa, historial y final de partida. La interfaz se mantiene igual aunque cambie el modo, por lo que los componentes visuales no necesitan conocer la lógica interna de cada servicio.

Al destruirse, cancela las suscripciones de ruta y conexión, elimina el intervalo que actualiza el reloj visual y destruye el servicio de partida actual.

## Tablero E Interacción

El tablero no tiene un componente independiente: se genera en `game.component.html` con dos bucles `@for`, uno por fila y otro por casilla. Las filas y columnas proceden de `ranks` y `files`, que se invierten según `boardOrientation`.

Cada casilla puede mostrar estas marcas visuales:

- casilla clara u oscura
- pieza y su imagen desde `assets/pieces/`
- pieza seleccionada
- origen y destino del último movimiento
- destinos legales sin captura y con captura
- rey del turno que está en jaque

`isKingInCheckSquare()` calcula si el rey del turno está atacado mediante `AttackedSquares`. Conserva el último resultado en una caché asociada al tablero y turno actuales para no repetir el cálculo en las 64 casillas durante el mismo renderizado.

### Clic Y Arrastre

Un clic sobre una casilla llama a `gameService.handleSquareClick(rank, file)`. El servicio resuelve si debe seleccionar una pieza, recalcular destinos legales o intentar el movimiento. Pulsar fuera del tablero, los relojes o los diálogos borra la selección actual.

También se puede arrastrar una pieza:

1. `pointerdown` comprueba que la pieza pueda moverse y la selecciona, igual que un clic.
2. Tras superar cinco píxeles de desplazamiento, se muestra una vista previa de la pieza bajo el puntero.
3. Al soltarla, `GameComponent` convierte la posición del puntero en una casilla según la orientación actual.
4. Si el destino está entre `legalMoves`, lo delega de nuevo al servicio; si no lo está, reproduce el sonido de error.

El arrastre queda bloqueado si la partida está pausada, terminada o en revisión, si hay una promoción pendiente o si la pieza no es del turno actual. En partida contra IA solo puede arrastrarse el color humano, y en online solo el color asignado al jugador.

## Orientación Del Tablero

`RotationButtonComponent` emite los eventos para girar el tablero manualmente. La orientación inicial depende del modo:

- Local comienza con blancas abajo y puede activar `AUTO`, que orienta el tablero hacia el color del turno.
- Contra IA comienza con el color elegido por la persona abajo.
- Online sigue inicialmente el color asignado al jugador; por ejemplo, tras una revancha puede adaptarse al nuevo color.

Una rotación manual conserva esa decisión. En local, girar manualmente desactiva la rotación automática para que no se sobrescriba la elección del usuario.

## Reloj

`ClockComponent` recibe milisegundos, incrementos, color activo, orientación y si cada color tiene tiempo ilimitado. Reordena los dos relojes para que el color situado abajo en el tablero también se muestre abajo.

Para un color ilimitado muestra `∞`; en los demás casos usa `formatTime()` y `formatTimeFraction()` para presentar tiempo principal y fracción. La clase `active` se aplica al reloj del turno que está consumiendo tiempo y el incremento se muestra como `+Ns`.

`GameComponent` crea un intervalo cada 100 ms que solicita actualización de Angular mientras el reloj está activo y la partida no está pausada. Ese intervalo solo actualiza la interfaz: el cálculo de tiempo corresponde al servicio de partida. La plantilla renderiza `app-clock` cuando el servicio expone `clockEnabled`.

## Promoción

Cuando la lógica de juego encuentra varios movimientos válidos hacia una misma casilla, normalmente por promoción de peón, el servicio guarda los candidatos y activa `showPromotionDialog`.

La plantilla muestra `PromotionDialogComponent` en un panel junto al tablero. Recibe el color del turno y permite elegir `queen`, `rook`, `bishop` o `knight`; sus imágenes también proceden de `assets/pieces/`. Al seleccionar una opción, `GameComponent` delega en `onPromotionSelected()`, que permite al servicio resolver y enviar el movimiento elegido.

El botón `✕` cancela el diálogo. `closePromotionDialog()` descarta los candidatos y borra la selección, por lo que no se ejecuta ningún movimiento. Mientras el diálogo está abierto no se puede pausar, usar deshacer/rehacer ni arrastrar piezas.

## Pausa

`PauseButtonComponent` solo se muestra cuando el servicio implementa `pause()` y `resume()`: actualmente en local y contra IA, no en online. Al pulsarlo, `GameComponent` delega la pausa al servicio.

Con la partida pausada se sustituye el botón por `PauseOverlayComponent`. El overlay muestra:

- turno actual y número de movimientos
- relojes y `∞` cuando el reloj está habilitado
- historial en notación de coordenadas, con enroque y promoción adaptados
- acciones `RESUME`, `RESTART` y `QUIT`

`RESUME` llama a `resume()`, `RESTART` reinicia el servicio de partida y `QUIT` vuelve a `/`. El servicio local detiene y restaura su reloj; el servicio contra IA invalida cualquier cálculo pendiente de Stockfish. No se permite abrir la pausa durante una promoción ni mientras aparece el final normal de una partida.

## Fin De Partida Y Revancha

`GameOverDialogComponent` es un overlay que recibe el mensaje de resultado desde `getResultMessage()`. Muestra el título `GAME OVER`, la acción de reinicio o revancha y `QUIT`. Pulsar fuera del contenedor solo cierra el diálogo; `QUIT` cierra el diálogo en el servicio y navega a la pantalla de inicio.

La acción principal usa `RestartButtonComponent`, que solo encapsula un botón con etiqueta, estado deshabilitado y evento `restart`. Su significado depende del modo:

| Modo | Acción de `restart` |
| --- | --- |
| Local | Crea una partida nueva con el mismo control de tiempo. |
| Contra IA | Reinicia la partida con la misma configuración de IA. |
| Online | Solicita una revancha al backend; no reinicia el tablero localmente. |

En online, el diálogo recibe además el estado de la petición, etiqueta dinámica como `REQUEST REMATCH` o `SENDING...`, y mensajes como la espera de la respuesta rival. Los fallos de la petición se muestran en el aviso de error online de la pantalla.

En local y contra IA, al terminar una partida se activa el modo de revisión. Se puede cerrar el diálogo y recorrer el historial, pero no crear movimientos nuevos sobre una posición ya finalizada.

## Navegación De Movimientos

`MoveNavigationButtonsComponent` presenta los botones de retroceder y avanzar. Solo aparece si el servicio implementa `undoMove()` y `redoMove()`, actualmente en local y contra IA; las partidas online no permiten que un cliente modifique el historial compartido.

El componente recibe `canUndo`, `canRedo` y `disabled`, y solo emite eventos. La lógica está en `MoveNavigableGame`:

- al deshacer, mueve el último elemento de `moveHistory` a `redoHistory`
- al rehacer, recupera el siguiente movimiento de `redoHistory`
- después reconstruye el `GameState` desde todo el historial mediante `buildGameStateFromMoves()`

La navegación se bloquea durante la pausa o una promoción pendiente. Al moverse por el historial se limpian selección y promoción, se oculta el diálogo de final y el servicio concreto aplica sus propios ajustes: local detiene el reloj y contra IA invalida cálculos pendientes. Tras un final, esta navegación sirve para revisar la partida sin abandonar el modo de solo revisión.

## Avisos Online

En modo online, la parte superior del área de tablero puede mostrar dos tipos de avisos:

- advertencias del estado o mensaje de conexión STOMP, recibidos desde `OnlineRoomService`
- errores de envío del último movimiento o de la solicitud de revancha, expuestos por `OnlineGameService`

Estos avisos no cambian el tablero directamente. Informan de que la sincronización o la petición falló para que el usuario sepa que debe esperar una actualización o reintentar la acción disponible.

## Pruebas

`game.component.spec.ts` cubre comportamientos de coordinación de la interfaz:

- orientación inicial online, cambio de color y rotación manual persistente
- activación y cancelación de la rotación automática local
- restricciones de arrastre por turno y pausa
- estilos de destinos legales, capturas y captura al paso
- bloqueo y delegación de deshacer/rehacer
- delegación de pausa y reanudación
- limpieza de selección al pulsar fuera del área de juego
- salida desde el diálogo de final hacia la pantalla de inicio

Los componentes auxiliares no tienen pruebas unitarias individuales. Son componentes de presentación con `@Input` y `@Output`; la lógica de partidas se prueba en los servicios y la lógica de reglas en `core/`.
