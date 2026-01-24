# Update Caos (Impostor)

## Objetivo
Introducir un "Modo Caos" con variantes oficiales que se activan aleatoriamente. No se anuncian antes del debate y solo se revelan al final (segun variante).

## Sistema de activacion
- Parametros internos:
  - `chaosChanceBase` (0-1).
  - `chaosChanceIncrement` (aumento por partida, muy leve).
- Probabilidad efectiva por ronda:
  - `chaosChance = clamp(chaosChanceBase + roundsPlayed * chaosChanceIncrement)`
- `roundsPlayed` se guarda en `sessionStorage` para no perderse al cambiar jugadores o reiniciar partida.
- Si `chaosChance = 0`, nunca hay Caos.

## Variantes oficiales y pesos
Dentro de `activateChaosRound()`:

| Variante | Peso |
| --- | ---: |
| Sin impostor | 35% |
| Roles invertidos | 30% |
| 2 impostores | 20% |
| Todos impostores | 15% |

## Revelado del Modo Caos (dinamica)
Secuencia obligatoria cuando la ronda Caos SI se revela:
1) Confirmacion falsa (0.5-1s):
   - `EL IMPOSTOR ERA...`
2) Pausa incomoda (0.8s).
3) Glitch sutil (0.3s):
   - Desplazamiento horizontal 2-3px.
   - Parpadeo leve.
   - Vibracion corta.
4) Revelacion real (1.2s):
   - `RONDA CAOS` (o `ESTA RONDA NO ERA NORMAL`).
   - Color rojo tenue, fondo ligeramente distinto.
5) Mensaje especifico (1.5-2s):
   - `NO HABIA IMPOSTOR`
   - `TODOS ERAIS IMPOSTORES`
   - `HABIA 2 IMPOSTORES`
6) Descarga:
   - `Por eso nada cuadraba.`

Duracion total ideal: 4-6s.

Excepcion:
- `Roles invertidos` NO se revela nunca (ni "Ronda especial" ni "Modo caos").
## Detalle de variantes

### 1) Ronda sin impostor
**Que pasa**
- Todos reciben la palabra real.
- No hay impostor.

**Logica tecnica**
```
for each player:
  role = "informante"
  word = selectedWord
```

**Revelado final (mensaje especifico)**
- `NO HABIA IMPOSTOR`

**Frecuencia sugerida**
- 10-15% del total de rondas (repartido via pesos + activacion global).

---

### 2) Ronda todos son impostores
**Que pasa**
- Nadie recibe la palabra real.
- Todos reciben una pista generica (segun dificultad).

**Logica tecnica**
```
for each player:
  role = "impostor"
  hint = random(cluster.hard) // o normal segun dificultad
```

**Revelado final (mensaje especifico)**
- `TODOS ERAIS IMPOSTORES`

**Frecuencia sugerida**
- 5-10% (variante potente, menor peso relativo).

---

### 3) Ronda roles invertidos
**Que pasa**
- Los roles son normales (hay impostor), no cambia la logica.
- Se muestra un mensaje adicional al inicio:
  - `Puede que no seas quien crees que eres`

**Logica tecnica**
- No cambia la asignacion de roles ni palabras.
- Solo UI: mensaje de duda en pantalla.

**Revelado final**
- Normal (no se menciona que fue Caos).

**Frecuencia sugerida**
- 10-15%.

---

### 4) Ronda dos impostores que no se conocen
**Que pasa**
- Hay 2 impostores, pero cada uno cree que es el unico.
- Ambos reciben pista (o ninguna segun modo).
- El resto recibe la palabra real.

**Logica tecnica**
```
select 2 players randomly
for impostors:
  role = "impostor"
  hint = random(cluster.normal or hard)
for others:
  role = "informante"
  word = selectedWord
```

**Reglas**
- Solo si hay 3+ jugadores.
- No mostrar nunca "hay 2 impostores".

**Revelado final (mensaje especifico)**
- `HABIA 2 IMPOSTORES`
- Mostrar nombres uno a uno.

**Frecuencia sugerida**
- Probabilidad: 10% (dentro del pool de Caos).

## UI/UX
- No se cambia el flujo ni las pantallas actuales.
- Reveal Caos sigue la dinamica definida (pausa + doble mensaje).
- En "Roles invertidos", el reveal sigue siendo normal (no se menciona Caos).

## Impacto tecnico (refactor necesario)
Se necesita estado por jugador (secretos individuales) y engine de ronda:
- `PlayerSecret` con `role`, `word`, `hint`, `category`.
- `RoundState` con `mode`, `variant`, `secrets`, `impostorIndexes`, `selectedEntry`.
- Motor separado del componente para generar rondas normales y Caos.

## Plan de refactor (paso a paso)
### Paso 1 (sin cambios funcionales visibles)
- Modelos nuevos:
  - `RoundConfig` (showCategory, showHint, hintDifficulty, chaosChance)
  - `PlayerSecret`
  - `RoundState`
- Extraer la generacion de ronda a un modulo/servicio (`GameEngine`).
- El componente solo consulta el secreto del jugador actual.

### Paso 2 (activar param y activacion aleatoria)
- Añadir `chaosChanceBase` y `chaosChanceIncrement` como parametros internos (sin UI).
- Guardar `roundsPlayed` en `sessionStorage` y aumentarlo por partida completada.
- Evaluar `random < chaosChance` al inicio de cada ronda.

### Paso 3 (variantes Caos)
- Implementar variantes segun pesos.
- Aplicar restriccion de "2 impostores" solo con 4+ jugadores.

### Paso 4 (reveal)
- Si variante requiere, mostrar `RONDA ESPECIAL` al final.

## Criterios de aceptacion
- Modo Caos solo se activa si `random < chaosChance`.
- Activacion global de Caos con probabilidad definida por base + incremento.
- Variantes con pesos definidos.
- Reveal final solo si aplica.
- Dos impostores solo con 4+ jugadores.

## Testing minimo
- 20+ rondas con `chaosChanceBase = 0` y `chaosChanceIncrement = 0` => nunca se activa.
- 30+ rondas con `chaosChanceBase = 0.20` y `chaosChanceIncrement > 0` => aparece Caos en pocas rondas y aumenta ligeramente con el tiempo.
- Verificar que "Roles invertidos" no delata Caos al final.
- Verificar que "2 impostores" solo ocurre con 4+ jugadores.
