/**
 * Agent3D — Avatar 3D diferenciado con animaciones de actividad:
 *   - Masters (Samantha, Ginny, Emma): humanoide premium con halo/corona flotante
 *   - Resto de agentes: robot metálico con visor, antena y cuerpo angular
 *
 * Animations:
 *   - Walking: leg pendulum, arm swing, body bounce + lean
 *   - Running (working): forward lean, typing arms, head nod
 *   - Waiting (meeting): upright, arm gestures, head turns
 *   - Idle (relaxing): lean back, slow bob, slow halo/antenna
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Group, Mesh } from 'three';
import type { SessionStatus } from '../../types';
import type { AgentMotionState } from '../../hooks/useAgentMotion';
import { SpeechBubble3D } from './SpeechBubble3D';

/* ── Masters — conjunto fijo de IDs ── */
const MASTER_IDS = new Set(['main', 'samantha', 'ginny', 'emma']);

function isMaster(agentId: string): boolean {
  return MASTER_IDS.has(agentId.toLowerCase());
}

/* ── Colores por agente ── */
const AGENT_COLORS: Record<string, string> = {
  main:                       '#c084fc',
  samantha:                   '#c084fc',
  ginny:                      '#53e3c2',
  emma:                       '#ff9f43',
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
  /** Initial position — runtime position comes from motionRef */
  position: [number, number, number];
  status: SessionStatus;
  isActive: boolean;
  /** Shared ref from useAgentMotion — read in useFrame for zero-overhead updates */
  motionRef: React.RefObject<Map<string, AgentMotionState>>;
  /** Optional activity label shown below name */
  activityLabel?: string;
  /** Optional speech bubble message shown above the agent */
  speechBubble?: string;
}

/* ── Hair color por master ── */
const MASTER_HAIR: Record<string, string> = {
  main:     '#d4a853', // Samantha — rubia dorada
  samantha: '#d4a853',
  ginny:    '#b7410e', // Ginny — pelirroja
  emma:     '#8b5e3c', // Emma — castaña
};

/* ══════════════════════════════════════════
   MASTER AVATAR — female humanoid Pixar-style
   ══════════════════════════════════════════ */
function MasterAvatar({
  agentId, name, position, status, isActive, motionRef, activityLabel, speechBubble,
}: Agent3DProps) {
  const groupRef    = useRef<Group>(null);
  const bodyRef     = useRef<Group>(null);
  const haloRef     = useRef<Group>(null);
  const headRef     = useRef<Group>(null);
  const torsoRef    = useRef<Mesh>(null);
  const leftArmRef  = useRef<Mesh>(null);
  const rightArmRef = useRef<Mesh>(null);
  const leftLegRef  = useRef<Mesh>(null);
  const rightLegRef = useRef<Mesh>(null);
  const leftEyeRef  = useRef<Mesh>(null);  // párpado izquierdo (solo este mesh escala en Y)
  const rightEyeRef = useRef<Mesh>(null); // párpado derecho

  const id = agentId.toLowerCase();
  const color = getAgentColor(agentId);
  const glow  = STATUS_EMISSIVE[status];
  const haloColor = MASTER_HALO[id] ?? color;
  const hairColor = MASTER_HAIR[id] ?? '#1a1a2e';
  const skinColor = '#f5d5b0';
  const skinDark  = '#e8c49e';
  const cheekColor = '#f9b8b8';
  const lipColor   = '#d4798a';
  const eyeWhite   = '#f8f8f8';
  const irisColor  = '#3d2b1f';
  const blazerDark = color + 'cc';

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const seed = position[0] * 2 + position[2] * 0.7;

    if (!groupRef.current || !bodyRef.current) return;

    // Read motion state from shared ref (no React re-render needed)
    const motion = motionRef.current?.get(agentId);
    const isMoving = motion?.isMoving ?? false;
    const currentFacingAngle = motion?.facingAngle ?? 0;

    // Position from motion system
    if (motion) {
      const bobSpeed = isMoving ? 6 : status === 'idle' ? 0.8 : 1.3;
      const bobAmount = isMoving ? 0.12 : status === 'idle' ? 0.15 : 0.07;
      groupRef.current.position.x = motion.currentPos[0];
      groupRef.current.position.z = motion.currentPos[2];
      groupRef.current.position.y = motion.currentPos[1] + Math.sin(t * bobSpeed + seed) * bobAmount;
    } else {
      // Fallback: use initial position with bobbing
      const bobSpeed = status === 'idle' ? 0.8 : 1.3;
      const bobAmount = status === 'idle' ? 0.15 : 0.07;
      groupRef.current.position.y = position[1] + Math.sin(t * bobSpeed + seed) * bobAmount;
    }

    // Facing direction
    bodyRef.current.rotation.y = currentFacingAngle;

    // Body lean
    if (isMoving) {
      bodyRef.current.rotation.x = 0.12;
    } else if (status === 'running') {
      bodyRef.current.rotation.x = 0.15;
    } else if (status === 'idle') {
      bodyRef.current.rotation.x = -0.12;
    } else {
      bodyRef.current.rotation.x = 0;
    }

    // Breathing animation — torso scale.y oscillates
    if (torsoRef.current) {
      torsoRef.current.scale.y = 1.0 + Math.sin(t * 1.5 + seed) * 0.015 + 0.015;
    }

    // Head animation
    if (headRef.current) {
      if (isMoving) {
        headRef.current.rotation.y = 0;
        headRef.current.rotation.x = 0;
      } else if (status === 'running') {
        headRef.current.rotation.x = Math.sin(t * 1.5 + seed) * 0.2;
        headRef.current.rotation.y = 0;
      } else if (status === 'waiting') {
        headRef.current.rotation.y = Math.sin(t * 0.5 + seed) * 0.6;
        headRef.current.rotation.x = 0;
      } else {
        headRef.current.rotation.x = 0;
        headRef.current.rotation.y = Math.sin(t * 0.2 + seed) * 0.25;
      }
    }

    // Blink animation — solo mueve el párpado (mesh separado) en posY hacia abajo
    // Evita distorsión de perspectiva al no escalar grupos completos de ojo
    if (leftEyeRef.current && rightEyeRef.current) {
      const blinkCycle = (t + seed) % 3.5;
      // Durante blink (0.12s): párpado baja de y=0.028 a y=-0.018, luego vuelve
      const blink = blinkCycle < 0.12;
      const blinkPhase = blink ? blinkCycle / 0.12 : 0; // 0→1→0
      const lidDrop = blink ? Math.sin(blinkPhase * Math.PI) * 0.046 : 0;
      leftEyeRef.current.position.y  = 0.028 - lidDrop;
      rightEyeRef.current.position.y = 0.028 - lidDrop;
    }

    // Arm animation
    if (leftArmRef.current && rightArmRef.current) {
      if (isMoving) {
        const walkCycle = Math.sin(t * 6 + seed);
        leftArmRef.current.rotation.x = walkCycle * 0.6;
        rightArmRef.current.rotation.x = -walkCycle * 0.6;
        leftArmRef.current.rotation.z = 0;
        rightArmRef.current.rotation.z = 0;
      } else if (status === 'running') {
        // Typing motion — arms oscillate up/down like actually typing
        leftArmRef.current.rotation.x = -0.5 + Math.sin(t * 3 + seed) * 0.2;
        rightArmRef.current.rotation.x = -0.5 + Math.sin(t * 3.2 + seed + 1) * 0.2;
        leftArmRef.current.rotation.z = 0;
        rightArmRef.current.rotation.z = 0;
      } else if (status === 'waiting') {
        // Dramatic arm gesture — raises to shoulder height
        const gesture = Math.sin(t * 0.7 + seed);
        leftArmRef.current.rotation.x = gesture > 0.3 ? -0.8 * ((gesture - 0.3) / 0.7) : 0;
        rightArmRef.current.rotation.x = gesture > 0.5 ? -0.8 * ((gesture - 0.5) / 0.5) : 0;
        leftArmRef.current.rotation.z = gesture > 0.3 ? -0.3 * ((gesture - 0.3) / 0.7) : 0;
        rightArmRef.current.rotation.z = gesture > 0.5 ? 0.3 * ((gesture - 0.5) / 0.5) : 0;
      } else {
        leftArmRef.current.rotation.x = 0;
        rightArmRef.current.rotation.x = 0;
        leftArmRef.current.rotation.z = 0;
        rightArmRef.current.rotation.z = 0;
      }
    }

    // Leg animation
    if (leftLegRef.current && rightLegRef.current) {
      if (isMoving) {
        const walkCycle = Math.sin(t * 6 + seed);
        leftLegRef.current.rotation.x = -walkCycle * 0.5;
        rightLegRef.current.rotation.x = walkCycle * 0.5;
      } else {
        leftLegRef.current.rotation.x = 0;
        rightLegRef.current.rotation.x = 0;
      }
    }

    // Halo animation — rotation + vertical bob
    if (haloRef.current) {
      const haloSpeed = status === 'idle' ? 0.25 : 0.6;
      haloRef.current.rotation.z = t * haloSpeed;
      haloRef.current.rotation.x = Math.PI / 2 + Math.sin(t * 0.4) * 0.15;
      haloRef.current.position.y = 1.80 + Math.sin(t * 0.8 + seed) * 0.1;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <group ref={bodyRef}>

        {/* ── BLAZER / JACKET ── */}
        <mesh ref={torsoRef} position={[0, 0.50, 0]}>
          <cylinderGeometry args={[0.22, 0.30, 0.85, 16]} />
          <meshStandardMaterial color={color} emissive={glow.color} emissiveIntensity={glow.intensity} metalness={0.15} roughness={0.55} />
        </mesh>

        {/* Camisa interior (white V visible) */}
        <mesh position={[0, 0.72, 0.14]}>
          <boxGeometry args={[0.14, 0.28, 0.02]} />
          <meshStandardMaterial color="#f0f0f0" roughness={0.7} />
        </mesh>

        {/* Solapa izquierda */}
        <mesh position={[-0.09, 0.78, 0.145]} rotation={[0, 0, 0.25]}>
          <boxGeometry args={[0.10, 0.22, 0.015]} />
          <meshStandardMaterial color={blazerDark} metalness={0.1} roughness={0.5} />
        </mesh>
        {/* Solapa derecha */}
        <mesh position={[0.09, 0.78, 0.145]} rotation={[0, 0, -0.25]}>
          <boxGeometry args={[0.10, 0.22, 0.015]} />
          <meshStandardMaterial color={blazerDark} metalness={0.1} roughness={0.5} />
        </mesh>

        {/* Hombro izquierdo */}
        <mesh position={[-0.28, 0.90, 0]} scale={[1.2, 0.6, 0.9]}>
          <sphereGeometry args={[0.12, 12, 12]} />
          <meshStandardMaterial color={color} emissive={glow.color} emissiveIntensity={glow.intensity * 0.4} metalness={0.15} roughness={0.55} />
        </mesh>
        {/* Hombro derecho */}
        <mesh position={[0.28, 0.90, 0]} scale={[1.2, 0.6, 0.9]}>
          <sphereGeometry args={[0.12, 12, 12]} />
          <meshStandardMaterial color={color} emissive={glow.color} emissiveIntensity={glow.intensity * 0.4} metalness={0.15} roughness={0.55} />
        </mesh>

        {/* ── CUELLO ── */}
        <mesh position={[0, 1.00, 0]}>
          <cylinderGeometry args={[0.08, 0.11, 0.15, 10]} />
          <meshStandardMaterial color={skinColor} roughness={0.6} />
        </mesh>

        {/* ── CABEZA (group for head animation) ── */}
        <group ref={headRef} position={[0, 1.30, 0]}>

          {/* Cabeza base — slightly squished sphere */}
          <mesh scale={[1, 0.95, 0.92]}>
            <sphereGeometry args={[0.26, 20, 20]} />
            <meshStandardMaterial color={skinColor} roughness={0.55} />
          </mesh>

          {/* Mejilla izquierda */}
          <mesh position={[-0.14, -0.04, 0.12]} scale={[1, 0.6, 0.5]}>
            <sphereGeometry args={[0.08, 10, 10]} />
            <meshStandardMaterial color={cheekColor} transparent opacity={0.4} roughness={0.7} />
          </mesh>
          {/* Mejilla derecha */}
          <mesh position={[0.14, -0.04, 0.12]} scale={[1, 0.6, 0.5]}>
            <sphereGeometry args={[0.08, 10, 10]} />
            <meshStandardMaterial color={cheekColor} transparent opacity={0.4} roughness={0.7} />
          </mesh>

          {/* ── OJOS ── */}
          {/* Ojo izquierdo */}
          <group position={[-0.09, 0.04, 0.20]}>
            {/* Blanco del ojo */}
            <mesh>
              <sphereGeometry args={[0.055, 12, 12]} />
              <meshStandardMaterial color={eyeWhite} roughness={0.3} />
            </mesh>
            {/* Iris */}
            <mesh position={[0, 0, 0.035]}>
              <sphereGeometry args={[0.032, 10, 10]} />
              <meshStandardMaterial color={irisColor} roughness={0.4} />
            </mesh>
            {/* Pupila */}
            <mesh position={[0, 0, 0.05]}>
              <sphereGeometry args={[0.016, 8, 8]} />
              <meshStandardMaterial color="#000000" />
            </mesh>
            {/* Reflejo */}
            <mesh position={[0.012, 0.015, 0.055]}>
              <sphereGeometry args={[0.007, 6, 6]} />
              <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
            </mesh>
            {/* Párpado superior — este mesh se escala en Y para el parpadeo */}
            <mesh ref={leftEyeRef} position={[0, 0.028, 0.048]} scale={[1, 1, 1]}>
              <boxGeometry args={[0.115, 0.045, 0.012]} />
              <meshStandardMaterial color={skinColor} roughness={0.6} />
            </mesh>
          </group>

          {/* Ojo derecho */}
          <group position={[0.09, 0.04, 0.20]}>
            {/* Blanco del ojo */}
            <mesh>
              <sphereGeometry args={[0.055, 12, 12]} />
              <meshStandardMaterial color={eyeWhite} roughness={0.3} />
            </mesh>
            {/* Iris */}
            <mesh position={[0, 0, 0.035]}>
              <sphereGeometry args={[0.032, 10, 10]} />
              <meshStandardMaterial color={irisColor} roughness={0.4} />
            </mesh>
            {/* Pupila */}
            <mesh position={[0, 0, 0.05]}>
              <sphereGeometry args={[0.016, 8, 8]} />
              <meshStandardMaterial color="#000000" />
            </mesh>
            {/* Reflejo */}
            <mesh position={[0.012, 0.015, 0.055]}>
              <sphereGeometry args={[0.007, 6, 6]} />
              <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
            </mesh>
            {/* Párpado superior — este mesh se escala en Y para el parpadeo */}
            <mesh ref={rightEyeRef} position={[0, 0.028, 0.048]} scale={[1, 1, 1]}>
              <boxGeometry args={[0.115, 0.045, 0.012]} />
              <meshStandardMaterial color={skinColor} roughness={0.6} />
            </mesh>
          </group>

          {/* ── CEJAS ── */}
          {/* Ceja izquierda */}
          <mesh position={[-0.09, 0.11, 0.21]} rotation={[0, 0, 0.12]}>
            <boxGeometry args={[0.08, 0.015, 0.01]} />
            <meshStandardMaterial color={hairColor} />
          </mesh>
          {/* Ceja derecha */}
          <mesh position={[0.09, 0.11, 0.21]} rotation={[0, 0, -0.12]}>
            <boxGeometry args={[0.08, 0.015, 0.01]} />
            <meshStandardMaterial color={hairColor} />
          </mesh>

          {/* ── PESTANAS (fan of thin lashes per eye) ── */}
          {/* Pestanas ojo izquierdo */}
          <mesh position={[-0.12, 0.075, 0.23]} rotation={[0.2, 0.15, 0.5]}>
            <boxGeometry args={[0.025, 0.005, 0.002]} />
            <meshStandardMaterial color="#111111" />
          </mesh>
          <mesh position={[-0.095, 0.08, 0.24]} rotation={[0.15, 0.05, 0.3]}>
            <boxGeometry args={[0.025, 0.005, 0.002]} />
            <meshStandardMaterial color="#111111" />
          </mesh>
          <mesh position={[-0.07, 0.078, 0.24]} rotation={[0.15, -0.05, 0.1]}>
            <boxGeometry args={[0.025, 0.005, 0.002]} />
            <meshStandardMaterial color="#111111" />
          </mesh>
          {/* Pestanas ojo derecho */}
          <mesh position={[0.12, 0.075, 0.23]} rotation={[0.2, -0.15, -0.5]}>
            <boxGeometry args={[0.025, 0.005, 0.002]} />
            <meshStandardMaterial color="#111111" />
          </mesh>
          <mesh position={[0.095, 0.08, 0.24]} rotation={[0.15, -0.05, -0.3]}>
            <boxGeometry args={[0.025, 0.005, 0.002]} />
            <meshStandardMaterial color="#111111" />
          </mesh>
          <mesh position={[0.07, 0.078, 0.24]} rotation={[0.15, 0.05, -0.1]}>
            <boxGeometry args={[0.025, 0.005, 0.002]} />
            <meshStandardMaterial color="#111111" />
          </mesh>

          {/* ── NARIZ ── */}
          <mesh position={[0, -0.02, 0.24]} scale={[0.6, 0.7, 0.6]}>
            <sphereGeometry args={[0.035, 8, 8]} />
            <meshStandardMaterial color={skinDark} roughness={0.6} />
          </mesh>

          {/* ── LABIOS ── */}
          {/* Labio superior (thinner) */}
          <mesh position={[0, -0.09, 0.22]} scale={[1.3, 0.5, 0.6]} rotation={[0.1, 0, 0]}>
            <sphereGeometry args={[0.04, 10, 10]} />
            <meshStandardMaterial color={lipColor} roughness={0.45} />
          </mesh>
          {/* Labio inferior (fuller) */}
          <mesh position={[0, -0.105, 0.215]} scale={[1.2, 0.6, 0.6]} rotation={[-0.05, 0, 0]}>
            <sphereGeometry args={[0.04, 10, 10]} />
            <meshStandardMaterial color={lipColor} roughness={0.4} />
          </mesh>

          {/* ── PELO / HAIR ── */}
          {/* Top/crown — large cap */}
          <mesh position={[0, 0.12, -0.02]} scale={[1.08, 0.7, 1.05]}>
            <sphereGeometry args={[0.27, 16, 16]} />
            <meshStandardMaterial color={hairColor} roughness={0.7} />
          </mesh>

          {/* Flequillo / Bangs — fringe across forehead */}
          <mesh position={[0, 0.14, 0.16]} scale={[1.15, 0.3, 0.4]}>
            <sphereGeometry args={[0.2, 12, 12]} />
            <meshStandardMaterial color={hairColor} roughness={0.65} />
          </mesh>

          {/* Pelo lateral izquierdo — flowing to shoulder */}
          <mesh position={[-0.22, -0.08, -0.02]} scale={[0.55, 1.4, 0.6]}>
            <sphereGeometry args={[0.2, 12, 12]} />
            <meshStandardMaterial color={hairColor} roughness={0.65} />
          </mesh>
          {/* Mechon largo izquierdo — past shoulder */}
          <mesh position={[-0.20, -0.35, 0.0]} scale={[0.45, 1.0, 0.5]}>
            <sphereGeometry args={[0.18, 10, 10]} />
            <meshStandardMaterial color={hairColor} roughness={0.7} />
          </mesh>

          {/* Pelo lateral derecho — flowing to shoulder */}
          <mesh position={[0.22, -0.08, -0.02]} scale={[0.55, 1.4, 0.6]}>
            <sphereGeometry args={[0.2, 12, 12]} />
            <meshStandardMaterial color={hairColor} roughness={0.65} />
          </mesh>
          {/* Mechon largo derecho — past shoulder */}
          <mesh position={[0.20, -0.35, 0.0]} scale={[0.45, 1.0, 0.5]}>
            <sphereGeometry args={[0.18, 10, 10]} />
            <meshStandardMaterial color={hairColor} roughness={0.7} />
          </mesh>

          {/* Pelo trasero — back volume */}
          <mesh position={[0, -0.02, -0.15]} scale={[1.0, 1.1, 0.7]}>
            <sphereGeometry args={[0.26, 14, 14]} />
            <meshStandardMaterial color={hairColor} roughness={0.7} />
          </mesh>
          {/* Mechon trasero largo */}
          <mesh position={[0, -0.30, -0.12]} scale={[0.8, 0.9, 0.55]}>
            <sphereGeometry args={[0.22, 12, 12]} />
            <meshStandardMaterial color={hairColor} roughness={0.7} />
          </mesh>

          {/* Ondas/wave accents */}
          <mesh position={[-0.17, -0.18, 0.08]} scale={[0.4, 0.8, 0.35]}>
            <sphereGeometry args={[0.12, 8, 8]} />
            <meshStandardMaterial color={hairColor} roughness={0.65} />
          </mesh>
          <mesh position={[0.17, -0.18, 0.08]} scale={[0.4, 0.8, 0.35]}>
            <sphereGeometry args={[0.12, 8, 8]} />
            <meshStandardMaterial color={hairColor} roughness={0.65} />
          </mesh>
        </group>

        {/* ── BRAZOS ── */}
        {/* Brazo izquierdo */}
        <group position={[-0.36, 0.88, 0]}>
          <mesh ref={leftArmRef} position={[0, -0.30, 0]}>
            <cylinderGeometry args={[0.06, 0.07, 0.58, 10]} />
            <meshStandardMaterial color={color} emissive={glow.color} emissiveIntensity={glow.intensity * 0.4} metalness={0.15} roughness={0.55} />
          </mesh>
          {/* Mano izquierda */}
          <mesh position={[0, -0.62, 0]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshStandardMaterial color={skinColor} roughness={0.5} />
          </mesh>
        </group>
        {/* Brazo derecho */}
        <group position={[0.36, 0.88, 0]}>
          <mesh ref={rightArmRef} position={[0, -0.30, 0]}>
            <cylinderGeometry args={[0.06, 0.07, 0.58, 10]} />
            <meshStandardMaterial color={color} emissive={glow.color} emissiveIntensity={glow.intensity * 0.4} metalness={0.15} roughness={0.55} />
          </mesh>
          {/* Mano derecha */}
          <mesh position={[0, -0.62, 0]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshStandardMaterial color={skinColor} roughness={0.5} />
          </mesh>
        </group>

        {/* ── PIERNAS ── */}
        <group position={[-0.11, 0.06, 0]}>
          <mesh ref={leftLegRef} position={[0, -0.28, 0]}>
            <cylinderGeometry args={[0.08, 0.065, 0.55, 10]} />
            <meshStandardMaterial color={color} emissive={glow.color} emissiveIntensity={glow.intensity * 0.3} metalness={0.1} roughness={0.55} />
          </mesh>
          {/* Zapato izquierdo */}
          <mesh position={[0, -0.58, 0.02]}>
            <boxGeometry args={[0.1, 0.06, 0.14]} />
            <meshStandardMaterial color="#2a2a2a" roughness={0.4} metalness={0.2} />
          </mesh>
        </group>
        <group position={[0.11, 0.06, 0]}>
          <mesh ref={rightLegRef} position={[0, -0.28, 0]}>
            <cylinderGeometry args={[0.08, 0.065, 0.55, 10]} />
            <meshStandardMaterial color={color} emissive={glow.color} emissiveIntensity={glow.intensity * 0.3} metalness={0.1} roughness={0.55} />
          </mesh>
          {/* Zapato derecho */}
          <mesh position={[0, -0.58, 0.02]}>
            <boxGeometry args={[0.1, 0.06, 0.14]} />
            <meshStandardMaterial color="#2a2a2a" roughness={0.4} metalness={0.2} />
          </mesh>
        </group>

        {/* ── HALO / CORONA FLOTANTE ── */}
        <group ref={haloRef} position={[0, 1.80, 0]}>
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

        {/* Speech bubble */}
        {speechBubble && <SpeechBubble3D message={speechBubble} />}

        {/* Label */}
        <Html position={[0, 2.15, 0]} center distanceFactor={12} style={{ pointerEvents: 'none', whiteSpace: 'nowrap' }}>
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
          {activityLabel && (
            <div style={{
              color: `${haloColor}99`,
              fontSize: '8px',
              fontFamily: 'monospace',
              textAlign: 'center',
              marginTop: '2px',
              whiteSpace: 'nowrap',
            }}>
              {activityLabel}
            </div>
          )}
        </Html>
      </group>
    </group>
  );
}

/* ══════════════════════════════════════════
   ROBOT AVATAR — agente genérico mecánico
   ══════════════════════════════════════════ */
function RobotAvatar({
  agentId, name, position, status, isActive, motionRef, activityLabel, speechBubble,
}: Agent3DProps) {
  const groupRef    = useRef<Group>(null);
  const bodyRef     = useRef<Group>(null);
  const antennaRef  = useRef<Group>(null);
  const headRef     = useRef<Mesh>(null);
  const torsoRef    = useRef<Mesh>(null);
  const visorRef    = useRef<Mesh>(null);
  const leftArmRef  = useRef<Mesh>(null);
  const rightArmRef = useRef<Mesh>(null);
  const leftLegRef  = useRef<Mesh>(null);
  const rightLegRef = useRef<Mesh>(null);
  const color = getAgentColor(agentId);
  const glow  = STATUS_EMISSIVE[status];
  const bodyColor = color;
  const metalColor = '#4a5568';

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const seed = position[0] * 2 + position[2] * 0.7;

    if (!groupRef.current || !bodyRef.current) return;

    // Read motion state from shared ref (no React re-render needed)
    const motion = motionRef.current?.get(agentId);
    const isMoving = motion?.isMoving ?? false;
    const currentFacingAngle = motion?.facingAngle ?? 0;

    // Position from motion system
    if (motion) {
      const bobSpeed = isMoving ? 7 : status === 'idle' ? 0.8 : 1.5;
      const bobAmount = isMoving ? 0.12 : status === 'idle' ? 0.15 : 0.05;
      groupRef.current.position.x = motion.currentPos[0];
      groupRef.current.position.z = motion.currentPos[2];
      groupRef.current.position.y = motion.currentPos[1] + Math.sin(t * bobSpeed + seed) * bobAmount;
    } else {
      // Fallback: use initial position with bobbing
      const bobSpeed = status === 'idle' ? 0.8 : 1.5;
      const bobAmount = status === 'idle' ? 0.15 : 0.05;
      groupRef.current.position.y = position[1] + Math.sin(t * bobSpeed + seed) * bobAmount;
    }

    // Facing direction
    bodyRef.current.rotation.y = currentFacingAngle;

    // Body lean
    if (isMoving) {
      bodyRef.current.rotation.x = 0.1;
    } else if (status === 'running') {
      bodyRef.current.rotation.x = 0.15;
    } else if (status === 'idle') {
      bodyRef.current.rotation.x = -0.12;
    } else {
      bodyRef.current.rotation.x = 0;
    }

    // Breathing animation — torso scale.y oscillates
    if (torsoRef.current) {
      torsoRef.current.scale.y = 1.0 + Math.sin(t * 1.5 + seed) * 0.015 + 0.015;
    }

    // Head animation
    if (headRef.current) {
      if (isMoving) {
        headRef.current.rotation.y = 0;
        headRef.current.rotation.x = 0;
      } else if (status === 'running') {
        headRef.current.rotation.x = Math.sin(t * 2 + seed) * 0.2;
        headRef.current.rotation.y = 0;
      } else if (status === 'waiting') {
        headRef.current.rotation.y = Math.sin(t * 0.5 + seed) * 0.6;
        headRef.current.rotation.x = 0;
      } else {
        headRef.current.rotation.x = 0;
        headRef.current.rotation.y = Math.sin(t * 0.15 + seed) * 0.25;
      }
    }

    // Antenna pulse speed varies by status — dramatic pulsing
    if (antennaRef.current) {
      const pulseSpeed = isMoving ? 4 : status === 'running' ? 5 : status === 'idle' ? 1.2 : 3;
      const pulseAmount = status === 'idle' ? 0.15 : 0.3;
      antennaRef.current.scale.y = 1 + Math.sin(t * pulseSpeed + seed) * pulseAmount;
    }

    // Visor glow — emissive intensity oscillation
    if (visorRef.current) {
      const mat = visorRef.current.material as THREE.MeshStandardMaterial;
      if (status === 'running') {
        mat.emissiveIntensity = 2.75 + Math.sin(t * 3 + seed) * 1.25;
      } else if (status === 'waiting') {
        mat.emissiveIntensity = 2.0 + Math.sin(t * 1.5 + seed) * 0.8;
      } else {
        mat.emissiveIntensity = 1.8 + Math.sin(t * 0.8 + seed) * 0.6;
      }
    }

    // Arm animation
    if (leftArmRef.current && rightArmRef.current) {
      if (isMoving) {
        const walkCycle = Math.sin(t * 7 + seed);
        leftArmRef.current.rotation.x = walkCycle * 0.6;
        rightArmRef.current.rotation.x = -walkCycle * 0.6;
        leftArmRef.current.rotation.z = 0.18;
        rightArmRef.current.rotation.z = -0.18;
      } else if (status === 'running') {
        // Typing motion — arms oscillate up/down like actually typing
        leftArmRef.current.rotation.x = -0.5 + Math.sin(t * 3 + seed) * 0.2;
        rightArmRef.current.rotation.x = -0.5 + Math.sin(t * 3.3 + seed + 1) * 0.2;
        leftArmRef.current.rotation.z = 0.18;
        rightArmRef.current.rotation.z = -0.18;
      } else if (status === 'waiting') {
        // Dramatic arm gesture — raises to shoulder height
        const gesture = Math.sin(t * 0.6 + seed);
        leftArmRef.current.rotation.x = gesture > 0.3 ? -0.8 * ((gesture - 0.3) / 0.7) : 0;
        rightArmRef.current.rotation.x = gesture > 0.4 ? -0.8 * ((gesture - 0.4) / 0.6) : 0;
        leftArmRef.current.rotation.z = 0.18 + (gesture > 0.3 ? -0.3 * ((gesture - 0.3) / 0.7) : 0);
        rightArmRef.current.rotation.z = -0.18 + (gesture > 0.4 ? 0.3 * ((gesture - 0.4) / 0.6) : 0);
      } else {
        leftArmRef.current.rotation.x = 0;
        rightArmRef.current.rotation.x = 0;
        leftArmRef.current.rotation.z = 0.18;
        rightArmRef.current.rotation.z = -0.18;
      }
    }

    // Leg animation
    if (leftLegRef.current && rightLegRef.current) {
      if (isMoving) {
        const walkCycle = Math.sin(t * 7 + seed);
        leftLegRef.current.rotation.x = -walkCycle * 0.5;
        rightLegRef.current.rotation.x = walkCycle * 0.5;
      } else {
        leftLegRef.current.rotation.x = 0;
        rightLegRef.current.rotation.x = 0;
      }
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <group ref={bodyRef}>

        {/* ── Cuerpo principal (caja) ── */}
        <mesh ref={torsoRef} position={[0, 0.55, 0]}>
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
        <mesh ref={headRef} position={[0, 1.08, 0]}>
          <boxGeometry args={[0.40, 0.32, 0.30]} />
          <meshStandardMaterial color={bodyColor} emissive={glow.color} emissiveIntensity={glow.intensity * 0.7} metalness={0.65} roughness={0.35} />
        </mesh>

        {/* Visor (pantalla frontal) */}
        <mesh ref={visorRef} position={[0, 1.10, 0.155]}>
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
          <mesh position={[0, 0.10, 0]}>
            <cylinderGeometry args={[0.018, 0.018, 0.22, 6]} />
            <meshStandardMaterial color={metalColor} metalness={0.9} roughness={0.1} />
          </mesh>
          <mesh position={[0, 0.235, 0]}>
            <sphereGeometry args={[0.042, 8, 8]} />
            <meshStandardMaterial color={glow.color} emissive={glow.color} emissiveIntensity={2.5} />
          </mesh>
        </group>

        {/* ── Brazos (pivoting from shoulder) ── */}
        <group position={[-0.36, 0.92, 0]}>
          <mesh ref={leftArmRef} position={[0, -0.30, 0]} rotation={[0, 0, 0.18]}>
            <boxGeometry args={[0.12, 0.55, 0.13]} />
            <meshStandardMaterial color={bodyColor} emissive={glow.color} emissiveIntensity={glow.intensity * 0.4} metalness={0.7} roughness={0.3} />
          </mesh>
        </group>
        <group position={[0.36, 0.92, 0]}>
          <mesh ref={rightArmRef} position={[0, -0.30, 0]} rotation={[0, 0, -0.18]}>
            <boxGeometry args={[0.12, 0.55, 0.13]} />
            <meshStandardMaterial color={bodyColor} emissive={glow.color} emissiveIntensity={glow.intensity * 0.4} metalness={0.7} roughness={0.3} />
          </mesh>
        </group>

        {/* Manos / pinzas */}
        <mesh position={[-0.38, 0.33, 0]}>
          <boxGeometry args={[0.14, 0.10, 0.12]} />
          <meshStandardMaterial color={metalColor} metalness={0.85} roughness={0.15} />
        </mesh>
        <mesh position={[0.38, 0.33, 0]}>
          <boxGeometry args={[0.14, 0.10, 0.12]} />
          <meshStandardMaterial color={metalColor} metalness={0.85} roughness={0.15} />
        </mesh>

        {/* ── Piernas (pivoting from hip) ── */}
        <group position={[-0.13, 0.08, 0]}>
          <mesh ref={leftLegRef} position={[0, -0.28, 0]}>
            <boxGeometry args={[0.14, 0.50, 0.14]} />
            <meshStandardMaterial color={bodyColor} emissive={glow.color} emissiveIntensity={glow.intensity * 0.3} metalness={0.7} roughness={0.3} />
          </mesh>
        </group>
        <group position={[0.13, 0.08, 0]}>
          <mesh ref={rightLegRef} position={[0, -0.28, 0]}>
            <boxGeometry args={[0.14, 0.50, 0.14]} />
            <meshStandardMaterial color={bodyColor} emissive={glow.color} emissiveIntensity={glow.intensity * 0.3} metalness={0.7} roughness={0.3} />
          </mesh>
        </group>

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

        {/* Speech bubble */}
        {speechBubble && <SpeechBubble3D message={speechBubble} />}

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
          {activityLabel && (
            <div style={{
              color: `${color}99`,
              fontSize: '8px',
              fontFamily: 'monospace',
              textAlign: 'center',
              marginTop: '2px',
              whiteSpace: 'nowrap',
            }}>
              {activityLabel}
            </div>
          )}
        </Html>
      </group>
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
