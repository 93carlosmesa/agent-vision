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
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import type { Group, Mesh } from 'three';
import type { SessionStatus } from '../../types';
import type { AgentMotionState } from '../../hooks/useAgentMotion';
import { SpeechBubble3D } from './SpeechBubble3D';
import { isMaster, isCEO, getAgentColor, getAgentConfig } from '../../config/agentConfig';
import type { AgentVisualState } from '../../types/AgentState';

/* ── Agent label — WebGL-based (no DOM overhead) ── */
function AgentLabel3D({
  yPos,
  name,
  nameColor,
  subColor,
  activityLabel,
  prefix = "★",
}: {
  yPos: number;
  name: string;
  nameColor: string;
  subColor: string;
  activityLabel?: string;
  prefix?: string;
}) {
  return (
    <Billboard position={[0, yPos, 0]}>
      <Text
        fontSize={0.20}
        color={nameColor}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.025}
        outlineColor="#050510"
        letterSpacing={0.02}
      >
        {`${prefix} ${name}`}
      </Text>
      {activityLabel && (
        <Text
          position={[0, -0.30, 0]}
          fontSize={0.14}
          color={subColor}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#050510"
          fillOpacity={0.75}
        >
          {activityLabel}
        </Text>
      )}
    </Billboard>
  );
}

/* ── Status emissive — maps both SessionStatus and AgentVisualState ── */
const STATUS_EMISSIVE: Record<SessionStatus, { color: string; intensity: number }> = {
  running: { color: '#22c55e', intensity: 0.9 },
  waiting: { color: '#eab308', intensity: 0.55 },
  idle:    { color: '#6b7280', intensity: 0.15 },
};

/** Emissive override for extended visual states */
const VISUAL_STATE_EMISSIVE: Partial<Record<AgentVisualState, { color: string; intensity: number }>> = {
  communicating: { color: '#3b82f6', intensity: 0.75 },  // blue — chatting
  using_skill:   { color: '#f59e0b', intensity: 0.85 },  // amber — skill active
};

/* ── Halo/Hair helpers — read from registry ── */
function getMasterHalo(agentId: string): string {
  const cfg = getAgentConfig(agentId);
  return cfg?.haloColor ?? cfg?.color ?? '#c084fc';
}

function getMasterHair(agentId: string): string {
  const cfg = getAgentConfig(agentId);
  return cfg?.hairColor ?? '#1a1a2e';
}

/* ── Props ── */
export interface Agent3DProps {
  name: string;
  agentId: string;
  /** Initial position — runtime position comes from motionRef */
  position: [number, number, number];
  status: SessionStatus;
  /** Extended 5-state visual state for richer animation control */
  visualState?: AgentVisualState;
  isActive: boolean;
  /** Shared ref from useAgentMotion — read in useFrame for zero-overhead updates */
  motionRef: React.RefObject<Map<string, AgentMotionState>>;
  /** Optional activity label shown below name */
  activityLabel?: string;
  /** Optional speech bubble message shown above the agent */
  speechBubble?: string;
}

/* ══════════════════════════════════════════
   MASTER AVATAR — female humanoid Pixar-style
   ══════════════════════════════════════════ */
function MasterAvatar({
  agentId, name, position, status, visualState, isActive, motionRef, activityLabel, speechBubble,
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

  const color = getAgentColor(agentId);
  // Use extended visual state glow if available, fall back to session status
  const glow  = (visualState && VISUAL_STATE_EMISSIVE[visualState]) ?? STATUS_EMISSIVE[status];
  const haloColor = getMasterHalo(agentId);
  const hairColor = getMasterHair(agentId);
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

    // PERFORMANCE: Skip all animation when idle and stationary
    if (status === "idle" && !isMoving) {
      // Only minimal breathing bob every other frame
      if (groupRef.current && motion) {
        groupRef.current.position.x = motion.currentPos[0];
        groupRef.current.position.z = motion.currentPos[2];
        groupRef.current.position.y = motion.currentPos[1] + Math.sin(t * 0.5 + seed) * 0.03;
      }
      // Reset body to neutral pose (one-time convergence)
      if (bodyRef.current) {
        bodyRef.current.rotation.x = 0;
        bodyRef.current.rotation.y = currentFacingAngle;
      }
      // Halo: very slow or stopped
      if (haloRef.current) {
        haloRef.current.rotation.z = t * 0.1;
        haloRef.current.rotation.x = Math.PI / 2;
      }
      return; // Skip arms, legs, head, halo, visor — all frozen
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
        <AgentLabel3D yPos={2.15} name={name} nameColor={color} subColor={haloColor} activityLabel={activityLabel} prefix="★" />
      </group>
    </group>
  );
}

/* ══════════════════════════════════════════
   ROBOT AVATAR — agente genérico mecánico
   ══════════════════════════════════════════ */
function RobotAvatar({
  agentId, name, position, status, visualState, isActive, motionRef, activityLabel, speechBubble,
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
  const glow  = (visualState && VISUAL_STATE_EMISSIVE[visualState]) ?? STATUS_EMISSIVE[status];
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

    // PERFORMANCE: Skip all animation when idle and stationary
    if (status === "idle" && !isMoving) {
      // Only minimal breathing bob every other frame
      if (groupRef.current && motion) {
        groupRef.current.position.x = motion.currentPos[0];
        groupRef.current.position.z = motion.currentPos[2];
        groupRef.current.position.y = motion.currentPos[1] + Math.sin(t * 0.5 + seed) * 0.03;
      }
      // Reset body to neutral pose (one-time convergence)
      if (bodyRef.current) {
        bodyRef.current.rotation.x = 0;
        bodyRef.current.rotation.y = currentFacingAngle;
      }
      return; // Skip arms, legs, head, halo, visor — all frozen
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
        <AgentLabel3D yPos={1.75} name={name} nameColor={color} subColor={color} activityLabel={activityLabel} prefix="●" />
      </group>
    </group>
  );
}

/* ══════════════════════════════════════════
   SAMANTHA AVATAR — high-detail full-body suit
   ══════════════════════════════════════════ */
function SamanthaAvatarDetailed({
  agentId, name, position, status, visualState, isActive, motionRef, activityLabel, speechBubble,
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
  const leftEyeRef  = useRef<Mesh>(null);
  const rightEyeRef = useRef<Mesh>(null);

  const color = getAgentColor(agentId);
  const glow  = (visualState && VISUAL_STATE_EMISSIVE[visualState]) ?? STATUS_EMISSIVE[status];
  const haloColor = getMasterHalo(agentId);
  const hairColor = getMasterHair(agentId);

  // Palette
  const skinColor  = '#fce0c5';        // warmer, brighter skin
  const skinDark   = '#f0cba8';
  const cheekColor = '#ffbdbd';
  const lipColor   = '#c96b7e';        // more natural lip tone
  const eyeWhite   = '#fafafa';
  const irisColor  = '#3d7a6e';       // teal-green eyes for Samantha
  const blazerColor = '#6b1d3a';      // burgundy blazer
  const blazerDark  = '#501428';      // darker burgundy for lapels/shadows
  const shirtColor  = '#f0f0f0';      // white shirt
  const trouserColor = '#5a1830';     // slightly darker burgundy trousers
  const beltColor   = '#1a1a1a';      // black belt
  const buckleColor = '#c0c0c0';      // silver buckle
  const heelColor   = '#6b1d3a';      // burgundy heels
  const tabletColor = '#b0b8c4';      // light metallic tablet

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const seed = position[0] * 2 + position[2] * 0.7;

    if (!groupRef.current || !bodyRef.current) return;

    const motion = motionRef.current?.get(agentId);
    const isMoving = motion?.isMoving ?? false;
    const currentFacingAngle = motion?.facingAngle ?? 0;

    // Position from motion system
    if (motion) {
      const bobSpeed = isMoving ? 6 : status === 'idle' ? 0.8 : 1.3;
      const bobAmount = isMoving ? 0.10 : status === 'idle' ? 0.12 : 0.05;
      groupRef.current.position.x = motion.currentPos[0];
      groupRef.current.position.z = motion.currentPos[2];
      groupRef.current.position.y = motion.currentPos[1] + Math.sin(t * bobSpeed + seed) * bobAmount;
    } else {
      const bobSpeed = status === 'idle' ? 0.8 : 1.3;
      const bobAmount = status === 'idle' ? 0.12 : 0.05;
      groupRef.current.position.y = position[1] + Math.sin(t * bobSpeed + seed) * bobAmount;
    }

    // PERFORMANCE: Skip all animation when idle and stationary
    if (status === "idle" && !isMoving) {
      // Only minimal breathing bob every other frame
      if (groupRef.current && motion) {
        groupRef.current.position.x = motion.currentPos[0];
        groupRef.current.position.z = motion.currentPos[2];
        groupRef.current.position.y = motion.currentPos[1] + Math.sin(t * 0.5 + seed) * 0.03;
      }
      // Reset body to neutral pose (one-time convergence)
      if (bodyRef.current) {
        bodyRef.current.rotation.x = 0;
        bodyRef.current.rotation.y = currentFacingAngle;
      }
      // Halo: very slow or stopped
      if (haloRef.current) {
        haloRef.current.rotation.z = t * 0.1;
        haloRef.current.rotation.x = Math.PI / 2;
      }
      return; // Skip arms, legs, head, halo, visor — all frozen
    }

    // Facing
    bodyRef.current.rotation.y = currentFacingAngle;

    // Body lean
    if (isMoving) {
      bodyRef.current.rotation.x = 0.10;
    } else if (status === 'running') {
      bodyRef.current.rotation.x = 0.12;
    } else if (status === 'idle') {
      bodyRef.current.rotation.x = -0.08;
    } else {
      bodyRef.current.rotation.x = 0;
    }

    // Breathing
    if (torsoRef.current) {
      torsoRef.current.scale.y = 1.0 + Math.sin(t * 1.5 + seed) * 0.012 + 0.012;
    }

    // Head animation
    if (headRef.current) {
      if (isMoving) {
        headRef.current.rotation.y = 0;
        headRef.current.rotation.x = 0;
      } else if (status === 'running') {
        headRef.current.rotation.x = Math.sin(t * 1.5 + seed) * 0.15;
        headRef.current.rotation.y = 0;
      } else if (status === 'waiting') {
        headRef.current.rotation.y = Math.sin(t * 0.5 + seed) * 0.5;
        headRef.current.rotation.x = 0;
      } else {
        headRef.current.rotation.x = 0;
        headRef.current.rotation.y = Math.sin(t * 0.2 + seed) * 0.2;
      }
    }

    // Blink — párpado esfera baja posición Y y crece scaleY para cubrir ojo
    if (leftEyeRef.current && rightEyeRef.current) {
      const blinkCycle = (t + seed) % 3.5;
      const blink = blinkCycle < 0.12;
      const blinkPhase = blink ? blinkCycle / 0.12 : 0;
      const blinkAmount = blink ? Math.sin(blinkPhase * Math.PI) : 0;
      // Párpado baja de y=0.048 a y=0.01 y crece de scaleY 0.20 a 0.70
      leftEyeRef.current.position.y  = 0.048 - blinkAmount * 0.038;
      rightEyeRef.current.position.y = 0.048 - blinkAmount * 0.038;
      leftEyeRef.current.scale.y  = 0.20 + blinkAmount * 0.50;
      rightEyeRef.current.scale.y = 0.20 + blinkAmount * 0.50;
    }

    // Arm animation — left arm holds tablet so less swing
    if (leftArmRef.current && rightArmRef.current) {
      if (isMoving) {
        const walkCycle = Math.sin(t * 6 + seed);
        leftArmRef.current.rotation.x = walkCycle * 0.25;   // tablet arm: less swing
        rightArmRef.current.rotation.x = -walkCycle * 0.5;
        leftArmRef.current.rotation.z = 0;
        rightArmRef.current.rotation.z = 0;
      } else if (status === 'running') {
        leftArmRef.current.rotation.x = -0.35 + Math.sin(t * 2.5 + seed) * 0.1;
        rightArmRef.current.rotation.x = -0.5 + Math.sin(t * 3.2 + seed + 1) * 0.2;
        leftArmRef.current.rotation.z = 0;
        rightArmRef.current.rotation.z = 0;
      } else if (status === 'waiting') {
        const gesture = Math.sin(t * 0.7 + seed);
        leftArmRef.current.rotation.x = -0.2 + Math.sin(t * 0.3 + seed) * 0.08;
        rightArmRef.current.rotation.x = gesture > 0.3 ? -0.7 * ((gesture - 0.3) / 0.7) : 0;
        leftArmRef.current.rotation.z = 0;
        rightArmRef.current.rotation.z = gesture > 0.5 ? 0.3 * ((gesture - 0.5) / 0.5) : 0;
      } else {
        // Idle: subtle secondary motion
        leftArmRef.current.rotation.x = -0.15 + Math.sin(t * 0.3 + seed) * 0.04;
        rightArmRef.current.rotation.x = Math.sin(t * 0.25 + seed + 1) * 0.04;
        leftArmRef.current.rotation.z = 0;
        rightArmRef.current.rotation.z = 0;
      }
    }

    // Leg animation
    if (leftLegRef.current && rightLegRef.current) {
      if (isMoving) {
        const walkCycle = Math.sin(t * 6 + seed);
        leftLegRef.current.rotation.x = -walkCycle * 0.45;
        rightLegRef.current.rotation.x = walkCycle * 0.45;
      } else {
        // Subtle idle sway
        leftLegRef.current.rotation.x = Math.sin(t * 0.2 + seed) * 0.02;
        rightLegRef.current.rotation.x = Math.sin(t * 0.2 + seed + 1) * 0.02;
      }
    }

    // Halo
    if (haloRef.current) {
      const haloSpeed = status === 'idle' ? 0.25 : 0.6;
      haloRef.current.rotation.z = t * haloSpeed;
      haloRef.current.rotation.x = Math.PI / 2 + Math.sin(t * 0.4) * 0.15;
      haloRef.current.position.y = 1.85 + Math.sin(t * 0.8 + seed) * 0.1;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <group ref={bodyRef}>

        {/* ══ TORSO / BLAZER ══ */}
        {/* Main torso — narrower waist, wider shoulders */}
        <mesh ref={torsoRef} position={[0, 0.58, 0]}>
          <cylinderGeometry args={[0.20, 0.26, 0.78, 16]} />
          <meshStandardMaterial color={blazerColor} emissive={glow.color} emissiveIntensity={glow.intensity * 0.3} metalness={0.12} roughness={0.60} />
        </mesh>

        {/* Waist pinch — darker inset to show narrowing */}
        <mesh position={[0, 0.22, 0]}>
          <cylinderGeometry args={[0.18, 0.20, 0.12, 14]} />
          <meshStandardMaterial color={blazerDark} metalness={0.10} roughness={0.55} />
        </mesh>

        {/* Hip widening below waist */}
        <mesh position={[0, 0.14, 0]}>
          <cylinderGeometry args={[0.22, 0.18, 0.10, 14]} />
          <meshStandardMaterial color={trouserColor} metalness={0.08} roughness={0.60} />
        </mesh>

        {/* White shirt V-opening */}
        <mesh position={[0, 0.76, 0.15]}>
          <boxGeometry args={[0.16, 0.32, 0.02]} />
          <meshStandardMaterial color={shirtColor} roughness={0.70} />
        </mesh>

        {/* Shirt collar left */}
        <mesh position={[-0.06, 0.92, 0.15]} rotation={[0, 0, 0.15]}>
          <boxGeometry args={[0.06, 0.08, 0.015]} />
          <meshStandardMaterial color={shirtColor} roughness={0.65} />
        </mesh>
        {/* Shirt collar right */}
        <mesh position={[0.06, 0.92, 0.15]} rotation={[0, 0, -0.15]}>
          <boxGeometry args={[0.06, 0.08, 0.015]} />
          <meshStandardMaterial color={shirtColor} roughness={0.65} />
        </mesh>

        {/* Lapel left */}
        <mesh position={[-0.10, 0.82, 0.155]} rotation={[0, 0, 0.22]}>
          <boxGeometry args={[0.11, 0.26, 0.015]} />
          <meshStandardMaterial color={blazerDark} metalness={0.10} roughness={0.50} />
        </mesh>
        {/* Lapel right */}
        <mesh position={[0.10, 0.82, 0.155]} rotation={[0, 0, -0.22]}>
          <boxGeometry args={[0.11, 0.26, 0.015]} />
          <meshStandardMaterial color={blazerDark} metalness={0.10} roughness={0.50} />
        </mesh>

        {/* Shoulder left */}
        <mesh position={[-0.26, 0.94, 0]} scale={[1.3, 0.55, 0.85]}>
          <sphereGeometry args={[0.12, 12, 12]} />
          <meshStandardMaterial color={blazerColor} emissive={glow.color} emissiveIntensity={glow.intensity * 0.2} metalness={0.12} roughness={0.60} />
        </mesh>
        {/* Shoulder right */}
        <mesh position={[0.26, 0.94, 0]} scale={[1.3, 0.55, 0.85]}>
          <sphereGeometry args={[0.12, 12, 12]} />
          <meshStandardMaterial color={blazerColor} emissive={glow.color} emissiveIntensity={glow.intensity * 0.2} metalness={0.12} roughness={0.60} />
        </mesh>

        {/* ══ BELT ══ */}
        <mesh position={[0, 0.18, 0]}>
          <cylinderGeometry args={[0.205, 0.205, 0.05, 16]} />
          <meshStandardMaterial color={beltColor} metalness={0.30} roughness={0.40} />
        </mesh>
        {/* Belt buckle */}
        <mesh position={[0, 0.18, 0.20]}>
          <boxGeometry args={[0.06, 0.04, 0.015]} />
          <meshStandardMaterial color={buckleColor} metalness={0.85} roughness={0.15} />
        </mesh>

        {/* ══ NECK ══ */}
        <mesh position={[0, 1.04, 0]}>
          <cylinderGeometry args={[0.07, 0.10, 0.14, 10]} />
          <meshStandardMaterial color={skinColor} roughness={0.55} />
        </mesh>

        {/* ══ HEAD ══ */}
        <group ref={headRef} position={[0, 1.32, 0]}>

          {/* Head base */}
          <mesh scale={[1, 0.96, 0.90]}>
            <sphereGeometry args={[0.24, 20, 20]} />
            <meshStandardMaterial color={skinColor} roughness={0.50} />
          </mesh>

          {/* Chin refinement — subtle */}
          <mesh position={[0, -0.16, 0.10]} scale={[0.6, 0.4, 0.5]}>
            <sphereGeometry args={[0.12, 10, 10]} />
            <meshStandardMaterial color={skinColor} roughness={0.55} />
          </mesh>

          {/* Cheek left */}
          <mesh position={[-0.13, -0.03, 0.11]} scale={[1, 0.6, 0.5]}>
            <sphereGeometry args={[0.07, 10, 10]} />
            <meshStandardMaterial color={cheekColor} transparent opacity={0.35} roughness={0.70} />
          </mesh>
          {/* Cheek right */}
          <mesh position={[0.13, -0.03, 0.11]} scale={[1, 0.6, 0.5]}>
            <sphereGeometry args={[0.07, 10, 10]} />
            <meshStandardMaterial color={cheekColor} transparent opacity={0.35} roughness={0.70} />
          </mesh>

          {/* ── EYES ── */}
          {/* Left eye */}
          <group position={[-0.085, 0.04, 0.19]}>
            {/* Blanco del ojo */}
            <mesh>
              <sphereGeometry args={[0.050, 14, 14]} />
              <meshStandardMaterial color={eyeWhite} roughness={0.25} />
            </mesh>
            {/* Iris */}
            <mesh position={[0, 0, 0.032]}>
              <sphereGeometry args={[0.028, 12, 12]} />
              <meshStandardMaterial color={irisColor} roughness={0.35} />
            </mesh>
            {/* Pupila */}
            <mesh position={[0, 0, 0.046]}>
              <sphereGeometry args={[0.013, 8, 8]} />
              <meshStandardMaterial color="#050505" />
            </mesh>
            {/* Reflejo */}
            <mesh position={[0.010, 0.012, 0.050]}>
              <sphereGeometry args={[0.005, 6, 6]} />
              <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.6} />
            </mesh>
            {/* Párpado — esfera aplanada que cubre el ojo desde arriba, color piel */}
            <mesh ref={leftEyeRef} position={[0, 0.048, 0.005]} scale={[1.15, 0.20, 1.05]}>
              <sphereGeometry args={[0.052, 12, 12]} />
              <meshStandardMaterial color={skinColor} roughness={0.50} />
            </mesh>
          </group>

          {/* Right eye */}
          <group position={[0.085, 0.04, 0.19]}>
            <mesh>
              <sphereGeometry args={[0.050, 14, 14]} />
              <meshStandardMaterial color={eyeWhite} roughness={0.25} />
            </mesh>
            <mesh position={[0, 0, 0.032]}>
              <sphereGeometry args={[0.028, 12, 12]} />
              <meshStandardMaterial color={irisColor} roughness={0.35} />
            </mesh>
            <mesh position={[0, 0, 0.046]}>
              <sphereGeometry args={[0.013, 8, 8]} />
              <meshStandardMaterial color="#050505" />
            </mesh>
            <mesh position={[0.010, 0.012, 0.050]}>
              <sphereGeometry args={[0.005, 6, 6]} />
              <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.6} />
            </mesh>
            {/* Párpado */}
            <mesh ref={rightEyeRef} position={[0, 0.048, 0.005]} scale={[1.15, 0.20, 1.05]}>
              <sphereGeometry args={[0.052, 12, 12]} />
              <meshStandardMaterial color={skinColor} roughness={0.50} />
            </mesh>
          </group>

          {/* ── EYEBROWS ── */}
          <mesh position={[-0.085, 0.105, 0.20]} rotation={[0, 0, 0.10]}>
            <boxGeometry args={[0.075, 0.014, 0.01]} />
            <meshStandardMaterial color={hairColor} roughness={0.70} />
          </mesh>
          <mesh position={[0.085, 0.105, 0.20]} rotation={[0, 0, -0.10]}>
            <boxGeometry args={[0.075, 0.014, 0.01]} />
            <meshStandardMaterial color={hairColor} roughness={0.70} />
          </mesh>

          {/* ── EYELASHES ── */}
          {/* Left eye lashes */}
          <mesh position={[-0.115, 0.072, 0.22]} rotation={[0.2, 0.15, 0.5]}>
            <boxGeometry args={[0.022, 0.005, 0.002]} />
            <meshStandardMaterial color="#111111" />
          </mesh>
          <mesh position={[-0.090, 0.076, 0.23]} rotation={[0.15, 0.05, 0.3]}>
            <boxGeometry args={[0.022, 0.005, 0.002]} />
            <meshStandardMaterial color="#111111" />
          </mesh>
          <mesh position={[-0.065, 0.074, 0.23]} rotation={[0.15, -0.05, 0.1]}>
            <boxGeometry args={[0.022, 0.005, 0.002]} />
            <meshStandardMaterial color="#111111" />
          </mesh>
          {/* Right eye lashes */}
          <mesh position={[0.115, 0.072, 0.22]} rotation={[0.2, -0.15, -0.5]}>
            <boxGeometry args={[0.022, 0.005, 0.002]} />
            <meshStandardMaterial color="#111111" />
          </mesh>
          <mesh position={[0.090, 0.076, 0.23]} rotation={[0.15, -0.05, -0.3]}>
            <boxGeometry args={[0.022, 0.005, 0.002]} />
            <meshStandardMaterial color="#111111" />
          </mesh>
          <mesh position={[0.065, 0.074, 0.23]} rotation={[0.15, 0.05, -0.1]}>
            <boxGeometry args={[0.022, 0.005, 0.002]} />
            <meshStandardMaterial color="#111111" />
          </mesh>

          {/* ── NOSE — very small, delicate ── */}
          <mesh position={[0, -0.02, 0.225]} scale={[0.40, 0.45, 0.30]}>
            <sphereGeometry args={[0.022, 8, 8]} />
            <meshStandardMaterial color={skinDark} roughness={0.50} />
          </mesh>

          {/* ── LIPS — subtle, close to face ── */}
          {/* Upper lip (thinner) */}
          <mesh position={[0, -0.085, 0.205]} scale={[1.0, 0.32, 0.30]}>
            <sphereGeometry args={[0.032, 10, 10]} />
            <meshStandardMaterial color={lipColor} roughness={0.42} />
          </mesh>
          {/* Lower lip (slightly fuller) */}
          <mesh position={[0, -0.098, 0.200]} scale={[0.9, 0.38, 0.30]}>
            <sphereGeometry args={[0.032, 10, 10]} />
            <meshStandardMaterial color={lipColor} roughness={0.38} />
          </mesh>

          {/* ══ HAIR — blonde/golden, long wavy, center split ══ */}
          {/* Top crown */}
          <mesh position={[0, 0.12, -0.02]} scale={[1.06, 0.68, 1.04]}>
            <sphereGeometry args={[0.26, 16, 16]} />
            <meshStandardMaterial color={hairColor} roughness={0.65} />
          </mesh>

          {/* Center part line — subtle darker strip */}
          <mesh position={[0, 0.20, 0.10]} rotation={[0.3, 0, 0]}>
            <boxGeometry args={[0.008, 0.14, 0.06]} />
            <meshStandardMaterial color={skinDark} roughness={0.60} />
          </mesh>

          {/* Bangs — split to left and right of center */}
          <mesh position={[-0.08, 0.14, 0.16]} scale={[0.7, 0.35, 0.4]}>
            <sphereGeometry args={[0.18, 12, 12]} />
            <meshStandardMaterial color={hairColor} roughness={0.60} />
          </mesh>
          <mesh position={[0.08, 0.14, 0.16]} scale={[0.7, 0.35, 0.4]}>
            <sphereGeometry args={[0.18, 12, 12]} />
            <meshStandardMaterial color={hairColor} roughness={0.60} />
          </mesh>

          {/* Left side hair — flows to shoulder */}
          <mesh position={[-0.22, -0.06, -0.02]} scale={[0.55, 1.5, 0.60]}>
            <sphereGeometry args={[0.19, 12, 12]} />
            <meshStandardMaterial color={hairColor} roughness={0.65} />
          </mesh>
          {/* Left long strand — past shoulder */}
          <mesh position={[-0.20, -0.38, 0.0]} scale={[0.48, 1.2, 0.50]}>
            <sphereGeometry args={[0.17, 10, 10]} />
            <meshStandardMaterial color={hairColor} roughness={0.68} />
          </mesh>
          {/* Left wave accent */}
          <mesh position={[-0.18, -0.55, 0.04]} scale={[0.40, 0.7, 0.40]}>
            <sphereGeometry args={[0.14, 8, 8]} />
            <meshStandardMaterial color={hairColor} roughness={0.65} />
          </mesh>

          {/* Right side hair */}
          <mesh position={[0.22, -0.06, -0.02]} scale={[0.55, 1.5, 0.60]}>
            <sphereGeometry args={[0.19, 12, 12]} />
            <meshStandardMaterial color={hairColor} roughness={0.65} />
          </mesh>
          {/* Right long strand */}
          <mesh position={[0.20, -0.38, 0.0]} scale={[0.48, 1.2, 0.50]}>
            <sphereGeometry args={[0.17, 10, 10]} />
            <meshStandardMaterial color={hairColor} roughness={0.68} />
          </mesh>
          {/* Right wave accent */}
          <mesh position={[0.18, -0.55, 0.04]} scale={[0.40, 0.7, 0.40]}>
            <sphereGeometry args={[0.14, 8, 8]} />
            <meshStandardMaterial color={hairColor} roughness={0.65} />
          </mesh>

          {/* Back hair volume */}
          <mesh position={[0, -0.02, -0.14]} scale={[1.0, 1.15, 0.70]}>
            <sphereGeometry args={[0.25, 14, 14]} />
            <meshStandardMaterial color={hairColor} roughness={0.68} />
          </mesh>
          {/* Back long fall */}
          <mesh position={[0, -0.32, -0.12]} scale={[0.85, 1.0, 0.55]}>
            <sphereGeometry args={[0.21, 12, 12]} />
            <meshStandardMaterial color={hairColor} roughness={0.70} />
          </mesh>
          {/* Back lower waves */}
          <mesh position={[0, -0.55, -0.08]} scale={[0.70, 0.60, 0.45]}>
            <sphereGeometry args={[0.18, 10, 10]} />
            <meshStandardMaterial color={hairColor} roughness={0.68} />
          </mesh>

          {/* Side wave accents near face */}
          <mesh position={[-0.16, -0.16, 0.08]} scale={[0.38, 0.75, 0.35]}>
            <sphereGeometry args={[0.11, 8, 8]} />
            <meshStandardMaterial color={hairColor} roughness={0.62} />
          </mesh>
          <mesh position={[0.16, -0.16, 0.08]} scale={[0.38, 0.75, 0.35]}>
            <sphereGeometry args={[0.11, 8, 8]} />
            <meshStandardMaterial color={hairColor} roughness={0.62} />
          </mesh>
        </group>

        {/* ══ ARMS ══ */}
        {/* Left arm (holds tablet) */}
        <group position={[-0.34, 0.92, 0]}>
          <mesh ref={leftArmRef} position={[0, -0.30, 0]}>
            <cylinderGeometry args={[0.055, 0.065, 0.56, 10]} />
            <meshStandardMaterial color={blazerColor} emissive={glow.color} emissiveIntensity={glow.intensity * 0.2} metalness={0.12} roughness={0.60} />
          </mesh>
          {/* Left hand */}
          <mesh position={[0, -0.62, 0]}>
            <sphereGeometry args={[0.045, 8, 8]} />
            <meshStandardMaterial color={skinColor} roughness={0.50} />
          </mesh>
          {/* ── TABLET in left hand ── */}
          <mesh position={[-0.02, -0.56, 0.06]} rotation={[0.3, 0.15, 0.1]}>
            <boxGeometry args={[0.14, 0.20, 0.015]} />
            <meshStandardMaterial color={tabletColor} metalness={0.65} roughness={0.25} />
          </mesh>
          {/* Tablet screen */}
          <mesh position={[-0.02, -0.56, 0.069]} rotation={[0.3, 0.15, 0.1]}>
            <boxGeometry args={[0.12, 0.17, 0.002]} />
            <meshStandardMaterial color="#1a2a3a" emissive="#2288aa" emissiveIntensity={0.3} metalness={0.10} roughness={0.10} />
          </mesh>
        </group>
        {/* Right arm */}
        <group position={[0.34, 0.92, 0]}>
          <mesh ref={rightArmRef} position={[0, -0.30, 0]}>
            <cylinderGeometry args={[0.055, 0.065, 0.56, 10]} />
            <meshStandardMaterial color={blazerColor} emissive={glow.color} emissiveIntensity={glow.intensity * 0.2} metalness={0.12} roughness={0.60} />
          </mesh>
          {/* Right hand */}
          <mesh position={[0, -0.62, 0]}>
            <sphereGeometry args={[0.045, 8, 8]} />
            <meshStandardMaterial color={skinColor} roughness={0.50} />
          </mesh>
        </group>

        {/* ══ LEGS — separate trouser geometry ══ */}
        {/* Left leg */}
        <group position={[-0.10, 0.08, 0]}>
          {/* Upper leg */}
          <mesh ref={leftLegRef} position={[0, -0.22, 0]}>
            <cylinderGeometry args={[0.075, 0.060, 0.50, 10]} />
            <meshStandardMaterial color={trouserColor} emissive={glow.color} emissiveIntensity={glow.intensity * 0.15} metalness={0.08} roughness={0.60} />
          </mesh>
          {/* Ankle */}
          <mesh position={[0, -0.50, 0]}>
            <cylinderGeometry args={[0.038, 0.042, 0.08, 8]} />
            <meshStandardMaterial color={skinColor} roughness={0.55} />
          </mesh>
          {/* ── HIGH HEEL — left ── */}
          {/* Shoe upper */}
          <mesh position={[0, -0.55, 0.02]} scale={[1, 0.7, 1.2]}>
            <sphereGeometry args={[0.055, 10, 10]} />
            <meshStandardMaterial color={heelColor} metalness={0.15} roughness={0.45} />
          </mesh>
          {/* Sole */}
          <mesh position={[0, -0.59, 0.02]}>
            <boxGeometry args={[0.08, 0.02, 0.12]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.80} />
          </mesh>
          {/* Heel spike */}
          <mesh position={[0, -0.55, -0.04]} rotation={[0.15, 0, 0]}>
            <cylinderGeometry args={[0.012, 0.018, 0.10, 6]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.30} roughness={0.35} />
          </mesh>
        </group>

        {/* Right leg */}
        <group position={[0.10, 0.08, 0]}>
          {/* Upper leg */}
          <mesh ref={rightLegRef} position={[0, -0.22, 0]}>
            <cylinderGeometry args={[0.075, 0.060, 0.50, 10]} />
            <meshStandardMaterial color={trouserColor} emissive={glow.color} emissiveIntensity={glow.intensity * 0.15} metalness={0.08} roughness={0.60} />
          </mesh>
          {/* Ankle */}
          <mesh position={[0, -0.50, 0]}>
            <cylinderGeometry args={[0.038, 0.042, 0.08, 8]} />
            <meshStandardMaterial color={skinColor} roughness={0.55} />
          </mesh>
          {/* ── HIGH HEEL — right ── */}
          <mesh position={[0, -0.55, 0.02]} scale={[1, 0.7, 1.2]}>
            <sphereGeometry args={[0.055, 10, 10]} />
            <meshStandardMaterial color={heelColor} metalness={0.15} roughness={0.45} />
          </mesh>
          <mesh position={[0, -0.59, 0.02]}>
            <boxGeometry args={[0.08, 0.02, 0.12]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.80} />
          </mesh>
          <mesh position={[0, -0.55, -0.04]} rotation={[0.15, 0, 0]}>
            <cylinderGeometry args={[0.012, 0.018, 0.10, 6]} />
            <meshStandardMaterial color="#1a1a1a" metalness={0.30} roughness={0.35} />
          </mesh>
        </group>

        {/* ══ HALO / FLOATING CROWN ══ */}
        <group ref={haloRef} position={[0, 1.85, 0]}>
          <mesh>
            <torusGeometry args={[0.28, 0.022, 8, 36]} />
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
            <ringGeometry args={[0.34, 0.42, 28]} />
            <meshStandardMaterial color={glow.color} emissive={glow.color} emissiveIntensity={1.4} transparent opacity={0.75} />
          </mesh>
        )}

        {/* Speech bubble */}
        {speechBubble && <SpeechBubble3D message={speechBubble} />}

        {/* Label */}
        <AgentLabel3D yPos={2.20} name={name} nameColor={color} subColor={haloColor} activityLabel={activityLabel} prefix="★" />
      </group>
    </group>
  );
}

/* ══════════════════════════════════════════
   EXPORT PRINCIPAL — elige tipo según ID
   ══════════════════════════════════════════ */
export function Agent3D(props: Agent3DProps) {
  if (isCEO(props.agentId)) {
    return <SamanthaAvatarDetailed {...props} />;
  }
  if (isMaster(props.agentId)) {
    return <MasterAvatar {...props} />;
  }
  return <RobotAvatar {...props} />;
}
