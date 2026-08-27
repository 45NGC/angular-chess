# Arranque Y Navegación

## Objetivo

Este documento describe cómo arranca la aplicación Angular, qué rutas existen y cómo se navega desde la pantalla principal hasta una partida según el modo elegido.

## Arranque De La Aplicación

La aplicación se inicia en `src/main.ts`, donde Angular arranca el componente raíz mediante `bootstrapApplication`.

En ese arranque se usa `appConfig`, que registra tres piezas principales:

- el router
- el cliente HTTP
- los listeners globales de errores del navegador

El componente raíz `App` no contiene lógica de negocio. Su plantilla solo renderiza un `router-outlet`, por lo que toda la navegación queda delegada al sistema de rutas.

## Rutas Definidas

La aplicación tiene una estructura de rutas muy simple:

- `/` muestra la pantalla principal
- `/game/:mode` muestra la pantalla de juego
- cualquier otra ruta redirige a `/`

Esto significa que toda la entrada funcional del usuario pasa por `HomeComponent`, y que `GameComponent` reutiliza la misma pantalla para los tres modos de juego.

## Pantalla Principal

La pantalla principal muestra tres acciones:

- `Local`
- `Online`
- `AI`

Al pulsar cualquiera de ellas no siempre se navega de inmediato. En algunos casos primero se abre un diálogo para recoger configuración.

## Navegación Según El Modo

### Modo Local

Al pulsar `Local`, la aplicación no entra directamente en la ruta de juego. Primero abre el diálogo de configuración de tiempo.

Cuando el usuario confirma, navega a:

`/game/local`

con estos query params:

- `baseW`
- `incW`
- `baseB`
- `incB`

Estos valores representan el tiempo base y el incremento de blancas y negras.

### Modo Contra IA

Al pulsar `AI`, primero se abre el diálogo de configuración de la partida contra la IA.

Cuando el usuario confirma, navega a:

`/game/ai`

con estos query params:

- `difficulty`
- `color`

`difficulty` indica el nivel de la IA y `color` el color elegido por el jugador.

### Modo Online

Al pulsar `Online`, tampoco se navega directamente a la pantalla de juego. Primero se abre `online-lobby-dialog`, que actúa como paso intermedio.

Desde ese lobby el usuario puede:

- crear una sala
- unirse a una sala existente

La navegación a la partida online ocurre solo cuando ya existe una sesión válida y la sala está lista para jugar o ya está en curso.

En ese momento la aplicación navega a:

`/game/online`

con estos query params:

- `code`
- `playerId`
- `side`

Estos parámetros identifican la sala y al jugador dentro de ella.

## Qué Hace `GameComponent` Al Entrar

`GameComponent` no asume un único flujo de entrada. Al iniciarse, observa a la vez:

- el parámetro de ruta `mode`
- los query params

Con esa información reconstruye el contexto de la partida y decide qué servicio de juego debe crear.

## Resolución Del Modo

La ruta `game/:mode` puede activar tres comportamientos:

- `local` crea `LocalGameService`
- `ai` crea `AiGameService`
- `online` crea `OnlineGameService`

Si el modo no es válido, el componente no crea servicio de juego y registra un error en consola.

## Interpretación De Parámetros

### Parámetros Del Modo Local

Los valores `baseW`, `incW`, `baseB` e `incB` se transforman en un objeto `TimeControl`.

Si faltan o no son válidos, el componente cae en valores seguros:

- tiempo base `0`
- incremento `0`

En la práctica, eso equivale a una partida sin reloj para ese lado.

### Parámetros Del Modo IA

Los valores `difficulty` y `color` se validan antes de crear el servicio.

Si no coinciden con los valores esperados, se usan estos defaults:

- `difficulty = beginner`
- `color = random`

### Parámetros Del Modo Online

Para entrar en una partida online, `GameComponent` intenta reconstruir una `OnlineRoomSession`.

Puede hacerlo de dos formas:

- usando `code`, `playerId` y `side` presentes en la URL
- recuperando una sesión guardada en `localStorage` para esa sala

Si no consigue una sesión válida, no puede inicializar el modo online.

## Persistencia Ligera De Navegación Online

El modo online tiene una particularidad: parte de la navegación depende de una sesión guardada en cliente.

Tras crear o unirse a una sala, el frontend guarda la sesión en `localStorage`. Esto permite que, si el usuario vuelve a entrar a la ruta de juego online con el código correcto, el componente pueda intentar restaurar el contexto del jugador.

No es una autenticación completa, pero sí una forma simple de mantener continuidad entre pantallas o recargas.

## Relación Entre Navegación Y Estado

En esta aplicación, la ruta no describe por sí sola toda la partida. La ruta indica el modo general, pero los detalles concretos viajan en query params o se reconstruyen desde estado local.

Por eso:

- `/game/local` necesita parámetros de tiempo
- `/game/ai` necesita parámetros de dificultad y color
- `/game/online` necesita identidad de sala y jugador

La navegación y la inicialización del estado están estrechamente acopladas.

## Salida De La Pantalla De Juego

La vuelta a la pantalla principal se resuelve con una navegación simple a:

`/`

Esto puede ocurrir, por ejemplo, cuando el usuario sale desde el diálogo de fin de partida o desde la pausa.

## Resumen

El arranque de Angular es mínimo y la navegación del proyecto se apoya en muy pocas rutas. La mayor parte de la lógica está en cómo `HomeComponent`, `online-lobby-dialog` y `GameComponent` colaboran para transformar una elección del usuario en una partida correctamente inicializada.
