/**
 * DeskPresenceAura — Eternal ambient presence particles above executive desks.
 *
 * Each desk has a signature aura color that floats gently upward, never stopping.
 * This makes the Sala de Dirección feel alive even when agents are idle.
 *
 *   Samantha 🧠 — violet/purple  (#b06cff)
 *   Emma     💻 — warm amber     (#f59e0b)
 *   Ginny    📈 — aquamarine     (#2dd4bf)
 *
 * Design principles:
 *   - Subtle: low opacity, small particles, slow drift
 *   - Organic: each particle has independent random phase + drift
 *   - Zero interaction: pointerEvents none, pure atmosphere
 *   - Cheap: ~20 particles per aura, point geometry, no Html overhead
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  SAMANTHA_DESK_POSITION,
  EMMA_DESK_POSITION,
  GINNY_DESK_POSITION,
} from '../../systems/DeskManager';

/* ─────────────────────────────────────────────── */
/*  Single aura — point-based particle system      */
/* ─────────────────────────────────────────────── */

interface AuraConfig {
  /** Center position of the desk furniture */
  deskPos: [number, number, number];
  /** Base color of the particles */
  color: string;
  /** Hover height above desk surface (desk top ≈ +0.79) */
  baseY?: number;
  /** Spread radius around desk center */
  spread?: number;
  /** Number of particles */
  count?: number;
  /** Unique phase offset so auras don't pulse in sync */
  phaseOffset?: number;
}

function DeskAura({
  deskPos,
  color,
  baseY = 1.1,
  spread = 0.55,
  count = 22,
  phaseOffset = 0,
}: AuraConfig) {
  const pointsRef = useRef<THREE.Points>(null);

  /** Static per-particle data: [x, z, speed, drift-phase, drift-radius] */
  const particleData = useMemo(() => {
    const data: Float32Array = new Float32Array(count * 5);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r     = Math.random() * spread;
      data[i * 5 + 0] = deskPos[0] + Math.cos(angle) * r; // x
      data[i * 5 + 1] = deskPos[2] + Math.sin(angle) * r; // z
      data[i * 5 + 2] = 0.15 + Math.random() * 0.25;       // rise speed
      data[i * 5 + 3] = Math.random() * Math.PI * 2;       // drift phase
      data[i * 5 + 4] = 0.04 + Math.random() * 0.06;       // drift radius
    }
    return data;
  }, [count, spread, deskPos]);

  /** Initial positions buffer — updated per frame */
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 0] = particleData[i * 5 + 0];
      pos[i * 3 + 1] = deskPos[1] + baseY + Math.random() * 0.8;
      pos[i * 3 + 2] = particleData[i * 5 + 1];
    }
    return pos;
  }, [count, deskPos, baseY, particleData]);

  const startTimes = useMemo(() => {
    const t = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      t[i] = Math.random() * 6; // stagger starting time
    }
    return t;
  }, [count]);

  useFrame(({ clock }) => {
    const pts = pointsRef.current;
    if (!pts) return;

    const posAttr = pts.geometry.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    const t = clock.elapsedTime + phaseOffset;

    for (let i = 0; i < count; i++) {
      const baseX   = particleData[i * 5 + 0];
      const baseZ   = particleData[i * 5 + 1];
      const speed   = particleData[i * 5 + 2];
      const phase   = particleData[i * 5 + 3];
      const drift   = particleData[i * 5 + 4];

      // Cyclic Y: rises from baseY to baseY+1.4 over lifecycle, then resets
      const lifespan = 1.4 / speed;       // seconds to rise full height
      const elapsed  = (t + startTimes[i]) % lifespan;
      const progress = elapsed / lifespan;  // 0..1

      arr[i * 3 + 0] = baseX + Math.cos(t * 0.7 + phase) * drift;
      arr[i * 3 + 1] = deskPos[1] + baseY + progress * 1.4;
      arr[i * 3 + 2] = baseZ + Math.sin(t * 0.5 + phase) * drift;
    }

    posAttr.needsUpdate = true;

    // Pulse overall opacity
    const mat = pts.material as THREE.PointsMaterial;
    mat.opacity = 0.28 + Math.sin(t * 0.9 + phaseOffset) * 0.08;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={0.045}
        sizeAttenuation
        transparent
        opacity={0.28}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/* ─────────────────────────────────────────────── */
/*  Soft glow ring on the floor under each desk    */
/* ─────────────────────────────────────────────── */

function FloorGlowRing({
  deskPos,
  color,
  phaseOffset = 0,
}: {
  deskPos: [number, number, number];
  color: string;
  phaseOffset?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = 0.12 + Math.sin(clock.elapsedTime * 1.1 + phaseOffset) * 0.05;
  });

  return (
    <mesh
      ref={meshRef}
      position={[deskPos[0], 0.005, deskPos[2]]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <ringGeometry args={[0.6, 1.1, 32]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.12}
        transparent
        opacity={0.18}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/* ─────────────────────────────────────────────── */
/*  Main export — all three executive auras        */
/* ─────────────────────────────────────────────── */

export function DeskPresenceAura() {
  return (
    <group name="desk-presence-auras">
      {/* Samantha — violet */}
      <DeskAura
        deskPos={SAMANTHA_DESK_POSITION}
        color="#b06cff"
        baseY={1.2}
        spread={0.5}
        count={20}
        phaseOffset={0}
      />
      <FloorGlowRing deskPos={SAMANTHA_DESK_POSITION} color="#b06cff" phaseOffset={0} />

      {/* Emma — warm amber */}
      <DeskAura
        deskPos={EMMA_DESK_POSITION}
        color="#f59e0b"
        baseY={1.1}
        spread={0.48}
        count={18}
        phaseOffset={2.1}
      />
      <FloorGlowRing deskPos={EMMA_DESK_POSITION} color="#f59e0b" phaseOffset={2.1} />

      {/* Ginny — aquamarine */}
      <DeskAura
        deskPos={GINNY_DESK_POSITION}
        color="#2dd4bf"
        baseY={1.1}
        spread={0.48}
        count={18}
        phaseOffset={4.3}
      />
      <FloorGlowRing deskPos={GINNY_DESK_POSITION} color="#2dd4bf" phaseOffset={4.3} />
    </group>
  );
}
