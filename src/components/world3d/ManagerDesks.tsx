/**
 * ManagerDesks — Personal workstations for Emma & Ginny.
 *
 * Each desk has a unique color scheme matching their agent identity:
 *   - Emma (💻): warm amber/orange — practical, grounded
 *   - Ginny (📈): teal/emerald — analytical, deep
 *
 * Positioned in the Work Hub (sala de trabajo) at fixed locations
 * so they always have their own spot alongside the squad.
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/* ── Shared desk builder ── */

interface ManagerDeskConfig {
  position: [number, number, number];
  /** Avatar sits here (chair position, z offset from desk) */
  chairOffset: number;
  /** Primary color for accents, chair, glow */
  primary: string;
  /** Darker shade for desk edge glow, legs */
  dark: string;
  /** Emissive monitor color */
  emissive: string;
  /** Glow light color */
  glowColor: string;
  /** Label on the monitor top */
  label: string;
}

function ManagerDeskUnit({ config }: { config: ManagerDeskConfig }) {
  const { position, primary, dark, emissive, glowColor } = config;
  const [x, y, z] = position;

  const screenRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (screenRef.current) {
      (screenRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        0.55 + Math.sin(t * 2.0) * 0.15;
    }
    if (lightRef.current) {
      lightRef.current.intensity = 0.6 + Math.sin(t * 1.6) * 0.2;
    }
  });

  const deskW = 1.4;
  const baseY = y + 0.79; // desk surface top

  return (
    <group>
      {/* ── Desk surface ── */}
      <mesh position={[x, y + 0.74, z]} castShadow receiveShadow>
        <boxGeometry args={[deskW, 0.05, 0.68]} />
        <meshStandardMaterial color="#2a1a08" roughness={0.55} />
      </mesh>

      {/* Colored edge glow strip (front) */}
      <mesh position={[x, y + 0.76, z - 0.33]}>
        <boxGeometry args={[deskW, 0.012, 0.015]} />
        <meshStandardMaterial color={primary} emissive={emissive} emissiveIntensity={0.8} />
      </mesh>

      {/* Metal legs */}
      {[
        [-deskW / 2 + 0.08, -0.26],
        [deskW / 2 - 0.08, -0.26],
        [-deskW / 2 + 0.08, 0.26],
        [deskW / 2 - 0.08, 0.26],
      ].map(([lx, lz], i) => (
        <mesh key={i} position={[x + lx, y + 0.35, z + lz]}>
          <boxGeometry args={[0.04, 0.7, 0.04]} />
          <meshStandardMaterial color={dark} metalness={0.6} roughness={0.3} />
        </mesh>
      ))}

      {/* Keyboard */}
      <mesh position={[x, y + 0.775, z + 0.04]}>
        <boxGeometry args={[0.34, 0.012, 0.13]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.4} roughness={0.4} />
      </mesh>

      {/* ── Monitor ── */}
      <group position={[x, baseY, z - 0.27]}>
        {/* Stand */}
        <mesh position={[0, 0.07, 0]}>
          <cylinderGeometry args={[0.06, 0.09, 0.14, 10]} />
          <meshStandardMaterial color={dark} metalness={0.6} roughness={0.3} />
        </mesh>
        {/* Screen body */}
        <mesh position={[0, 0.28, -0.02]}>
          <boxGeometry args={[0.48, 0.30, 0.02]} />
          <meshStandardMaterial color="#0f0f1a" metalness={0.4} roughness={0.4} />
        </mesh>
        {/* Screen face — glowing */}
        <mesh ref={screenRef} position={[0, 0.28, -0.008]}>
          <planeGeometry args={[0.42, 0.24]} />
          <meshStandardMaterial
            color={dark}
            emissive={emissive}
            emissiveIntensity={0.6}
            transparent
            opacity={1}
          />
        </mesh>
        {/* Top logo stripe */}
        <mesh position={[0, 0.42, -0.02]}>
          <planeGeometry args={[0.10, 0.022]} />
          <meshStandardMaterial
            color={primary}
            emissive={primary}
            emissiveIntensity={0.85}
            transparent
            opacity={0.8}
          />
        </mesh>
      </group>

      {/* ── Chair ── */}
      <group position={[x, y, z + config.chairOffset]}>
        {/* Seat */}
        <mesh position={[0, 0.43, 0]} castShadow>
          <boxGeometry args={[0.42, 0.06, 0.40]} />
          <meshStandardMaterial color={primary} roughness={0.7} />
        </mesh>
        {/* Back */}
        <mesh position={[0, 0.72, 0.16]} castShadow>
          <boxGeometry args={[0.40, 0.50, 0.055]} />
          <meshStandardMaterial color={primary} roughness={0.65} />
        </mesh>
        {/* Armrests */}
        {([-0.22, 0.22] as number[]).map((xOff, i) => (
          <mesh key={i} position={[xOff, 0.52, 0.04]}>
            <boxGeometry args={[0.035, 0.035, 0.28]} />
            <meshStandardMaterial color={dark} metalness={0.3} roughness={0.5} />
          </mesh>
        ))}
        {/* Base cylinder */}
        <mesh position={[0, 0.15, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.30, 8]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.5} roughness={0.3} />
        </mesh>
        {/* 5-star base */}
        {Array.from({ length: 5 }, (_, i) => {
          const a = (i / 5) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.20, 0.02, Math.sin(a) * 0.20]} rotation={[0, a, 0]}>
              <boxGeometry args={[0.38, 0.022, 0.035]} />
              <meshStandardMaterial color="#1a1a1a" metalness={0.5} roughness={0.3} />
            </mesh>
          );
        })}
      </group>

      {/* ── Subtle glow ── */}
      <pointLight
        ref={lightRef}
        position={[x, y + 1.3, z - 0.27]}
        color={glowColor}
        intensity={0.7}
        distance={3.5}
      />
    </group>
  );
}

/* ── Fixed positions in Work Hub ── */

// Emma's desk: left side of trabajo, front row — near the squad she manages
export const EMMA_DESK_POS: [number, number, number] = [-16, 0, -6];
export const EMMA_AVATAR_POS: [number, number, number] = [-16, 0, -4.9];

// Ginny's desk: right side of trabajo, front row — near the edge for focus
export const GINNY_DESK_POS: [number, number, number] = [8, 0, -6];
export const GINNY_AVATAR_POS: [number, number, number] = [8, 0, -4.9];

const EMMA_CONFIG: ManagerDeskConfig = {
  position: EMMA_DESK_POS,
  chairOffset: 1.1,
  primary: '#c2610a',    // warm amber
  dark: '#7c3d00',       // deep amber
  emissive: '#ff9f43',   // orange glow
  glowColor: '#ff9f43',
  label: 'EMMA',
};

const GINNY_CONFIG: ManagerDeskConfig = {
  position: GINNY_DESK_POS,
  chairOffset: 1.1,
  primary: '#0d7377',    // deep teal
  dark: '#064e52',       // dark teal
  emissive: '#53e3c2',   // emerald glow
  glowColor: '#53e3c2',
  label: 'GINNY',
};

/* ── Main export ── */
export function ManagerDesks() {
  return (
    <group>
      <ManagerDeskUnit config={EMMA_CONFIG} />
      <ManagerDeskUnit config={GINNY_CONFIG} />
    </group>
  );
}
