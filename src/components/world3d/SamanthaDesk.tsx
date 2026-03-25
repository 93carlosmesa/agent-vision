/**
 * SamanthaDesk — CEO's permanent personal workstation.
 *
 * Features:
 *  - Violet/purple glowing monitor (emissive, pulsing)
 *  - Subtle halo ring on the floor
 *  - Chair with purple cushion
 *  - Floating particle effect around the monitor
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SAMANTHA_DESK_POSITION } from '../../systems/DeskManager';

/* ── Pulsing violet light ── */
function VioletGlow({ position }: { position: [number, number, number] }) {
  const lightRef = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (lightRef.current) {
      lightRef.current.intensity = 0.8 + Math.sin(clock.elapsedTime * 1.8) * 0.3;
    }
  });
  return (
    <pointLight
      ref={lightRef}
      position={position}
      color="#b06cff"
      intensity={1.1}
      distance={4.5}
    />
  );
}

/* ── Floating particles ── */
function DeskParticles({ origin }: { origin: [number, number, number] }) {
  const count = 18;
  const ref = useRef<THREE.Points>(null);

  const { positions, speeds, offsets } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const spd = new Float32Array(count);
    const off = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const r = 0.5 + Math.random() * 0.4;
      pos[i * 3 + 0] = origin[0] + Math.cos(angle) * r;
      pos[i * 3 + 1] = origin[1] + 0.9 + Math.random() * 0.8;
      pos[i * 3 + 2] = origin[2] + Math.sin(angle) * r * 0.4;
      spd[i] = 0.3 + Math.random() * 0.5;
      off[i] = Math.random() * Math.PI * 2;
    }
    return { positions: pos, speeds: spd, offsets: off };
  }, [origin]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    const arr = (ref.current.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + t * speeds[i] * 0.4;
      const r = 0.5 + 0.15 * Math.sin(t * speeds[i] + offsets[i]);
      arr[i * 3 + 0] = origin[0] + Math.cos(angle) * r;
      arr[i * 3 + 1] = origin[1] + 0.85 + 0.3 * Math.abs(Math.sin(t * speeds[i] * 1.1 + offsets[i]));
      arr[i * 3 + 2] = origin[2] + Math.sin(angle) * r * 0.35;
    }
    (ref.current.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  });

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return g;
  }, [positions]);

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial
        color="#c084fc"
        size={0.045}
        sizeAttenuation
        transparent
        opacity={0.75}
        depthWrite={false}
      />
    </points>
  );
}


/* ── Violet monitor ── */
function VioletMonitor({ position }: { position: [number, number, number] }) {
  const screenRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (screenRef.current) {
      (screenRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        0.65 + Math.sin(clock.elapsedTime * 2.2) * 0.2;
    }
  });

  const [x, y, z] = position;
  // The desk surface is at y+0.79 (desk top at 0.74 + 0.05 half-thickness)
  // monitor stand base sits on desk surface
  const baseY = y + 0.79;

  return (
    <group position={[x, baseY, z - 0.05]}>
      {/* Stand cylinder */}
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.07, 0.1, 0.16, 12]} />
        <meshStandardMaterial color="#6d28d9" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Screen body */}
      <mesh position={[0, 0.31, -0.02]}>
        <boxGeometry args={[0.52, 0.34, 0.022]} />
        <meshStandardMaterial color="#1a0a2e" metalness={0.4} roughness={0.4} />
      </mesh>
      {/* Screen face — glowing violet */}
      <mesh ref={screenRef} position={[0, 0.31, -0.008]}>
        <planeGeometry args={[0.46, 0.28]} />
        <meshStandardMaterial
          color="#3b0764"
          emissive="#a855f7"
          emissiveIntensity={0.7}
          transparent
          opacity={1}
        />
      </mesh>
      {/* Subtle top logo stripe */}
      <mesh position={[0, 0.47, -0.02]}>
        <planeGeometry args={[0.12, 0.025]} />
        <meshStandardMaterial
          color="#c084fc"
          emissive="#c084fc"
          emissiveIntensity={0.9}
          transparent
          opacity={0.85}
        />
      </mesh>
    </group>
  );
}

/* ── CEO Chair ── */
function CEOChair({ position }: { position: [number, number, number] }) {
  const [x, y, z] = position;
  return (
    <group position={[x, y, z + 0.1]}>
      {/* Seat */}
      <mesh position={[0, 0.44, 0]} castShadow>
        <boxGeometry args={[0.44, 0.07, 0.42]} />
        <meshStandardMaterial color="#4c1d95" roughness={0.7} />
      </mesh>
      {/* Back */}
      <mesh position={[0, 0.76, 0.17]} castShadow>
        <boxGeometry args={[0.42, 0.56, 0.06]} />
        <meshStandardMaterial color="#5b21b6" roughness={0.65} />
      </mesh>
      {/* Armrests */}
      {([-0.23, 0.23] as number[]).map((xOff, i) => (
        <mesh key={i} position={[xOff, 0.54, 0.05]}>
          <boxGeometry args={[0.04, 0.04, 0.3]} />
          <meshStandardMaterial color="#3b0764" metalness={0.3} roughness={0.5} />
        </mesh>
      ))}
      {/* Base cylinder */}
      <mesh position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.32, 8]} />
        <meshStandardMaterial color="#1e1b4b" metalness={0.5} roughness={0.3} />
      </mesh>
      {/* 5-star base */}
      {Array.from({ length: 5 }, (_, i) => {
        const a = (i / 5) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.22, 0.02, Math.sin(a) * 0.22]} rotation={[0, a, 0]}>
            <boxGeometry args={[0.42, 0.025, 0.04]} />
            <meshStandardMaterial color="#1e1b4b" metalness={0.5} roughness={0.3} />
          </mesh>
        );
      })}
    </group>
  );
}

/* ── Walnut desk with violet edge trim ── */
function SamanthaDeskTop({ position }: { position: [number, number, number] }) {
  const [x, y, z] = position;
  const w = 1.5;
  return (
    <group position={[x, y, z]}>
      {/* Desk surface */}
      <mesh position={[0, 0.74, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, 0.05, 0.72]} />
        <meshStandardMaterial color="#3b1f0a" roughness={0.55} />
      </mesh>
      {/* Violet edge glow strip */}
      <mesh position={[0, 0.76, -0.35]}>
        <boxGeometry args={[w, 0.012, 0.015]} />
        <meshStandardMaterial color="#a855f7" emissive="#c084fc" emissiveIntensity={0.9} />
      </mesh>
      {/* Metal legs */}
      {[[-w / 2 + 0.09, -0.28], [w / 2 - 0.09, -0.28], [-w / 2 + 0.09, 0.28], [w / 2 - 0.09, 0.28]].map(([lx, lz], i) => (
        <mesh key={i} position={[lx, 0.35, lz]}>
          <boxGeometry args={[0.04, 0.7, 0.04]} />
          <meshStandardMaterial color="#2e1065" metalness={0.6} roughness={0.3} />
        </mesh>
      ))}
      {/* Keyboard */}
      <mesh position={[0, 0.775, 0.05]}>
        <boxGeometry args={[0.38, 0.012, 0.14]} />
        <meshStandardMaterial color="#1e1b4b" metalness={0.4} roughness={0.4} />
      </mesh>
    </group>
  );
}

/* ── Main export ── */
export function SamanthaDesk() {
  const pos = SAMANTHA_DESK_POSITION;

  return (
    <group>
      {/* Desk + monitor */}
      <SamanthaDeskTop position={pos} />
      <VioletMonitor position={[pos[0], pos[1], pos[2] - 0.27]} />

      {/* CEO chair — further back so avatar fits seated between chair and desk */}
      <CEOChair position={[pos[0], pos[1], pos[2] + 1.1]} />

      {/* Particles */}
      <DeskParticles origin={[pos[0], pos[1], pos[2] - 0.27]} />

      {/* Dynamic glow light */}
      <VioletGlow position={[pos[0], pos[1] + 1.4, pos[2] - 0.27]} />
    </group>
  );
}
