# ANALYSIS — Pixel Agents (referencia) aplicado a Agent Vision

## Qué aporta Pixel Agents a nivel arquitectura

1. **Separación host/UI clara**
   - Host (extensión VS Code) observa JSONL, gestiona agentes, timers y heurísticas de estado.
   - UI (webview React + canvas) solo renderiza estado y emite acciones.

2. **Loop visual en tiempo real**
   - Renderizado tipo juego en canvas con estado externo a React para animaciones fluidas.
   - Transiciones de estado (idle/active/waiting) con señales de transcript + timers.

3. **Modelo de estado por agente**
   - Mapa de agentes con tool activity, subagentes, permisos/espera y última actividad.
   - Persistencia de layout/asignaciones para continuidad entre sesiones.

4. **UX orientada a observabilidad**
   - “Office” como metáfora espacial: 1 agente = 1 personaje.
   - Overlay de tool/status y feedback visual inmediato.
   - Paneles auxiliares (debug, selección, controles) sin romper la vista principal.

## Decisiones de réplica funcional en Agent Vision

- Mantener stack actual (Express + frontend vanilla) para compatibilidad y simplicidad.
- Implementar una **escena office web** con rejilla + desks + avatares por sesión.
- Usar **animaciones CSS por estado** (idle/running/waiting) con emojis/sprites simples libres.
- Añadir **panel lateral** con timeline global y detalle de sesión seleccionada.
- Mantener polling (2.5s) como refresco real-time robusto (sin dependencias extra).
- Extender backend con endpoint de detalle por sesión (`/api/sessions/:sessionKey`) sin romper endpoints existentes.

## Diferencias deliberadas frente a Pixel Agents original

- Sin editor completo de layout/furniture ni pipeline de assets pixel-art.
- Sin pathfinding/game loop físico; se usa distribución por grid para estabilidad y menor complejidad.
- Heurísticas de estado basadas en eventos OpenClaw existentes, no señales profundas de terminal-host.

## Resultado esperado

Una réplica funcional del concepto visual de “oficina de agentes” adaptada al contexto OpenClaw: ligera, mantenible, sin assets restrictivos y lista para evolucionar a canvas/game-loop más avanzado en iteraciones futuras.
