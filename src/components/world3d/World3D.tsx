/**
 * World3D — R3F Canvas with multi-room office building.
 *
 * Rooms: Lobby, Sala de Descanso, Sala de Comunicación, Sala de Trabajo, Biblioteca
 * Agents are placed based on their status AND context (dev vs investment).
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
type RoomKey = 'lobby' | 'descanso' | 'comunicacion' | 'trabajo' | 'biblioteca';

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

/* ── Scene internals ── */
function SceneContent({ sessions, agentNames, interactions = [] }: World3DProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { agents, positionMap } = useMemo(() => {
    const context = detectContext(sessions);
    const sessionByAgent = new Map<string, ISession>();
    for (const s of sessions) {
      sessionByAgent.set(s.agentId, s);
    }

    const allIds = new Set([...Object.keys(agentNames), ...sessions.map(s => s.agentId)]);

    // Group agents by room
    const roomGroups: Record<RoomKey, { id: string; name: string; status: SessionStatus }[]> = {
      lobby: [], descanso: [], comunicacion: [], trabajo: [], biblioteca: [],
    };

    for (const id of allIds) {
      const session = sessionByAgent.get(id);
      const status: SessionStatus = session?.status ?? 'idle';
      const rawName = agentNames[id] ?? id;
      const name = rawName.replace(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)\s*/u, '').trim() || id;
      const room = getRoomForAgent(id, status, context);
      roomGroups[room].push({ id, name, status });
    }

    const result: { id: string; name: string; pos: [number, number, number]; status: SessionStatus; isActive: boolean }[] = [];
    const posMap = new Map<string, [number, number, number]>();

    for (const room of Object.keys(roomGroups) as RoomKey[]) {
      const center = ROOM_CENTERS[room];
      const list = roomGroups[room];
      const cols = Math.min(list.length, room === 'trabajo' ? 4 : 3);
      const spacing = room === 'lobby' ? 2.0 : 1.6;

      for (let i = 0; i < list.length; i++) {
        const pos = gridPosition(center.cx, center.cz, i, Math.max(cols, 1), spacing);
        const agent = list[i];
        result.push({
          id: agent.id,
          name: agent.name,
          pos,
          status: agent.status,
          isActive: agent.status !== 'idle',
        });
        posMap.set(agent.id, pos);
      }
    }

    // Map session keys to positions for beams
    const sessionKeyMap = new Map<string, [number, number, number]>();
    for (const s of sessions) {
      const agentPos = posMap.get(s.agentId);
      if (agentPos) sessionKeyMap.set(s.key, agentPos);
    }

    return { agents: result, positionMap: sessionKeyMap };
  }, [sessions, agentNames]);

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
