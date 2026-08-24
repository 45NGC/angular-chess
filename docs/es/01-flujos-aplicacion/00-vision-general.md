# Visión General

## Objetivo De La Aplicación

Esta aplicación es un proyecto de ajedrez web dividido en dos partes:

- un frontend en Angular encargado de la interfaz, la interacción y buena parte de la lógica de juego
- un backend en Spring Boot encargado del modo online y del estado compartido entre jugadores

El proyecto tiene un enfoque claramente didáctico. No busca resolver todos los problemas de una plataforma de ajedrez completa, sino servir como base para entender cómo se relacionan el frontend y el backend en una aplicación web real con estado, navegación, comunicación HTTP y actualizaciones en tiempo real.

## Alcance Actual

En el estado actual del proyecto, la aplicación permite jugar al ajedrez en tres modos:

- partida local entre dos jugadores en el mismo navegador
- partida contra la IA usando Stockfish en el propio frontend
- partida online entre dos jugadores mediante una sala compartida gestionada por el backend

Además, la aplicación incluye varias capacidades comunes a esos modos:

- validación de movimientos legales
- detección de jaque, mate y tablas soportadas
- control de tiempo configurable
- diálogos de configuración antes de empezar la partida
- sonidos y elementos visuales para mejorar la experiencia de juego

## Papel Del Frontend

Sus responsabilidades principales son:

- mostrar la pantalla inicial y los diálogos de configuración
- navegar entre la pantalla principal y la pantalla de juego
- renderizar el tablero, las piezas, los relojes y los overlays
- interpretar la interacción del usuario, ya sea por clic o por arrastrar y soltar
- mantener el estado de una partida local o contra IA
- comunicarse con Stockfish en el modo contra IA
- comunicarse con el backend en el modo online
- reaccionar a cambios del estado remoto cuando la partida es online

## Papel Del Backend

Sus responsabilidades principales son:

- crear salas online con un código compartible
- permitir que otro jugador se una a una sala existente
- mantener el estado actual de cada sala
- validar los movimientos enviados por los clientes
- aplicar los cambios aceptados al estado de la partida
- detectar el final de la partida online
- publicar snapshots actualizados de la sala por WebSocket

## Reparto De Responsabilidades Por Modo

### Partida Local

En el modo local, todo ocurre en el navegador:

- el usuario configura el tiempo
- el frontend crea la partida
- el frontend valida movimientos
- el frontend actualiza el tablero y los relojes
- el frontend detecta el fin de la partida

El backend no interviene.

### Partida Contra IA

En este modo, casi todo sigue ocurriendo en el navegador:

- el jugador elige dificultad y color
- el frontend mantiene el estado de la partida
- Stockfish calcula el movimiento de la IA dentro de un Web Worker
- el frontend aplica ese movimiento y actualiza la interfaz

El backend tampoco interviene.

### Partida Online

En el modo online, frontend y backend colaboran de forma constante:

- el frontend abre el lobby y permite crear o unirse a una sala
- el backend genera o recupera la sala correspondiente
- el frontend consulta el snapshot inicial y se suscribe a actualizaciones
- el backend publica cambios cuando el estado de la sala cambia
- cada jugada aceptada en servidor se refleja después en ambos clientes

## Flujo General Del Usuario

A nivel alto, el recorrido principal del usuario es el siguiente:

1. El usuario entra en la pantalla principal.
2. Elige un modo de juego.
3. Según el modo, configura tiempo, color o acceso a una sala online.
4. La aplicación navega a la pantalla de juego.
5. El servicio de juego correspondiente inicializa el estado.
6. La interfaz refleja la partida y responde a las acciones del usuario.

Este flujo general es el punto de partida del resto de documentos de la carpeta `01-flujos-aplicacion`.

## Decisiones Relevantes Del MVP

El estado actual del proyecto refleja varias decisiones deliberadas propias de un MVP:

- no hay sistema de usuarios registrado
- no hay base de datos persistente para las salas
- el backend online guarda el estado de las salas en memoria mientras el proceso está en ejecución
- la IA no se ejecuta en el servidor, sino en el navegador
- la aplicación prioriza claridad de arquitectura sobre complejidad de producto

## Limitaciones Actuales

Como MVP, el sistema tiene varias limitaciones conocidas:

- las salas online no son persistentes entre reinicios del backend
- no existe autenticación ni gestión formal de cuentas
- no hay sistema de Elo o matchmaking
- no hay historial persistente de partidas
- la reconexión online y el endurecimiento de sesiones siguen siendo áreas de mejora
- la internacionalización de textos todavía no está resuelta

## Relación Con El Resto De La Documentación

Este documento sirve como punto de entrada.

Los siguientes archivos de `01-flujos-aplicacion` profundizan en recorridos concretos, por ejemplo:

- cómo se crea una partida local
- cómo se integra Stockfish en el modo contra IA
- cómo se crea una sala online
- cómo se sincroniza una partida entre dos clientes
- cómo se envían movimientos y se gestionan errores

Después, la carpeta `02-mapa-codigo` baja un nivel más y describe la estructura del proyecto carpeta por carpeta para conectar cada flujo funcional con su implementación real.
