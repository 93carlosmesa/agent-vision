/**
 * agentConfig — Central registry for all agents.
 *
 * Single source of truth for agent identity, roles, colors, and departments.
 * Add new agents here — everything else reads from this registry.
 */

export type AgentRole = 'ceo' | 'manager' | 'specialist' | 'orchestrator-investment';
export type AgentDepartment = 'orchestration' | 'development' | 'investment';

export type InteractionStyle = 'commanding' | 'analytical' | 'creative' | 'supportive';

export interface AgentSoul {
  /** What this agent does — shown in tooltips/bubbles */
  purpose: string;
  /** What this agent says when it starts working */
  workingPhrase: string;
  /** What this agent says when delegating */
  delegatingPhrase?: string;
  /** What this agent says when idle (no squad tasks) */
  idlePhrase: string;
  /** What this agent says when waiting (squad active but no task assigned) */
  waitingPhrase?: string;
  /** What this agent says when communicating with another agent */
  communicatingPhrase?: string;
  /** What this agent says when walking to use a skill */
  usingSkillPhrase?: string;
  /** Interaction style — affects speech bubbles and beam colors */
  interactionStyle: InteractionStyle;
}

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
  /** Agent personality and behavior */
  soul: AgentSoul;
}

export const AGENT_REGISTRY: AgentConfig[] = [
  // Orchestrators
  { id: 'main',       role: 'ceo',                    color: '#c084fc', isFemale: true,  department: 'orchestration', hairColor: '#d4a853', haloColor: '#c084fc',
    soul: { purpose: 'Orchestrates all agents', workingPhrase: '🔧 On it', delegatingPhrase: '📋 {target}, handle this', idlePhrase: '💭 Overseeing', waitingPhrase: '👀 Monitoring squad', communicatingPhrase: '💬 Syncing with team', usingSkillPhrase: '⚡ Accessing skill', interactionStyle: 'commanding' } },
  { id: 'samantha',   role: 'ceo',                    color: '#c084fc', isFemale: true,  department: 'orchestration', hairColor: '#d4a853', haloColor: '#c084fc',
    soul: { purpose: 'Orchestrates all agents', workingPhrase: '🔧 On it', delegatingPhrase: '📋 {target}, handle this', idlePhrase: '💭 Overseeing', waitingPhrase: '👀 Monitoring squad', communicatingPhrase: '💬 Syncing with team', usingSkillPhrase: '⚡ Accessing skill', interactionStyle: 'commanding' } },
  { id: 'emma',       role: 'manager',                color: '#ff9f43', isFemale: true,  department: 'development',   hairColor: '#8b5e3c', haloColor: '#ff9f43',
    soul: { purpose: 'Manages dev execution', workingPhrase: '🛠️ Building...', delegatingPhrase: '📢 {target}, you\'re up', idlePhrase: '📋 Planning', waitingPhrase: '⏳ Waiting for task', communicatingPhrase: '📢 Coordinating', usingSkillPhrase: '🔧 Running tool', interactionStyle: 'commanding' } },
  { id: 'ginny',      role: 'orchestrator-investment', color: '#53e3c2', isFemale: true,  department: 'investment',    hairColor: '#b7410e', haloColor: '#53e3c2',
    soul: { purpose: 'Investment strategy & analysis', workingPhrase: '📊 Analyzing markets...', delegatingPhrase: '📈 {target}, run analysis', idlePhrase: '🧘 Monitoring', waitingPhrase: '📉 Awaiting signal', communicatingPhrase: '💹 Sharing analysis', usingSkillPhrase: '📡 Running scan', interactionStyle: 'analytical' } },

  // Dev specialists
  { id: 'dev-codereviewer',               role: 'specialist', color: '#ef4444', isFemale: false, department: 'development',
    soul: { purpose: 'Reviews code quality', workingPhrase: '🔍 Reviewing...', idlePhrase: '📖 Standby', interactionStyle: 'analytical' } },
  { id: 'dev-cybersec',                   role: 'specialist', color: '#22d3ee', isFemale: false, department: 'development',
    soul: { purpose: 'Security auditing', workingPhrase: '🔒 Scanning...', idlePhrase: '👁️ Watching', interactionStyle: 'analytical' } },
  { id: 'dev-git-guardian',               role: 'specialist', color: '#84cc16', isFemale: false, department: 'development',
    soul: { purpose: 'Git flow & branch management', workingPhrase: '🌿 Managing branches...', idlePhrase: '🛡️ Guarding', interactionStyle: 'supportive' } },
  { id: 'dev-senior-frontend-architect',  role: 'specialist', color: '#f472b6', isFemale: false, department: 'development',
    soul: { purpose: 'Frontend architecture & design', workingPhrase: '🏗️ Architecting...', idlePhrase: '🧩 Designing', interactionStyle: 'creative' } },
  { id: 'dev-linter',                     role: 'specialist', color: '#a3e635', isFemale: false, department: 'development',
    soul: { purpose: 'Code style enforcement', workingPhrase: '📏 Linting...', idlePhrase: '✅ Clean', interactionStyle: 'analytical' } },
  { id: 'dev-prettier',                   role: 'specialist', color: '#f59e0b', isFemale: false, department: 'development',
    soul: { purpose: 'Code formatting', workingPhrase: '✨ Formatting...', idlePhrase: '🎨 Ready', interactionStyle: 'supportive' } },
  { id: 'dev-controlnaming',             role: 'specialist', color: '#38bdf8', isFemale: false, department: 'development',
    soul: { purpose: 'Naming conventions', workingPhrase: '🏷️ Checking names...', idlePhrase: '📝 Standby', interactionStyle: 'analytical' } },
  { id: 'dev-ui-usability-analyst',       role: 'specialist', color: '#e879f9', isFemale: false, department: 'development',
    soul: { purpose: 'UX & usability analysis', workingPhrase: '🎯 Analyzing UX...', idlePhrase: '👀 Observing', interactionStyle: 'creative' } },
  { id: 'dev-tester',                     role: 'specialist', color: '#34d399', isFemale: false, department: 'development',
    soul: { purpose: 'Testing & QA', workingPhrase: '🧪 Testing...', idlePhrase: '🔬 Standby', interactionStyle: 'analytical' } },
  { id: 'dev-backend-socket-architect',   role: 'specialist', color: '#fb923c', isFemale: false, department: 'development',
    soul: { purpose: 'Backend & WebSocket architecture', workingPhrase: '🔌 Wiring sockets...', idlePhrase: '⚡ Listening', interactionStyle: 'creative' } },

  // Investment specialists
  { id: 'inv-psych-market',         role: 'specialist', color: '#a855f7', isFemale: false, department: 'investment',
    soul: { purpose: 'Market psychology analysis', workingPhrase: '🧠 Reading sentiment...', idlePhrase: '📉 Watching', interactionStyle: 'analytical' } },
  { id: 'inv-us-open',              role: 'specialist', color: '#06b6d4', isFemale: false, department: 'investment',
    soul: { purpose: 'US market open prediction', workingPhrase: '📈 Tracking US markets...', idlePhrase: '🔭 Monitoring', interactionStyle: 'analytical' } },
  { id: 'inv-risk-profiler',        role: 'specialist', color: '#f43f5e', isFemale: false, department: 'investment',
    soul: { purpose: 'Portfolio risk profiling', workingPhrase: '⚖️ Assessing risk...', idlePhrase: '🛡️ Guarding', interactionStyle: 'analytical' } },
  { id: 'inv-analyst-stocks',       role: 'specialist', color: '#22c55e', isFemale: false, department: 'investment',
    soul: { purpose: 'Stock market analysis', workingPhrase: '📊 Analyzing stocks...', idlePhrase: '🏦 Watching', interactionStyle: 'analytical' } },
  { id: 'inv-analyst-crypto',       role: 'specialist', color: '#f59e0b', isFemale: false, department: 'investment',
    soul: { purpose: 'Crypto market analysis', workingPhrase: '₿ Scanning chains...', idlePhrase: '🔗 On-chain', interactionStyle: 'analytical' } },
  { id: 'inv-analyst-forex',        role: 'specialist', color: '#3b82f6', isFemale: false, department: 'investment',
    soul: { purpose: 'Forex pair analysis', workingPhrase: '💱 Reading pairs...', idlePhrase: '🌍 Monitoring', interactionStyle: 'analytical' } },
  { id: 'inv-analyst-commodities',  role: 'specialist', color: '#d97706', isFemale: false, department: 'investment',
    soul: { purpose: 'Commodities analysis', workingPhrase: '🛢️ Tracking commodities...', idlePhrase: '⛏️ Standby', interactionStyle: 'analytical' } },
  { id: 'inv-analyst-ai',           role: 'specialist', color: '#8b5cf6', isFemale: false, department: 'investment',
    soul: { purpose: 'AI ecosystem tracking', workingPhrase: '🤖 Scanning AI landscape...', idlePhrase: '🧪 Researching', interactionStyle: 'creative' } },
  { id: 'inv-technical-analyst',    role: 'specialist', color: '#14b8a6', isFemale: false, department: 'investment',
    soul: { purpose: 'Technical chart analysis', workingPhrase: '📉 Reading charts...', idlePhrase: '📐 Standby', interactionStyle: 'analytical' } },
  { id: 'inv-strategist',           role: 'specialist', color: '#e11d48', isFemale: false, department: 'investment',
    soul: { purpose: 'Investment strategy & allocation', workingPhrase: '♟️ Planning strategy...', idlePhrase: '🎯 Thinking', interactionStyle: 'creative' } },

  // Vision specialists
  { id: 'dev-vision-3d-architect',      role: 'specialist', color: '#7c3aed', isFemale: false, department: 'development',
    soul: { purpose: '3D scene architecture', workingPhrase: '🎮 Building 3D...', idlePhrase: '🌐 Standby', interactionStyle: 'creative' } },
  { id: 'dev-vision-world-designer',    role: 'specialist', color: '#2563eb', isFemale: false, department: 'development',
    soul: { purpose: 'World & level design', workingPhrase: '🗺️ Designing world...', idlePhrase: '🌍 Standby', interactionStyle: 'creative' } },
  { id: 'dev-vision-avatar-creator',    role: 'specialist', color: '#ec4899', isFemale: false, department: 'development',
    soul: { purpose: 'Avatar creation & rigging', workingPhrase: '👤 Crafting avatars...', idlePhrase: '🎭 Standby', interactionStyle: 'creative' } },
  { id: 'dev-vision-fx-animator',       role: 'specialist', color: '#06b6d4', isFemale: false, department: 'development',
    soul: { purpose: 'Visual effects & animation', workingPhrase: '💫 Animating...', idlePhrase: '🎬 Standby', interactionStyle: 'creative' } },
  { id: 'dev-vision-office-decorator',  role: 'specialist', color: '#10b981', isFemale: false, department: 'development',
    soul: { purpose: 'Office decoration & props', workingPhrase: '🪴 Decorating...', idlePhrase: '🏠 Standby', interactionStyle: 'creative' } },
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

export function getAgentSoul(agentId: string): AgentSoul | undefined {
  return _byId.get(agentId.toLowerCase())?.soul;
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
