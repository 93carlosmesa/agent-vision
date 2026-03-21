/**
 * World3D — R3F Canvas with cyberpunk office scene: dark floor, grid, 3 glowing zones,
 * agent avatars placed by status.
 */

import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { Agent3D } from './Agent3D';
import { SkillObjects3D } from './SkillObject3D';
import type { ISession, AgentNameMap, SessionStatus } from '../../types';

export interface World3DProps {
  sessions: ISession[];
  agentNames: AgentNameMap;
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

/* ── Zone glow planes ── */
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
        <meshStandardMaterial color={color} transparent opacity={0.12} emissive={color} emissiveIntensity={0.4} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[Math.min(size[0], size[1]) * 0.48, Math.min(size[0], size[1]) * 0.5, 64]} />
        <meshStandardMaterial color={color} transparent opacity={0.3} emissive={color} emissiveIntensity={0.6} />
      </mesh>
      <group position={[0, 0.02, size[1] * 0.42]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[label.length * 0.18, 0.3]} />
          <meshStandardMaterial color={color} transparent opacity={0.25} emissive={color} emissiveIntensity={0.5} />
        </mesh>
      </group>
    </group>
  );
}

/* ── Low desk boxes in Trabajo zone ── */
function Desks() {
  const desks: [number, number, number][] = [
    [-7, 0.15, -1], [-5, 0.15, -1], [-3, 0.15, -1],
    [-7, 0.15, 1.5], [-5, 0.15, 1.5], [-3, 0.15, 1.5],
  ];
  return (
    <group>
      {desks.map((pos, i) => (
        <mesh key={i} position={pos}>
          <boxGeometry args={[1.2, 0.3, 0.6]} />
          <meshStandardMaterial color="#1a1a2e" emissive="#7c9cff" emissiveIntensity={0.08} />
        </mesh>
      ))}
    </group>
  );
}

/* ── Scene internals (rendered inside Canvas) ── */
function SceneContent({ sessions, agentNames }: World3DProps) {
  const agents = useMemo(() => {
    const sessionByAgent = new Map<string, ISession>();
    for (const s of sessions) {
      sessionByAgent.set(s.agentId, s);
    }

    // All agent IDs: from agentNames + sessions
    const allIds = new Set([...Object.keys(agentNames), ...sessions.map(s => s.agentId)]);

    // Group by status
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

    // Build positioned agents
    const result: { id: string; name: string; pos: [number, number, number]; status: SessionStatus; isActive: boolean }[] = [];

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
      }
    }

    return result;
  }, [sessions, agentNames]);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.15} color="#6366f1" />
      <pointLight position={[-6, 8, 0]} intensity={40} color="#7c9cff" distance={25} />
      <pointLight position={[6, 8, -3]} intensity={30} color="#53e3c2" distance={25} />
      <pointLight position={[6, 8, 5]} intensity={25} color="#ff9f43" distance={25} />
      <pointLight position={[0, 12, 0]} intensity={20} color="#e0e0ff" distance={30} />

      {/* Fog */}
      <fog attach="fog" args={['#0a0a1a', 15, 45]} />

      {/* Dark floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="#0a0a1a" />
      </mesh>

      {/* Cyberpunk grid */}
      <Grid
        position={[0, 0, 0]}
        args={[50, 50]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#1a1a3e"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#2a2a5e"
        fadeDistance={40}
        infiniteGrid
      />

      {/* Zone planes */}
      <ZonePlane position={[-5, 0.01, 1]} color="#7c9cff" size={[8, 10]} label="Trabajo" />
      <ZonePlane position={[5, 0.01, -3]} color="#53e3c2" size={[7, 6]} label="Comunicación" />
      <ZonePlane position={[5, 0.01, 5]} color="#ff9f43" size={[7, 6]} label="Relax" />

      {/* Desks */}
      <Desks />

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

      {/* Skill crystals */}
      <SkillObjects3D />

      {/* Controls */}
      <OrbitControls
        makeDefault
        minDistance={5}
        maxDistance={35}
        maxPolarAngle={Math.PI / 2.1}
        target={[0, 0, 1]}
      />

      {/* Postprocessing */}
      <EffectComposer>
        <Bloom luminanceThreshold={0.3} luminanceSmoothing={0.9} intensity={0.6} />
      </EffectComposer>
    </>
  );
}

export function World3D({ sessions, agentNames }: World3DProps) {
  return (
    <div style={{ width: '100%', height: '100%', background: '#0a0a1a' }}>
      <Canvas
        camera={{ position: [0, 14, 18], fov: 55 }}
        gl={{ antialias: true, alpha: false }}
        style={{ width: '100%', height: '100%' }}
      >
        <SceneContent sessions={sessions} agentNames={agentNames} />
      </Canvas>
    </div>
  );
}
