# 🌍 Idioma / Language

- [English](README.md)
- [Español](README_es.md)

---

# ♟️ Angular Chess

`Angular Chess` es una aplicación de ajedrez para navegador construida con Angular 21. Incluye modo local para dos jugadores, modo contra IA con Stockfish ejecutándose en un Web Worker, relojes configurables, navegación por historial de jugadas y un motor de ajedrez desacoplado de la interfaz.

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

### Interacción y experiencia de juego

- Movimiento por clic y arrastrar/soltar
- Resaltado de movimientos legales
- Resaltado del último movimiento
- Resaltado del rey en jaque
- Rotación manual del tablero
- Rotación automática del tablero en modo local
- Pausa y reanudación
- Navegación del historial con deshacer y rehacer
- Modo de revisión tras finalizar la partida
- Sonidos para movimiento, captura, jaque, error, poco tiempo y fin de partida

### Controles de tiempo

- Configuración independiente del reloj para blancas y negras
- Opciones de tiempo base desde `1` hasta `30` minutos
- Opción de tiempo ilimitado
- Incremento por jugada
- Detección de victoria por tiempo

## Arquitectura

El proyecto se divide en dos partes principales:

- `src/app/core`: reglas de ajedrez, modelo del tablero, simulación de movimientos, estado de partida, detección de tablas, utilidades FEN y lógica del reloj local
- `src/app/ui`: componentes standalone de Angular para pantalla inicial, tablero, diálogos, relojes, controles y overlays

Los servicios de juego coordinan cada modo:

- `LocalGameService` gestiona el modo local, los relojes, la pausa/reanudación y la navegación del historial
- `AiGameService` gestiona las partidas contra la IA y se comunica con Stockfish mediante `StockfishService`

## Estado del proyecto

Implementado:

- Motor de ajedrez con validación de movimientos legales
- Juego local
- Juego contra IA con Stockfish
- Controles de tiempo y finalización por tiempo
- Navegación con deshacer y rehacer
- Rotación y auto-rotación del tablero
- Sonidos de juego
- Pruebas unitarias automáticas para la lógica central

Pendiente:

- Modo `Online`
- Tablas por regla de los 50 movimientos
- Tablas por acuerdo mutuo

## Tecnologías

- Angular 21
- TypeScript
- RxJS
- Stockfish 18 mediante Web Worker + WASM
- Vitest para pruebas unitarias

## Puesta en marcha

### Requisitos

- Node.js
- npm

### Instalación

```bash
npm install
```

### Desarrollo

```bash
npm start
```

Abre `http://localhost:4200/`.

### Build

```bash
npm run build
```

### Pruebas

```bash
npm test
```

## Notas

- La pantalla inicial sigue mostrando un botón `Online`, pero ese modo todavía no está implementado.
- La IA se ejecuta completamente en el navegador usando los assets incluidos de Stockfish.
