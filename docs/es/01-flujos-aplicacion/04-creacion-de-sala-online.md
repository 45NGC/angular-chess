# Creación De Sala Online

## Objetivo

Este documento describe qué ocurre cuando un usuario crea una sala online: la configuración desde el lobby, la petición REST al backend, la creación del estado compartido y la suscripción a sus actualizaciones.

## Entrada Al Lobby

Desde `HomeComponent`, al pulsar `Online` se abre `online-lobby-dialog`.

El lobby ofrece dos flujos independientes:

- crear una partida nueva y generar un código
- unirse a una sala existente mediante un código

Este documento cubre el primer flujo.

## Configuración De La Sala

Al pulsar `SET UP AND GENERATE CODE`, el lobby abre `online-game-settings-dialog`.

El anfitrión puede configurar:

- el tiempo base y el incremento de blancas
- el tiempo base y el incremento de negras
- su preferencia de color: blancas, negras o aleatorio

Al confirmar, el diálogo devuelve un objeto `OnlineGameSettings`. `HomeComponent` guarda esa configuración como la última usada y el lobby inicia la creación de la sala.

Mientras la petición está en curso, `isSubmitting` evita que se envíen varias creaciones a la vez.

## Petición REST De Creación

`OnlineLobbyDialogComponent` delega la operación en `OnlineRoomService.createRoom(settings)`.

El servicio envía:

`POST /api/online/rooms`

con este formato:

```json
{
  "settings": {
    "timeControlSettings": {
      "white": { "baseMinutes": 5, "incrementSeconds": 0 },
      "black": { "baseMinutes": 5, "incrementSeconds": 0 }
    },
    "hostSidePreference": "random"
  }
}
```

La URL base se toma de `environment.onlineBackend.apiBaseUrl`. En desarrollo, se construye con el mismo host del frontend y el puerto `8080`.

## Creación En El Backend

`OnlineRoomController` recibe la petición en Spring Boot y delega en `InMemoryOnlineRoomService`.

El servicio:

- valida que exista la configuración recibida
- resuelve el color del anfitrión según su preferencia; si es aleatoria, lo decide el servidor
- genera un identificador de jugador
- genera un código único de seis caracteres
- crea una sala con estado `waiting`
- guarda la sala en `InMemoryOnlineRoomRepository`
- publica una actualización de la sala por WebSocket

El código usa letras y números pensados para evitar caracteres ambiguos. Antes de usarlo, el servicio comprueba que no exista ya en el repositorio.

Como el repositorio es en memoria, la sala solo existe mientras el proceso de Spring Boot sigue activo. Reiniciar el backend elimina las salas creadas.

## Estado Inicial De La Sala

Una sala recién creada contiene:

- un único jugador: el anfitrión
- el color asignado a ese jugador
- la configuración de tiempo elegida
- los tiempos iniciales calculados a partir de los minutos configurados
- una lista de movimientos vacía
- el estado `waiting`

El reloj todavía no está activo. La partida no empieza hasta que se una un segundo jugador y se envíe el primer movimiento.

## Respuesta Al Frontend

El backend responde con dos datos principales:

```json
{
  "room": {
    "code": "ABC123",
    "status": "waiting"
  },
  "session": {
    "roomCode": "ABC123",
    "playerId": "player_xxxx",
    "playerSide": "white"
  }
}
```

`room` es el snapshot actual de la sala. `session` identifica al jugador que acaba de crearla y se usa después para entrar y participar en la partida online.

## Guardado De La Sesión

Cuando `OnlineRoomService` recibe una respuesta correcta:

- actualiza el estado reactivo de esa sala en memoria
- guarda la sesión en `localStorage`
- inicia la escucha del topic WebSocket de la sala

La clave de almacenamiento tiene este formato:

`angular-chess.online-session.{codigoDeSala}`

El valor contiene `roomCode`, `playerId` y `playerSide`.

No es un sistema de autenticación. Es una persistencia ligera para que el navegador pueda reconstruir la identidad local del jugador al volver a la ruta online o tras una recarga.

## Suscripción A Actualizaciones

Después de crear la sala, el lobby llama a `watchRoom(code)`.

Este método hace dos cosas:

1. Solicita el snapshot actual con `GET /api/online/rooms/{code}`.
2. Se conecta al endpoint STOMP `/ws` y se suscribe a `/topic/online/rooms/{code}`.

La petición REST proporciona un estado inicial incluso si todavía no ha llegado ningún evento en tiempo real. Los mensajes del topic tienen un objeto `room` y cada uno sustituye el snapshot guardado en el frontend.

El cliente evita crear suscripciones duplicadas para una misma sala. Si la conexión cae, el cliente STOMP intenta reconectar y el lobby muestra un aviso; la creación de sala ya realizada no se pierde por ello.

## Espera Del Anfitrión

Tras crear la sala, el lobby muestra:

- el código generado para compartirlo
- el control de tiempo configurado
- el color preferido y el color finalmente asignado al anfitrión
- el estado `Waiting for opponent`

La sala no navega todavía a `GameComponent`. El anfitrión permanece en el lobby hasta recibir un snapshot cuyo estado sea `ready` o `playing`.

Eso ocurre normalmente cuando otro usuario se une a la sala. La suscripción actualiza el estado y entonces el lobby navega a:

`/game/online`

con `code`, `playerId` y `side` como query params.

## Errores Posibles

Si la petición `POST` falla, el lobby muestra un mensaje indicando que no se ha podido crear la sala y sugiere comprobar que el backend está en ejecución.

Una conexión WebSocket fallida no invalida automáticamente la sala ya creada. El usuario recibe un aviso de que las actualizaciones en tiempo real no están disponibles; cuando la conexión se recupere, el cliente volverá a suscribirse y el lobby podrá detectar automáticamente la entrada del rival.
