# Frontend: `ui/home/`

## Objetivo

`src/app/ui/home/` contiene la pantalla de inicio y los componentes que preparan una partida antes de entrar en `GameComponent`. Su responsabilidad es presentar modos, recopilar configuración y coordinar la navegación; no crea tableros ni aplica reglas de ajedrez.

```text
ui/home/
├── ai-mode-settings-dialog/
├── local-game-settings-dialog/
├── online-game-settings-dialog/
├── online-lobby-dialog/
├── time-control-settings-form/
├── home.component.ts
├── home.component.html
└── home.component.css
```

## `HomeComponent`

`home.component.ts` es el componente de la ruta raíz `/`. Muestra tres botones: `Local`, `Online` y `AI`.

Al pulsar uno no navega inmediatamente, sino que activa el diálogo correspondiente:

| Modo | Estado activado | Componente mostrado |
| --- | --- | --- |
| Local | `showTimeControlDialog` | `LocalGameSettingsDialogComponent` |
| Contra IA | `showAiModeDialog` | `AiModeSettingsDialogComponent` |
| Online | `showOnlineLobbyDialog` | `OnlineLobbyDialogComponent` |

La plantilla usa bloques `@if` para crear cada diálogo solo mientras su booleano está activo. Los diálogos se renderizan como overlays sobre la pantalla de inicio, no como rutas nuevas.

### Configuración Recordada

Mientras `HomeComponent` permanece vivo, conserva la última selección en tres propiedades:

- `lastTimeControl`
- `lastAiMode`
- `lastOnlineGameSettings`

Cada diálogo recibe ese valor por `@Input`, de modo que al cerrarlo y abrirlo de nuevo se muestra la selección anterior. Esta memoria solo vive en el componente; no se guarda en `localStorage` ni modifica una partida ya iniciada.

Los valores iniciales son cinco minutos sin incremento para ambos colores, dificultad `beginner` con color aleatorio para IA y preferencia `random` para el anfitrión online.

## Salida Hacia La Partida

Los diálogos emiten valores tipados al componente padre mediante `EventEmitter`. `HomeComponent` transforma esos valores en navegación:

```text
Diálogo de configuración
        │ emite configuración
        ↓
HomeComponent guarda la última selección
        │ crea query params cuando corresponde
        ↓
/game/local  o  /game/ai
        ↓
GameComponent crea el servicio de partida
```

Para local, `onTimeControlConfirm()` navega a `/game/local` con:

- `baseTimeWhite`
- `incrementWhite`
- `baseTimeBlack`
- `incrementBlack`

Para IA, `onAiModeConfirm()` navega a `/game/ai` con `difficulty` y `color`.

El modo online es diferente: el lobby crea o une una sala antes de navegar. Cuando recibe un snapshot con estado `ready` o `playing`, navega a `/game/online` con `code`, `playerId` y `side`.

## Formulario Reutilizable De Tiempo

`time-control-settings-form/` es el componente compartido por los diálogos local y online. Trabaja con el contrato `TimeControl`:

```ts
{
  white: { baseMinutes, incrementSeconds },
  black: { baseMinutes, incrementSeconds }
}
```

Recibe `initial` y emite `settingsChange` cada vez que se modifica una opción. Al recibir el input, clona los valores de blancas y negras. Así, seleccionar una opción dentro del formulario no modifica directamente el objeto que pertenece a su componente padre.

Las opciones visibles son:

| Tipo | Valores |
| --- | --- |
| Tiempo base | `1`, `2`, `3`, `5`, `10`, `15`, `20`, `30` minutos o `0` para ilimitado. |
| Incremento | `0`, `1`, `2`, `3`, `5`, `10`, `15` o `20` segundos. |

El formulario permite una configuración distinta para cada color y muestra un resumen actualizado. No decide qué modo recibirá el control ni inicia ningún reloj.

## Diálogo De Partida Local

`local-game-settings-dialog/` envuelve el formulario de tiempo con título, overlay y botones `START` y `CANCEL`.

Su estado `currentSettings` se inicializa como una copia de `initial` y se reemplaza al recibir cada `settingsChange` del formulario. Al confirmar, emite el `TimeControl` completo; al cancelar, solo emite `cancel`.

El overlay cierra el diálogo cuando se pulsa fuera de su contenedor. El contenedor detiene la propagación del clic para que modificar las opciones no cierre el diálogo accidentalmente.

## Diálogo De Partida Contra IA

`ai-mode-settings-dialog/` configura los dos valores de `AiModeSettings`:

| Opción | Valores |
| --- | --- |
| Dificultad | `beginner`, `intermediate`, `advanced`, `expert`. |
| Color del jugador | `white`, `black`, `random`. |

El componente usa detección de cambios `OnPush`. Mantiene `selectedDifficulty` y `selectedPlayerColor`, muestra un resumen de la selección y emite ambos valores al confirmar.

La plantilla declara `role="dialog"`, `aria-modal="true"`, un título asociado y `aria-pressed` en las opciones seleccionables. Además de cancelar con el botón o pulsando fuera, escucha `Escape` mediante `@HostListener` para cerrar el diálogo.

Los valores aproximados que aparecen junto a cada dificultad, como `~800` o `~2000`, son etiquetas de interfaz. `AiModeSettingsDialogComponent` no calcula Elo ni se comunica con Stockfish.

## Configuración Antes De Crear Una Sala

`online-game-settings-dialog/` combina el formulario de tiempo compartido con la preferencia del color del anfitrión.

La preferencia puede ser `white`, `black` o `random`. El componente crea al confirmar un `OnlineGameSettings` con:

```ts
{
  timeControlSettings,
  hostSidePreference
}
```

Recibe además el input `disabled`. Cuando el lobby está creando una sala, este input desactiva las opciones y los botones para evitar modificaciones o envíos duplicados. Al igual que el diálogo local, trabaja sobre copias de los valores recibidos y solo emite su configuración; no llama al backend directamente.

## `OnlineLobbyDialogComponent`

`online-lobby-dialog/` es el único componente de `ui/home` que se comunica directamente con servicios del modo online. Presenta dos paneles dentro del mismo overlay:

- crear una sala con configuración y código compartible
- unirse a una sala mediante un código de seis caracteres

También contiene de forma condicional `OnlineGameSettingsDialogComponent`, que se abre desde el panel de creación.

### Estado Del Lobby

El componente mantiene:

| Propiedad | Uso |
| --- | --- |
| `joinCode` y `joinError` | Contenido normalizado del input y error de unión visible. |
| `activeRoom` y `activeSession` | Snapshot y sesión de la sala creada o unida. |
| `activeFlow` | Distingue si el usuario creó o se unió a la sala. |
| `isSubmitting` | Bloquea botones mientras hay una petición activa. |
| `connectionState` y `connectionMessage` | Estado de STOMP para mostrar avisos de conexión. |

En el constructor se suscribe a `OnlineRoomService.watchConnectionState()` y `watchConnectionMessage()`. En `ngOnDestroy()` libera esas suscripciones y la suscripción específica de la sala.

### Crear Una Sala

Al confirmar el diálogo de configuración online, el lobby:

1. Emite `settingsChange` para que `HomeComponent` recuerde la selección.
2. Activa `isSubmitting` y cierra el diálogo interno.
3. Llama a `OnlineRoomService.createRoom(settings)`.
4. Guarda `room` y `session` recibidas y empieza a observar la sala.
5. Muestra el código, control de tiempo, preferencia, color asignado y estado actual.

Si la petición HTTP falla, muestra `Could not create the room. Check that the backend is running.`. El código definitivo procede de la respuesta del backend; el componente no lo genera localmente.

### Unirse A Una Sala

Mientras el usuario escribe, `onJoinCodeInput()` delega en `OnlineRoomCodeService.normalizeCode()`: convierte a mayúsculas, elimina caracteres no válidos y limita el valor a seis posiciones. También borra cualquier error anterior.

Al pulsar `CONTINUE`, el componente comprueba:

- que el código tenga seis caracteres válidos
- que no sea la misma sala que el usuario acaba de crear

Después llama a `OnlineRoomService.joinRoom()`. Si la respuesta del backend tiene `ok: false`, convierte `notFound`, `full` o `finished` en un texto visible. Los fallos HTTP muestran un mensaje de conexión genérico.

Al unirse correctamente, guarda la sesión, comienza a observar la sala y muestra un resumen equivalente al de creación.

### Espera Y Navegación

`watchRoom(code)` sustituye la suscripción anterior y observa el `OnlineRoom` reactivo de ese código. Cada snapshot actualiza el resumen del lobby.

Mientras una sala creada está en `waiting`, el anfitrión permanece en el lobby. Cuando la sala alcanza `ready` o `playing`, y hay una sesión activa, el componente navega a la pantalla online. Este mismo criterio permite al jugador que se une entrar inmediatamente después de recibir la sala preparada.

El snapshot y los cambios posteriores se reciben mediante el trabajo conjunto de REST y STOMP dentro de `OnlineRoomService`; el lobby solo reacciona al observable que ese servicio expone.

## Relación Entre Componentes

La comunicación principal usa inputs y outputs:

```text
HomeComponent
    │ initial / initialSettings
    ├── LocalGameSettingsDialogComponent
    │       └── TimeControlSettingsFormComponent
    ├── AiModeSettingsDialogComponent
    └── OnlineLobbyDialogComponent
            └── OnlineGameSettingsDialogComponent
                    └── TimeControlSettingsFormComponent
```

Los hijos reciben datos de configuración por `@Input` y devuelven acciones por `@Output`. Esto permite reutilizar el formulario de tiempo y mantener la navegación centralizada en `HomeComponent`, salvo la transición online que depende del estado real de la sala.

## Estilos Y Límites Actuales

Cada componente tiene su propio archivo CSS junto a su plantilla. Esto mantiene los estilos de overlays, paneles, controles y formularios próximos a la estructura que modifican.

Los textos visibles de la pantalla de inicio y sus diálogos están escritos directamente en las plantillas y componentes, actualmente en inglés. No existe todavía una capa de traducciones, por lo que añadir idiomas requerirá extraer estos textos a claves de internacionalización.

## Pruebas

`online-lobby-dialog.component.spec.ts` cubre tres comportamientos del componente más conectado:

- borrar un error previo mientras se escribe un código
- mostrar `Room not found.` y restaurar el estado de carga tras un error de unión
- mostrar el aviso cuando las actualizaciones en vivo no están disponibles

Los demás componentes de `ui/home` no tienen todavía pruebas unitarias específicas. Su lógica se apoya principalmente en contratos de configuración simples y eventos de Angular.
