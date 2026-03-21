/**
 * Agent3D — Avatar 3D diferenciado:
 *   - Masters (Samantha, Ginny, Emma): humanoide premium con halo/corona flotante
 *   - Resto de agentes: robot metálico con visor, antena y cuerpo angular
 *
 * Status glow + bobbing idle animation se aplican a ambos tipos.
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { Group } from 'three';
import type { SessionStatus } from '../../types';

/* ── Masters — conjunto fijo de IDs ── */
const MASTER_IDS = new Set(['main', 'samantha', 'ginny', 'emma']);

function isMaster(agentId: string): boolean {
  return MASTER_IDS.has(agentId.toLowerCase());
}

/* ── Colores por agente ── */
const AGENT_COLORS: Record<string, string> = {
  main:                       '#c084fc', // Samantha — violeta
  samantha:                   '#c084fc',
  ginny:                      '#53e3c2', // Ginny — turquesa
  emma:                       '#ff9f43', // Emma — naranja
  codereviewer:               '#ef4444',
  cybersec:                   '#22d3ee',
  'git-guardian':             '#84cc16',
  'senior-frontend-architect':'#f472b6',
  linter:                     '#a3e635',
  prettier:                   '#f59e0b',
  controlnaming:              '#38bdf8',
  'ui-usability-analyst':     '#e879f9',
  'fullstack-smoke-tester':   '#34d399',
  'backend-socket-architect': '#fb923c',
  'psych-market':             '#a855f7',
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

/* ── Status emissive ── */
const STATUS_EMISSIVE: Record<SessionStatus, { color: string; intensity: number }> = {
  running: { color: '#22c55e', intensity: 0.9 },
  waiting: { color: '#eab308', intensity: 0.55 },
  idle:    { color: '#6b7280', intensity: 0.15 },
};

/* ── Halo color por master ── */
const MASTER_HALO: Record<string, string> = {
  main:     '#c084fc',
  samantha: '#c084fc',
  ginny:    '#53e3c2',
  emma:     '#ff9f43',
};

/* ── Props ── */
export interface Agent3DProps {
  name: string;
  agentId: string;
  position: [number, number, number];
  status: SessionStatus;
  isActive: boolean;
}

/* ══════════════════════════════════════════
   MASTER AVATAR — humanoide premium con halo
   ══════════════════════════════════════════ */
function MasterAvatar({
  agentId, name, position, status, isActive,
}: Agent3DProps) {
  const groupRef = useRef<Group>(null);
  const haloRef  = useRef<Group>(null);
  const color = getAgentColor(agentId);
  const glow  = STATUS_EMISSIVE[status];
  const haloColor = MASTER_HALO[agentId.toLowerCase()] ?? color;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(t * 1.3 + position[0] * 2) * 0.07;
    }
    // Halo rotates slowly
    if (haloRef.current) {
      haloRef.current.rotation.z = t * 0.6;
      haloRef.current.rotation.x = Math.PI / 2 + Math.sin(t * 0.4) * 0.15;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Torso */}
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.24, 0.30, 0.9, 14]} />
        <meshStandardMaterial color={color} emissive={glow.color} emissiveIntensity={glow.intensity} metalness={0.15} roughness={0.6} />
      </mesh>

      {/* Cuello */}
      <mesh position={[0, 1.05, 0]}>
        <cylinderGeometry args={[0.10, 0.14, 0.18, 10]} />
        <meshStandardMaterial color={color} emissive={glow.color} emissiveIntensity={glow.intensity * 0.6} />
      </mesh>

      {/* Cabeza */}
      <mesh position={[0, 1.32, 0]}>
        <sphereGeometry args={[0.24, 18, 18]} />
        <meshStandardMaterial color={color} emissive={glow.color} emissiveIntensity={glow.intensity * 0.7} roughness={0.5} />
      </mesh>

      {/* Brazos */}
      <mesh position={[-0.38, 0.6, 0]}>
        <cylinderGeometry args={[0.07, 0.09, 0.65, 8]} />
        <meshStandardMaterial color={color} emissive={glow.color} emissiveIntensity={glow.intensity * 0.5} />
      </mesh>
      <mesh position={[0.38, 0.6, 0]}>
        <cylinderGeometry args={[0.07, 0.09, 0.65, 8]} />
        <meshStandardMaterial color={color} emissive={glow.color} emissiveIntensity={glow.intensity * 0.5} />
      </mesh>

      {/* Piernas */}
      <mesh position={[-0.12, -0.2, 0]}>
        <cylinderGeometry args={[0.09, 0.08, 0.55, 8]} />
        <meshStandardMaterial color={color} emissive={glow.color} emissiveIntensity={glow.intensity * 0.4} />
      </mesh>
      <mesh position={[0.12, -0.2, 0]}>
        <cylinderGeometry args={[0.09, 0.08, 0.55, 8]} />
        <meshStandardMaterial color={color} emissive={glow.color} emissiveIntensity={glow.intensity * 0.4} />
      </mesh>

      {/* Halo / corona flotante */}
      <group ref={haloRef} position={[0, 1.75, 0]}>
        <mesh>
          <torusGeometry args={[0.30, 0.025, 8, 36]} />
          <meshStandardMaterial
            color={haloColor}
            emissive={haloColor}
            emissiveIntensity={2.5}
            transparent
            opacity={0.85}
          />
        </mesh>
      </group>

      {/* Status ring */}
      {isActive && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.36, 0.44, 28]} />
          <meshStandardMaterial color={glow.color} emissive={glow.color} emissiveIntensity={1.4} transparent opacity={0.75} />
        </mesh>
      )}

      {/* Label */}
      <Html position={[0, 2.1, 0]} center distanceFactor={12} style={{ pointerEvents: 'none', whiteSpace: 'nowrap' }}>
        <div style={{
          background: 'rgba(10,10,26,0.90)',
          color,
          padding: '2px 10px',
          borderRadius: '4px',
          fontSize: '11px',
          fontFamily: 'monospace',
          fontWeight: 700,
          border: `1px solid ${haloColor}70`,
          textShadow: `0 0 8px ${haloColor}`,
          letterSpacing: '0.04em',
        }}>
          ★ {name}
        </div>
      </Html>
    </group>
  );
}

/* ══════════════════════════════════════════
   ROBOT AVATAR — agente genérico mecánico
   ══════════════════════════════════════════ */
function RobotAvatar({
  agentId, name, position, status, isActive,
}: Agent3DProps) {
  const groupRef  = useRef<Group>(null);
  const antennaRef = useRef<Group>(null);
  const color = getAgentColor(agentId);
  const glow  = STATUS_EMISSIVE[status];

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(t * 1.5 + position[0] * 2) * 0.05;
    }
    // Antena pulsa suavemente
    if (antennaRef.current) {
      antennaRef.current.scale.y = 1 + Math.sin(t * 3 + position[2]) * 0.12;
    }
  });

  // Color metálico ligeramente más oscuro para el cuerpo
  const bodyColor = color;
  const metalColor = '#4a5568';

  return (
    <group ref={groupRef} position={position}>

      {/* ── Cuerpo principal (caja) ── */}
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[0.52, 0.72, 0.32]} />
        <meshStandardMaterial color={bodyColor} emissive={glow.color} emissiveIntensity={glow.intensity} metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Panel frontal del torso (detalle) */}
      <mesh position={[0, 0.55, 0.165]}>
        <boxGeometry args={[0.30, 0.42, 0.01]} />
        <meshStandardMaterial color={metalColor} emissive={glow.color} emissiveIntensity={glow.intensity * 0.8} metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Indicador de status en pecho */}
      <mesh position={[0, 0.65, 0.175]}>
        <circleGeometry args={[0.055, 10]} />
        <meshStandardMaterial color={glow.color} emissive={glow.color} emissiveIntensity={2.5} />
      </mesh>

      {/* ── Cintura (conector) ── */}
      <mesh position={[0, 0.18, 0]}>
        <boxGeometry args={[0.42, 0.12, 0.28]} />
        <meshStandardMaterial color={metalColor} emissive={glow.color} emissiveIntensity={glow.intensity * 0.4} metalness={0.8} roughness={0.2} />
      </mesh>

      {/* ── Cabeza (caja angular) ── */}
      <mesh position={[0, 1.08, 0]}>
        <boxGeometry args={[0.40, 0.32, 0.30]} />
        <meshStandardMaterial color={bodyColor} emissive={glow.color} emissiveIntensity={glow.intensity * 0.7} metalness={0.65} roughness={0.35} />
      </mesh>

      {/* Visor (pantalla frontal) */}
      <mesh position={[0, 1.10, 0.155]}>
        <boxGeometry args={[0.28, 0.14, 0.01]} />
        <meshStandardMaterial
          color="#001122"
          emissive={glow.color}
          emissiveIntensity={1.8}
          metalness={0.2}
          roughness={0.0}
          transparent
          opacity={0.92}
        />
      </mesh>

      {/* Ojos (dos puntos luminosos) */}
      <mesh position={[-0.07, 1.115, 0.162]}>
        <circleGeometry args={[0.028, 8]} />
        <meshStandardMaterial color={glow.color} emissive={glow.color} emissiveIntensity={3.0} />
      </mesh>
      <mesh position={[0.07, 1.115, 0.162]}>
        <circleGeometry args={[0.028, 8]} />
        <meshStandardMaterial color={glow.color} emissive={glow.color} emissiveIntensity={3.0} />
      </mesh>

      {/* ── Antena ── */}
      <group ref={antennaRef} position={[0, 1.26, 0]}>
        {/* Palo */}
        <mesh position={[0, 0.10, 0]}>
          <cylinderGeometry args={[0.018, 0.018, 0.22, 6]} />
          <meshStandardMaterial color={metalColor} metalness={0.9} roughness={0.1} />
        </mesh>
        {/* Bola */}
        <mesh position={[0, 0.235, 0]}>
          <sphereGeometry args={[0.042, 8, 8]} />
          <meshStandardMaterial color={glow.color} emissive={glow.color} emissiveIntensity={2.5} />
        </mesh>
      </group>

      {/* ── Brazos (cajas angulares) ── */}
      <mesh position={[-0.36, 0.62, 0]} rotation={[0, 0, 0.18]}>
        <boxGeometry args={[0.12, 0.55, 0.13]} />
        <meshStandardMaterial color={bodyColor} emissive={glow.color} emissiveIntensity={glow.intensity * 0.4} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0.36, 0.62, 0]} rotation={[0, 0, -0.18]}>
        <boxGeometry args={[0.12, 0.55, 0.13]} />
        <meshStandardMaterial color={bodyColor} emissive={glow.color} emissiveIntensity={glow.intensity * 0.4} metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Manos / pinzas */}
      <mesh position={[-0.38, 0.33, 0]}>
        <boxGeometry args={[0.14, 0.10, 0.12]} />
        <meshStandardMaterial color={metalColor} metalness={0.85} roughness={0.15} />
      </mesh>
      <mesh position={[0.38, 0.33, 0]}>
        <boxGeometry args={[0.14, 0.10, 0.12]} />
        <meshStandardMaterial color={metalColor} metalness={0.85} roughness={0.15} />
      </mesh>

      {/* ── Piernas ── */}
      <mesh position={[-0.13, -0.20, 0]}>
        <boxGeometry args={[0.14, 0.50, 0.14]} />
        <meshStandardMaterial color={bodyColor} emissive={glow.color} emissiveIntensity={glow.intensity * 0.3} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0.13, -0.20, 0]}>
        <boxGeometry args={[0.14, 0.50, 0.14]} />
        <meshStandardMaterial color={bodyColor} emissive={glow.color} emissiveIntensity={glow.intensity * 0.3} metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Pies */}
      <mesh position={[-0.13, -0.47, 0.03]}>
        <boxGeometry args={[0.17, 0.08, 0.22]} />
        <meshStandardMaterial color={metalColor} metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0.13, -0.47, 0.03]}>
        <boxGeometry args={[0.17, 0.08, 0.22]} />
        <meshStandardMaterial color={metalColor} metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Status ring */}
      {isActive && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.38, 0.46, 20]} />
          <meshStandardMaterial color={glow.color} emissive={glow.color} emissiveIntensity={1.2} transparent opacity={0.65} />
        </mesh>
      )}

      {/* Label */}
      <Html position={[0, 1.75, 0]} center distanceFactor={12} style={{ pointerEvents: 'none', whiteSpace: 'nowrap' }}>
        <div style={{
          background: 'rgba(10,10,26,0.85)',
          color,
          padding: '2px 8px',
          borderRadius: '3px',
          fontSize: '10px',
          fontFamily: 'monospace',
          fontWeight: 600,
          border: `1px solid ${color}40`,
          textShadow: `0 0 5px ${color}`,
        }}>
          🤖 {name}
        </div>
      </Html>
    </group>
  );
}

/* ══════════════════════════════════════════
   EXPORT PRINCIPAL — elige tipo según ID
   ══════════════════════════════════════════ */
export function Agent3D(props: Agent3DProps) {
  if (isMaster(props.agentId)) {
    return <MasterAvatar {...props} />;
  }
  return <RobotAvatar {...props} />;
}
