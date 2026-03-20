# Agent Vision — Squad Worktree Playbook

## Estructura activa

- Repo base: `.../agent-vision` (rama `develop`)
- Squad Movement: `.../agent-vision-worktrees/squad-movement` (rama `squad/movement`)
- Squad Naming: `.../agent-vision-worktrees/squad-naming` (rama `squad/naming`)

## Reglas de colaboración

1. Cada squad trabaja SOLO en su worktree.
2. Commits pequeños y descriptivos.
3. Sin mezclar objetivos entre squads.
4. PR de cada squad hacia `develop`.
5. Antes de push: `npm run lint && npm run build`.

## Objetivos por squad

### Squad 1 · Movement
- Mejorar animación de caminar entre zonas.
- Suavizar rutas/colas de movimiento.
- Evitar solapes visuales de avatares en transición.

### Squad 2 · Naming
- Nombres de agentes 100% claros y estables.
- Agrupación visual por equipo/colaboración.
- Etiquetado consistente rol + agente + zona.

## Comandos útiles

```bash
# Ver worktrees
git worktree list

# Entrar squad movement
cd /Users/charlie-agent/Documents/Owner/Devs/agent-vision-worktrees/squad-movement

# Entrar squad naming
cd /Users/charlie-agent/Documents/Owner/Devs/agent-vision-worktrees/squad-naming
```
