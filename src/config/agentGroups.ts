/**
 * agentGroups — Squad definitions for 3D positioning and visual grouping.
 *
 * Each agent belongs to exactly one squad. Squads determine:
 *   - Fixed desk zones in Sala de Trabajo
 *   - Visual color indicator (disc below avatar)
 *   - Grouping in Comunicación seats when waiting
 */

/** Squad color for the visual disc indicator below each avatar */
export const SQUAD_COLORS: Record<string, string> = {
  managers:    '#FFD700',  // gold
  dev_core:    '#4A90D9',  // blue
  dev_quality: '#4A90D9',  // blue
  dev_vision:  '#4A90D9',  // blue
  inv_core:    '#4CAF50',  // green
  other:       '#888888',  // gray
};

/** Agent IDs grouped by squad */
export const AGENT_SQUADS: Record<string, string[]> = {
  managers:    ['main', 'emma', 'ginny'],
  dev_core:    ['dev-git-guardian', 'dev-senior-frontend-architect', 'dev-backend-socket-architect', 'dev-ui-usability-analyst', 'dev-tester'],
  dev_quality: ['dev-codereviewer', 'dev-cybersec', 'dev-linter', 'dev-prettier', 'dev-controlnaming'],
  dev_vision:  ['dev-vision-3d-architect', 'dev-vision-world-designer', 'dev-vision-avatar-creator', 'dev-vision-fx-animator', 'dev-vision-office-decorator'],
  inv_core:    ['inv-risk-profiler', 'inv-strategist', 'inv-analyst-stocks', 'inv-analyst-crypto', 'inv-analyst-forex', 'inv-analyst-commodities', 'inv-analyst-ai', 'inv-technical-analyst', 'inv-psych-market'],
  other:       ['hedwig'],
};

/** Managers are always visible regardless of status */
export const ALWAYS_VISIBLE_AGENTS = new Set(['main', 'emma', 'ginny']);

/** Given an agentId, return its squad key */
export function getSquad(agentId: string): string {
  for (const [squad, members] of Object.entries(AGENT_SQUADS)) {
    if (members.includes(agentId)) return squad;
  }
  return 'other';
}

/** Index of the agent within its squad (for relative positioning) */
export function getSquadIndex(agentId: string): number {
  const squad = getSquad(agentId);
  return AGENT_SQUADS[squad]?.indexOf(agentId) ?? 0;
}

/** Get the squad color for the visual disc indicator */
export function getSquadColor(agentId: string): string {
  return SQUAD_COLORS[getSquad(agentId)] ?? SQUAD_COLORS.other;
}
