/**
 * World3D — R3F Canvas with multi-room office building.
 *
 * STATE MACHINE PHILOSOPHY:
 *   5 formal visual states per agent, driven by AgentStateMachine:
 *   - IDLE:          Squad has no active tasks → random zone (lobby/descanso/biblioteca)
 *   - WAITING:       Squad working, this agent has no task → comunicacion
 *   - RUNNING:       Agent has active task → seated at desk in trabajo (via DeskManager)
 *   - COMMUNICATING: Agent communicating → comunicacion
 *   - USING_SKILL:   Agent visiting skill room → biblioteca (desk reserved, then returns)
 *
 * DeskManager ensures no 2 agents share a desk. Agents claim nearest free desk
 * on RUNNING, release on WAITING/IDLE, and keep reserved during USING_SKILL.
 */

import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { CameraControls3D, CameraHUD } from './CameraControls3D';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { AgentMotionSystem } from './AgentMotionSystem';
import { SkillFolders3D } from './Folder3D';
import { InteractionBeam3D } from './InteractionBeam3D';
import { OfficeLayout3D } from './OfficeLayout3D';
import {
  LobbyFurniture,
  DescansoFurniture,
  ComunicacionFurniture,
  TrabajoFurniture,
  BibliotecaFurniture,
  ExteriorFurniture,
} from './OfficeFurniture3D';
import { getWorldEnvironment, ROOM_CENTERS } from './officeTheme';
import { findPath } from '../../utils/officePathfinding';
import type { RoomKey } from '../../utils/officePathfinding';
import type { ISession, AgentNameMap, IInteraction, SessionStatus } from '../../types';
import { getLightingConfig } from '../../systems/DayNightCycle';
import type { LightingConfig } from '../../systems/DayNightCycle';
import {
  isOrchestrator,
  isCEO,
  isManager,
  CEO_ID,
  MANAGER_ID,
  AGENT_REGISTRY,
  getAgentSoul,
} from '../../config/agentConfig';
import { DeskManager } from '../../systems/DeskManager';
import { AgentStateMachine } from '../../systems/AgentStateMachine';
import type { AgentVisualState } from '../../types/AgentState';

export interface World3DProps {
  sessions: ISession[];
  agentNames: AgentNameMap;
  interactions?: IInteraction[];
  environmentId?: string;
}

/* ── Agent context mapping — derived from registry ── */
const INVESTMENT_AGENTS = AGENT_REGISTRY
  .filter(a => a.department === 'investment')
  .map(a => a.id);
const DEV_AGENTS = AGENT_REGISTRY
  .filter(a => a.department === 'development')
  .map(a => a.id);

type WorkContext = 'development' | 'investment';

/* Room centers moved to officeTheme.ts */

/* ── Idle spots in Descanso — near furniture ── */
interface IdleSpot {
  id: string;
  pos: [number, number, number];
  facing: number;
  label: string;
}

const DESCANSO_SPOTS: IdleSpot[] = [
  { id: 'sofa-a1', pos: [-18.8, 0, 7.6], facing: Math.PI / 2, label: '😌 Relaxing' },
  { id: 'sofa-a2', pos: [-18.8, 0, 6.2], facing: Math.PI / 2, label: '😌 Relaxing' },
  { id: 'sofa-a3', pos: [-17.0, 0, 8.2], facing: 0, label: '😌 Relaxing' },
  { id: 'sofa-a4', pos: [-15.0, 0, 7.4], facing: -Math.PI / 2, label: '😌 Relaxing' },
  { id: 'sofa-b1', pos: [-10.5, 0, 6.2], facing: Math.PI, label: '☕ Chat' },
  { id: 'sofa-b2', pos: [-8.9, 0, 7.8], facing: 0, label: '☕ Chat' },
  { id: 'coffee-1', pos: [-6.8, 0, 8.1], facing: 0, label: '☕ Coffee' },
  { id: 'coffee-2', pos: [-5.2, 0, 8.1], facing: 0, label: '☕ Coffee' },
  { id: 'plant-side', pos: [-22, 0, 7], facing: Math.PI / 2, label: '🌿 Break' },
  { id: 'stand-1', pos: [-12.2, 0, 4.5], facing: Math.PI / 3, label: '💭 Thinking' },
  { id: 'stand-2', pos: [-8.4, 0, 4.2], facing: 0, label: '💭 Thinking' },
  { id: 'stand-3', pos: [-14.8, 0, 10], facing: -Math.PI / 2, label: '💭 Thinking' },
];

/* ── Dedicated seats in Lobby for Investment Squad ── */
const INVESTMENT_LOBBY_SEATS: Record<string, IdleSpot> = {
  'ginny':                    { id: 'inv-ginny',          pos: [19,   0, 16.2], facing: Math.PI,          label: '📊 Standby' },
  'inv-psych-market':         { id: 'inv-psych',          pos: [16.5, 0, 15],   facing: Math.PI * 0.75,   label: '🧠 Standby' },
  'inv-us-open':              { id: 'inv-open',           pos: [21.5, 0, 15],   facing: -Math.PI * 0.75,  label: '📈 Standby' },
  'inv-risk-profiler':        { id: 'inv-risk',           pos: [14.5, 0, 16],   facing: Math.PI * 0.5,    label: '🎯 Standby' },
  'inv-analyst-stocks':       { id: 'inv-stocks',         pos: [23,   0, 16],   facing: -Math.PI * 0.5,   label: '📊 Standby' },
  'inv-analyst-crypto':       { id: 'inv-crypto',         pos: [14.5, 0, 13.5], facing: Math.PI * 0.5,    label: '🪙 Standby' },
  'inv-analyst-forex':        { id: 'inv-forex',          pos: [23,   0, 13.5], facing: -Math.PI * 0.5,   label: '💱 Standby' },
  'inv-analyst-commodities':  { id: 'inv-commodities',    pos: [16,   0, 12.5], facing: Math.PI * 0.25,   label: '⛏️ Standby' },
  'inv-analyst-ai':           { id: 'inv-ai',             pos: [22,   0, 12.5], facing: -Math.PI * 0.25,  label: '🤖 Standby' },
  'inv-technical-analyst':    { id: 'inv-technical',      pos: [19,   0, 11.5], facing: Math.PI,           label: '📐 Standby' },
  'inv-strategist':           { id: 'inv-strategist',     pos: [17,   0, 17.2], facing: Math.PI * 0.75,   label: '🏛️ Standby' },
};

/* ── Idle spots in Biblioteca — for idle agents assigned to biblioteca zone ── */
const BIBLIOTECA_IDLE_SPOTS: IdleSpot[] = [
  { id: 'bib-1', pos: [-17, 0, -10.9], facing: Math.PI, label: '📚 Reading' },
  { id: 'bib-2', pos: [-12, 0, -10.9], facing: Math.PI, label: '📖 Studying' },
  { id: 'bib-3', pos: [-7,  0, -10.9], facing: Math.PI, label: '💡 Learning' },
  { id: 'bib-4', pos: [-2,  0, -10.9], facing: Math.PI, label: '📚 Researching' },
  { id: 'bib-5', pos: [-14, 0, -15],   facing: 0,        label: '💭 Thinking' },
  { id: 'bib-6', pos: [-8,  0, -15],   facing: 0,        label: '🔬 Exploring' },
];

/* ── Idle spots in Lobby — for out-of-context agents (generic) ── */
const LOBBY_SPOTS: IdleSpot[] = [
  { id: 'bench-l1', pos: [-8.5, 0, 13.4], facing: 0, label: '💭 Waiting' },
  { id: 'bench-l2', pos: [-7.2, 0, 13.4], facing: 0, label: '💭 Waiting' },
  { id: 'bench-r1', pos: [8.5, 0, 13.4], facing: 0, label: '💭 Waiting' },
  { id: 'bench-r2', pos: [7.2, 0, 13.4], facing: 0, label: '💭 Waiting' },
  { id: 'stand-1', pos: [-3, 0, 14.5], facing: Math.PI / 3, label: '💭 Thinking' },
  { id: 'stand-2', pos: [3, 0, 14.5], facing: -Math.PI / 3, label: '💭 Thinking' },
  { id: 'stand-3', pos: [0, 0, 16.2], facing: Math.PI, label: '💭 Thinking' },
  { id: 'far-l', pos: [-14, 0, 15.6], facing: Math.PI / 6, label: '💭 Thinking' },
  { id: 'far-r', pos: [14, 0, 15.6], facing: -Math.PI / 6, label: '💭 Thinking' },
  { id: 'reception', pos: [0, 0, 13], facing: 0, label: '🧭 Waiting' },
];

/* ── Context helpers ── */
function matchesContext(agentId: string, list: string[]): boolean {
  const lower = agentId.toLowerCase();
  return list.some(keyword => lower.includes(keyword));
}

function detectContext(sessions: ISession[]): WorkContext {
  const running = sessions.filter(s => s.status === 'running');
  const hasInvestment = running.some(s => matchesContext(s.agentId, INVESTMENT_AGENTS));
  const hasDev = running.some(s => matchesContext(s.agentId, DEV_AGENTS));
  if (hasInvestment && !hasDev) return 'investment';
  return 'development';
}

function isInContext(agentId: string, context: WorkContext): boolean {
  if (isOrchestrator(agentId)) return true;
  if (context === 'investment') return matchesContext(agentId, INVESTMENT_AGENTS);
  return matchesContext(agentId, DEV_AGENTS);
}

/** @deprecated Use AgentStateMachine instead — kept for reference only */
function _getRoomForAgent(agentId: string, status: SessionStatus, context: WorkContext): RoomKey {
  if (!isInContext(agentId, context)) return 'lobby';
  switch (status) {
    case 'running': return 'trabajo';
    case 'waiting': return 'comunicacion';
    case 'idle':    return 'descanso';
  }
}
void _getRoomForAgent; // suppress unused warning

function gridPosition(
  cx: number, cz: number, index: number, cols: number, spacing = 1.6,
): [number, number, number] {
  const col = index % cols;
  const row = Math.floor(index / cols);
  return [cx - (cols - 1) * (spacing / 2) + col * spacing, 0, cz - 1.5 + row * spacing];
}

/* ── Activity labels — uses AgentSoul phrases when available ── */
function getActivityLabel(visualState: AgentVisualState, isMoving: boolean, agentId?: string): string {
  if (isMoving) return '🚶 Moving';
  const soul = agentId ? getAgentSoul(agentId) : undefined;
  switch (visualState) {
    case 'running':       return soul?.workingPhrase ?? '🔧 Working';
    case 'waiting':       return soul?.waitingPhrase ?? '⏳ Waiting';
    case 'communicating': return soul?.communicatingPhrase ?? '💬 Communicating';
    case 'using_skill':   return soul?.usingSkillPhrase ?? '⚡ Using skill';
    case 'idle':          return soul?.idlePhrase ?? '😌 Resting';
    default:              return soul?.idlePhrase ?? '';
  }
}

/* ── Status debounce — prevents flickering from server timestamp-based derivation ── */
// Transition-specific debounce:
//   idle → running/waiting: 0ms (immediate — agent started working)
//   running → idle:         3000ms (prevent flicker back to idle)
//   waiting → idle:         3000ms (prevent flicker back to idle)
//   running ↔ waiting:      1000ms (quick but not instant)
function getDebounceMs(from: SessionStatus, to: SessionStatus): number {
  if (from === 'idle' && (to === 'running' || to === 'waiting')) return 0;
  if ((from === 'running' || from === 'waiting') && to === 'idle') return 3000;
  if ((from === 'running' && to === 'waiting') || (from === 'waiting' && to === 'running')) return 1000;
  return 1500; // fallback
}

interface DebouncedStatus {
  confirmed: SessionStatus;
  confirmedAt: number;
  pending: SessionStatus | null;
  pendingAt: number;
}

function useDebouncedStatuses(sessions: ISession[]): Map<string, SessionStatus> {
  const trackRef = useRef<Map<string, DebouncedStatus>>(new Map());
  const [stable, setStable] = useState<Map<string, SessionStatus>>(new Map());

  // Tick every frame to confirm pending statuses
  useFrame(() => {
    const now = Date.now();
    let changed = false;
    for (const [, entry] of trackRef.current) {
      if (entry.pending !== null) {
        const delay = getDebounceMs(entry.confirmed, entry.pending);
        if (now - entry.pendingAt >= delay) {
          entry.confirmed = entry.pending;
          entry.confirmedAt = now;
          entry.pending = null;
          changed = true;
        }
      }
    }
    if (changed) {
      const map = new Map<string, SessionStatus>();
      for (const [id, entry] of trackRef.current) {
        map.set(id, entry.confirmed);
      }
      setStable(map);
    }
  });

  useEffect(() => {
    const now = Date.now();
    const track = trackRef.current;
    let changed = false;

    for (const s of sessions) {
      const existing = track.get(s.agentId);
      if (!existing) {
        // First time seeing this agent — accept immediately
        track.set(s.agentId, {
          confirmed: s.status,
          confirmedAt: now,
          pending: null,
          pendingAt: 0,
        });
        changed = true;
      } else if (s.status !== existing.confirmed) {
        if (s.status !== existing.pending) {
          // New pending status — start debounce timer
          existing.pending = s.status;
          existing.pendingAt = now;
          // If zero debounce, confirm immediately
          const delay = getDebounceMs(existing.confirmed, s.status);
          if (delay === 0) {
            existing.confirmed = s.status;
            existing.confirmedAt = now;
            existing.pending = null;
            changed = true;
          }
        }
        // else: same pending, keep waiting
      } else {
        // Status matches confirmed — cancel any pending
        existing.pending = null;
      }
    }

    if (changed) {
      const map = new Map<string, SessionStatus>();
      for (const [id, entry] of track) {
        map.set(id, entry.confirmed);
      }
      setStable(map);
    }
  }, [sessions]);

  return stable;
}

/* ── Speech bubble types ── */
interface SpeechBubbleEvent {
  agentId: string;
  message: string;
  startTime: number;
}

const BUBBLE_DURATION = 3.5; // seconds

/* ── Speech bubble hook: CEO delegates to Manager, Manager calls robots ── */
function useSpeechBubbles(
  sessions: ISession[],
  agentNames: AgentNameMap,
  debouncedStatuses: Map<string, SessionStatus>,
): { bubbles: SpeechBubbleEvent[]; bubbleMap: Map<string, string> } {
  const prevStatusRef = useRef<Map<string, SessionStatus>>(new Map());
  const [bubbles, setBubbles] = useState<SpeechBubbleEvent[]>([]);
  // Track persistent "waiting-with" bubbles (not transition-based)
  const waitingBubblesRef = useRef<Map<string, string>>(new Map());

  const cleanName = useCallback((agentId: string) => {
    const rawName = agentNames[agentId] ?? agentId;
    return rawName.replace(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)\s*/u, '').trim() || agentId;
  }, [agentNames]);

  useEffect(() => {
    const prev = prevStatusRef.current;
    const now = Date.now();
    const newBubbles: SpeechBubbleEvent[] = [];

    for (const s of sessions) {
      const status = debouncedStatuses.get(s.agentId) ?? s.status;
      const prevStatus = prev.get(s.agentId);

      // Detect idle/waiting → running transition
      if (status === 'running' && prevStatus !== undefined && prevStatus !== 'running') {
        const ceoSoul = getAgentSoul(CEO_ID);
        const mgrSoul = getAgentSoul(MANAGER_ID);
        const agentSoul = getAgentSoul(s.agentId);

        if (isCEO(s.agentId)) {
          // Samantha herself starts running → she works directly
          newBubbles.push({
            agentId: s.agentId,
            message: agentSoul?.workingPhrase ?? '🔧 On it',
            startTime: now,
          });
        } else if (isManager(s.agentId)) {
          // Emma starts running → Samantha delegates
          const phrase = ceoSoul?.delegatingPhrase?.replace('{target}', cleanName(s.agentId))
            ?? `📋 ${cleanName(s.agentId)}, you're up`;
          newBubbles.push({
            agentId: CEO_ID,
            message: phrase,
            startTime: now,
          });
        } else if (!isOrchestrator(s.agentId)) {
          // Robot starts running → chain of command
          const name = cleanName(s.agentId);
          // Samantha delegates to Emma
          const ceoPhrase = ceoSoul?.delegatingPhrase?.replace('{target}', 'Emma')
            ?? `📋 Emma, handle ${name}`;
          newBubbles.push({
            agentId: CEO_ID,
            message: ceoPhrase,
            startTime: now,
          });
          // Emma calls the robot
          const mgrPhrase = mgrSoul?.delegatingPhrase?.replace('{target}', name)
            ?? `📢 ${name}, you're up`;
          newBubbles.push({
            agentId: MANAGER_ID,
            message: mgrPhrase,
            startTime: now,
          });
        }
      }
    }

    if (newBubbles.length > 0) {
      setBubbles(prev => [...prev, ...newBubbles]);
    }

    // "Waiting-with-someone" persistent bubbles:
    // If main agent is "waiting" and another agent is "running", show communication bubbles
    const newWaiting = new Map<string, string>();
    const mainStatus = debouncedStatuses.get(CEO_ID);
    if (mainStatus === 'waiting') {
      const runningAgents = sessions.filter(s => {
        const st = debouncedStatuses.get(s.agentId) ?? s.status;
        return st === 'running' && !isCEO(s.agentId);
      });
      if (runningAgents.length > 0) {
        // Samantha is talking to the running agents
        const names = runningAgents.map(s => cleanName(s.agentId));
        const nameList = names.length <= 2 ? names.join(' & ') : `${names[0]} +${names.length - 1}`;
        newWaiting.set(CEO_ID, `💬 Talking to ${nameList}`);
        // Each running agent reports to Samantha
        for (const s of runningAgents) {
          newWaiting.set(s.agentId, '📨 Reporting to Samantha');
        }
      }
    }
    waitingBubblesRef.current = newWaiting;

    // Update previous statuses (use debounced)
    const newMap = new Map<string, SessionStatus>();
    for (const s of sessions) {
      newMap.set(s.agentId, debouncedStatuses.get(s.agentId) ?? s.status);
    }
    prevStatusRef.current = newMap;
  }, [sessions, debouncedStatuses, cleanName]);

  // Clean up expired bubbles periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setBubbles(prev => prev.filter(b => now - b.startTime < BUBBLE_DURATION * 1000));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Build a map of agentId → latest message for easy lookup
  // Transition bubbles take priority; persistent "waiting-with" bubbles fill in gaps
  const bubbleMap = useMemo(() => {
    const map = new Map<string, string>();
    // First layer: persistent waiting-with-someone bubbles
    for (const [id, msg] of waitingBubblesRef.current) {
      map.set(id, msg);
    }
    // Second layer: transition bubbles override (they're more specific/timely)
    const now = Date.now();
    for (const b of bubbles) {
      if (now - b.startTime < BUBBLE_DURATION * 1000) {
        map.set(b.agentId, b.message);
      }
    }
    return map;
  }, [bubbles]);

  return { bubbles, bubbleMap };
}

/* ── Day/Night cycle hook — updates every minute ── */
function useDayNightCycle(): LightingConfig {
  const [config, setConfig] = useState<LightingConfig>(() => getLightingConfig());

  useEffect(() => {
    // Align first tick to the next full minute
    const now = new Date();
    const msToNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();

    const timeout = setTimeout(() => {
      setConfig(getLightingConfig());
      const interval = setInterval(() => {
        setConfig(getLightingConfig());
      }, 60_000);
      return () => clearInterval(interval);
    }, msToNextMinute);

    return () => clearTimeout(timeout);
  }, []);

  return config;
}

/* ── Scene internals ── */
function SceneContent({ sessions, agentNames, interactions = [], environmentId = 'office' }: World3DProps) {
  const environment = getWorldEnvironment(environmentId);
  const theme = environment.theme;
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const agentRoomsRef = useRef<Map<string, RoomKey>>(new Map());

  // Day/night lighting (updates every minute, skipped on beach mode)
  const dnc = useDayNightCycle();

  // State machine systems — stable refs (no React re-renders)
  const deskManagerRef = useRef<DeskManager>(new DeskManager());
  const stateMachineRef = useRef<AgentStateMachine>(new AgentStateMachine(deskManagerRef.current));

  // Status debounce — prevents flickering
  const debouncedStatuses = useDebouncedStatuses(sessions);

  // Speech bubbles — detects status transitions with hierarchy
  const { bubbleMap } = useSpeechBubbles(sessions, agentNames, debouncedStatuses);

  // Compute room assignments and agent list using state machine
  const agents = useMemo(() => {
    void detectContext(sessions); // context detection drives future squad routing
    const sessionByAgent = new Map<string, ISession>();
    for (const s of sessions) {
      sessionByAgent.set(s.agentId, s);
    }

    const allIds = [...new Set([...Object.keys(agentNames), ...sessions.map(s => s.agentId)])];
    const currentRooms = agentRoomsRef.current;
    const stateMachine = stateMachineRef.current;

    // Determine squad-level activity
    const runningCount = sessions.filter(s =>
      (debouncedStatuses.get(s.agentId) ?? s.status) === 'running'
    ).length;
    const squadHasActiveTasks = runningCount > 0;

    // Team sync heuristic: when Samantha is waiting, force Emma+Ginny to waiting
    const ceoStatus: SessionStatus | undefined =
      debouncedStatuses.get('main')
      ?? debouncedStatuses.get('samantha')
      ?? sessions.find(s => {
        const id = s.agentId.toLowerCase();
        return id === 'main' || id === 'samantha';
      })?.status;
    const forceCoreMeeting = ceoStatus === 'waiting';

    // Build state machine inputs for all agents
    const smInputs = allIds.map((id, agentIndex) => {
      const session = sessionByAgent.get(id);
      let sessionStatus: SessionStatus = debouncedStatuses.get(id) ?? session?.status ?? 'idle';

      // Core sync: if Samantha is waiting, Emma+Ginny follow to comunicacion
      const lowerId = id.toLowerCase();
      if (forceCoreMeeting && (lowerId === 'emma' || lowerId === 'ginny')) {
        sessionStatus = 'waiting';
      }

      // Detect if agent is being called (e.g. manager calling a specialist)
      const beingCalled = sessionStatus === 'waiting' && squadHasActiveTasks;

      return {
        agentId: id,
        agentIndex,
        sessionStatus,
        squadHasActiveTasks,
        beingCalled,
        needsSkill: false,  // Future: detect from session events
        currentPosition: (currentRooms.has(id)
          ? undefined  // Will use desk proximity from room center
          : undefined),
      };
    });

    // Compute visual states via state machine
    const smOutputs = stateMachine.computeStates(smInputs);

    // Group agents by room for grid positioning (non-running/non-desk states)
    const roomGroups: Record<RoomKey, string[]> = {
      lobby: [], descanso: [], comunicacion: [], trabajo: [], biblioteca: [],
    };
    for (const id of allIds) {
      const output = smOutputs.get(id);
      if (!output) continue;
      const vs = output.visualState;
      // Only group agents that don't have an explicit desk position
      if (vs !== 'running' && vs !== 'using_skill') {
        roomGroups[output.targetRoom].push(id);
      }
    }

    // Idle agents: assign to named spots in their idle zone
    const zoneIdxMap: Record<string, number> = {
      lobby: 0, descanso: 0, comunicacion: 0, biblioteca: 0,
    };

    const result: {
      id: string;
      name: string;
      waypoints: [number, number, number][];
      facingAngle?: number;
      status: SessionStatus;
      visualState: AgentVisualState;
      isActive: boolean;
      activityLabel: string;
      speechBubble?: string;
    }[] = [];

    for (const id of allIds) {
      const session = sessionByAgent.get(id);
      const sessionStatus: SessionStatus = debouncedStatuses.get(id) ?? session?.status ?? 'idle';
      const output = smOutputs.get(id);
      if (!output) continue;

      const { visualState, targetRoom, desk } = output;

      const rawName = agentNames[id] ?? id;
      const name = rawName.replace(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)\s*/u, '').trim() || id;

      let targetPos: [number, number, number];
      let targetFacing: number | undefined;

      if (visualState === 'running' && desk) {
        // Running agent → explicit desk position
        targetPos = desk.position;
        targetFacing = desk.facingAngle;
      } else if (visualState === 'using_skill' && desk) {
        // Using skill → walk to biblioteca, keep desk reserved
        const center = ROOM_CENTERS['biblioteca'];
        const idx = zoneIdxMap['biblioteca'] ?? 0;
        zoneIdxMap['biblioteca'] = idx + 1;
        targetPos = gridPosition(center.cx, center.cz, idx, 4, 2.0);
        targetFacing = undefined;
      } else if (visualState === 'idle') {
        // Investment squad always go to dedicated lobby seats
        const dedicatedSeat = INVESTMENT_LOBBY_SEATS[id.toLowerCase()];
        if (dedicatedSeat) {
          targetPos = dedicatedSeat.pos;
          targetFacing = dedicatedSeat.facing;
        } else {
          // Spread idle agents across their assigned zone
          const zone = targetRoom;
          const zoneSpots: IdleSpot[] =
            zone === 'descanso' ? DESCANSO_SPOTS
            : zone === 'biblioteca'
              ? BIBLIOTECA_IDLE_SPOTS
              : LOBBY_SPOTS;
          const idx = zoneIdxMap[zone] ?? 0;
          zoneIdxMap[zone] = idx + 1;
          const spot = zoneSpots[idx % zoneSpots.length];
          targetPos = spot.pos;
          targetFacing = spot.facing;
        }
      } else {
        // Waiting / communicating / etc — grid position in room
        const agents = roomGroups[targetRoom];
        const idx = agents.indexOf(id);
        const center = ROOM_CENTERS[targetRoom];
        const cols = Math.min(agents.length, targetRoom === 'comunicacion' ? 4 : 3);
        const spacing = targetRoom === 'lobby' ? 2.0 : 1.6;
        targetPos = idx >= 0
          ? gridPosition(center.cx, center.cz, idx, Math.max(cols, 1), spacing)
          : [center.cx, 0, center.cz];
        targetFacing = undefined;
      }

      // Pathfinding through doors
      const prevRoom = currentRooms.get(id) ?? targetRoom;
      const doorWaypoints = findPath(prevRoom, targetRoom);
      const waypoints: [number, number, number][] = [...doorWaypoints, targetPos];

      currentRooms.set(id, targetRoom);

      // Activity label with soul phrase override
      const label = getActivityLabel(visualState, false, id);

      // Speech bubble
      const bubble = bubbleMap.get(id);

      result.push({
        id,
        name,
        waypoints,
        facingAngle: targetFacing,
        status: sessionStatus,
        visualState,
        isActive: visualState !== 'idle',
        activityLabel: label,
        speechBubble: bubble,
      });
    }

    return result;
  }, [sessions, agentNames, bubbleMap, debouncedStatuses]);

  // Position map for interaction beams
  const positionMap = useMemo(() => {
    const map = new Map<string, [number, number, number]>();
    for (const a of agents) {
      const pos = a.waypoints[a.waypoints.length - 1];
      if (pos) {
        // Map by session key
        const session = sessions.find(s => s.agentId === a.id);
        if (session) map.set(session.key, pos);
      }
    }
    return map;
  }, [agents, sessions]);

  const beams = useMemo(() => {
    return interactions
      .map((inter) => {
        const from = positionMap.get(inter.fromSessionKey);
        const to = positionMap.get(inter.toSessionKey);
        if (!from || !to) return null;
        return {
          id: inter.id,
          from: [from[0], 1, from[2]] as [number, number, number],
          to: [to[0], 1, to[2]] as [number, number, number],
          type: inter.type,
        };
      })
      .filter((b): b is NonNullable<typeof b> => b !== null);
  }, [interactions, positionMap]);

  const isBeach = !!environment.beachMode;

  return (
    <>
      {/* ── Lighting — BRIGHT ── */}
      {isBeach ? (
        <>
          {/* Tropical sun — very bright */}
          <ambientLight intensity={0.8} color="#FFF8E8" />
          <directionalLight
            position={[15, 25, 10]}
            intensity={2.5}
            color="#FFF0D0"
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          <hemisphereLight color="#87CEEB" groundColor="#F0E8D8" intensity={1.0} />
          {/* Warm fill lights */}
          <pointLight position={[0, 8, 14]} intensity={1.2} color="#FFF0D0" distance={30} />
          <pointLight position={[-14, 6, 6.5]} intensity={1.0} color="#FFE8C0" distance={20} />
          <pointLight position={[10, 6, 6.5]} intensity={1.0} color="#FFE8C0" distance={20} />
          <pointLight position={[0, 6, -3]} intensity={1.0} color="#FFF0D0" distance={25} />
          <pointLight position={[17, 6, -14]} intensity={1.0} color="#FFE8C0" distance={20} />

          {/* Very light fog — barely visible */}
          <fog attach="fog" args={['#B8D8F0', 60, 150]} />

          {/* Environment map for reflections */}
          <Environment preset="sunset" />
        </>
      ) : (
        <>
          {/* Office — day/night reactive lighting (Europe/Madrid clock) */}
          {/* Ambient — time-of-day color */}
          <ambientLight intensity={dnc.ambientIntensity} color={dnc.ambientColor} />

          {/* Primary directional (sun / moon) */}
          <directionalLight
            position={dnc.sunPosition}
            intensity={dnc.sunIntensity}
            color={dnc.sunColor}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />

          {/* Hemisphere — sky/ground gradient */}
          <hemisphereLight color={dnc.hemiSkyColor} groundColor={dnc.hemiGroundColor} intensity={dnc.hemiIntensity} />

          {/* Room-specific point lights — intensity scales with roomLightsIntensity */}
          <pointLight position={[0, 8, 14]}   intensity={1.0 * dnc.roomLightsIntensity} color="#FFF0D0" distance={22} />
          <pointLight position={[-14, 7, 6.5]} intensity={1.0 * dnc.roomLightsIntensity} color="#FFE0B0" distance={18} />
          <pointLight position={[10, 7, 6.5]}  intensity={1.0 * dnc.roomLightsIntensity} color="#FFE0B0" distance={20} />
          <pointLight position={[0, 7, -3]}    intensity={1.2 * dnc.roomLightsIntensity} color="#FFF0D0" distance={25} />
          <pointLight position={[-8, 6, -14]}  intensity={0.8 * dnc.roomLightsIntensity} color="#FFE8C0" distance={16} />
          <pointLight position={[17, 6, -14]}  intensity={0.8 * dnc.roomLightsIntensity} color="#FFE0B0" distance={18} />

          {/* Desk lamp glow — warm orange, active at night/late_evening */}
          {dnc.deskLampIntensity > 0 && (
            <>
              <pointLight position={[0, 2, -3]}    intensity={dnc.deskLampIntensity * 0.6} color={dnc.deskLampColor} distance={8} />
              <pointLight position={[-7, 2, -14]}  intensity={dnc.deskLampIntensity * 0.5} color={dnc.deskLampColor} distance={7} />
              <pointLight position={[10, 2, 6.5]}  intensity={dnc.deskLampIntensity * 0.5} color={dnc.deskLampColor} distance={7} />
              <pointLight position={[-14, 2, 6.5]} intensity={dnc.deskLampIntensity * 0.4} color={dnc.deskLampColor} distance={6} />
            </>
          )}

          {/* Time-reactive fog */}
          <fog attach="fog" args={[dnc.fogColor, dnc.fogNear, dnc.fogFar]} />

          {/* Environment map for reflections */}
          <Environment preset="city" />
        </>
      )}

      {/* ── Ground plane ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[76, 70]} />
        <meshStandardMaterial color={theme.floorBase} roughness={0.85} />
      </mesh>

      {/* Grid overlay — subtle in office, very subtle on beach */}
      <Grid
        position={[0, 0, 0]}
        args={[76, 70]}
        cellSize={2}
        cellThickness={isBeach ? 0.12 : 0.2}
        cellColor={theme.gridCell}
        sectionSize={6}
        sectionThickness={isBeach ? 0.2 : 0.4}
        sectionColor={theme.gridSection}
        fadeDistance={isBeach ? 35 : 45}
        infiniteGrid
      />

      {/* Office layout — walls, floors, doorways, labels */}
      <OfficeLayout3D environment={environment} />

      {/* Room furniture */}
      <LobbyFurniture environment={environment} />
      <DescansoFurniture environment={environment} />
      <ComunicacionFurniture environment={environment} />
      <TrabajoFurniture environment={environment} />
      <BibliotecaFurniture environment={environment} />
      <ExteriorFurniture environment={environment} />

      {/* Agents with smooth motion system */}
      <AgentMotionSystem agents={agents} />

      {/* Interaction beams */}
      {beams.map((b) => (
        <InteractionBeam3D key={b.id} from={b.from} to={b.to} type={b.type} />
      ))}

      {/* Skill folders in Biblioteca */}
      <SkillFolders3D />

      {/* Controls */}
      <OrbitControls
        ref={controlsRef}
        makeDefault
        minDistance={5}
        maxDistance={50}
        maxPolarAngle={Math.PI / 2.1}
        target={[0, 0, 0]}
      />
      <CameraControls3D controlsRef={controlsRef} />

      {/* Postprocessing */}
      <EffectComposer>
        <Bloom luminanceThreshold={0.5} luminanceSmoothing={0.9} intensity={isBeach ? 0.15 : 0.2} />
      </EffectComposer>
    </>
  );
}

export function World3D({ sessions, agentNames, interactions, environmentId = 'office' }: World3DProps) {
  const environment = getWorldEnvironment(environmentId);
  const dnc = useDayNightCycle();

  // Inject CSS variable so the rest of the UI can react to day/night
  useEffect(() => {
    if (environment.beachMode) return;
    document.documentElement.setAttribute('data-time-of-day', dnc.timeOfDay);
    document.documentElement.style.setProperty('--dnc-sky', dnc.skyColor);
    document.documentElement.style.setProperty('--dnc-ambient', dnc.ambientColor);
  }, [dnc, environment.beachMode]);

  const bgColor = environment.beachMode ? '#87CEEB' : dnc.skyColor;

  return (
    <div style={{ width: '100%', height: '100%', background: bgColor, position: 'relative' }}>
      <Canvas
        camera={{ position: [0, 25, 30], fov: 50 }}
        dpr={[1, 1.5]}
        performance={{ min: 0.5 }}
        gl={{ antialias: true, alpha: false }}
        scene={{ background: environment.beachMode ? new THREE.Color('#87CEEB') : new THREE.Color(dnc.skyColor) }}
        style={{ width: '100%', height: '100%' }}
      >
        <SceneContent sessions={sessions} agentNames={agentNames} interactions={interactions} environmentId={environmentId} />
      </Canvas>
      <CameraHUD />
    </div>
  );
}
