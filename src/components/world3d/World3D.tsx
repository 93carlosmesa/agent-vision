/**
 * World3D — R3F Canvas with multi-room office building.
 *
 * NEW PHILOSOPHY: No fake movements. Agents move only on REAL status changes.
 *   - Idle agents → Sala de Descanso (near furniture spots)
 *   - Running agents → Sala de Trabajo
 *   - Waiting agents → Sala de Comunicación
 *   - Out-of-context agents → Lobby
 *   - Samantha (main) is the orchestrator — moves first, calls others via speech bubble
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
import {
  isOrchestrator,
  isCEO,
  isManager,
  CEO_ID,
  MANAGER_ID,
  AGENT_REGISTRY,
} from '../../config/agentConfig';

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

/* ── Idle spots in Lobby — for out-of-context agents ── */
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

function getRoomForAgent(agentId: string, status: SessionStatus, context: WorkContext): RoomKey {
  if (!isInContext(agentId, context)) return 'lobby';
  switch (status) {
    case 'running': return 'trabajo';
    case 'waiting': return 'comunicacion';
    case 'idle':    return 'descanso';
  }
}

function gridPosition(
  cx: number, cz: number, index: number, cols: number, spacing = 1.6,
): [number, number, number] {
  const col = index % cols;
  const row = Math.floor(index / cols);
  return [cx - (cols - 1) * (spacing / 2) + col * spacing, 0, cz - 1.5 + row * spacing];
}

/* ── Activity labels — REAL status only ── */
function getActivityLabel(status: SessionStatus, isMoving: boolean): string {
  if (isMoving) return '🚶 Moving';
  switch (status) {
    case 'running': return '🔧 Working';
    case 'waiting': return '⏳ In meeting';
    default: return '';
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
        if (isCEO(s.agentId)) {
          // Samantha herself starts running → she works directly
          newBubbles.push({
            agentId: s.agentId,
            message: '🔧 On it',
            startTime: now,
          });
        } else if (isManager(s.agentId)) {
          // Emma starts running → Samantha delegates
          newBubbles.push({
            agentId: CEO_ID,
            message: "📋 Emma, you're up",
            startTime: now,
          });
        } else if (!isOrchestrator(s.agentId)) {
          // Robot starts running → chain of command
          const name = cleanName(s.agentId);
          // Samantha delegates to Emma
          newBubbles.push({
            agentId: CEO_ID,
            message: `📋 Emma, handle ${name}`,
            startTime: now,
          });
          // Emma calls the robot (slightly delayed visually via separate bubble)
          newBubbles.push({
            agentId: MANAGER_ID,
            message: `📢 Calling ${name}...`,
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

/* ── Scene internals ── */
function SceneContent({ sessions, agentNames, interactions = [], environmentId = 'office' }: World3DProps) {
  const environment = getWorldEnvironment(environmentId);
  const theme = environment.theme;
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const agentRoomsRef = useRef<Map<string, RoomKey>>(new Map());

  // Status debounce — prevents flickering
  const debouncedStatuses = useDebouncedStatuses(sessions);

  // Speech bubbles — detects status transitions with hierarchy
  const { bubbleMap } = useSpeechBubbles(sessions, agentNames, debouncedStatuses);

  // Compute room assignments and agent list
  const agents = useMemo(() => {
    const context = detectContext(sessions);
    const sessionByAgent = new Map<string, ISession>();
    for (const s of sessions) {
      sessionByAgent.set(s.agentId, s);
    }

    const allIds = new Set([...Object.keys(agentNames), ...sessions.map(s => s.agentId)]);
    const currentRooms = agentRoomsRef.current;

    // Collect all agents with their data
    const agentData: {
      id: string;
      name: string;
      status: SessionStatus;
      room: RoomKey;
      inCtx: boolean;
    }[] = [];

    for (const id of allIds) {
      const session = sessionByAgent.get(id);
      // Use debounced status to prevent flickering
      const status: SessionStatus = debouncedStatuses.get(id) ?? session?.status ?? 'idle';
      const rawName = agentNames[id] ?? id;
      const name = rawName.replace(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)\s*/u, '').trim() || id;
      const room = getRoomForAgent(id, status, context);
      const inCtx = isInContext(id, context);
      agentData.push({ id, name, status, room, inCtx });
    }

    // Group non-idle agents by room for grid positioning
    const roomGroups: Record<RoomKey, string[]> = {
      lobby: [], descanso: [], comunicacion: [], trabajo: [], biblioteca: [],
    };
    for (const d of agentData) {
      if (d.status !== 'idle') {
        roomGroups[d.room].push(d.id);
      }
    }

    // Idle agents: assign to named spots
    let descansoIdx = 0;
    let lobbyIdx = 0;

    const result: {
      id: string;
      name: string;
      waypoints: [number, number, number][];
      status: SessionStatus;
      isActive: boolean;
      activityLabel: string;
      speechBubble?: string;
    }[] = [];

    for (const d of agentData) {
      let targetRoom: RoomKey;
      let targetPos: [number, number, number];
      let label: string;

      if (d.status === 'idle') {
        if (d.inCtx) {
          // In-context idle → Descanso spots
          targetRoom = 'descanso';
          const spot = DESCANSO_SPOTS[descansoIdx % DESCANSO_SPOTS.length];
          targetPos = spot.pos;
          label = spot.label;
          descansoIdx++;
        } else {
          // Out-of-context idle → Lobby spots
          targetRoom = 'lobby';
          const spot = LOBBY_SPOTS[lobbyIdx % LOBBY_SPOTS.length];
          targetPos = spot.pos;
          label = spot.label;
          lobbyIdx++;
        }
      } else {
        // Active agent — grid position in their room
        targetRoom = d.room;
        const agents = roomGroups[targetRoom];
        const idx = agents.indexOf(d.id);
        const center = ROOM_CENTERS[targetRoom];
        const cols = Math.min(agents.length, targetRoom === 'trabajo' ? 4 : 3);
        const spacing = targetRoom === 'lobby' ? 2.0 : 1.6;
        targetPos = idx >= 0
          ? gridPosition(center.cx, center.cz, idx, Math.max(cols, 1), spacing)
          : [center.cx, 0, center.cz];
        label = getActivityLabel(d.status, false);
      }

      // Pathfinding through doors
      const prevRoom = currentRooms.get(d.id) ?? targetRoom;
      const doorWaypoints = findPath(prevRoom, targetRoom);
      const waypoints: [number, number, number][] = [...doorWaypoints, targetPos];

      currentRooms.set(d.id, targetRoom);

      // Speech bubble
      const bubble = bubbleMap.get(d.id);

      result.push({
        id: d.id,
        name: d.name,
        waypoints,
        status: d.status,
        isActive: d.status !== 'idle',
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
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
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
          {/* Office — warm 4500K with skylights */}
          <ambientLight intensity={0.9} color="#FFF0D8" />
          <directionalLight
            position={[5, 20, 10]}
            intensity={2.0}
            color="#FFF0D0"
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
          <hemisphereLight color="#E8D8C8" groundColor="#A07850" intensity={0.5} />
          {/* Room-specific warm point lights */}
          <pointLight position={[0, 8, 14]} intensity={1.0} color="#FFF0D0" distance={22} />
          <pointLight position={[-14, 7, 6.5]} intensity={1.0} color="#FFE0B0" distance={18} />
          <pointLight position={[10, 7, 6.5]} intensity={1.0} color="#FFE0B0" distance={20} />
          <pointLight position={[0, 7, -3]} intensity={1.2} color="#FFF0D0" distance={25} />
          <pointLight position={[-8, 6, -14]} intensity={0.8} color="#FFE8C0" distance={16} />
          <pointLight position={[17, 6, -14]} intensity={0.8} color="#FFE0B0" distance={18} />
          {/* Room center lights — one per room for full visibility */}
          <pointLight position={[0, 4, -3]} color="#ffe8c0" intensity={2.0} distance={12} />
          <pointLight position={[-7, 4, -14]} color="#e0e8ff" intensity={1.5} distance={10} />
          <pointLight position={[10, 4, 6.5]} color="#ffe8c0" intensity={1.8} distance={10} />
          <pointLight position={[-14, 4, 6.5]} color="#ffd4a0" intensity={1.5} distance={10} />

          {/* Warm fog matching navy walls */}
          <fog attach="fog" args={['#2D3A4A', 40, 85]} />

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

  return (
    <div style={{ width: '100%', height: '100%', background: environment.theme.background, position: 'relative' }}>
      <Canvas
        camera={{ position: [0, 25, 30], fov: 50 }}
        gl={{ antialias: true, alpha: false }}
        scene={{ background: environment.beachMode ? new THREE.Color('#87CEEB') : undefined }}
        style={{ width: '100%', height: '100%' }}
      >
        <SceneContent sessions={sessions} agentNames={agentNames} interactions={interactions} environmentId={environmentId} />
      </Canvas>
      <CameraHUD />
    </div>
  );
}
