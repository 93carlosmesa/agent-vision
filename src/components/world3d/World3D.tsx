/**
 * World3D — R3F Canvas with realistic office scene: warm wood floor, glass walls,
 * zone markers, agent avatars, portfolio folders, and interaction beams.
 */

import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { Agent3D } from './Agent3D';
import { SkillFolders3D } from './Folder3D';
import { InteractionBeam3D } from './InteractionBeam3D';
import { TrabajoFurniture, ComunicacionFurniture, RelaxFurniture, GlassPerimeter } from './OfficeFurniture3D';
import type { ISession, AgentNameMap, IInteraction, SessionStatus } from '../../types';

export interface World3DProps {
  sessions: ISession[];
  agentNames: AgentNameMap;
  interactions?: IInteraction[];
}

/* ── Zone centers in 3D space ── */
const ZONE_CENTERS: Record<SessionStatus, { cx: number; cz: number }> = {
  running: { cx: -5, cz: 1 },
  waiting: { cx: 5, cz: -3 },
  idle:    { cx: 5, cz: 5 },
};

function gridPosition(
  cx: number, cz: number, index: number, cols: number,
): [number, number, number] {
  const col = index % cols;
  const row = Math.floor(index / cols);
  return [cx - (cols - 1) * 0.7 + col * 1.4, 0, cz - 1.5 + row * 1.6];
}

/* ── Zone glow planes (toned down for realistic look) ── */
function ZonePlane({ position, color, size, label }: {
  position: [number, number, number];
  color: string;
  size: [number, number];
  label: string;
}) {
  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={size} />
        <meshStandardMaterial color={color} transparent opacity={0.06} emissive={color} emissiveIntensity={0.15} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[Math.min(size[0], size[1]) * 0.48, Math.min(size[0], size[1]) * 0.5, 64]} />
        <meshStandardMaterial color={color} transparent opacity={0.15} emissive={color} emissiveIntensity={0.25} />
      </mesh>
      <group position={[0, 0.02, size[1] * 0.42]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[label.length * 0.18, 0.3]} />
          <meshStandardMaterial color={color} transparent opacity={0.12} emissive={color} emissiveIntensity={0.2} />
        </mesh>
      </group>
    </group>
  );
}

/* ── Scene internals (rendered inside Canvas) ── */
function SceneContent({ sessions, agentNames, interactions = [] }: World3DProps) {
  const { agents, positionMap } = useMemo(() => {
    const sessionByAgent = new Map<string, ISession>();
    for (const s of sessions) {
      sessionByAgent.set(s.agentId, s);
    }

    const allIds = new Set([...Object.keys(agentNames), ...sessions.map(s => s.agentId)]);

    const groups: Record<SessionStatus, { id: string; name: string }[]> = {
      running: [], waiting: [], idle: [],
    };

    for (const id of allIds) {
      const session = sessionByAgent.get(id);
      const status: SessionStatus = session?.status ?? 'idle';
      const rawName = agentNames[id] ?? id;
      const name = rawName.replace(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)\s*/u, '').trim() || id;
      groups[status].push({ id, name });
    }

    const result: { id: string; name: string; pos: [number, number, number]; status: SessionStatus; isActive: boolean }[] = [];
    const posMap = new Map<string, [number, number, number]>();

    for (const status of ['running', 'waiting', 'idle'] as SessionStatus[]) {
      const zone = ZONE_CENTERS[status];
      const list = groups[status];
      const cols = Math.min(list.length, status === 'running' ? 4 : 3);
      for (let i = 0; i < list.length; i++) {
        const pos = gridPosition(zone.cx, zone.cz, i, Math.max(cols, 1));
        result.push({
          id: list[i].id,
          name: list[i].name,
          pos,
          status,
          isActive: status !== 'idle',
        });
        posMap.set(list[i].id, pos);
      }
    }

    // Also map session keys to positions
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
      {/* Warm office lighting */}
      <ambientLight intensity={0.25} color="#fff5e6" />
      <pointLight position={[-6, 8, 0]} intensity={30} color="#ffd699" distance={25} />
      <pointLight position={[6, 8, -3]} intensity={25} color="#ffe0b2" distance={25} />
      <pointLight position={[6, 8, 5]} intensity={20} color="#ffcc80" distance={25} />
      <pointLight position={[0, 12, 0]} intensity={25} color="#fff8f0" distance={30} />

      {/* Lighter warm fog */}
      <fog attach="fog" args={['#1a1a24', 18, 50]} />

      {/* Warm office floor (dark wood tone) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="#3a3530" roughness={0.85} />
      </mesh>

      {/* Very subtle grid (toned down) */}
      <Grid
        position={[0, 0, 0]}
        args={[50, 50]}
        cellSize={2}
        cellThickness={0.3}
        cellColor="#2a2520"
        sectionSize={5}
        sectionThickness={0.5}
        sectionColor="#302a25"
        fadeDistance={30}
        infiniteGrid
      />

      {/* Zone planes (subtle) */}
      <ZonePlane position={[-5, 0.01, 1]} color="#7c9cff" size={[8, 10]} label="Trabajo" />
      <ZonePlane position={[5, 0.01, -3]} color="#53e3c2" size={[7, 6]} label="Comunicación" />
      <ZonePlane position={[5, 0.01, 5]} color="#ff9f43" size={[7, 6]} label="Relax" />

      {/* Office furniture */}
      <TrabajoFurniture />
      <ComunicacionFurniture />
      <RelaxFurniture />

      {/* Glass perimeter walls */}
      <GlassPerimeter />

      {/* Agents */}
      {agents.map((a) => (
        <Agent3D
          key={a.id}
          name={a.name}
          agentId={a.id}
          position={a.pos}
          status={a.status}
          isActive={a.isActive}
        />
      ))}

      {/* Interaction beams */}
      {beams.map((b) => (
        <InteractionBeam3D key={b.id} from={b.from} to={b.to} type={b.type} />
      ))}

      {/* Skill folders (replacing crystals) */}
      <SkillFolders3D />

      {/* Controls */}
      <OrbitControls
        makeDefault
        minDistance={5}
        maxDistance={35}
        maxPolarAngle={Math.PI / 2.1}
        target={[0, 0, 1]}
      />

      {/* Postprocessing — reduced bloom */}
      <EffectComposer>
        <Bloom luminanceThreshold={0.4} luminanceSmoothing={0.9} intensity={0.3} />
      </EffectComposer>
    </>
  );
}

export function World3D({ sessions, agentNames, interactions }: World3DProps) {
  return (
    <div style={{ width: '100%', height: '100%', background: '#1a1a24' }}>
      <Canvas
        camera={{ position: [0, 14, 18], fov: 55 }}
        gl={{ antialias: true, alpha: false }}
        style={{ width: '100%', height: '100%' }}
      >
        <SceneContent sessions={sessions} agentNames={agentNames} interactions={interactions} />
      </Canvas>
    </div>
  );
}
