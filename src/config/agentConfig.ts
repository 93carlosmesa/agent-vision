/**
 * agentConfig — Central registry for all agents.
 *
 * Single source of truth for agent identity, roles, colors, and departments.
 * Add new agents here — everything else reads from this registry.
 */

export type AgentRole = 'ceo' | 'manager' | 'specialist' | 'orchestrator-investment';
export type AgentDepartment = 'orchestration' | 'development' | 'investment';

export interface AgentConfig {
  id: string;
  role: AgentRole;
  color: string;
  isFemale: boolean;
  department: AgentDepartment;
  /** Hair color for master (humanoid) avatars */
  hairColor?: string;
  /** Halo color override for master avatars */
  haloColor?: string;
}

export const AGENT_REGISTRY: AgentConfig[] = [
  { id: 'main',       role: 'ceo',                    color: '#c084fc', isFemale: true,  department: 'orchestration', hairColor: '#d4a853', haloColor: '#c084fc' },
  { id: 'samantha',   role: 'ceo',                    color: '#c084fc', isFemale: true,  department: 'orchestration', hairColor: '#d4a853', haloColor: '#c084fc' },
  { id: 'emma',       role: 'manager',                color: '#ff9f43', isFemale: true,  department: 'development',   hairColor: '#8b5e3c', haloColor: '#ff9f43' },
  { id: 'ginny',      role: 'orchestrator-investment', color: '#53e3c2', isFemale: true,  department: 'investment',    hairColor: '#b7410e', haloColor: '#53e3c2' },

  // Dev specialists
  { id: 'dev-codereviewer',               role: 'specialist', color: '#ef4444', isFemale: false, department: 'development' },
  { id: 'dev-cybersec',                   role: 'specialist', color: '#22d3ee', isFemale: false, department: 'development' },
  { id: 'dev-git-guardian',               role: 'specialist', color: '#84cc16', isFemale: false, department: 'development' },
  { id: 'dev-senior-frontend-architect',  role: 'specialist', color: '#f472b6', isFemale: false, department: 'development' },
  { id: 'dev-linter',                     role: 'specialist', color: '#a3e635', isFemale: false, department: 'development' },
  { id: 'dev-prettier',                   role: 'specialist', color: '#f59e0b', isFemale: false, department: 'development' },
  { id: 'dev-controlnaming',             role: 'specialist', color: '#38bdf8', isFemale: false, department: 'development' },
  { id: 'dev-ui-usability-analyst',       role: 'specialist', color: '#e879f9', isFemale: false, department: 'development' },
  { id: 'dev-tester',                     role: 'specialist', color: '#34d399', isFemale: false, department: 'development' },
  { id: 'dev-backend-socket-architect',   role: 'specialist', color: '#fb923c', isFemale: false, department: 'development' },

  // Investment specialists
  { id: 'inv-psych-market',         role: 'specialist', color: '#2dd4bf', isFemale: false, department: 'investment' },
  { id: 'inv-us-open',              role: 'specialist', color: '#06b6d4', isFemale: false, department: 'investment' },
  { id: 'inv-risk-profiler',        role: 'specialist', color: '#2dd4bf', isFemale: false, department: 'investment' },
  { id: 'inv-analyst-stocks',       role: 'specialist', color: '#2dd4bf', isFemale: false, department: 'investment' },
  { id: 'inv-analyst-crypto',       role: 'specialist', color: '#2dd4bf', isFemale: false, department: 'investment' },
  { id: 'inv-analyst-forex',        role: 'specialist', color: '#2dd4bf', isFemale: false, department: 'investment' },
  { id: 'inv-analyst-commodities',  role: 'specialist', color: '#2dd4bf', isFemale: false, department: 'investment' },
  { id: 'inv-analyst-ai',           role: 'specialist', color: '#2dd4bf', isFemale: false, department: 'investment' },
  { id: 'inv-technical-analyst',    role: 'specialist', color: '#2dd4bf', isFemale: false, department: 'investment' },
  { id: 'inv-strategist',           role: 'specialist', color: '#2dd4bf', isFemale: false, department: 'investment' },

  // Vision specialists
  { id: 'dev-vision-3d-architect',      role: 'specialist', color: '#7c3aed', isFemale: false, department: 'development' },
  { id: 'dev-vision-world-designer',    role: 'specialist', color: '#2563eb', isFemale: false, department: 'development' },
  { id: 'dev-vision-avatar-creator',    role: 'specialist', color: '#ec4899', isFemale: false, department: 'development' },
  { id: 'dev-vision-fx-animator',       role: 'specialist', color: '#06b6d4', isFemale: false, department: 'development' },
  { id: 'dev-vision-office-decorator',  role: 'specialist', color: '#10b981', isFemale: false, department: 'development' },
];

/* ── Derived lookup helpers ── */

const _byId = new Map<string, AgentConfig>();
for (const a of AGENT_REGISTRY) _byId.set(a.id, a);

export function getAgentConfig(agentId: string): AgentConfig | undefined {
  return _byId.get(agentId.toLowerCase());
}

/** Master avatars = any agent with a hairColor defined (humanoid rendering) */
export function isMaster(agentId: string): boolean {
  const cfg = _byId.get(agentId.toLowerCase());
  return cfg?.hairColor !== undefined;
}

export function getAgentColor(agentId: string): string {
  const cfg = _byId.get(agentId.toLowerCase());
  if (cfg) return cfg.color;
  // Fallback: hash-based color for unknown agents
  let hash = 0;
  for (let i = 0; i < agentId.length; i++) {
    hash = agentId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `hsl(${Math.abs(hash) % 360}, 70%, 60%)`;
}

/* ── Role hierarchy constants ── */
export const CEO_ID = 'main';       // Samantha
export const MANAGER_ID = 'emma';   // Emma manages the squad
export const ORCHESTRATOR_IDS = [CEO_ID, MANAGER_ID];

export function isOrchestrator(agentId: string): boolean {
  const lower = agentId.toLowerCase();
  return lower === CEO_ID || lower === MANAGER_ID || lower === 'samantha';
}

export function isCEO(agentId: string): boolean {
  const lower = agentId.toLowerCase();
  return lower === CEO_ID || lower === 'samantha';
}

export function isManager(agentId: string): boolean {
  return agentId.toLowerCase() === MANAGER_ID;
}
