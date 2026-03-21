/**
 * Agent3D — Cylinder body + sphere head with floating name label,
 * color glow based on status, and gentle bobbing idle animation.
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { Group } from 'three';
import type { SessionStatus } from '../../types';

/* ── Agent color map ── */
const AGENT_COLORS: Record<string, string> = {
  main: '#7c9cff',
  ginny: '#53e3c2',
  emma: '#ff9f43',
  'psych-market': '#a855f7',
  codereviewer: '#ef4444',
  cybersec: '#22d3ee',
  'git-guardian': '#84cc16',
  'senior-frontend-architect': '#f472b6',
  '3d-architect': '#fbbf24',
  'world-designer': '#c084fc',
  'avatar-creator': '#fb923c',
  'fx-animator': '#f43f5e',
};

function hashColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 70%, 60%)`;
}

function getAgentColor(agentId: string): string {
  return AGENT_COLORS[agentId] ?? hashColor(agentId);
}

const STATUS_EMISSIVE: Record<SessionStatus, { color: string; intensity: number }> = {
  running: { color: '#22c55e', intensity: 0.8 },
  waiting: { color: '#eab308', intensity: 0.5 },
  idle: { color: '#6b7280', intensity: 0.15 },
};

export interface Agent3DProps {
  name: string;
  agentId: string;
  position: [number, number, number];
  status: SessionStatus;
  isActive: boolean;
}

export function Agent3D({ name, agentId, position, status, isActive }: Agent3DProps) {
  const groupRef = useRef<Group>(null);
  const color = getAgentColor(agentId);
  const glow = STATUS_EMISSIVE[status];

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    // Gentle bobbing
    groupRef.current.position.y = position[1] + Math.sin(t * 1.5 + position[0] * 2) * 0.06;
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Body — cylinder */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.22, 0.28, 1, 12]} />
        <meshStandardMaterial
          color={color}
          emissive={glow.color}
          emissiveIntensity={glow.intensity}
        />
      </mesh>

      {/* Head — sphere */}
      <mesh position={[0, 1.2, 0]}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={glow.color}
          emissiveIntensity={glow.intensity}
        />
      </mesh>

      {/* Status ring on ground */}
      {isActive && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.35, 0.42, 24]} />
          <meshStandardMaterial
            color={glow.color}
            emissive={glow.color}
            emissiveIntensity={1.2}
            transparent
            opacity={0.7}
          />
        </mesh>
      )}

      {/* Floating name label */}
      <Html
        position={[0, 1.7, 0]}
        center
        distanceFactor={12}
        style={{
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        <div style={{
          background: 'rgba(10,10,26,0.85)',
          color,
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '11px',
          fontFamily: 'monospace',
          fontWeight: 600,
          border: `1px solid ${color}40`,
          textShadow: `0 0 6px ${color}`,
        }}>
          {name}
        </div>
      </Html>
    </group>
  );
}
