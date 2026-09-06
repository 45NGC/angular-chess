# Unión A Sala Online

## Objetivo

Este documento describe el flujo para unirse a una sala online existente: introducción y validación del código, petición al backend, errores posibles y transición a una partida activa.

## Introducción Del Código

En `online-lobby-dialog`, el usuario introduce el código de una sala en el campo `Game code` y pulsa `CONTINUE`.

Con cada cambio en el campo, `OnlineRoomCodeService` normaliza el valor:

- convierte las letras a mayúsculas
- elimina caracteres que no sean letras ni números
- limita el resultado a seis caracteres

La aplicación considera válido un código normalizado que tenga exactamente seis caracteres. Esta validación comprueba su formato, pero no garantiza todavía que la sala exista.

## Validaciones En El Frontend

Antes de enviar la petición, el lobby comprueba:

- que no haya otra operación en curso mediante `isSubmitting`
- que el código tenga seis caracteres tras normalizarse
- que el código no coincida con la sala asociada a la sesión activa del propio navegador

Si el código no es válido, no se llama al backend y se muestra el mensaje `Enter a valid 6-character code.`

Si ya hay una sesión activa para ese código, tampoco se envía la petición. La interfaz muestra que el usuario ya es el anfitrión de esa sala; en la práctica, esta comprobación evita repetir una operación sobre la sala actual.

## Petición De Unión

Cuando las validaciones pasan, `OnlineLobbyDialogComponent` llama a `OnlineRoomService.joinRoom(code)`.

El servicio vuelve a normalizar el código y envía:

`POST /api/online/rooms/{code}/join`

con este cuerpo:

```json
{
  "code": "ABC123"
}
```

El código de la ruta identifica la sala que se quiere abrir. El backend también valida que el campo `code` del cuerpo no esté vacío.

## Validaciones En El Backend

`OnlineRoomController` recibe la petición y delega en `InMemoryOnlineRoomService`.

El servicio normaliza el código de la ruta y comprueba, en este orden:

- que la sala exista
- que no esté terminada
- que tenga un color libre para un segundo jugador

La asignación del color no depende de una preferencia del jugador que se une. El servidor le entrega el único color disponible:

- si falta el jugador blanco, recibe blancas
- en caso contrario, si falta el jugador negro, recibe negras

Si las dos plazas están ocupadas, la sala se considera llena.

## Actualización De La Sala

Cuando la unión es válida, el backend:

- crea un nuevo identificador para el segundo jugador
- lo añade en el color libre
- cambia el estado de la sala de `waiting` a `ready`
- conserva la configuración de tiempo y la lista de movimientos vacía
- guarda el nuevo snapshot en el repositorio en memoria
- publica la actualización en `/topic/online/rooms/{code}`

La sala está preparada para jugar, pero no pasa a `playing` hasta que se acepta el primer movimiento.

## Respuesta Correcta

El backend devuelve:

```json
{
  "ok": true,
  "room": {
    "code": "ABC123",
    "status": "ready"
  },
  "session": {
    "roomCode": "ABC123",
    "playerId": "player_xxxx",
    "playerSide": "black"
  }
}
```

La sesión identifica al jugador que se acaba de unir y contiene el color que el servidor le ha asignado.

Al recibir una respuesta correcta, `OnlineRoomService`:

- actualiza el snapshot de la sala en memoria
- guarda `roomCode`, `playerId` y `playerSide` en `localStorage`
- inicia o reutiliza la suscripción STOMP del topic de la sala

Después, el lobby guarda la sesión como activa y llama a `watchRoom(code)`, que solicita también un snapshot por REST para sincronizar el estado inicial.

## Errores De Dominio

Los errores normales de unión no se tratan como fallos de red. El backend responde con `ok: false` y un código de error:

| Error | Significado | Mensaje mostrado |
| --- | --- | --- |
| `notFound` | No existe una sala con ese código. | `Room not found.` |
| `full` | Las dos plazas de la sala ya están ocupadas. | `This room is already full.` |
| `finished` | La sala ya terminó. | `This room has already finished.` |

En estos casos el lobby mantiene al usuario en la pantalla actual, muestra el mensaje correspondiente y permite introducir otro código.

## Fallos De Comunicación

Si la petición HTTP no llega al backend o falla de forma inesperada, el observable entra por su rama de error. El lobby muestra:

`Could not reach the backend. Check that Spring Boot is running.`

La conexión WebSocket se gestiona de forma independiente. Si falla, la sala puede haberse unido correctamente por REST, pero el usuario verá un aviso de que las actualizaciones en tiempo real no están disponibles hasta que la conexión se recupere.

## Transición A La Partida

Al guardar el snapshot con estado `ready`, la suscripción del jugador que se une recibe esa actualización de inmediato. A la vez, el anfitrión recibe el evento publicado por el backend en su propia suscripción.

El lobby navega cuando recibe una sala con estado `ready` o `playing` y existe una sesión activa. La ruta resultante es:

`/game/online?code=ABC123&playerId=player_xxxx&side=black`

`GameComponent` usa esos parámetros, o la sesión almacenada si es necesario, para crear `OnlineGameService`. Desde ese momento ambos clientes observan el mismo snapshot de sala y pueden continuar con el flujo de la partida online.
