# Sincronización Online

## Objetivo

Este documento explica cómo se mantiene sincronizado el estado de una sala entre dos navegadores: el snapshot inicial por REST, las actualizaciones en tiempo real con WebSocket/STOMP y la actualización de la interfaz.

## Fuente Del Estado Compartido

En una partida online, el backend mantiene el estado compartido de la sala. El frontend conserva una copia reactiva de ese estado para mostrarlo, pero no decide por sí solo qué cambios son válidos para todos los jugadores.

La unidad de sincronización es `OnlineRoom`. Cada snapshot contiene, entre otros datos:

- el código y estado de la sala
- los dos jugadores y sus colores
- la configuración y el estado del reloj
- el historial de movimientos
- las solicitudes de revancha

En lugar de enviar cambios parciales, el backend publica un snapshot completo de la sala después de cada cambio relevante.

## Estado En El Frontend

`OnlineRoomService` es un servicio global de Angular. Mantiene un `BehaviorSubject` por código de sala dentro de un `Map`.

Esto permite que varios consumidores del mismo navegador, como el lobby y `OnlineGameService`, observen una única copia reactiva del snapshot. Cuando el servicio recibe una sala nueva, llama a `updateRoom(room)` y todos los suscriptores de esa sala reciben el valor actualizado.

Antes de publicar el nuevo valor, el servicio comprueba si el jugador guardado en `localStorage` ha cambiado de color en la sala. Si es así, actualiza `playerSide` en la sesión almacenada. Esto permite mantener la sesión coherente cuando una revancha intercambia los colores.

## Snapshot Inicial Por REST

El método `watchRoom(code)` se usa al entrar en una sala o al crear `OnlineGameService`.

Antes de depender de WebSocket, realiza:

`GET /api/online/rooms/{code}`

La respuesta proporciona el snapshot actual de la sala. Esto es importante porque un cliente puede entrar después de que ya se hayan publicado eventos o puede estar restaurando una sesión tras una recarga.

Si el backend devuelve una sala, el frontend actualiza el `BehaviorSubject`. Si devuelve `room: null` o la petición falla, publica `null` para esa sala.

Además, las respuestas correctas de crear sala, unirse, enviar un movimiento o solicitar revancha también incluyen un snapshot. `OnlineRoomService` los aplica directamente, por lo que el cliente que inicia una acción no tiene que esperar al evento WebSocket para verse actualizado.

## Conexión WebSocket Y STOMP

En paralelo al snapshot REST, `watchRoom(code)` registra la sala para recibir actualizaciones en tiempo real.

El frontend crea un único cliente STOMP para el navegador y se conecta a:

`/ws`

Cuando la conexión está disponible, se suscribe al topic específico de la sala:

`/topic/online/rooms/{code}`

El servicio evita crear suscripciones duplicadas para un mismo código. Si hay varias salas registradas, el mismo cliente STOMP puede mantener un topic por cada una.

## Eventos Recibidos

Los mensajes STOMP tienen esta estructura:

```json
{
  "room": {
    "code": "ABC123"
  }
}
```

Al recibir un mensaje, `OnlineRoomService`:

1. Convierte el cuerpo del mensaje desde JSON.
2. Extrae el snapshot `room`.
3. Actualiza el `BehaviorSubject` correspondiente.

Los mensajes malformados se ignoran para que una trama incorrecta no cierre la escucha de la sala.

## Publicación Desde El Backend

Spring Boot expone el endpoint STOMP `/ws` y habilita el broker simple para destinos que empiezan por `/topic`.

`StompOnlineRoomTopicPublisher` publica cada snapshot mediante `SimpMessagingTemplate` en:

`/topic/online/rooms/{code}`

`InMemoryOnlineRoomService` publica una actualización cuando:

- se crea una sala
- se une el segundo jugador
- se acepta un movimiento
- cambia el estado al consultar una sala, por ejemplo al materializar un tiempo agotado
- se registra una solicitud de revancha o se reinicia la sala para una revancha

Los clientes no envían movimientos por WebSocket. Las acciones que cambian el juego se mandan por REST; WebSocket solo distribuye el estado aceptado por el backend.

## Actualización De `OnlineGameService`

`OnlineGameService` se suscribe a `watchRoom(session.roomCode)` al construirse.

Con cada snapshot, `applyRoom()`:

- actualiza el estado y el control de tiempo de la sala
- comprueba si el identificador del jugador conserva el mismo color
- actualiza los valores base del reloj y su marca temporal
- convierte `room.moves` en el historial local
- reconstruye `GameState` a partir de ese historial
- actualiza o limpia la selección y la promoción pendiente si ya no son válidas
- muestra el diálogo de fin si la sala o el estado de ajedrez han terminado
- reproduce el sonido del último movimiento recibido cuando corresponde

El servicio no aplica movimientos de forma aislada en cada cliente. Reconstruir el tablero desde el historial recibido garantiza que ambos usan la misma secuencia aceptada por el servidor.

Al final de cada actualización, solicita detección de cambios a Angular. `GameComponent` vuelve a leer el tablero, los relojes y el resto de getters del servicio para reflejar el nuevo estado en pantalla.

## Sincronización Del Reloj

El snapshot contiene `whiteTimeMs`, `blackTimeMs`, `activeClockColor` y `clockUpdatedAt`.

El backend es quien guarda esos valores. Para mostrar un reloj que avance entre snapshots, `OnlineGameService` calcula localmente el tiempo transcurrido desde `clockUpdatedAt` cuando la sala está en estado `playing`.

Así, los dos navegadores pueden mostrar un reloj fluido sin que el servidor publique un evento cada segundo. El backend vuelve a materializar el tiempo real cuando procesa una operación relevante, como consultar la sala o enviar un movimiento.

## Ejemplo De Actualización Por Movimiento

El recorrido normal de un movimiento aceptado es:

1. Un jugador envía su jugada por REST.
2. El backend la valida y construye un nuevo `OnlineRoom` con el movimiento, turno y reloj actualizados.
3. El backend guarda ese snapshot y lo publica por STOMP.
4. El cliente que movió actualiza su estado con la respuesta REST.
5. El rival recibe el mismo snapshot por el topic STOMP.
6. Ambos `OnlineGameService` reconstruyen el mismo tablero y actualizan la interfaz.

El detalle de la validación y el envío de movimientos se documenta en `07-envio-de-movimientos-online.md`.

## Reconexión Y Limitaciones Actuales

Si se cierra la conexión, el cliente muestra el estado `disconnected` e intenta reconectarse cada cinco segundos. Al reconectar, vuelve a suscribirse a los topics registrados.

REST y WebSocket se complementan, pero el sistema todavía tiene una limitación: después de una reconexión WebSocket no se solicita automáticamente un nuevo snapshot REST. Si se perdió una actualización mientras el canal estaba desconectado, el estado se volverá a conciliar cuando se haga otra llamada REST relevante o se vuelva a ejecutar `watchRoom(code)`.
