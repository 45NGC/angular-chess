# Frontend: `interfaces/`

## Objetivo

`src/app/interfaces/` define los contratos TypeScript que intercambian componentes, servicios y la comunicación online. No contiene lógica ejecutable: describe la forma esperada de datos y operaciones para que las distintas partes de Angular puedan colaborar sin depender de detalles de implementación.

```text
interfaces/
├── ai-mode.interface.ts
├── game-service.interface.ts
├── online-backend-contract.interface.ts
├── online-game-draft.interface.ts
├── online-game-settings.interface.ts
├── online-room.interface.ts
└── time-control.interface.ts
```

Una interfaz de TypeScript existe durante la compilación, no cuando la aplicación está ejecutándose en el navegador. Por ello, ayuda a detectar incompatibilidades al desarrollar, pero no sustituye la validación de formularios, reglas de ajedrez ni validación del backend.

## Tipos De Configuración De Partida

Tres archivos describen la configuración elegida antes de iniciar cada modo:

| Archivo | Contratos | Uso principal |
| --- | --- | --- |
| `time-control.interface.ts` | `SideTimeControl`, `TimeControl` | Configuración de reloj local y online. |
| `ai-mode.interface.ts` | `AiDifficulty`, `PlayerColor`, `AiModeSettings` | Dificultad y color de una partida contra IA. |
| `online-game-settings.interface.ts` | `OnlineGameSettings` | Control de tiempo y preferencia de color del anfitrión online. |

`TimeControl` mantiene una configuración independiente para blancas y negras:

```ts
{
  white: { baseMinutes, incrementSeconds },
  black: { baseMinutes, incrementSeconds }
}
```

El mismo contrato pasa desde `TimeControlSettingsFormComponent` a los diálogos local y online, y después a `LocalGameService` o al backend. Esto evita tener una estructura de tiempo distinta para cada modo.

`AiModeSettings` limita la dificultad a `beginner`, `intermediate`, `advanced` o `expert`, y el color a `white`, `black` o `random`. `OnlineGameSettings` reutiliza `PlayerColor` para `hostSidePreference`, ya que la preferencia del anfitrión también admite esos tres valores.

## `IGameService`: Contrato Común De La Pantalla De Juego

`game-service.interface.ts` contiene `IGameService`, el contrato central entre `GameComponent` y los servicios que representan una partida:

```text
GameComponent
     │ usa IGameService
     ├── LocalGameService
     ├── AiGameService
     └── OnlineGameService
```

El componente guarda su servicio activo como `IGameService | null`. De este modo puede leer datos comunes sin necesitar una plantilla distinta para cada modo:

- `state`, `selectedSquare` y `legalMoves`
- diálogos de promoción y fin de partida
- `handleSquareClick()`, `onPromotionSelected()` y `clearSelection()`
- `resetGame()`, `closeGameOverDialog()` y `getResultMessage()`

Las capacidades que no existen en todos los modos se declaran como opcionales:

| Capacidad opcional | Disponible en |
| --- | --- |
| Pausa y reanudación | Local y contra IA. |
| Historial, deshacer, rehacer y revisión | Local y contra IA. |
| Datos de reloj | Local y online. |
| `destroy()` | Servicios que necesitan liberar temporizadores, workers o suscripciones. |

Por ejemplo, `GameComponent` comprueba si `pause` y `resume` son funciones antes de mostrar controles de pausa, y usa encadenamiento opcional para los botones de historial. Así, el modo online puede omitir esas funciones sin obligar al componente a conocer la implementación de los otros dos modos.

`GameplayService` implementa el comportamiento común de este contrato. `LocalGameService`, `AiGameService` y `OnlineGameService` lo completan con sus responsabilidades propias. Para elementos exclusivos del modo online, como mensajes de conexión o revancha, `GameComponent` usa además `instanceof OnlineGameService`; el resto de la pantalla sigue dependiendo del contrato común.

## Modelo De Sala Online

`online-room.interface.ts` describe el estado compartido de una sala y los resultados de acciones online.

| Contrato | Responsabilidad |
| --- | --- |
| `OnlineRoom` | Snapshot completo de una sala: jugadores, estado, reloj, historial, revancha y fechas. |
| `OnlineRoomPlayer` | Identificador, color, presencia y fecha de unión de un participante. |
| `OnlineMoveRecord` | Movimiento aceptado, color que lo realizó y momento en que se jugó. |
| `OnlineRoomSession` | Contexto local del jugador: código de sala, `playerId` y color. |
| `OnlineRoomStatus` | Estados `waiting`, `ready`, `playing` y `finished`. |
| `OnlineRoomSide` | Color de una plaza de la sala: `white` o `black`. |

`OnlineRoom` es la unidad de sincronización. `OnlineRoomService` mantiene un `BehaviorSubject<OnlineRoom | null>` por código, y `OnlineGameService` reconstruye el tablero desde `room.moves` cuando recibe un snapshot nuevo.

`OnlineRoomSession` se guarda en `localStorage` para restaurar la identidad local tras navegar o recargar. Es un contrato de continuidad del MVP, no una credencial de autenticación segura.

### Resultados Con Éxito O Error

El mismo archivo define uniones discriminadas para unión, movimiento y revancha:

```ts
type SubmitOnlineMoveResult =
  | { ok: true; room: OnlineRoom }
  | { ok: false; error: SubmitOnlineMoveError };
```

Después de comprobar `result.ok`, TypeScript sabe si hay un `room` válido o un código de error. Esto evita acceder accidentalmente a ambos campos a la vez y obliga a manejar los errores definidos por el contrato.

Los códigos disponibles son tipos literales, no textos libres. Por ejemplo, un movimiento puede devolver `notFound`, `notParticipant`, `illegalMove`, `notYourTurn` o `finished`. `OnlineGameService` traduce cada código al mensaje que muestra la interfaz.

## Contrato HTTP Y WebSocket

`online-backend-contract.interface.ts` define los cuerpos REST que usa `OnlineRoomService`:

| Operación | Request | Response |
| --- | --- | --- |
| Crear sala | `CreateOnlineRoomRequest` | `CreateOnlineRoomResponse` |
| Unirse | `JoinOnlineRoomRequest` | `JoinOnlineRoomResponse` |
| Consultar sala | Sin cuerpo | `GetOnlineRoomResponse` |
| Enviar movimiento | `SubmitOnlineMoveRequest` | `SubmitOnlineMoveResponse` |
| Solicitar revancha | `RequestOnlineRematchRequest` | `RequestOnlineRematchResponse` |

`OnlineRoomService` usa esos tipos como parámetros genéricos de `HttpClient`, por ejemplo `http.post<SubmitOnlineMoveResponse>(...)`. Por tanto, el servicio recibe un resultado tipado antes de decidir si actualiza el snapshot o comunica un error.

Las request de movimiento reutilizan `Move`, que vive en `core/rules/` porque también representa una jugada local. Esto garantiza que la forma que envía el navegador al backend coincide con la que usan el tablero, el historial y los servicios de juego.

El backend define records Java equivalentes en `online/dto` y `online/model`. No existe un paquete de tipos compartido entre TypeScript y Java: la compatibilidad depende de mantener los mismos nombres y estructuras JSON en ambos repositorios, además de las pruebas y la documentación del contrato.

### Snapshot STOMP Actual

El archivo también declara `OnlineRoomEvent` y `OnlineRoomEventType`, con posibles tipos como `roomUpdated` o `gameFinished`. Esos tipos no participan en el flujo STOMP actual.

Actualmente el backend publica `OnlineRoomUpdateEvent`, cuyo cuerpo contiene únicamente:

```ts
{ room: OnlineRoom }
```

`OnlineRoomService` interpreta ese formato mediante la interfaz local `OnlineRoomUpdateEvent`. Si en el futuro se añadiera un campo `type` a los mensajes STOMP, `OnlineRoomEvent` podría convertirse en el contrato activo; hasta entonces representa una posible envoltura de evento, no la utilizada por la aplicación.

## Borrador Online No Usado

`online-game-draft.interface.ts` define `OnlineGameDraft`, formado por un código, un `TimeControl` y la fecha de creación. No está importado por el flujo actual de la aplicación.

Puede servir como base para guardar un formulario o una sala pendiente antes de crearla, pero actualmente las opciones se mantienen directamente en los componentes de inicio y en `OnlineGameSettings`.

## Cómo Desacoplan El Código

Las interfaces reducen el acoplamiento en varios puntos:

- Un componente de configuración emite `TimeControl` o `AiModeSettings`, sin saber quién consumirá esos datos.
- `HomeComponent` y los diálogos intercambian `OnlineGameSettings`, sin llamar directamente al backend.
- `GameComponent` usa `IGameService`, sin contener tres implementaciones de partida.
- `OnlineRoomService` encapsula REST y STOMP, exponiendo `OnlineRoom` y resultados tipados al resto del frontend.
- Los servicios online trabajan con modelos de sala en lugar de depender de JSON sin tipar distribuido por componentes.

El resultado no elimina todas las dependencias: los servicios concretos todavía conocen las reglas de ajedrez, y el contrato online debe evolucionar a la vez que el backend. Sí concentra esas dependencias en contratos pequeños y explícitos, en lugar de repartir propiedades y strings arbitrarios por la aplicación.

## Al Cambiar Un Contrato Online

Un cambio en un campo de `OnlineRoom`, una petición REST o un código de error requiere revisar, como mínimo:

1. La interfaz TypeScript correspondiente.
2. `OnlineRoomService` y los consumidores del dato.
3. El record o DTO Java equivalente en `springboot-chess`.
4. La lógica del backend que crea, valida o publica el valor.
5. Las pruebas y `online-backend-contract.md`.

Seguir este recorrido reduce el riesgo de que el frontend compile con una estructura que el backend ya no envía, o de que el backend acepte un valor que el cliente no contempla.

## Límites De Los Tipos

TypeScript desaparece al compilar a JavaScript. Un navegador modificado, una respuesta de red malformada o una petición manual pueden ignorar estas interfaces. Por eso:

- los formularios limitan las opciones que puede elegir la interfaz
- la lógica de ajedrez calcula jugadas legales
- Spring Boot valida DTOs y vuelve a validar las jugadas online

Las interfaces mejoran la claridad y detectan errores de integración pronto, pero la seguridad y la validez final permanecen en las comprobaciones de tiempo de ejecución.
