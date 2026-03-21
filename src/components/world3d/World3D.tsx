/**
 * World3D — R3F Canvas with cyberpunk office scene: dark floor, grid, 3 glowing zones.
 */

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import type { ISession, AgentNameMap } from '../../types';

interface World3DProps {
  sessions: ISession[];
  agentNames: AgentNameMap;
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
      {/* Border ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[Math.min(size[0], size[1]) * 0.48, Math.min(size[0], size[1]) * 0.5, 64]} />
        <meshStandardMaterial color={color} transparent opacity={0.3} emissive={color} emissiveIntensity={0.6} />
      </mesh>
      {/* Zone label — invisible mesh used as anchor, actual text handled by agents */}
      <mesh position={[0, 0.05, size[1] * 0.45]} visible={false}>
        <boxGeometry args={[0.1, 0.1, 0.1]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {/* Simple label plane */}
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
    [-6, 0.15, -1], [-4, 0.15, -1], [-6, 0.15, 1], [-4, 0.15, 1],
    [-6, 0.15, 3], [-4, 0.15, 3],
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

/* ── Main scene contents ── */
function Scene() {
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

export function World3D({ sessions: _sessions, agentNames: _agentNames }: World3DProps) {
  return (
    <div style={{ width: '100%', height: '100%', background: '#0a0a1a' }}>
      <Canvas
        camera={{ position: [0, 14, 18], fov: 55 }}
        gl={{ antialias: true, alpha: false }}
        style={{ width: '100%', height: '100%' }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
