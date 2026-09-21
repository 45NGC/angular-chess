# Estructura General

## Objetivo

Este documento ofrece un mapa inicial de los dos repositorios que forman la aplicación. Los archivos de `01-flujos-aplicacion` explican qué ocurre durante cada acción; esta carpeta explica dónde se encuentra el código responsable.

## Los Dos Repositorios

El proyecto está dividido en dos aplicaciones que pueden ejecutarse de forma independiente:

| Repositorio | Tecnología principal | Papel |
| --- | --- | --- |
| `angular-chess` | Angular, TypeScript y RxJS | Interfaz, lógica de partida local y contra IA, y cliente del modo online. |
| `springboot-chess` | Spring Boot y Java | API REST, WebSocket/STOMP, estado de salas y validación autoritativa de partidas online. |

El frontend no necesita el backend para los modos local y contra IA. El modo online sí necesita que los dos procesos estén activos, porque el navegador consulta y actualiza salas a través del backend.

## Relación Entre Ambos

La comunicación tiene dos canales:

- REST para crear salas, unirse, obtener su snapshot, enviar movimientos y solicitar revancha
- WebSocket con STOMP para recibir snapshots actualizados de una sala

Durante el desarrollo, Angular se sirve normalmente en `http://localhost:4200` y Spring Boot en el puerto `8080`. `angular-chess/src/environments/environment.shared.ts` construye las URLs REST y WebSocket del backend. `springboot-chess/src/main/resources/application.properties` define, entre otras cosas, el origen permitido por CORS.

El backend no depende del código Angular. El frontend conoce el contrato de sus endpoints y mensajes, pero no importa clases Java. Esto permite ejecutar, probar y desplegar cada proyecto por separado.

## Lógica De Ajedrez En Ambos Lados

Los dos repositorios contienen lógica de ajedrez:

- el frontend la usa para mostrar destinos legales, responder de forma inmediata a la interacción y gestionar las partidas sin servidor
- el backend reconstruye la partida y calcula los movimientos legales para decidir si una acción online es válida

Esta duplicación es deliberada en el MVP. El cliente mejora la experiencia de usuario, pero el servidor no confía en él. Una jugada online solo se guarda cuando la lógica del backend también la acepta.

## Estructura De `angular-chess`

```text
angular-chess/
├── docs/                 Documentación general del proyecto en español e inglés
├── public/               Recursos públicos, como el favicon
├── src/
│   ├── app/              Código Angular de la aplicación
│   ├── assets/           Piezas, sonidos y archivos de Stockfish
│   └── environments/     Configuración de conexión con el backend
├── angular.json          Configuración de Angular CLI
├── package.json          Dependencias y scripts de npm
├── README.md             Introducción en inglés
└── README_es.md          Introducción en español
```

Dentro de `src/app/` se encuentran las áreas principales:

| Carpeta | Responsabilidad |
| --- | --- |
| `core/` | Lógica pura de tablero, reglas, FEN, estado de juego y reloj local. |
| `interfaces/` | Contratos TypeScript compartidos entre componentes y servicios. |
| `services/` | Coordinación de los modos de juego, Stockfish, sonido y comunicación online. |
| `ui/` | Componentes Angular de la pantalla de inicio, partida, tablero y diálogos. |

## Estructura De `springboot-chess`

```text
springboot-chess/
├── docs/                 Documentación específica del contrato del backend
├── src/
│   ├── main/
│   │   ├── java/com/angularchess/backend/
│   │   │   ├── chess/    Reglas y modelos de ajedrez del servidor
│   │   │   ├── config/   CORS y configuración WebSocket/STOMP
│   │   │   └── online/   Salas, API, persistencia en memoria y publicación de eventos
│   │   └── resources/    Propiedades de configuración de Spring Boot
│   └── test/             Pruebas del backend
├── pom.xml               Dependencias y configuración de Maven
├── mvnw                  Maven Wrapper para sistemas Unix
└── README.md             Introducción y ejecución del backend
```

El paquete `online/` está organizado por responsabilidad:

| Carpeta | Responsabilidad |
| --- | --- |
| `controller/` | Endpoints REST que reciben las peticiones del frontend. |
| `dto/` | Cuerpos de petición, respuesta y eventos publicados. |
| `model/` | Modelos de sala, jugador, tiempo, movimiento y enums del modo online. |
| `repository/` | Abstracción de almacenamiento y su implementación actual en memoria. |
| `service/` | Reglas de negocio de salas, movimientos, reloj y revancha. |
| `websocket/` | Publicación de snapshots de sala en topics STOMP. |

## Documentación Y Punto De Entrada

La documentación general se centraliza en `angular-chess/docs/`:

```text
docs/
├── es/
│   ├── 01-flujos-aplicacion/
│   └── 02-mapa-codigo/
└── en/
    ├── 01-application-flows/
    └── 02-code-map/
```

El contrato específico de la comunicación online está disponible como `online-backend-contract.md` en la documentación de ambos repositorios. Conviene consultarlo junto a los documentos de `online/controller`, `online/dto` y `OnlineRoomService` cuando se quiera seguir una petición de extremo a extremo.

## Ejecución En Desarrollo

Cada repositorio tiene sus propios comandos y dependencias:

| Proyecto | Instalación | Desarrollo | Pruebas |
| --- | --- | --- |
| `angular-chess` | `npm install` | `npm start` | `npm test` |
| `springboot-chess` | Maven Wrapper incluido | `./mvnw spring-boot:run` | `./mvnw test` |

Para probar el modo online se ejecutan ambos proyectos. Para desarrollar el tablero, las reglas, el modo local o Stockfish, basta con ejecutar el frontend.

## Cómo Continuar El Mapa

Los siguientes archivos describirán el frontend por áreas y después el backend por paquetes. El orden propuesto permite empezar por la lógica de juego y los servicios que usa Angular antes de revisar la implementación del servidor.
