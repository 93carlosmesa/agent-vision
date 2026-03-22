# UX Analysis: 27 Agents in Agent Vision Office

**Fecha:** 2026-03-22  
**Analista:** UX Analyst (Emma pipeline)  
**Contexto:** Expansión de 18 → 27 agentes (Squad Inversión ×9)

---

## Diagnóstico de Capacidad

### Salas actuales y capacidad definida

| Sala | Capacidad configurada | Uso típico |
|------|----------------------|------------|
| Lobby (espera) | 14 seats + Investment corner | Idle out-of-context + Investment standby |
| Descanso | 16 seats (DESCANSO_SPOTS) | Idle in-context dev agents |
| Comunicación | 16 seats | Waiting/meeting agents |
| Trabajo | 24 stations | Running/working agents |
| Biblioteca | 10 seats | No asignación automática actual |

### ¿Caben 27 avatares?

**Respuesta: Sí, con ajustes menores.**

- **Caso normal (mayoría idle):** Con 27 agentes raramente todos estarán en una misma sala. El contexto (dev vs investment) separa grupos naturalmente.
- **Trabajo (running):** Capacidad 24 stations es suficiente para el pico máximo previsible.
- **Descanso:** 12 DESCANSO_SPOTS definidos. Con 14 dev specialists idle pueden reutilizar spots (wrap-around ya implementado). No hay colisión visual grave por spacing 1.6m.
- **Investment Lobby Corner:** Actualmente 3 dedicated seats (ginny, inv-psych-market, inv-us-open). Con 9 nuevos agents de inversión se necesitan **8 seats adicionales** en esa zona.

---

## Problemas identificados

### 🔴 Crítico
- **Investment Lobby Corner insuficiente:** Solo 3 `INVESTMENT_LOBBY_SEATS`. Los 9 agentes inv nuevos no tienen asignación dedicada → caerán en generic lobby spots que son 6 (bench + stand), creando sobrecarga visual.

### 🟡 Moderado  
- **Biblioteca sin uso:** 10 seats vacíos que podrían servir como área alternativa de descanso para investment squad si el lobby se satura.
- **DESCANSO_SPOTS:** 12 spots para potencialmente 14 dev agents idle → wrap-around OK, pero puede haber superposición visual leve.

### 🟢 Bien resuelto
- Separación dev/investment por contexto evita aglomeración simultánea.
- Sistema de grid (`gridPosition`) auto-organiza en `trabajo` y `comunicacion`.
- Capacity targets en `OFFICE_CAPACITY` ya contemplan escala suficiente.

---

## Recomendaciones

1. **Ampliar `INVESTMENT_LOBBY_SEATS`** con 8 nuevos dedicated seats en el rincón investment (x: 13–22, z: 13.5–17.5) — **implementar en este sprint**.
2. **Considerar zona "Biblioteca" para investment idle** en sprint futuro si el squad crece más allá de 12 agentes.
3. No se necesitan salas nuevas para este sprint. La arquitectura actual absorbe 27 agentes correctamente con los ajustes del punto 1.

---

## Conclusión

La oficina 3D **soporta 27 agentes** sin refactorización estructural. El único ajuste necesario es expandir los dedicated lobby seats del investment squad en `World3D.tsx` (8 nuevas posiciones). El sistema de contexto dev/investment es el mitigador principal de saturación visual.
