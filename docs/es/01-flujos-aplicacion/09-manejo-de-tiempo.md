# Manejo De Tiempo

## Objetivo

Este documento explica cómo se configuran y calculan los relojes, cómo se aplican los incrementos y qué diferencias existen entre los modos local, contra IA y online.

## Configuración Del Control De Tiempo

El modelo compartido es `TimeControl`, con una configuración independiente para cada color:

```ts
{
  white: { baseMinutes, incrementSeconds },
  black: { baseMinutes, incrementSeconds }
}
```

El formulario permite elegir para cada lado:

- tiempo base de `1`, `2`, `3`, `5`, `10`, `15`, `20` o `30` minutos
- tiempo ilimitado, representado por `baseMinutes: 0`
- incremento de `0`, `1`, `2`, `3`, `5`, `10`, `15` o `20` segundos

Blancas y negras pueden tener controles distintos. Por ejemplo, una partida puede tener cinco minutos para blancas y tres para negras, o tiempo ilimitado para uno de los dos lados.

El formulario limita las opciones visibles, aunque el backend acepta cualquier valor no negativo recibido en el contrato.

## Comparación Entre Modos

| Modo | Quién calcula el tiempo | ¿Hay reloj de partida? | ¿Puede terminar por tiempo? |
| --- | --- | --- | --- |
| Local | `LocalClock` en el navegador | Opcional | Sí |
| Contra IA | Nadie | No | No |
| Online | Backend Spring Boot | Opcional | Sí |

En modo online, el frontend calcula una proyección visual del reloj entre actualizaciones, pero el backend conserva los valores que se consideran válidos para la partida.

En los modos local y online, el reloj solo se muestra si al menos uno de los dos lados tiene un tiempo base finito. Si ambos tienen `baseMinutes: 0`, los dos son ilimitados y la interfaz no renderiza el componente de reloj. Si solo uno es ilimitado, el reloj se muestra y ese lado aparece con `∞`.

## Partida Local

`LocalGameService` crea un `LocalClock` y lo configura al iniciar o reiniciar la partida.

El reloj local usa `performance.now()` cuando está disponible y actualiza su estado cada 100 ms. El propio navegador mantiene los tiempos de blancas, negras y el color activo.

El reloj no empieza al cargar el tablero. Tras el primer movimiento válido:

1. Se aplica la jugada.
2. Se añade el incremento al jugador que acaba de mover, si tiene tiempo base finito.
3. Empieza a correr el reloj del rival.

En los movimientos posteriores se repite el mismo ciclo: se descuenta el tiempo del jugador activo, se añade su incremento al completar la jugada y se activa el reloj contrario.

Si ambos tiempos base son `0`, el reloj está desactivado. Si solo uno es `0`, ese lado se considera ilimitado y el reloj del otro lado sigue funcionando.

## Pausa, Historial Y Fin Local

Solo el modo local permite pausar el reloj. Al pausar, `LocalGameService` guarda el color que estaba activo y detiene `LocalClock`; al reanudar, lo vuelve a iniciar si la partida continúa.

Navegar hacia atrás o adelante por el historial también detiene el reloj. Si el usuario realiza una jugada nueva desde una posición revisada, el reloj vuelve a activarse para el rival después de esa jugada.

Cuando el reloj llega a cero, `LocalClock` detiene su intervalo y notifica el color ganador a `LocalGameService`. El servicio marca el resultado como `timeout`, reproduce el sonido de fin y muestra el diálogo de resultado.

Además, al bajar por primera vez de 15 segundos en una partida local, se reproduce un sonido de poco tiempo.

## Partida Contra IA

El modo contra IA no crea `LocalClock` ni recibe una configuración de `TimeControl`. Por tanto, no muestra relojes y una partida contra Stockfish no puede terminar por tiempo.

La dificultad de la IA sí define un límite de cálculo para Stockfish, entre 700 ms y 2000 ms según el nivel. Ese valor solo limita cuánto tiempo analiza el motor antes de elegir una jugada; no representa tiempo disponible para blancas o negras dentro de la partida.

Pausar una partida contra IA cancela o detiene el cálculo pendiente de Stockfish, pero no tiene ningún reloj de juego que detener.

## Partida Online: Estado Autoritativo

Al crear una sala online, el backend transforma los minutos configurados a milisegundos y guarda en `OnlineRoom`:

- `whiteTimeMs` y `blackTimeMs`
- `activeClockColor`
- `clockUpdatedAt`
- `timeoutWinner`, cuando existe

Antes del primer movimiento, `activeClockColor` es `null` y el reloj no corre. Cuando el backend acepta una jugada, añade el incremento al jugador que ha movido, si su tiempo base es finito, y activa el reloj del rival.

El backend usa su propio `Clock` para calcular el tiempo transcurrido. Al procesar una consulta de sala o un movimiento, resta ese tiempo al color activo y guarda un nuevo snapshot si el valor cambió.

Por eso, aunque cada navegador tenga una hora local distinta, las cantidades que determinan si una jugada se acepta o una partida termina proceden del servidor.

## Reloj Visual Online

`OnlineGameService` recibe los valores del backend y, mientras la sala está en `playing`, calcula el tiempo visible restando localmente el tiempo transcurrido desde `clockUpdatedAt`.

`GameComponent` fuerza una actualización visual cada 100 ms cuando hay un control de tiempo habilitado y la partida no está pausada. Esto hace que el reloj parezca continuo sin exigir al backend que publique un mensaje por segundo.

Cuando llega un nuevo snapshot REST o STOMP, el cliente sustituye sus valores base por los enviados por el backend. De esta forma, el servidor corrige posibles diferencias acumuladas en la visualización local.

El modo online no ofrece pausa, ya que detener el tiempo de forma unilateral en un navegador no sería válido para una partida compartida.

## Tiempo Agotado Online

Al materializar el reloj, si el tiempo del color activo llega a cero, el backend:

- fija ese tiempo en `0`
- asigna el ganador opuesto en `timeoutWinner`
- cambia la sala a `finished`
- detiene el reloj y guarda `finishedAt`
- publica el snapshot actualizado

El frontend bloquea la interacción del jugador cuyo reloj visual ya llegó a cero, pero el backend no tiene todavía una tarea periódica que materialice el timeout por sí sola. Si no llega una consulta REST ni un intento de movimiento, una sala puede permanecer temporalmente en `playing` aunque un reloj visible haya llegado a cero.

Esta es una limitación actual del MVP. Una evolución posible sería añadir una tarea del servidor que revise las salas activas o una reconciliación REST periódica desde los clientes.

## Incrementos En Los Tres Modos

El incremento se suma después de cada jugada válida del jugador que ha movido:

- en local, lo realiza `LocalClock.switchTurn()`
- en online, lo realiza `InMemoryOnlineRoomService.advanceClockAfterAcceptedMove()`
- contra IA no existe incremento de partida porque no hay reloj

En local y online, el incremento se aplica también tras el primer movimiento. Los lados con tiempo ilimitado no reciben incremento, ya que no necesitan acumular tiempo.

## Resumen

El modo local prioriza una experiencia flexible en un solo navegador y calcula todo el tiempo en cliente. El modo contra IA prescinde de reloj de partida. El modo online delega el tiempo válido al backend y usa el navegador solo para mostrar una cuenta atrás fluida entre snapshots.
