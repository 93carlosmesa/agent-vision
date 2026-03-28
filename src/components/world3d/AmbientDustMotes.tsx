/**
 * AmbientDustMotes — Atmospheric floating dust/light particles.
 *
 * Density and brightness react to the day/night cycle:
 *   - Day: visible dust catching sunlight (warm, brighter)
 *   - Night/evening: faint, sparse, cool-toned
 *
 * Movement is organic: slow drift with subtle sine-wave oscillation.
 * Uses a single Points geometry for all particles — very cheap.
 *
 * ~60 particles total — negligible GPU cost.
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { TimeOfDay } from '../../systems/DayNightCycle';

const MOTE_COUNT = 60;
const SPREAD_X = 28;
const SPREAD_Z = 28;
const HEIGHT_MIN = 0.5;
const HEIGHT_MAX = 3.5;

interface AmbientDustMotesProps {
  timeOfDay: TimeOfDay;
}

/** Visual config per time period */
const DUST_CONFIG: Record<TimeOfDay, { color: string; opacity: number; size: number }> = {
  day:           { color: '#fff8d0', opacity: 0.35, size: 0.06 },
  early_morning: { color: '#ffcc80', opacity: 0.28, size: 0.055 },
  evening:       { color: '#ffa050', opacity: 0.25, size: 0.05 },
  late_evening:  { color: '#6080b0', opacity: 0.15, size: 0.04 },
  night:         { color: '#4060a0', opacity: 0.10, size: 0.035 },
};

export function AmbientDustMotes({ timeOfDay }: AmbientDustMotesProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const currentConfig = DUST_CONFIG[timeOfDay];

  /** Per-particle static data: [baseX, baseY, baseZ, driftSpeed, driftPhase, driftRadius] */
  const particleData = useMemo(() => {
    const d = new Float32Array(MOTE_COUNT * 6);
    for (let i = 0; i < MOTE_COUNT; i++) {
      const off = i * 6;
      d[off + 0] = (Math.random() - 0.5) * SPREAD_X;  // baseX
      d[off + 1] = HEIGHT_MIN + Math.random() * (HEIGHT_MAX - HEIGHT_MIN); // baseY
      d[off + 2] = (Math.random() - 0.5) * SPREAD_Z;  // baseZ
      d[off + 3] = 0.08 + Math.random() * 0.15;        // drift speed
      d[off + 4] = Math.random() * Math.PI * 2;         // phase
      d[off + 5] = 0.3 + Math.random() * 0.6;          // drift radius
    }
    return d;
  }, []);

  const positions = useMemo(() => {
    const p = new Float32Array(MOTE_COUNT * 3);
    for (let i = 0; i < MOTE_COUNT; i++) {
      p[i * 3 + 0] = particleData[i * 6 + 0];
      p[i * 3 + 1] = particleData[i * 6 + 1];
      p[i * 3 + 2] = particleData[i * 6 + 2];
    }
    return p;
  }, [particleData]);

  useFrame(({ clock }) => {
    const pts = pointsRef.current;
    if (!pts) return;

    const posAttr = pts.geometry.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    const t = clock.elapsedTime;

    for (let i = 0; i < MOTE_COUNT; i++) {
      const off = i * 6;
      const bx    = particleData[off + 0];
      const by    = particleData[off + 1];
      const bz    = particleData[off + 2];
      const speed = particleData[off + 3];
      const phase = particleData[off + 4];
      const rad   = particleData[off + 5];

      // Organic 3D drift: slow elliptical motion
      arr[i * 3 + 0] = bx + Math.cos(t * speed + phase) * rad;
      arr[i * 3 + 1] = by + Math.sin(t * speed * 0.7 + phase) * 0.2;
      arr[i * 3 + 2] = bz + Math.sin(t * speed * 0.9 + phase * 1.3) * rad * 0.6;
    }
    posAttr.needsUpdate = true;

    // Smooth opacity/color transitions via material mutation
    const mat = pts.material as THREE.PointsMaterial;
    // Lerp toward target opacity
    mat.opacity += (currentConfig.opacity - mat.opacity) * 0.02;
    mat.size += (currentConfig.size - mat.size) * 0.02;
  });

  return (
    <points ref={pointsRef} name="ambient-dust-motes">
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={MOTE_COUNT}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color={currentConfig.color}
        size={currentConfig.size}
        sizeAttenuation
        transparent
        opacity={currentConfig.opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
