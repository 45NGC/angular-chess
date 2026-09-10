# 🌍 Idioma / Language

- [English](README.md)
- [Español](README_es.md)

---

# ♟️ Angular Chess

`Angular Chess` es una aplicación de ajedrez para navegador construida con Angular 21. Incluye modo local para dos jugadores, modo contra IA con Stockfish ejecutándose en un Web Worker y partidas online respaldadas por un servidor Spring Boot con REST y actualizaciones STOMP.

## Funcionalidades actuales

### Reglas del juego

- Generación completa de movimientos legales para todas las piezas
- Detección de jaque, jaque mate y ahogado
- Enroque corto y largo
- Captura al paso
- Promoción de peones con diálogo de selección de pieza
- Tablas por triple repetición
- Tablas por material insuficiente

### Modos de juego

- Modo local para dos jugadores
- Modo contra IA con Stockfish
- Niveles de dificultad de IA: `beginner`, `intermediate`, `advanced`, `expert`
- Selección de color en partidas contra IA: `white`, `black` o `random`
- Partidas online para dos jugadores mediante códigos de sala compartibles
- Validación autoritativa de movimientos online y actualizaciones de sala en tiempo real

### Interacción y experiencia de juego

- Movimiento por clic y arrastrar/soltar
- Resaltado de movimientos legales
- Resaltado del último movimiento
- Resaltado del rey en jaque
- Rotación manual del tablero
- Rotación automática del tablero en modo local
- Pausa y reanudación en partidas locales y contra IA
- Navegación del historial con deshacer y rehacer en partidas locales y contra IA
- Modo de revisión tras finalizar partidas locales y contra IA
- Sonidos para movimiento, captura, jaque, error, poco tiempo y fin de partida

### Controles de tiempo

- Configuración independiente del reloj para blancas y negras
- Opciones de tiempo base desde `1` hasta `30` minutos
- Opción de tiempo ilimitado
- Incremento por jugada
- Detección de victoria por tiempo
- Relojes sincronizados por el backend en partidas online

## Arquitectura

El frontend se organiza en tres áreas principales:

- `src/app/core`: reglas de ajedrez, modelo del tablero, simulación de movimientos, estado de partida, detección de tablas, utilidades FEN y lógica del reloj local
- `src/app/ui`: componentes standalone de Angular para pantalla inicial, tablero, diálogos, relojes, controles y overlays
- `src/app/services`: coordinación de partidas locales, contra IA y online, además de la comunicación con Stockfish y el backend

Los servicios de juego coordinan cada modo:

- `LocalGameService` gestiona el modo local, los relojes, la pausa/reanudación y la navegación del historial
- `AiGameService` gestiona las partidas contra la IA y se comunica con Stockfish mediante `StockfishService`
- `OnlineGameService` representa el estado de sala aceptado por el servidor y `OnlineRoomService` gestiona las peticiones REST y suscripciones STOMP

El backend online vive en el repositorio independiente `springboot-chess`. Gestiona las salas en memoria, valida los movimientos de forma autoritativa y publica snapshots completos por WebSocket.

## Documentación

La documentación detallada de los flujos de aplicación está disponible en ambos idiomas:

- [Application flows in English](docs/en/01-application-flows/00-overview.md)
- [Flujos de aplicación en español](docs/es/01-flujos-aplicacion/00-vision-general.md)
- [Contrato del backend online](docs/es/online-backend-contract.md)

## Estado del proyecto

Implementado:

- Motor de ajedrez con validación de movimientos legales
- Juego local
- Juego contra IA con Stockfish
- Salas online, validación autoritativa de movimientos y sincronización STOMP
- Controles de tiempo y finalización por tiempo
- Navegación con deshacer y rehacer
- Rotación y auto-rotación del tablero
- Sonidos de juego
- Pruebas unitarias automáticas para la lógica central

Pendiente:

- Persistencia de salas
- Autenticación de usuarios y endurecimiento de sesiones
- Elo y matchmaking
- Tablas por regla de los 50 movimientos
- Tablas por acuerdo mutuo

## Tecnologías

- Angular 21
- TypeScript
- RxJS
- Stockfish 18 mediante Web Worker + WASM
- Backend Spring Boot para el modo online
- Vitest para pruebas unitarias

## Puesta en marcha

### Requisitos

- Node.js
- npm
- Java 21, solo para ejecutar el backend online

### Instalación

```bash
npm install
```

### Desarrollo

```bash
npm start
```

Abre `http://localhost:4200/`.

### Ejecutar el modo online

Las partidas online también necesitan el backend ejecutándose desde el repositorio hermano `springboot-chess`:

```bash
cd ../springboot-chess
./mvnw spring-boot:run
```

Por defecto, el frontend se conecta al backend en el puerto `8080`.

### Build

```bash
npm run build
```

### Pruebas

```bash
npm test
```

## Notas

- La IA se ejecuta completamente en el navegador usando los assets incluidos de Stockfish.
- Las salas online se guardan en memoria y se pierden al reiniciar el backend.
