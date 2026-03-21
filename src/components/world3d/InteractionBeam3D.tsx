/**
 * InteractionBeam3D — Glowing pulsing line between two 3D positions.
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';
import { TubeGeometry, CatmullRomCurve3, Vector3 } from 'three';
import type { InteractionType } from '../../types';
import { INTERACTION_COLORS } from '../../types';

interface InteractionBeam3DProps {
  from: [number, number, number];
  to: [number, number, number];
  type: InteractionType;
}

export function InteractionBeam3D({ from, to, type }: InteractionBeam3DProps) {
  const meshRef = useRef<Mesh>(null);
  const color = INTERACTION_COLORS[type];

  const mid: [number, number, number] = [
    (from[0] + to[0]) / 2,
    Math.max(from[1], to[1]) + 1.5,
    (from[2] + to[2]) / 2,
  ];

  const curve = new CatmullRomCurve3([
    new Vector3(...from),
    new Vector3(...mid),
    new Vector3(...to),
  ]);

  const geometry = new TubeGeometry(curve, 20, 0.03, 6, false);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as { opacity: number };
    mat.opacity = 0.5 + Math.sin(clock.getElapsedTime() * 3) * 0.3;
  });

  return (
    <group>
      <mesh ref={meshRef} geometry={geometry}>
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.2}
          transparent
          opacity={0.7}
        />
      </mesh>
      {/* Glow tube */}
      <mesh geometry={new TubeGeometry(curve, 20, 0.08, 6, false)}>
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.4}
          transparent
          opacity={0.12}
        />
      </mesh>
    </group>
  );
}
