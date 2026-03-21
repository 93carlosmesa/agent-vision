/**
 * World3D — R3F Canvas with multi-room office building.
 *
 * Rooms: Lobby, Sala de Descanso, Sala de Comunicación, Sala de Trabajo, Biblioteca
 * Agents are placed based on their status AND context (dev vs investment).
 * Idle agents get autonomous activities via useOfficeLife.
 * All agent movement goes through doors via officePathfinding.
 */

import { useMemo, useRef } from 'react';
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
import { useOfficeLife } from '../../hooks/useOfficeLife';
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

/* ── Room centers for agent placement ── */
const ROOM_CENTERS: Record<RoomKey, { cx: number; cz: number }> = {
  lobby:        { cx: 0,   cz: 12 },
  descanso:     { cx: -10, cz: 6.5 },
  comunicacion: { cx: 10,  cz: 6.5 },
  trabajo:      { cx: 0,   cz: -1 },
  biblioteca:   { cx: 0,   cz: -10 },
};

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
  // Out-of-context agents go to lobby
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

function getActivityLabel(status: SessionStatus): string | undefined {
  switch (status) {
    case 'running': return '🔧 Working';
    case 'waiting': return '⏳ Waiting';
    default: return undefined;
  }
}

/* ── Scene internals ── */
function SceneContent({ sessions, agentNames, interactions = [] }: World3DProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  // Track each agent's current room for pathfinding
  const agentRoomsRef = useRef<Map<string, RoomKey>>(new Map());

  // Compute room assignments and agent list
  const { idleAgentIds, agentDataList, positionMap } = useMemo(() => {
    const context = detectContext(sessions);
    const sessionByAgent = new Map<string, ISession>();
    for (const s of sessions) {
      sessionByAgent.set(s.agentId, s);
    }

    const allIds = new Set([...Object.keys(agentNames), ...sessions.map(s => s.agentId)]);
    const idleIds: string[] = [];
    const dataList: {
      id: string;
      name: string;
      status: SessionStatus;
      baseRoom: RoomKey;
      isInCtx: boolean;
    }[] = [];

    for (const id of allIds) {
      const session = sessionByAgent.get(id);
      const status: SessionStatus = session?.status ?? 'idle';
      const rawName = agentNames[id] ?? id;
      const name = rawName.replace(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)\s*/u, '').trim() || id;
      const room = getRoomForAgent(id, status, context);
      const inCtx = isInContext(id, context);

      dataList.push({ id, name, status, baseRoom: room, isInCtx: inCtx });

      if (status === 'idle' && inCtx) {
        idleIds.push(id);
      }
    }

    // Build position map for beams
    const posMap = new Map<string, [number, number, number]>();
    const roomGroups: Record<RoomKey, string[]> = {
      lobby: [], descanso: [], comunicacion: [], trabajo: [], biblioteca: [],
    };

    // Group non-idle agents by their base room for grid positioning
    for (const d of dataList) {
      if (d.status !== 'idle') {
        roomGroups[d.baseRoom].push(d.id);
      }
    }

    // Calculate positions for non-idle agents
    for (const room of Object.keys(roomGroups) as RoomKey[]) {
      const center = ROOM_CENTERS[room];
      const list = roomGroups[room];
      const cols = Math.min(list.length, room === 'trabajo' ? 4 : 3);
      const spacing = room === 'lobby' ? 2.0 : 1.6;

      for (let i = 0; i < list.length; i++) {
        posMap.set(list[i], gridPosition(center.cx, center.cz, i, Math.max(cols, 1), spacing));
      }
    }

    // Session key to position map for beams
    const sessionKeyMap = new Map<string, [number, number, number]>();
    for (const s of sessions) {
      const agentPos = posMap.get(s.agentId);
      if (agentPos) sessionKeyMap.set(s.key, agentPos);
    }

    return { idleAgentIds: idleIds, agentDataList: dataList, positionMap: sessionKeyMap };
  }, [sessions, agentNames]);

  // Office life simulation for idle agents (runs in useFrame)
  const { ref: officeLifeRef, version: officeLifeVersion } = useOfficeLife(idleAgentIds);

  // Build final agent entries with waypoints
  const agents = useMemo(() => {
    const currentRooms = agentRoomsRef.current;

    // First pass: determine target rooms and positions for idle agents
    const idleRoomGroups: Record<RoomKey, { id: string; offset: [number, number, number] }[]> = {
      lobby: [], descanso: [], comunicacion: [], trabajo: [], biblioteca: [],
    };

    for (const d of agentDataList) {
      if (d.status === 'idle' && d.isInCtx) {
        const lifeEntry = officeLifeRef.current.get(d.id);
        const targetRoom = lifeEntry?.simulatedRoom ?? 'descanso';
        const offset = lifeEntry?.positionOffset ?? [0, 0, 0];
        idleRoomGroups[targetRoom].push({ id: d.id, offset });
      } else if (d.status === 'idle') {
        // Out-of-context idle → lobby
        idleRoomGroups[d.baseRoom].push({ id: d.id, offset: [0, 0, 0] });
      }
    }

    // Calculate positions for idle agents in their simulated rooms
    const idlePosMap = new Map<string, { pos: [number, number, number]; room: RoomKey }>();
    for (const room of Object.keys(idleRoomGroups) as RoomKey[]) {
      const center = ROOM_CENTERS[room];
      const list = idleRoomGroups[room];
      const cols = Math.min(list.length, 3);

      for (let i = 0; i < list.length; i++) {
        const basePos = gridPosition(center.cx, center.cz, i, Math.max(cols, 1), 1.6);
        const pos: [number, number, number] = [
          basePos[0] + list[i].offset[0],
          basePos[1] + list[i].offset[1],
          basePos[2] + list[i].offset[2],
        ];
        idlePosMap.set(list[i].id, { pos, room });
      }
    }

    // Build result with pathfinding waypoints
    const result: {
      id: string;
      name: string;
      waypoints: [number, number, number][];
      status: SessionStatus;
      isActive: boolean;
      activityLabel: string | undefined;
    }[] = [];

    for (const d of agentDataList) {
      let targetRoom: RoomKey;
      let targetPos: [number, number, number];
      let label: string | undefined;

      if (d.status === 'idle') {
        const idleData = idlePosMap.get(d.id);
        if (idleData) {
          targetRoom = idleData.room;
          targetPos = idleData.pos;
        } else {
          targetRoom = d.baseRoom;
          const center = ROOM_CENTERS[targetRoom];
          targetPos = [center.cx, 0, center.cz];
        }
        const lifeEntry = officeLifeRef.current.get(d.id);
        label = lifeEntry?.activityLabel;
      } else {
        targetRoom = d.baseRoom;
        // Non-idle agents use pre-computed positions from the room groups
        const roomCenter = ROOM_CENTERS[targetRoom];
        // We need to find the position - check our earlier computation
        // For non-idle, we computed positions in the first useMemo
        // We need to reconstruct or use a simpler approach
        targetPos = [roomCenter.cx, 0, roomCenter.cz]; // Will be overridden below
        label = getActivityLabel(d.status);
      }

      // For non-idle agents, get their grid position from positionMap computation
      // We handle this by recomputing positions for non-idle agents
      if (d.status !== 'idle') {
        // Recompute based on room grouping
        const context = detectContext(sessions);
        const roomAgents = agentDataList
          .filter(a => a.status !== 'idle' && getRoomForAgent(a.id, a.status, context) === targetRoom)
          .map(a => a.id);
        const idx = roomAgents.indexOf(d.id);
        if (idx >= 0) {
          const center = ROOM_CENTERS[targetRoom];
          const cols = Math.min(roomAgents.length, targetRoom === 'trabajo' ? 4 : 3);
          const spacing = targetRoom === 'lobby' ? 2.0 : 1.6;
          targetPos = gridPosition(center.cx, center.cz, idx, Math.max(cols, 1), spacing);
        }
      }

      // Get current room for pathfinding
      const prevRoom = currentRooms.get(d.id) ?? targetRoom;
      const doorWaypoints = findPath(prevRoom, targetRoom);

      // Build waypoint sequence: doors + final destination
      const waypoints: [number, number, number][] = [...doorWaypoints, targetPos];

      // Update current room tracking
      currentRooms.set(d.id, targetRoom);

      result.push({
        id: d.id,
        name: d.name,
        waypoints,
        status: d.status,
        isActive: d.status !== 'idle',
        activityLabel: label,
      });
    }

    return result;
  // officeLifeVersion triggers recomputation when agents change activities.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, agentNames, agentDataList, idleAgentIds, officeLifeRef, officeLifeVersion]);

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

      {/* Base floor (covers gaps / extends under everything) */}
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
