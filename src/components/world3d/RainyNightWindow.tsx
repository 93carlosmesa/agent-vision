/**
 * RainyNightWindow — Cinematic rain effect visible through a large window pane.
 *
 * Only renders during night / late_evening time periods.
 * Placed on the back wall of the office as an ambient environmental layer.
 *
 * Technique:
 *   - Transparent dark-blue plane acts as the "window glass"
 *   - Point-based rain streaks fall in front of the glass
 *   - Soft emissive glow simulates city light reflection
 *   - All animation via useFrame (zero re-renders)
 *   - ~80 rain particles — cheap enough to leave running
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { TimeOfDay } from '../../systems/DayNightCycle';

const RAIN_COUNT = 80;
const WINDOW_W = 8;
const WINDOW_H = 2.4;
/** Rain falls from top of window to bottom */
const FALL_MIN = 0.6;
const FALL_MAX = 1.4;

interface RainyNightWindowProps {
  timeOfDay: TimeOfDay;
  /** World position of window center */
  position?: [number, number, number];
}

const NIGHT_TIMES = new Set<TimeOfDay>(['night', 'late_evening']);

export function RainyNightWindow({
  timeOfDay,
  position = [0, 1.9, -20.1],
}: RainyNightWindowProps) {
  const visible = NIGHT_TIMES.has(timeOfDay);

  const rainRef = useRef<THREE.Points>(null);
  const glassRef = useRef<THREE.Mesh>(null);

  /** Per-particle: [xOffset, speed, phase] */
  const particleData = useMemo(() => {
    const d = new Float32Array(RAIN_COUNT * 3);
    for (let i = 0; i < RAIN_COUNT; i++) {
      d[i * 3 + 0] = (Math.random() - 0.5) * WINDOW_W;         // x offset within window
      d[i * 3 + 1] = FALL_MIN + Math.random() * (FALL_MAX - FALL_MIN); // fall speed
      d[i * 3 + 2] = Math.random() * 10;                         // time phase offset
    }
    return d;
  }, []);

  const positions = useMemo(() => {
    const p = new Float32Array(RAIN_COUNT * 3);
    for (let i = 0; i < RAIN_COUNT; i++) {
      p[i * 3 + 0] = particleData[i * 3 + 0];
      p[i * 3 + 1] = Math.random() * WINDOW_H;
      p[i * 3 + 2] = 0.15; // slightly in front of glass
    }
    return p;
  }, [particleData]);

  useFrame(({ clock }) => {
    if (!visible) return;
    const rain = rainRef.current;
    if (!rain) return;

    const posAttr = rain.geometry.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    const t = clock.elapsedTime;

    for (let i = 0; i < RAIN_COUNT; i++) {
      const xBase = particleData[i * 3 + 0];
      const speed = particleData[i * 3 + 1];
      const phase = particleData[i * 3 + 2];

      // Cyclic fall: drops reset to top
      const cycle = WINDOW_H / speed;
      const elapsed = (t + phase) % cycle;
      const y = WINDOW_H - elapsed * speed;

      // Slight horizontal wind drift
      const xDrift = Math.sin(t * 0.3 + phase) * 0.04;

      arr[i * 3 + 0] = xBase + xDrift;
      arr[i * 3 + 1] = y - WINDOW_H / 2; // center around 0
      arr[i * 3 + 2] = 0.15;
    }
    posAttr.needsUpdate = true;

    // Pulse glass glow subtly
    if (glassRef.current) {
      const mat = glassRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.06 + Math.sin(t * 0.4) * 0.02;
    }
  });

  if (!visible) return null;

  return (
    <group position={position} name="rainy-night-window">
      {/* Window glass pane */}
      <mesh ref={glassRef}>
        <planeGeometry args={[WINDOW_W, WINDOW_H]} />
        <meshStandardMaterial
          color="#0a1628"
          emissive="#1a3050"
          emissiveIntensity={0.06}
          transparent
          opacity={0.55}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Window frame */}
      {/* Top bar */}
      <mesh position={[0, WINDOW_H / 2 + 0.05, 0.01]}>
        <boxGeometry args={[WINDOW_W + 0.2, 0.1, 0.06]} />
        <meshStandardMaterial color="#1a1a2a" roughness={0.5} />
      </mesh>
      {/* Bottom bar */}
      <mesh position={[0, -WINDOW_H / 2 - 0.05, 0.01]}>
        <boxGeometry args={[WINDOW_W + 0.2, 0.1, 0.06]} />
        <meshStandardMaterial color="#1a1a2a" roughness={0.5} />
      </mesh>
      {/* Center vertical divider */}
      <mesh position={[0, 0, 0.01]}>
        <boxGeometry args={[0.06, WINDOW_H, 0.06]} />
        <meshStandardMaterial color="#1a1a2a" roughness={0.5} />
      </mesh>

      {/* Rain particles */}
      <points ref={rainRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
            count={RAIN_COUNT}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#6090c0"
          size={0.035}
          sizeAttenuation
          transparent
          opacity={0.5}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Soft ambient light spill from "outside" */}
      <pointLight
        position={[0, 0, 0.5]}
        intensity={0.3}
        color="#2040a0"
        distance={8}
        decay={2}
      />
    </group>
  );
}
