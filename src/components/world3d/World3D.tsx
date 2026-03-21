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

import { useMemo, useRef, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
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
} from './OfficeFurniture3D';
import { findPath } from '../../utils/officePathfinding';
import type { RoomKey } from '../../utils/officePathfinding';
import type { ISession, AgentNameMap, IInteraction, SessionStatus } from '../../types';

export interface World3DProps {
  sessions: ISession[];
  agentNames: AgentNameMap;
  interactions?: IInteraction[];
}

/* ── Agent context mapping ── */
const INVESTMENT_AGENTS = ['ginny', 'psych-market', 'us-open'];
const DEV_AGENTS = [
  'codereviewer', 'cybersec', 'git-guardian',
  'senior-frontend-architect', 'linter', 'prettier',
  'controlnaming', 'ui-usability-analyst',
  'fullstack-smoke-tester', 'backend-socket-architect', 'emma',
];
const ORCHESTRATORS = ['main', 'samantha'];

type WorkContext = 'development' | 'investment';

/* ── Room centers for grid positioning (non-idle agents) ── */
const ROOM_CENTERS: Record<RoomKey, { cx: number; cz: number }> = {
  lobby:        { cx: 0,   cz: 12 },
  descanso:     { cx: -10, cz: 6.5 },
  comunicacion: { cx: 10,  cz: 6.5 },
  trabajo:      { cx: 0,   cz: -1 },
  biblioteca:   { cx: 0,   cz: -10 },
};

/* ── Idle spots in Descanso — near furniture ── */
interface IdleSpot {
  id: string;
  pos: [number, number, number];
  facing: number;
  label: string;
}

const DESCANSO_SPOTS: IdleSpot[] = [
  { id: 'sofa-1',     pos: [-12, 0, 7],     facing: 0,               label: '😌 Relaxing' },
  { id: 'sofa-2',     pos: [-11, 0, 7],     facing: 0,               label: '😌 Relaxing' },
  { id: 'sofa-3',     pos: [-9, 0, 5.5],    facing: Math.PI / 2,     label: '😌 Relaxing' },
  { id: 'coffee',     pos: [-7, 0, 8],      facing: Math.PI,         label: '☕ Coffee' },
  { id: 'water',      pos: [-13, 0, 5],     facing: -Math.PI / 2,    label: '😌 Relaxing' },
  { id: 'standing-1', pos: [-10, 0, 6],     facing: 0,               label: '💭 Thinking' },
  { id: 'standing-2', pos: [-8, 0, 6.5],    facing: Math.PI / 4,     label: '💭 Thinking' },
  { id: 'tv',         pos: [-11, 0, 4.5],   facing: Math.PI,         label: '😌 Relaxing' },
];

/* ── Idle spots in Lobby — for out-of-context agents ── */
const LOBBY_SPOTS: IdleSpot[] = [
  { id: 'bench-l1',   pos: [-6, 0, 12],     facing: 0,               label: '💭 Thinking' },
  { id: 'bench-l2',   pos: [-5, 0, 12],     facing: 0,               label: '💭 Thinking' },
  { id: 'bench-r1',   pos: [6, 0, 12],      facing: 0,               label: '💭 Thinking' },
  { id: 'bench-r2',   pos: [7, 0, 12],      facing: 0,               label: '💭 Thinking' },
  { id: 'stand-1',    pos: [-3, 0, 13],     facing: Math.PI / 4,     label: '💭 Thinking' },
  { id: 'stand-2',    pos: [3, 0, 13],      facing: -Math.PI / 4,    label: '💭 Thinking' },
  { id: 'stand-3',    pos: [0, 0, 13.5],    facing: 0,               label: '💭 Thinking' },
  { id: 'far-l',      pos: [-12, 0, 12.5],  facing: Math.PI / 6,     label: '💭 Thinking' },
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

function isOrchestrator(agentId: string): boolean {
  return matchesContext(agentId, ORCHESTRATORS);
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

/* ── Speech bubble types ── */
interface SpeechBubbleEvent {
  agentId: string;
  message: string;
  startTime: number;
}

const BUBBLE_DURATION = 3.5; // seconds

/* ── Speech bubble hook: detects new running agents, generates Samantha's call ── */
function useSpeechBubbles(
  sessions: ISession[],
  agentNames: AgentNameMap,
): { bubbles: SpeechBubbleEvent[]; bubbleMap: Map<string, string> } {
  const prevStatusRef = useRef<Map<string, SessionStatus>>(new Map());
  const [bubbles, setBubbles] = useState<SpeechBubbleEvent[]>([]);

  useEffect(() => {
    const prev = prevStatusRef.current;
    const now = Date.now();
    const newBubbles: SpeechBubbleEvent[] = [];

    for (const s of sessions) {
      const prevStatus = prev.get(s.agentId);
      // Detect idle/waiting → running transition (new work starting)
      if (s.status === 'running' && prevStatus !== undefined && prevStatus !== 'running') {
        // Skip if the agent IS Samantha/main — she doesn't call herself
        if (!isOrchestrator(s.agentId)) {
          const rawName = agentNames[s.agentId] ?? s.agentId;
          const name = rawName.replace(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)\s*/u, '').trim() || s.agentId;
          // Samantha announces
          newBubbles.push({
            agentId: 'main',
            message: `📢 Calling ${name}...`,
            startTime: now,
          });
        }
      }
    }

    if (newBubbles.length > 0) {
      setBubbles(prev => [...prev, ...newBubbles]);
    }

    // Update previous statuses
    const newMap = new Map<string, SessionStatus>();
    for (const s of sessions) {
      newMap.set(s.agentId, s.status);
    }
    prevStatusRef.current = newMap;
  }, [sessions, agentNames]);

  // Clean up expired bubbles periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setBubbles(prev => prev.filter(b => now - b.startTime < BUBBLE_DURATION * 1000));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Build a map of agentId → latest message for easy lookup
  const bubbleMap = useMemo(() => {
    const map = new Map<string, string>();
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
function SceneContent({ sessions, agentNames, interactions = [] }: World3DProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const agentRoomsRef = useRef<Map<string, RoomKey>>(new Map());

  // Speech bubbles — detects status transitions
  const { bubbleMap } = useSpeechBubbles(sessions, agentNames);

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
      const status: SessionStatus = session?.status ?? 'idle';
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
  }, [sessions, agentNames, bubbleMap]);

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

  return (
    <>
      {/* Warm office lighting — distributed across rooms */}
      <ambientLight intensity={0.2} color="#fff5e6" />
      {/* Trabajo (brightest) */}
      <pointLight position={[-8, 8, -1]} intensity={30} color="#ffd699" distance={25} />
      <pointLight position={[8, 8, -1]} intensity={30} color="#ffd699" distance={25} />
      {/* Descanso (warm) */}
      <pointLight position={[-10, 7, 6.5]} intensity={20} color="#ffcc80" distance={20} />
      {/* Comunicación */}
      <pointLight position={[10, 7, 6.5]} intensity={22} color="#ffe0b2" distance={20} />
      {/* Lobby */}
      <pointLight position={[0, 6, 12]} intensity={18} color="#ddeeff" distance={18} />
      {/* Biblioteca (dimmer, calmer) */}
      <pointLight position={[0, 6, -10]} intensity={15} color="#ffeedd" distance={22} />
      {/* Overhead fill */}
      <pointLight position={[0, 14, 0]} intensity={20} color="#fff8f0" distance={40} />

      {/* Warm fog */}
      <fog attach="fog" args={['#1a1a24', 25, 65]} />

      {/* Base floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[60, 50]} />
        <meshStandardMaterial color="#2a2520" roughness={0.9} />
      </mesh>

      {/* Subtle grid */}
      <Grid
        position={[0, 0, 0]}
        args={[60, 50]}
        cellSize={2}
        cellThickness={0.3}
        cellColor="#2a2520"
        sectionSize={5}
        sectionThickness={0.5}
        sectionColor="#302a25"
        fadeDistance={40}
        infiniteGrid
      />

      {/* Office layout — walls, floors, doorways, labels */}
      <OfficeLayout3D />

      {/* Room furniture */}
      <LobbyFurniture />
      <DescansoFurniture />
      <ComunicacionFurniture />
      <TrabajoFurniture />
      <BibliotecaFurniture />

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
        <Bloom luminanceThreshold={0.4} luminanceSmoothing={0.9} intensity={0.3} />
      </EffectComposer>
    </>
  );
}

export function World3D({ sessions, agentNames, interactions }: World3DProps) {
  return (
    <div style={{ width: '100%', height: '100%', background: '#1a1a24', position: 'relative' }}>
      <Canvas
        camera={{ position: [0, 25, 30], fov: 50 }}
        gl={{ antialias: true, alpha: false }}
        style={{ width: '100%', height: '100%' }}
      >
        <SceneContent sessions={sessions} agentNames={agentNames} interactions={interactions} />
      </Canvas>
      <CameraHUD />
    </div>
  );
}
