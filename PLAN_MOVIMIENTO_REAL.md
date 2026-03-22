# Plan de Movimiento Real — Agent Vision 3D

## Filosofía

**"Si nadie trabaja, nadie se mueve."**

Los agentes solo se mueven cuando hay un motivo real derivado de datos de sesión. No hay animaciones de ocio, no hay paseos ficticios. Cada movimiento tiene una causa y un destino lógico.

---

## Mapa de salas y su propósito

| Sala | Propósito real | Quién va |
|------|---------------|----------|
| **Descanso** | Agentes idle sin tarea activa | Todos los idle en contexto |
| **Lobby** | Agentes fuera de contexto (ej: dev agents cuando solo hay inversión activa) | Idle fuera de contexto |
| **Trabajo** | Agentes ejecutando tarea (status=running) | El que está trabajando activamente |
| **Comunicación** | Agentes coordinando (status=waiting) o delegando | Orquestadores delegando, agentes recibiendo instrucciones |
| **Biblioteca** | Referencia/skills — nadie vive aquí | Solo visitas breves (futuro) |

---

## Regla de oro: Idle = Quieto

Cuando `status === 'idle'`:
- El agente **NO se mueve**. Está en su sitio (Descanso o Lobby).
- **NO hay animación de piernas/brazos de caminar.**
- Solo animación mínima de "respiración" (bobbing sutil).
- Esto es CRÍTICO para rendimiento: agentes idle = 0 frames de movimiento.

---

## Flujo de Samantha (CEO / Orquestadora)

Samantha es `main` / `samantha`. Su movimiento refleja el flujo real de orquestación:

### Estado: IDLE
```
📍 Descanso → posición fija de "sofa CEO"
🎬 Animación: sentada/relajada, halo girando lento
💬 Sin burbuja
```

### Estado: RUNNING (ella misma trabaja)
```
📍 Se mueve a Trabajo → puesto de CEO (centro-frontal)
🎬 Animación: typing, concentrada
💬 Burbuja: "🔧 On it"
```

### Estado: WAITING (delegó y espera respuesta)
```
📍 Se mueve a Comunicación → posición de orquestadora
🎬 Animación: gestos de conversación, mira a los lados
💬 Burbuja: "💬 Talking to [nombre del agente running]"
```

### Transiciones reales de Samantha:
```
idle → running:    Descanso → Trabajo (directa, va a trabajar sola)
idle → waiting:    Descanso → Comunicación (va a coordinar/delegar)
running → waiting: Trabajo → Comunicación (terminó algo, ahora espera)
running → idle:    Trabajo → Descanso (terminó, vuelve a descansar)
waiting → idle:    Comunicación → Descanso (equipo terminó, se relaja)
waiting → running: Comunicación → Trabajo (decide trabajar ella misma)
```

---

## Flujo de Emma (Manager)

Emma es la intermediaria. Samantha le delega, ella activa robots.

### Estado: IDLE
```
📍 Descanso → posición fija de "sofa Manager"
🎬 Relajada
```

### Estado: RUNNING (gestionando tarea)
```
📍 Trabajo → puesto de Manager
🎬 Typing, coordinando
💬 Burbuja: "📋 Managing [tarea]"
```

### Estado: WAITING (esperando resultado de un robot)
```
📍 Comunicación → cerca de los agentes que llamó
🎬 Gestos de conversación
💬 Burbuja: "⏳ Waiting on [robot]"
```

---

## Flujo de Ginny (Orquestadora Inversión)

Ginny maneja su propio equipo de inversión.

### Estado: IDLE → Descanso
### Estado: RUNNING → Trabajo (zona inversión)
### Estado: WAITING → Comunicación (coordina con inv-psych, inv-us-open)

---

## Flujo de Robots (Especialistas)

Los robots solo se mueven por órdenes reales:

### Estado: IDLE
```
📍 Descanso (en contexto) o Lobby (fuera de contexto)
🎬 COMPLETAMENTE quieto. Sin bobbing ni animación.
   Solo status dot pulsando muy lento.
```

### Estado: RUNNING (ejecutando tarea)
```
📍 Trabajo → puesto asignado (grid position)
🎬 Typing, visor pulsando rápido
💬 Burbuja al llegar: "🔧 Working"
```

### Estado: WAITING (reportando o esperando instrucción)
```
📍 Comunicación → near their caller (Emma/Ginny/Samantha)
🎬 Gestos mínimos
💬 Burbuja: "📨 Reporting"
```

---

## Secuencia completa: Caso real de delegación

```
T0: Todo idle. Nadie se mueve. Oficina en calma.

T1: Samantha recibe tarea del usuario
    → status: idle → running
    → Samantha se levanta del sofá, camina a Trabajo
    → Burbuja: "🔧 On it"

T2: Samantha decide que necesita a dev-codereviewer
    → status: running → waiting (Samantha delega)
    → Samantha camina de Trabajo → Comunicación
    → Burbuja: "📋 Emma, handle dev-codereviewer"

T3: Emma se activa (idle → running)
    → Emma se levanta del sofá → Trabajo
    → Burbuja: "📢 Calling dev-codereviewer..."

T4: dev-codereviewer se activa (idle → running)
    → Robot sale de Descanso → Trabajo (vía puertas)
    → Burbuja: "🔧 Working"

T5: dev-codereviewer termina (running → idle)
    → Robot camina de Trabajo → Descanso
    → Se queda quieto en su sitio

T6: Emma termina (running → idle)
    → Emma camina de Trabajo → Descanso

T7: Samantha recibe resultado (waiting → idle)
    → Samantha camina de Comunicación → Descanso
    → Oficina en calma de nuevo.
```

---

## Caso: Múltiples agentes trabajando simultáneamente

```
T1: Samantha → running → Trabajo
T2: Samantha → waiting (delega a 3 agentes)
    → Samantha → Comunicación
    → Emma → running → Trabajo
    → dev-codereviewer, dev-cybersec, dev-tester → running → Trabajo

    En Trabajo: 4 agentes trabajando (Emma + 3 robots)
    En Comunicación: Samantha esperando
    
    Burbuja Samantha: "💬 Talking to Emma, CodeReviewer +2"

T3: dev-tester termina primero
    → running → idle
    → Sale de Trabajo → Descanso
    → Los demás siguen trabajando

T4: Todos terminan → Todos vuelven a Descanso
```

---

## Caso: Inversión (Ginny orquesta)

```
T1: Ginny → running → Trabajo (zona inversión)
T2: Ginny → waiting → Comunicación
    → inv-psych-market → running → Trabajo
    → inv-us-open → running → Trabajo

    Samantha y Emma no se mueven (no están en contexto inversión).
    
T3: Inversión termina → todos vuelven a Descanso
```

---

## Optimización de rendimiento: Freeze idle

```typescript
// En useFrame de cada agente:
if (status === 'idle' && !isMoving) {
  // NO actualizar nada. Solo respiración cada 2 frames.
  if (frameCount % 2 !== 0) return; // skip odd frames
  // Solo bobbing sutil
  groupRef.current.position.y = baseY + Math.sin(t * 0.5) * 0.03;
  return; // No tocar brazos, piernas, cabeza, halo
}
```

---

## Implementación: Cambios necesarios

### 1. World3D.tsx — `getRoomForAgent` ya está correcto
La función actual mapea bien: running→trabajo, waiting→comunicación, idle→descanso/lobby.
✅ No necesita cambio.

### 2. Agent3D.tsx — Congelar idle
- Cuando `status === 'idle' && !isMoving`: solo bobbing mínimo cada 2 frames
- Brazos, piernas, cabeza: rotación 0 (reset one-time, no per-frame)
- Visor del robot: emissive fijo (no pulsing)
- Halo de masters: giro muy lento o parado

### 3. useAgentMotion.ts — Skip idle agents
- En el loop `useFrame`, si el agente está idle y ya llegó a destino: **no procesar**.
- Reducir el loop de colisiones: solo agentes en movimiento (ya está así).

### 4. SpeechBubble3D.tsx — Eliminar el requestAnimationFrame de BubbleContent
- Usar opacidad directa en useFrame del padre, no un RAF separado.

### 5. Interacciones (useInteractions.ts) — Hacerlas reales
- Cuando Samantha (waiting) y otro agente (running) coexisten → interaction beam entre ellos
- Tipo "delegating" cuando Samantha/Emma delega
- Tipo "consulting" cuando un agente reporta

---

## Resultado esperado

- Oficina en calma cuando nadie trabaja: **0 movimientos, rendimiento máximo**
- Movimiento fluido y con propósito cuando hay actividad
- Cada transición de sala tiene sentido narrativo
- Burbujas de diálogo solo en transiciones (no permanentes)
- Beams de interacción solo entre agentes realmente conectados
