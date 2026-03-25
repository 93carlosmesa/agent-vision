/**
 * Tests for the agent 5-state machine, DeskManager, and AgentStateMachine.
 *
 * Validates:
 *  1. Valid transitions between states
 *  2. Invalid transitions are rejected
 *  3. Each state has correct zones assigned
 *  4. DeskManager assign/release logic
 *  5. AgentStateMachine produces expected outputs
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  AGENT_STATE_CONFIGS,
  IDLE_ZONES,
  getIdleZone,
  type AgentVisualState,
  type AgentZone,
} from '../types/AgentState';
import {
  DeskManager,
  ALL_DESKS,
  SAMANTHA_DESK,
  SAMANTHA_DESK_ID,
} from '../systems/DeskManager';
import { AgentStateMachine, type AgentStateInput } from '../systems/AgentStateMachine';

// ─── Helpers ──────────────────────────────────────────────

const ALL_STATES: AgentVisualState[] = ['idle', 'waiting', 'running', 'communicating', 'using_skill'];

/** Build all theoretically possible pairs and filter out valid ones → invalid set */
const ALL_PAIRS: [AgentVisualState, AgentVisualState][] = ALL_STATES.flatMap(
  from => ALL_STATES.filter(to => to !== from).map(to => [from, to] as [AgentVisualState, AgentVisualState])
);

const INVALID_TRANSITIONS = ALL_PAIRS.filter(
  ([from, to]) => !VALID_TRANSITIONS.some(([vf, vt]) => vf === from && vt === to)
);
void INVALID_TRANSITIONS; // reserved for future negative-path tests

function makeInput(overrides: Partial<AgentStateInput> & { agentId: string }): AgentStateInput {
  return {
    agentIndex: 0,
    sessionStatus: 'idle',
    squadHasActiveTasks: false,
    ...overrides,
  };
}

// ─── 1. AGENT_STATE_CONFIGS — zone assignments ───────────

describe('AGENT_STATE_CONFIGS — zone assignments', () => {
  it('idle state has lobby, descanso, exterior zones', () => {
    expect(AGENT_STATE_CONFIGS.idle.validZones).toEqual(['lobby', 'descanso', 'exterior']);
  });

  it('waiting state has comunicacion, lobby zones', () => {
    expect(AGENT_STATE_CONFIGS.waiting.validZones).toEqual(['comunicacion', 'lobby']);
  });

  it('running state has trabajo, biblioteca zones', () => {
    expect(AGENT_STATE_CONFIGS.running.validZones).toEqual(['trabajo', 'biblioteca']);
  });

  it('communicating state has comunicacion zone', () => {
    expect(AGENT_STATE_CONFIGS.communicating.validZones).toEqual(['comunicacion']);
  });

  it('using_skill state has biblioteca zone', () => {
    expect(AGENT_STATE_CONFIGS.using_skill.validZones).toEqual(['biblioteca']);
  });

  it('only running state needs a desk', () => {
    for (const state of ALL_STATES) {
      expect(AGENT_STATE_CONFIGS[state].needsDesk).toBe(state === 'running');
    }
  });

  it('only running state is seated', () => {
    for (const state of ALL_STATES) {
      expect(AGENT_STATE_CONFIGS[state].seated).toBe(state === 'running');
    }
  });
});

// ─── 2. IDLE_ZONES and getIdleZone ───────────────────────

describe('IDLE_ZONES and getIdleZone', () => {
  it('IDLE_ZONES contains exactly lobby, descanso, exterior', () => {
    expect(IDLE_ZONES).toEqual(['lobby', 'descanso', 'exterior']);
  });

  it('getIdleZone always returns a valid idle zone', () => {
    for (let i = 0; i < 20; i++) {
      const zone = getIdleZone(`agent-${i}`, i);
      expect(IDLE_ZONES).toContain(zone);
    }
  });

  it('getIdleZone is deterministic for same inputs', () => {
    const z1 = getIdleZone('agent-test', 5);
    const z2 = getIdleZone('agent-test', 5);
    expect(z1).toBe(z2);
  });

  it('getIdleZone distributes across multiple zones', () => {
    const zones = new Set<AgentZone>();
    for (let i = 0; i < 30; i++) {
      zones.add(getIdleZone(`agent-${i}`, i));
    }
    // With 30 agents, we should hit at least 2 of 3 zones
    expect(zones.size).toBeGreaterThanOrEqual(2);
  });
});

// ─── 3. DeskManager ──────────────────────────────────────

describe('DeskManager', () => {
  let dm: DeskManager;

  beforeEach(() => {
    dm = new DeskManager();
  });

  it('initializes with all desks', () => {
    expect(dm.getDesks()).toBe(ALL_DESKS);
    expect(dm.getDesks().length).toBeGreaterThanOrEqual(17); // 1 Samantha + 16 trabajo + 4 biblioteca
  });

  it('Samantha desk is pre-reserved for "main"', () => {
    const occ = dm.getOccupancy(SAMANTHA_DESK_ID);
    expect(occ).toBeDefined();
    expect(occ!.agentId).toBe('main');
    expect(dm.isFree(SAMANTHA_DESK_ID)).toBe(false);
  });

  it('other desks start free', () => {
    const freeDesks = ALL_DESKS.filter(d => d.id !== SAMANTHA_DESK_ID && dm.isFree(d.id));
    expect(freeDesks.length).toBe(ALL_DESKS.length - 1);
  });

  it('claimNearestDesk assigns a desk to an agent', () => {
    const desk = dm.claimNearestDesk('agent-1', [0, 0, -3]);
    expect(desk).not.toBeNull();
    expect(dm.getDeskForAgent('agent-1')).toBe(desk);
    expect(dm.isFree(desk!.id)).toBe(false);
  });

  it('claimNearestDesk picks the closest desk', () => {
    // Claim from a position very close to a specific desk
    const targetDesk = ALL_DESKS.find(d => d.id !== SAMANTHA_DESK_ID)!;
    const desk = dm.claimNearestDesk('agent-1', targetDesk.position);
    expect(desk).not.toBeNull();
    expect(desk!.id).toBe(targetDesk.id);
  });

  it('non-samantha agents cannot claim Samantha desk', () => {
    // Release Samantha's desk manually via internal state to test the filter
    dm.releaseDesk('main');
    // Now all trabajo desks are free, but non-samantha should not get samantha's desk
    // even if it's closer
    const desk = dm.claimNearestDesk('agent-1', SAMANTHA_DESK.position);
    expect(desk).not.toBeNull();
    expect(desk!.id).not.toBe(SAMANTHA_DESK_ID);
  });

  it('samantha can claim her own desk', () => {
    dm.releaseDesk('main');
    const desk = dm.claimNearestDesk('main', SAMANTHA_DESK.position);
    expect(desk).not.toBeNull();
    expect(desk!.id).toBe(SAMANTHA_DESK_ID);
  });

  it('releaseDesk frees the desk', () => {
    const desk = dm.claimNearestDesk('agent-1', [0, 0, -3]);
    expect(desk).not.toBeNull();
    dm.releaseDesk('agent-1');
    expect(dm.getDeskForAgent('agent-1')).toBeNull();
    expect(dm.isFree(desk!.id)).toBe(true);
  });

  it('keepDesk returns the desk without releasing', () => {
    const desk = dm.claimNearestDesk('agent-1', [0, 0, -3]);
    const kept = dm.keepDesk('agent-1');
    expect(kept).toBe(desk);
    expect(dm.getDeskForAgent('agent-1')).toBe(desk);
  });

  it('multiple agents get different desks', () => {
    const desk1 = dm.claimNearestDesk('a1', [0, 0, -3]);
    const desk2 = dm.claimNearestDesk('a2', [0, 0, -3]);
    const desk3 = dm.claimNearestDesk('a3', [0, 0, -3]);
    expect(desk1).not.toBeNull();
    expect(desk2).not.toBeNull();
    expect(desk3).not.toBeNull();
    const ids = new Set([desk1!.id, desk2!.id, desk3!.id]);
    expect(ids.size).toBe(3);
  });

  it('occupiedCount and freeCount are consistent', () => {
    const before = dm.occupiedCount;
    dm.claimNearestDesk('a1', [0, 0, 0]);
    dm.claimNearestDesk('a2', [0, 0, 0]);
    expect(dm.occupiedCount).toBe(before + 2);
    expect(dm.freeCount).toBe(ALL_DESKS.length - dm.occupiedCount);
  });

  it('claimNearestDesk releases previous desk before claiming new one', () => {
    const desk1 = dm.claimNearestDesk('agent-1', [-16, 0, -6]);
    expect(desk1).not.toBeNull();
    const desk2 = dm.claimNearestDesk('agent-1', [8, 0, -6]);
    expect(desk2).not.toBeNull();
    // Old desk should be free, new desk should be occupied
    expect(dm.isFree(desk1!.id)).toBe(true);
    expect(dm.getDeskForAgent('agent-1')!.id).toBe(desk2!.id);
  });

  it('returns null when all desks are occupied', () => {
    // Claim all free desks
    const total = ALL_DESKS.length;
    for (let i = 0; i < total; i++) {
      dm.claimNearestDesk(`filler-${i}`, [0, 0, 0]);
    }
    const desk = dm.claimNearestDesk('overflow-agent', [0, 0, 0]);
    expect(desk).toBeNull();
  });

  it('getOccupancySnapshot returns all desks', () => {
    const snap = dm.getOccupancySnapshot();
    expect(Object.keys(snap).length).toBe(ALL_DESKS.length);
  });
});

// ─── 4. AgentStateMachine — state derivation ─────────────

describe('AgentStateMachine — state derivation', () => {
  let dm: DeskManager;
  let sm: AgentStateMachine;

  beforeEach(() => {
    dm = new DeskManager();
    sm = new AgentStateMachine(dm);
  });

  it('default state is idle', () => {
    expect(sm.getState('any-agent')).toBe('idle');
  });

  it('idle session + no squad activity → idle', () => {
    const results = sm.computeStates([
      makeInput({ agentId: 'a1', sessionStatus: 'idle', squadHasActiveTasks: false }),
    ]);
    expect(results.get('a1')!.visualState).toBe('idle');
  });

  it('idle session + squad active → waiting', () => {
    const results = sm.computeStates([
      makeInput({ agentId: 'a1', sessionStatus: 'idle', squadHasActiveTasks: true }),
    ]);
    expect(results.get('a1')!.visualState).toBe('waiting');
  });

  it('waiting session + squad active → waiting', () => {
    const results = sm.computeStates([
      makeInput({ agentId: 'a1', sessionStatus: 'waiting', squadHasActiveTasks: true }),
    ]);
    expect(results.get('a1')!.visualState).toBe('waiting');
  });

  it('waiting session + no squad activity → idle', () => {
    const results = sm.computeStates([
      makeInput({ agentId: 'a1', sessionStatus: 'waiting', squadHasActiveTasks: false }),
    ]);
    expect(results.get('a1')!.visualState).toBe('idle');
  });

  it('running session → running', () => {
    const results = sm.computeStates([
      makeInput({ agentId: 'a1', sessionStatus: 'running', squadHasActiveTasks: true }),
    ]);
    expect(results.get('a1')!.visualState).toBe('running');
    expect(results.get('a1')!.seated).toBe(true);
    expect(results.get('a1')!.desk).not.toBeNull();
  });

  it('running state gets a desk assigned', () => {
    const results = sm.computeStates([
      makeInput({ agentId: 'a1', sessionStatus: 'running', squadHasActiveTasks: true }),
    ]);
    const output = results.get('a1')!;
    expect(output.desk).not.toBeNull();
    expect(output.targetRoom).toBe('trabajo');
  });

  it('idle state has no desk and is not seated', () => {
    const results = sm.computeStates([
      makeInput({ agentId: 'a1', sessionStatus: 'idle', squadHasActiveTasks: false }),
    ]);
    const output = results.get('a1')!;
    expect(output.desk).toBeNull();
    expect(output.seated).toBe(false);
  });

  it('waiting state targets comunicacion room', () => {
    const results = sm.computeStates([
      makeInput({ agentId: 'a1', sessionStatus: 'idle', squadHasActiveTasks: true }),
    ]);
    expect(results.get('a1')!.targetRoom).toBe('comunicacion');
  });
});

// ─── 5. Valid transitions via AgentStateMachine ──────────

describe('AgentStateMachine — valid transitions', () => {
  let dm: DeskManager;
  let sm: AgentStateMachine;

  beforeEach(() => {
    dm = new DeskManager();
    sm = new AgentStateMachine(dm);
  });

  it('idle → running (session becomes running)', () => {
    // Start idle
    sm.computeStates([makeInput({ agentId: 'a1', sessionStatus: 'idle', squadHasActiveTasks: false })]);
    expect(sm.getState('a1')).toBe('idle');

    // Transition to running
    sm.computeStates([makeInput({ agentId: 'a1', sessionStatus: 'running', squadHasActiveTasks: true })]);
    expect(sm.getState('a1')).toBe('running');
  });

  it('idle → waiting (squad becomes active)', () => {
    sm.computeStates([makeInput({ agentId: 'a1', sessionStatus: 'idle', squadHasActiveTasks: false })]);
    expect(sm.getState('a1')).toBe('idle');

    sm.computeStates([makeInput({ agentId: 'a1', sessionStatus: 'idle', squadHasActiveTasks: true })]);
    expect(sm.getState('a1')).toBe('waiting');
  });

  it('waiting → running (agent gets a task)', () => {
    sm.computeStates([makeInput({ agentId: 'a1', sessionStatus: 'idle', squadHasActiveTasks: true })]);
    expect(sm.getState('a1')).toBe('waiting');

    sm.computeStates([makeInput({ agentId: 'a1', sessionStatus: 'running', squadHasActiveTasks: true })]);
    expect(sm.getState('a1')).toBe('running');
  });

  it('waiting → communicating (agent gets called)', () => {
    sm.computeStates([makeInput({ agentId: 'a1', sessionStatus: 'idle', squadHasActiveTasks: true })]);
    expect(sm.getState('a1')).toBe('waiting');

    sm.computeStates([makeInput({ agentId: 'a1', sessionStatus: 'waiting', squadHasActiveTasks: true, beingCalled: true })]);
    expect(sm.getState('a1')).toBe('communicating');
  });

  it('running → communicating (agent gets called while working)', () => {
    sm.computeStates([makeInput({ agentId: 'a1', sessionStatus: 'running', squadHasActiveTasks: true })]);
    expect(sm.getState('a1')).toBe('running');

    sm.computeStates([makeInput({ agentId: 'a1', sessionStatus: 'running', squadHasActiveTasks: true, beingCalled: true })]);
    expect(sm.getState('a1')).toBe('communicating');
  });

  it('running → using_skill (agent needs skill)', () => {
    sm.computeStates([makeInput({ agentId: 'a1', sessionStatus: 'running', squadHasActiveTasks: true })]);
    expect(sm.getState('a1')).toBe('running');

    sm.computeStates([makeInput({ agentId: 'a1', sessionStatus: 'running', squadHasActiveTasks: true, needsSkill: true })]);
    expect(sm.getState('a1')).toBe('using_skill');
  });

  it('running → waiting (agent task ends but squad still active)', () => {
    sm.computeStates([makeInput({ agentId: 'a1', sessionStatus: 'running', squadHasActiveTasks: true })]);
    expect(sm.getState('a1')).toBe('running');

    sm.computeStates([makeInput({ agentId: 'a1', sessionStatus: 'waiting', squadHasActiveTasks: true })]);
    expect(sm.getState('a1')).toBe('waiting');
  });

  it('communicating → running (back to work)', () => {
    // Get to communicating state
    sm.computeStates([makeInput({ agentId: 'a1', sessionStatus: 'idle', squadHasActiveTasks: true })]);
    sm.computeStates([makeInput({ agentId: 'a1', sessionStatus: 'waiting', squadHasActiveTasks: true, beingCalled: true })]);
    expect(sm.getState('a1')).toBe('communicating');

    sm.computeStates([makeInput({ agentId: 'a1', sessionStatus: 'running', squadHasActiveTasks: true })]);
    expect(sm.getState('a1')).toBe('running');
  });

  it('communicating → waiting (done communicating, no task)', () => {
    sm.computeStates([makeInput({ agentId: 'a1', sessionStatus: 'idle', squadHasActiveTasks: true })]);
    sm.computeStates([makeInput({ agentId: 'a1', sessionStatus: 'waiting', squadHasActiveTasks: true, beingCalled: true })]);
    expect(sm.getState('a1')).toBe('communicating');

    sm.computeStates([makeInput({ agentId: 'a1', sessionStatus: 'waiting', squadHasActiveTasks: true })]);
    expect(sm.getState('a1')).toBe('waiting');
  });

  it('using_skill → running (skill done, back to desk)', () => {
    sm.computeStates([makeInput({ agentId: 'a1', sessionStatus: 'running', squadHasActiveTasks: true })]);
    const deskBefore = dm.getDeskForAgent('a1');
    expect(deskBefore).not.toBeNull();

    sm.computeStates([makeInput({ agentId: 'a1', sessionStatus: 'running', squadHasActiveTasks: true, needsSkill: true })]);
    expect(sm.getState('a1')).toBe('using_skill');

    // Desk should still be reserved during skill usage
    expect(dm.getDeskForAgent('a1')).not.toBeNull();

    sm.computeStates([makeInput({ agentId: 'a1', sessionStatus: 'running', squadHasActiveTasks: true })]);
    expect(sm.getState('a1')).toBe('running');
    expect(dm.getDeskForAgent('a1')).not.toBeNull();
  });
});

// ─── 6. Invalid transitions — should NOT happen ─────────

describe('AgentStateMachine — invalid transitions should not occur', () => {
  let dm: DeskManager;
  let sm: AgentStateMachine;

  beforeEach(() => {
    dm = new DeskManager();
    sm = new AgentStateMachine(dm);
  });

  it('using_skill cannot be reached from idle (needsSkill requires running prev)', () => {
    sm.computeStates([makeInput({ agentId: 'a1', sessionStatus: 'idle', squadHasActiveTasks: false })]);
    expect(sm.getState('a1')).toBe('idle');

    // Even with needsSkill, idle → using_skill should NOT happen (guard: previousVisualState === 'running')
    sm.computeStates([makeInput({ agentId: 'a1', sessionStatus: 'idle', squadHasActiveTasks: false, needsSkill: true })]);
    expect(sm.getState('a1')).not.toBe('using_skill');
  });

  it('using_skill cannot be reached from waiting', () => {
    sm.computeStates([makeInput({ agentId: 'a1', sessionStatus: 'idle', squadHasActiveTasks: true })]);
    expect(sm.getState('a1')).toBe('waiting');

    sm.computeStates([makeInput({ agentId: 'a1', sessionStatus: 'waiting', squadHasActiveTasks: true, needsSkill: true })]);
    expect(sm.getState('a1')).not.toBe('using_skill');
  });

  it('communicating cannot be reached from idle (beingCalled requires waiting or running prev)', () => {
    sm.computeStates([makeInput({ agentId: 'a1', sessionStatus: 'idle', squadHasActiveTasks: false })]);
    expect(sm.getState('a1')).toBe('idle');

    sm.computeStates([makeInput({ agentId: 'a1', sessionStatus: 'idle', squadHasActiveTasks: false, beingCalled: true })]);
    expect(sm.getState('a1')).not.toBe('communicating');
  });

  it('communicating cannot be reached from using_skill', () => {
    // Get to using_skill
    sm.computeStates([makeInput({ agentId: 'a1', sessionStatus: 'running', squadHasActiveTasks: true })]);
    sm.computeStates([makeInput({ agentId: 'a1', sessionStatus: 'running', squadHasActiveTasks: true, needsSkill: true })]);
    expect(sm.getState('a1')).toBe('using_skill');

    sm.computeStates([makeInput({ agentId: 'a1', sessionStatus: 'running', squadHasActiveTasks: true, beingCalled: true })]);
    expect(sm.getState('a1')).not.toBe('communicating');
  });
});

// ─── 7. Desk lifecycle through state transitions ─────────

describe('Desk lifecycle through state transitions', () => {
  let dm: DeskManager;
  let sm: AgentStateMachine;

  beforeEach(() => {
    dm = new DeskManager();
    sm = new AgentStateMachine(dm);
  });

  it('desk is assigned on running and released on idle', () => {
    sm.computeStates([makeInput({ agentId: 'a1', sessionStatus: 'running', squadHasActiveTasks: true })]);
    const desk = dm.getDeskForAgent('a1');
    expect(desk).not.toBeNull();

    sm.computeStates([makeInput({ agentId: 'a1', sessionStatus: 'idle', squadHasActiveTasks: false })]);
    expect(dm.getDeskForAgent('a1')).toBeNull();
    expect(dm.isFree(desk!.id)).toBe(true);
  });

  it('desk is preserved during running → using_skill → running cycle', () => {
    sm.computeStates([makeInput({ agentId: 'a1', sessionStatus: 'running', squadHasActiveTasks: true })]);
    const deskId = dm.getDeskForAgent('a1')!.id;

    sm.computeStates([makeInput({ agentId: 'a1', sessionStatus: 'running', squadHasActiveTasks: true, needsSkill: true })]);
    expect(dm.getDeskForAgent('a1')).not.toBeNull();

    sm.computeStates([makeInput({ agentId: 'a1', sessionStatus: 'running', squadHasActiveTasks: true })]);
    expect(dm.getDeskForAgent('a1')!.id).toBe(deskId);
  });

  it('desk is released when running → waiting', () => {
    sm.computeStates([makeInput({ agentId: 'a1', sessionStatus: 'running', squadHasActiveTasks: true })]);
    const desk = dm.getDeskForAgent('a1');
    expect(desk).not.toBeNull();

    sm.computeStates([makeInput({ agentId: 'a1', sessionStatus: 'waiting', squadHasActiveTasks: true })]);
    expect(dm.getDeskForAgent('a1')).toBeNull();
  });

  it('multiple agents get different desks simultaneously', () => {
    const results = sm.computeStates([
      makeInput({ agentId: 'a1', sessionStatus: 'running', squadHasActiveTasks: true, agentIndex: 0 }),
      makeInput({ agentId: 'a2', sessionStatus: 'running', squadHasActiveTasks: true, agentIndex: 1 }),
      makeInput({ agentId: 'a3', sessionStatus: 'running', squadHasActiveTasks: true, agentIndex: 2 }),
    ]);
    const desks = [
      results.get('a1')!.desk,
      results.get('a2')!.desk,
      results.get('a3')!.desk,
    ];
    expect(desks.every(d => d !== null)).toBe(true);
    const ids = new Set(desks.map(d => d!.id));
    expect(ids.size).toBe(3);
  });

  it('Samantha always gets her desk', () => {
    const results = sm.computeStates([
      makeInput({ agentId: 'main', sessionStatus: 'running', squadHasActiveTasks: true }),
    ]);
    expect(results.get('main')!.desk!.id).toBe(SAMANTHA_DESK_ID);
  });
});

// ─── 8. Metrics tracking ─────────────────────────────────

describe('AgentStateMachine — metrics', () => {
  let dm: DeskManager;
  let sm: AgentStateMachine;

  beforeEach(() => {
    dm = new DeskManager();
    sm = new AgentStateMachine(dm);
  });

  it('creates metrics on first compute', () => {
    sm.computeStates([makeInput({ agentId: 'a1', sessionStatus: 'idle', squadHasActiveTasks: false })]);
    const metrics = sm.getMetrics('a1');
    expect(metrics).toBeDefined();
    expect(metrics!.currentState).toBe('idle');
    expect(metrics!.agentId).toBe('a1');
  });

  it('updates metrics on state change', () => {
    sm.computeStates([makeInput({ agentId: 'a1', sessionStatus: 'idle', squadHasActiveTasks: false })]);
    sm.computeStates([makeInput({ agentId: 'a1', sessionStatus: 'running', squadHasActiveTasks: true })]);
    const metrics = sm.getMetrics('a1');
    expect(metrics!.currentState).toBe('running');
  });

  it('getAllMetrics returns all tracked agents', () => {
    sm.computeStates([
      makeInput({ agentId: 'a1', sessionStatus: 'idle', squadHasActiveTasks: false }),
      makeInput({ agentId: 'a2', sessionStatus: 'idle', squadHasActiveTasks: false }),
    ]);
    expect(sm.getAllMetrics().length).toBe(2);
  });
});

// ─── 9. Activity labels ──────────────────────────────────

describe('AgentStateMachine — activity labels', () => {
  let dm: DeskManager;
  let sm: AgentStateMachine;

  beforeEach(() => {
    dm = new DeskManager();
    sm = new AgentStateMachine(dm);
  });

  it('idle produces correct label', () => {
    const results = sm.computeStates([makeInput({ agentId: 'a1', sessionStatus: 'idle', squadHasActiveTasks: false })]);
    expect(results.get('a1')!.activityLabel).toContain('Descansando');
  });

  it('running produces correct label', () => {
    const results = sm.computeStates([makeInput({ agentId: 'a1', sessionStatus: 'running', squadHasActiveTasks: true })]);
    expect(results.get('a1')!.activityLabel).toContain('Trabajando');
  });

  it('waiting produces correct label', () => {
    const results = sm.computeStates([makeInput({ agentId: 'a1', sessionStatus: 'idle', squadHasActiveTasks: true })]);
    expect(results.get('a1')!.activityLabel).toContain('En espera');
  });
});
