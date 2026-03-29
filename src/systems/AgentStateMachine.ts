/**
 * AgentStateMachine — Formal state machine for agent 3D world behavior.
 *
 * Integrated by AvatarVisibilitySystem for full 5-state agent management.
 *
 * Derives AgentVisualState from:
 *   - Session status (running/waiting/idle from server)
 *   - Squad-level activity (are others working?)
 *   - Desk availability
 *   - Communication triggers
 *   - Skill usage triggers
 *
 * Rules:
 *   IDLE:          Squad has no active tasks → random zone (lobby/descanso/biblioteca)
 *   WAITING:       Squad working, this agent has no task → comunicacion
 *   RUNNING:       Agent has active task → seated at desk in trabajo
 *   COMMUNICATING: Agent needs to share with another → comunicacion
 *   USING_SKILL:   Agent visiting skill room → biblioteca (then back to desk)
 */

import type { SessionStatus } from '../types/ISession';
import type { AgentVisualState, AgentStateMetrics } from '../types/AgentState';
import { getIdleZone } from '../types/AgentState';
import type { DeskManager } from './DeskManager';
import type { Desk } from './DeskManager';
import { SAMANTHA_DESK, SAMANTHA_DESK_ID, EMMA_DESK, EMMA_DESK_ID, GINNY_DESK, GINNY_DESK_ID } from './DeskManager';
import type { RoomKey } from '../utils/officePathfinding';

export interface AgentStateInput {
  agentId: string;
  /** Index in the overall agent list (for zone distribution) */
  agentIndex: number;
  /** Server-derived status */
  sessionStatus: SessionStatus;
  /** Whether ANY other agent in the squad is currently running */
  squadHasActiveTasks: boolean;
  /** Whether this agent is being called by another (triggers COMMUNICATING) */
  beingCalled?: boolean;
  /** Whether this agent needs to use a skill right now */
  needsSkill?: boolean;
  /** Current previous visual state (for transitions) */
  previousVisualState?: AgentVisualState;
  /** Current agent 3D position (for desk proximity) */
  currentPosition?: [number, number, number];
}

export interface AgentStateOutput {
  visualState: AgentVisualState;
  /** Which room to navigate to */
  targetRoom: RoomKey;
  /** Assigned desk (only for running/using_skill) */
  desk: Desk | null;
  /** Whether to use the desk's seated position */
  seated: boolean;
  /** Activity label for display */
  activityLabel: string;
}

/** Map visual state to room key (primary room) */
function stateToRoom(state: AgentVisualState, idleZone: RoomKey): RoomKey {
  switch (state) {
    case 'idle':          return idleZone;
    case 'waiting':       return 'comunicacion';
    case 'running':       return 'trabajo';
    case 'communicating': return 'comunicacion';
    case 'using_skill':   return 'biblioteca';
  }
}

/** Derive the target visual state from session + squad context */
function deriveVisualState(input: AgentStateInput): AgentVisualState {
  const { sessionStatus, squadHasActiveTasks, beingCalled, needsSkill, previousVisualState } = input;

  // Skill usage takes highest priority when flagged
  if (needsSkill && previousVisualState === 'running') {
    return 'using_skill';
  }

  // Communication — either called by another or agent initiates
  if (beingCalled && (previousVisualState === 'waiting' || previousVisualState === 'running')) {
    return 'communicating';
  }

  switch (sessionStatus) {
    case 'running':
      // Agent has an active task
      if (previousVisualState === 'using_skill') {
        // Returning from skill room → back to running (at desk)
        return 'running';
      }
      return 'running';

    case 'waiting':
      // Squad is working but this agent has no task yet
      if (squadHasActiveTasks) {
        return 'waiting';
      }
      // If squad is completely idle, go idle too
      return 'idle';

    case 'idle':
      if (squadHasActiveTasks) {
        // Squad is active but this agent is idle → waiting
        return 'waiting';
      }
      // True idle — no squad activity
      return 'idle';
  }
}

/** Get activity label for a given visual state */
function getStateLabel(state: AgentVisualState): string {
  switch (state) {
    case 'idle':          return '😌 Descansando';
    case 'waiting':       return '⏳ En espera';
    case 'running':       return '🔧 Trabajando';
    case 'communicating': return '💬 Comunicando';
    case 'using_skill':   return '⚡ Usando skill';
  }
}

/**
 * AgentStateMachine — manages state for a set of agents.
 * Holds references to DeskManager for desk allocation.
 */
export class AgentStateMachine {
  private deskManager: DeskManager;
  /** Current visual state per agent */
  private agentStates: Map<string, AgentVisualState> = new Map();
  /** Metrics tracking per agent */
  private metrics: Map<string, AgentStateMetrics> = new Map();
  /** Idle zone assignments (stable per agent for session) */
  private idleZoneAssignments: Map<string, RoomKey> = new Map();
  /** Skill return desk (desk reserved while using skill) */
  private skillReturnDesks: Map<string, Desk> = new Map();

  constructor(deskManager: DeskManager) {
    this.deskManager = deskManager;
  }

  /**
   * Compute new state outputs for all agents.
   * Called once per frame or on session update.
   */
  computeStates(inputs: AgentStateInput[]): Map<string, AgentStateOutput> {
    const results = new Map<string, AgentStateOutput>();

    for (const input of inputs) {
      const prev = this.agentStates.get(input.agentId) ?? 'idle';
      const newState = deriveVisualState({ ...input, previousVisualState: prev });
      const idleZone = this.getOrAssignIdleZone(input.agentId, input.agentIndex);
      const targetRoom = stateToRoom(newState, idleZone);

      let desk: Desk | null = null;
      let seated = false;

      // Desk management based on state transitions
      const isSamantha = input.agentId === 'main' || input.agentId === 'samantha';
      const isEmma = input.agentId === 'emma';
      const isGinny = input.agentId === 'ginny';

      // Managers always at their personal desks regardless of state
      if (isSamantha) {
        desk = SAMANTHA_DESK;
        const occupiedDesk = this.deskManager.getDeskForAgent(input.agentId);
        if (!occupiedDesk || occupiedDesk.id !== SAMANTHA_DESK_ID) {
          this.deskManager.claimNearestDesk(input.agentId, SAMANTHA_DESK.position);
        }
        seated = newState === 'running';
      } else if (isEmma) {
        desk = EMMA_DESK;
        const occupiedDesk = this.deskManager.getDeskForAgent('emma');
        if (!occupiedDesk || occupiedDesk.id !== EMMA_DESK_ID) {
          this.deskManager.claimNearestDesk('emma', EMMA_DESK.position);
        }
        seated = true;
      } else if (isGinny) {
        desk = GINNY_DESK;
        const occupiedDesk = this.deskManager.getDeskForAgent('ginny');
        if (!occupiedDesk || occupiedDesk.id !== GINNY_DESK_ID) {
          this.deskManager.claimNearestDesk('ginny', GINNY_DESK.position);
        }
        seated = true;
      } else if (newState === 'running') {
        if (prev === 'using_skill') {
          // Return to previously reserved desk
          desk = this.skillReturnDesks.get(input.agentId)
            ?? this.deskManager.getDeskForAgent(input.agentId)
            ?? this.deskManager.claimNearestDesk(input.agentId, input.currentPosition ?? [0, 0, -3]);
          this.skillReturnDesks.delete(input.agentId);
        } else if (prev !== 'running' && prev !== 'communicating') {
          // Newly running — claim nearest free desk
          desk = this.deskManager.claimNearestDesk(input.agentId, input.currentPosition ?? [0, 0, -3]);
        } else {
          // Already running — keep existing desk
          desk = this.deskManager.getDeskForAgent(input.agentId);
          if (!desk) {
            desk = this.deskManager.claimNearestDesk(input.agentId, input.currentPosition ?? [0, 0, -3]);
          }
        }
        seated = desk !== null;
      } else if (newState === 'using_skill') {
        // Keep desk reserved while visiting skill room
        const currentDesk = this.deskManager.keepDesk(input.agentId);
        if (currentDesk) {
          this.skillReturnDesks.set(input.agentId, currentDesk);
          desk = currentDesk; // still "owned" — not released
        }
        seated = false; // agent is walking
      } else {
        // Not running — release desk (unless using_skill already handled)
        if (prev === 'running' || prev === 'communicating') {
          // Don't release if we might be using_skill (handled above)
          this.deskManager.releaseDesk(input.agentId);
        }
        desk = null;
        seated = false;
      }

      // Update state tracking
      this.agentStates.set(input.agentId, newState);
      this.updateMetrics(input.agentId, newState, prev);

      // Managers always stay in despacho
      const finalTargetRoom = (isEmma || isGinny) ? 'despacho' : targetRoom;

      results.set(input.agentId, {
        visualState: newState,
        targetRoom: finalTargetRoom,
        desk,
        seated,
        activityLabel: getStateLabel(newState),
      });
    }

    return results;
  }

  /** Get current visual state for an agent */
  getState(agentId: string): AgentVisualState {
    return this.agentStates.get(agentId) ?? 'idle';
  }

  /** Get metrics for an agent */
  getMetrics(agentId: string): AgentStateMetrics | undefined {
    return this.metrics.get(agentId);
  }

  /** Get all metrics (for debugging/display) */
  getAllMetrics(): AgentStateMetrics[] {
    return [...this.metrics.values()];
  }

  /** Deterministically assign idle zones to spread agents across 3 zones */
  private getOrAssignIdleZone(agentId: string, agentIndex: number): RoomKey {
    const existing = this.idleZoneAssignments.get(agentId);
    if (existing) return existing;

    // Map AgentZone → RoomKey (AgentZone has 'biblioteca' | 'lobby' | 'descanso' for idle)
    const zone = getIdleZone(agentId, agentIndex);
    // Map AgentZone → RoomKey. 'exterior' maps to 'descanso' (outdoor/beach spots near relax zone)
    const roomMap: Record<string, RoomKey> = {
      lobby: 'lobby',
      descanso: 'descanso',
      exterior: 'descanso',  // exterior spots use descanso area coordinates
      comunicacion: 'comunicacion',
      trabajo: 'trabajo',
      biblioteca: 'biblioteca',
    };
    const roomKey: RoomKey = roomMap[zone] ?? 'lobby';
    this.idleZoneAssignments.set(agentId, roomKey);
    return roomKey;
  }

  /** Update metrics tracking for an agent */
  private updateMetrics(agentId: string, newState: AgentVisualState, prevState: AgentVisualState): void {
    const now = Date.now();
    const existing = this.metrics.get(agentId);

    if (!existing) {
      this.metrics.set(agentId, {
        agentId,
        currentState: newState,
        enteredStateAt: now,
        timeInState: 0,
        cumulativeTime: { [newState]: 0 },
      });
      return;
    }

    // Accumulate time spent in previous state
    const elapsed = now - existing.enteredStateAt;
    const cumulative = { ...existing.cumulativeTime };
    cumulative[prevState] = (cumulative[prevState] ?? 0) + elapsed;

    this.metrics.set(agentId, {
      agentId,
      currentState: newState,
      enteredStateAt: now,
      timeInState: 0,
      cumulativeTime: cumulative,
    });
  }
}

/**
 * Visibility check — all agents with a session are visible in the 3D world.
 * The state machine handles placement (idle agents go to lobby/descanso/exterior).
 */
export function isAgentVisible(status: import('../types').SessionStatus): boolean {
  return status === 'running' || status === 'waiting' || status === 'idle';
}
