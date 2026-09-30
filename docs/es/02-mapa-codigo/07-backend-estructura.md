# Backend: Estructura General

## Objetivo

El backend está en el repositorio `springboot-chess`, dentro de `src/main/java/com/angularchess/backend/`. Es una aplicación Spring Boot que proporciona las salas de partidas online: recibe peticiones REST, conserva el estado de cada sala, valida los movimientos con la lógica de ajedrez y publica actualizaciones mediante WebSocket/STOMP.

```text
src/main/java/com/angularchess/backend/
├── SpringbootChessApplication.java
├── chess/
│   ├── board/
│   ├── model/
│   └── rules/
├── config/
│   ├── WebConfig.java
│   ├── WebSocketConfig.java
│   └── WebSocketDestinations.java
└── online/
    ├── controller/
    ├── dto/
    ├── model/
    ├── repository/
    ├── service/
    └── websocket/
```

`SpringbootChessApplication` es el punto de entrada. La anotación `@SpringBootApplication` inicia el contenedor de Spring, detecta los componentes de los paquetes inferiores y aplica la configuración automática de las dependencias definidas en `pom.xml`.

## Relación Entre Paquetes

La dependencia principal fluye desde las capas de comunicación hacia la lógica de dominio:

```text
Petición REST
     ↓
online/controller
     ↓
online/service
     ├── online/repository
     ├── online/websocket
     └── chess
```

`chess` es independiente de Spring, HTTP y WebSocket. `online` utiliza esa lógica para comprobar los movimientos de una partida remota. `config` no contiene reglas ni salas: configura cómo los clientes pueden llegar a las capas de `online`.

## `chess/`

`chess/` concentra la lógica reutilizable de ajedrez que el backend necesita para ser autoritativo en las partidas online. No conoce jugadores, códigos de sala, peticiones REST ni STOMP.

| Paquete | Responsabilidad |
| --- | --- |
| `chess/board/` | Representación del tablero, lectura de FEN, casillas y derechos de enroque. |
| `chess/model/` | Tipos de dominio compartidos: piezas, colores, resultados y motivos de tablas. |
| `chess/rules/` | Estado de partida, generación de movimientos legales, casillas atacadas, simulación, historial y reglas de tablas. |

Por ejemplo, al recibir un movimiento online, el servicio reconstruye un `GameState` a partir del historial de la sala y usa `LegalMoveFinder` para comprobar si la jugada enviada es legal. Esta separación permite usar la misma lógica sin necesidad de arrancar Spring y evita que el controlador HTTP tenga que conocer reglas de ajedrez.

## `config/`

`config/` contiene la configuración transversal de la aplicación.

### `WebConfig`

`WebConfig` configura CORS para las rutas `/api/**`. Permite los métodos `GET`, `POST` y `OPTIONS` desde los orígenes definidos en `app.cors.allowed-origins`; si no se configura otra cosa, usa `http://localhost:4200`, donde se ejecuta el frontend de Angular durante desarrollo.

### `WebSocketConfig`

`WebSocketConfig` habilita el broker de mensajes de Spring y registra el endpoint STOMP `/ws`. También permite los mismos orígenes configurados para CORS.

El broker simple publica destinos bajo `/topic`; `/app` queda reservado como prefijo de destinos de aplicación. El cliente se suscribe a topics, no ejecuta lógica de sala enviando mensajes STOMP al backend.

### `WebSocketDestinations`

`WebSocketDestinations` centraliza las constantes `/topic`, `/app` y `/ws`. Las clases de configuración y las de publicación pueden reutilizarlas sin duplicar literales de protocolo.

## `online/`

`online/` implementa el caso de uso de las partidas remotas. Mantiene salas de dos personas, sus movimientos, relojes, resultados y solicitudes de revancha.

| Paquete | Responsabilidad |
| --- | --- |
| `controller/` | Endpoints REST bajo `/api/online/rooms`. Delega sin contener reglas de partida. |
| `dto/` | Contratos de entrada, salida y eventos que se serializan para el cliente. |
| `model/` | Modelo de dominio online: sala, jugadores, sesión, movimiento, tiempo, colores, estados y errores tipados. |
| `repository/` | Abstracción para guardar y recuperar salas, con implementación actual en memoria. |
| `service/` | Operaciones de crear, unirse, consultar, mover y pedir revancha; valida y actualiza el estado. |
| `websocket/` | Construcción de topics por sala y publicación de actualizaciones STOMP. |

### Controlador Y DTOs

`OnlineRoomController` expone cinco operaciones: crear una sala, unirse, consultar su snapshot, enviar un movimiento y solicitar revancha. Recibe objetos de `dto/` anotados con `@Valid` y delega cada operación en `OnlineRoomService`.

Los DTOs separan lo que cruza la red de las clases internas. Las respuestas de unión, envío de movimiento y revancha pueden incluir errores de dominio tipados, como sala inexistente, partida terminada, movimiento ilegal o turno incorrecto.

### Servicios

`OnlineRoomService` define el contrato de las operaciones online. `InMemoryOnlineRoomService` es la implementación marcada con `@Service` que Spring inyecta en el controlador.

Esta clase coordina el flujo completo: normaliza códigos con `OnlineRoomCodeService`, genera la sesión del jugador, reconstruye el estado de ajedrez, valida la jugada, actualiza el reloj, guarda el nuevo snapshot y notifica a los clientes. Sus operaciones públicas son `synchronized` para que las modificaciones de una sala no se intercalen dentro de la misma instancia del backend.

### Repositorio En Memoria

`OnlineRoomRepository` permite que el servicio no dependa directamente de una tecnología de persistencia. La implementación actual, `InMemoryOnlineRoomRepository`, usa un `ConcurrentHashMap` con las salas indexadas por código.

Esto significa que las salas existen solo mientras el proceso de Spring Boot está en ejecución. Reiniciar el backend elimina las partidas y no hay compartición entre varias instancias del servidor. En una evolución con base de datos, se podría conservar el contrato del repositorio y sustituir esta implementación.

### Publicación STOMP

`OnlineRoomTopicPublisher` es otra abstracción utilizada por el servicio. `StompOnlineRoomTopicPublisher` usa `SimpMessagingTemplate` para enviar un `OnlineRoomUpdateEvent` al topic de la sala:

```text
/topic/online/rooms/{roomCode}
```

El servicio publica el snapshot tras crear, unir, actualizar o reiniciar una sala. El frontend recibe ese evento mediante la suscripción STOMP que gestiona `OnlineRoomService` de Angular.

## Configuración De Ejecución

`src/main/resources/application.properties` define el nombre de la aplicación y el origen CORS permitido por defecto. El proyecto usa Java 21 y los starters de Spring Boot para validación, MVC y WebSocket, declarados en `pom.xml`.

No hay actualmente paquetes específicos de usuarios, autenticación, seguridad, base de datos ni persistencia. Son límites coherentes con el MVP actual y puntos naturales de extensión para una evolución posterior.
