# AMBIENTES 3D — Agent Vision

Actualizado: 2026-03-22 (madrugada)

## Investigación rápida usada como referencia

Fuentes consultadas (web):

1. **Googleplex (Wikipedia)** — campus multipabellón, escala grande, mezcla de oficinas y zonas abiertas verdes.
2. **Apple Park (Wikipedia)** — anillo de vidrio, aluminio, foco en luz natural, continuidad interior-exterior y naturaleza.
3. **Microsoft WorkLab: “Hybrid Work Is Just Work”** — patrón híbrido, más reuniones, necesidad de espacios para colaboración y foco.
4. **Microsoft Redmond Campus (Wikipedia)** — campus extenso, múltiples edificios y crecimiento continuo.
5. **Intel Corporate Responsibility** — enfoque operacional/ingeniería y consistencia técnica.
6. **Gensler Global Workplace Survey 2024** — tendencia people-first, experiencia emocional del espacio, rendimiento más allá de ocupación.

> Nota: estas referencias se tradujeron a una estética isométrica modular, no a réplicas literales.

---

## Línea estética modular aplicada

### Visión general
Un sistema data-driven con misma topología base (lobby, descanso, comunicación, trabajo, biblioteca, exterior) y variación por **tema ambiental**:
- colorimetría y materiales
- densidad de mobiliario
- tono lumínico
- tratamiento exterior

### Principios de distribución
1. **Núcleo operativo estable**: pathfinding y salas se mantienen para no romper motion.
2. **Escalado por densidad**: `low`, `medium`, `high` ajusta estaciones de trabajo y asientos.
3. **Colaboración + foco**: comunicación visible y biblioteca/quiet room preservada.
4. **Exterior activo**: bancos/plantas y en ambientes playa se añade zona sol reforzada.

### Materiales y color
- Base: grafito / slate / vidrio translúcido.
- Variantes:
  - corporativo frío (Intel Lab Grid)
  - minimal claro (Apple Glass Ring)
  - social-colorido (Google Garden)
  - tropical cálido (Sunset/Tropical Beach)

---

## Ambientes disponibles en selector

1. **Neo HQ**
2. **Google Garden**
3. **Apple Glass Ring**
4. **Microsoft Hybrid Hub**
5. **Intel Lab Grid**
6. **Startup Loft**
7. **Zen Atrium**
8. **Sunset Beach Office**
9. **Tropical Beach Campus**

### Propósito de cada ambiente
- **Neo HQ**: baseline equilibrado para operación diaria.
- **Google Garden**: colaboración viva con verde y acentos frescos.
- **Apple Glass Ring**: claridad visual y estética premium minimal.
- **Microsoft Hybrid Hub**: dinámica híbrida de reuniones y trabajo distribuido.
- **Intel Lab Grid**: ingeniería y foco técnico con alta densidad.
- **Startup Loft**: ambiente maker/iterativo de sprint.
- **Zen Atrium**: ritmo calmado, biophilic y bienestar.
- **Sunset Beach Office**: playa profesional con tono sunset.
- **Tropical Beach Campus**: playa expandida (sombrillas extra, bancos, vegetación reforzada, zona sol).

---

## Notas técnicas

- Sin dependencias nuevas.
- Integración en UI: selector de escena + selector de ambiente (si escena = 3D).
- Compatibilidad mantenida con:
  - agentes
  - motion system
  - pathfinding por salas
- Recomendación futura: mover spots de descanso/lobby también a configuración por ambiente para layouts totalmente temáticos.
