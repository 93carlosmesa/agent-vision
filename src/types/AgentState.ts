/**
 * AgentState — 5-state formal agent state machine for World3D.
 *
 * States reflect real workflow conditions derived from session data.
 * Each state has strict location rules and transition conditions.
 */

/** The 5 formal states of an agent in the 3D world */
export type AgentVisualState =
  | 'idle'           // No squad tasks — wandering lobby/descanso/terraza
  | 'waiting'        // Squad working, this agent has no task yet — waiting area
  | 'running'        // Agent has an active task — seated at desk in work zone
  | 'communicating'  // Sharing info with another agent — communication room
  | 'using_skill';   // Using a skill — visiting skill room then returning

/** Zone types where agents can reside */
export type AgentZone =
  | 'lobby'
  | 'descanso'
  | 'comunicacion'
  | 'trabajo'
  | 'biblioteca'
  | 'exterior';      // Terraza/Beach — for idle only

/** Valid state transitions */
export type StateTransition =
  | { from: 'idle';         to: 'waiting' | 'running' }
  | { from: 'waiting';      to: 'running' | 'communicating' }
  | { from: 'running';      to: 'waiting' | 'communicating' | 'using_skill' }
  | { from: 'communicating'; to: 'running' | 'waiting' }
  | { from: 'using_skill';  to: 'running' };

/** State metadata — where agents go and what they do */
export interface AgentStateConfig {
  state: AgentVisualState;
  label: string;
  emoji: string;
  /** Which rooms are valid for this state */
  validZones: AgentZone[];
  /** Whether the agent should be seated */
  seated: boolean;
  /** Whether agent needs a desk assigned */
  needsDesk: boolean;
}

export const AGENT_STATE_CONFIGS: Record<AgentVisualState, AgentStateConfig> = {
  idle: {
    state: 'idle',
    label: 'Sin Trabajo',
    emoji: '😌',
    validZones: ['lobby', 'descanso', 'exterior'],
    seated: false,
    needsDesk: false,
  },
  waiting: {
    state: 'waiting',
    label: 'Esperando',
    emoji: '⏳',
    validZones: ['comunicacion', 'lobby'],
    seated: false,
    needsDesk: false,
  },
  running: {
    state: 'running',
    label: 'Trabajando',
    emoji: '🔧',
    validZones: ['trabajo', 'biblioteca'],
    seated: true,
    needsDesk: true,
  },
  communicating: {
    state: 'communicating',
    label: 'Comunicando',
    emoji: '💬',
    validZones: ['comunicacion'],
    seated: false,
    needsDesk: false,
  },
  using_skill: {
    state: 'using_skill',
    label: 'Usando Skill',
    emoji: '⚡',
    validZones: ['biblioteca'],
    seated: false,
    needsDesk: false,
  },
};

/** Time tracking per agent per state */
export interface AgentStateMetrics {
  agentId: string;
  currentState: AgentVisualState;
  enteredStateAt: number;   // epoch ms
  timeInState: number;      // ms elapsed in current state
  /** Cumulative time per state (ms) since session start */
  cumulativeTime: Partial<Record<AgentVisualState, number>>;
}

/** Idle zone distribution — 3 possible zones for idle agents (Charlie spec: lobby, sala espera, terraza exterior) */
export const IDLE_ZONES: AgentZone[] = ['lobby', 'descanso', 'exterior'];

/** Get a pseudo-random idle zone for an agent. Uses hash to be stable per session but look random. */
export function getIdleZone(agentId: string, agentIndex: number): AgentZone {
  // Simple hash from agentId + index for stable but varied distribution
  let hash = agentIndex * 7;
  for (let i = 0; i < agentId.length; i++) {
    hash = ((hash << 5) - hash + agentId.charCodeAt(i)) | 0;
  }
  const zoneIndex = Math.abs(hash) % IDLE_ZONES.length;
  return IDLE_ZONES[zoneIndex];
}
