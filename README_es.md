# 🌍 Idioma / Language

- [English](README.md)
- [Español](README_es.md)

---

# ♟️ Angular Chess

Este proyecto de Angular implementa las reglas fundamentales del ajedrez y proporciona una interfaz local para dos jugadores. El motor de juego está completamente desacoplado de la interfaz, lo que facilita su extensión con inteligencia artificial o multijugador online.

**Mecánicas implementadas:**

- Generación completa de movimientos legales para todas las piezas  
- Juego por turnos con cambio automático de turno  
- Detección de jaque, jaque mate y ahogado  
- Enroque (largo y corto)  
- Promoción de peones (con diálogo interactivo)  
- Captura al paso  
- Validación y simulación de movimientos  
- Cálculo de casillas atacadas  

**Mecánicas pendientes para cumplir completamente con las reglas oficiales:**

- Tablas por triple repetición  
- Tablas por material insuficiente  
- Tablas por regla de los 50 movimientos  
- Tablas por jaque perpetuo (cubierto por triple repetición en la práctica)  
- Tablas por acuerdo mutuo  

---

## ¿Cómo funciona?

El proyecto se ejecuta completamente en el navegador. La lógica del ajedrez reside en el módulo `core`, que es independiente de la interfaz. Los componentes de la interfaz (`ui/game`) dibujan el tablero interactivo y gestionan los clics del usuario. Cuando se selecciona una pieza, los movimientos legales se resaltan utilizando el servicio `legal-move-finder`. Tras realizar un movimiento, los servicios `move-simulator` y `game-state` actualizan el tablero y evalúan la nueva posición.

Los diálogos de promoción y fin de partida están implementados como componentes de Angular y aparecen cuando es necesario.

---

## Estado del Proyecto

**Mecánicas implementadas:**
- [x] Movimiento de piezas y generación de movimientos legales
- [x] Detección de jaque y jaque mate
- [x] Enroque
- [x] Captura al paso
- [x] Promoción de peones (con diálogo)
- [x] Ahogado
- [x] Cálculo de casillas atacadas
- [x] Simulación y validación de movimientos
- [x] Tablero visual interactivo
- [x] Modo local para dos jugadores

**Implementaciones futuras:**
- [ ] Condiciones de tablas restantes (triple repetición, regla de 50 movimientos, etc.)
- [ ] Oponente IA (primero movimientos aleatorios, luego minimax)
- [ ] Multijugador online vía WebSockets (Socket.IO)
- [ ] Historial y repetición de partidas
- [ ] Controles de tiempo ajustables

---

## Tecnologías utilizadas

- Angular (TypeScript)  
- RxJS para la gestión de estado  
- HTML5 / CSS3  
- Pruebas unitarias con Jasmine (ver archivos `.spec.ts`)

---

## Como probarlo

1. Clona el repositorio.  
2. Ejecuta `npm install` para instalar las dependencias.  
3. Ejecuta `ng serve` para levantar el servidor de desarrollo.  
4. Navega a `http://localhost:4200/`.  
