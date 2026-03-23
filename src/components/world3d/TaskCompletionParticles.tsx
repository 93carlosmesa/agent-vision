/**
 * TaskCompletionParticles — celebratory burst when an agent transitions
 * from 'running' → 'waiting' or 'idle'.
 *
 * Design goals:
 *  - Lightweight: max 30 particles per burst, ref-driven (no re-renders)
 *  - Glowing spheres fly outward from agent position, fade out in 0.5–1.5s
 *  - Color matches the agent's configured color
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const PARTICLE_COUNT = 28;
const LIFETIME_MIN = 0.5;
const LIFETIME_MAX = 1.5;
const SPEED_MIN = 2.0;
const SPEED_MAX = 5.5;

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  lifetime: number;   // total lifetime in seconds
  age: number;        // elapsed seconds
  active: boolean;
}

interface TaskCompletionParticlesProps {
  position: [number, number, number];
  color: string;
}

function makeParticles(origin: THREE.Vector3): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, () => {
    // Random hemisphere (mostly upward burst)
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI * 0.85; // 0..153° → hemisphere + slight downward
    const speed = SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN);
    const vx = Math.sin(phi) * Math.cos(theta) * speed;
    const vy = Math.abs(Math.cos(phi)) * speed + 0.5; // slight upward bias
    const vz = Math.sin(phi) * Math.sin(theta) * speed;

    return {
      position: origin.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.2,
        0.5 + Math.random() * 0.3,
        (Math.random() - 0.5) * 0.2,
      )),
      velocity: new THREE.Vector3(vx, vy, vz),
      lifetime: LIFETIME_MIN + Math.random() * (LIFETIME_MAX - LIFETIME_MIN),
      age: 0,
      active: true,
    };
  });
}

export function TaskCompletionParticles({ position, color }: TaskCompletionParticlesProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const originVec = useMemo(
    () => new THREE.Vector3(position[0], position[1], position[2]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const colorObj = useMemo(() => new THREE.Color(color), [color]);

  // Initialize particles once on mount
  useMemo(() => {
    particlesRef.current = makeParticles(originVec);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_state, delta) => {
    const particles = particlesRef.current;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const mesh = meshRefs.current[i];
      if (!mesh) continue;

      if (!p.active) {
        mesh.visible = false;
        continue;
      }

      p.age += delta;

      if (p.age >= p.lifetime) {
        p.active = false;
        mesh.visible = false;
        continue;
      }

      // Progress 0→1
      const t = p.age / p.lifetime;

      // Apply gravity
      p.velocity.y -= 4.5 * delta;

      // Move particle
      p.position.x += p.velocity.x * delta;
      p.position.y += p.velocity.y * delta;
      p.position.z += p.velocity.z * delta;

      mesh.position.copy(p.position);

      // Fade out (ease-in)
      const opacity = 1.0 - t * t;
      // Scale: pop up then shrink
      const scale = (1.0 - t) * 0.18 + 0.02;
      mesh.scale.setScalar(scale);

      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.opacity = opacity;
      mat.emissiveIntensity = (1.0 - t) * 2.5;
    }
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: PARTICLE_COUNT }, (_, i) => (
        <mesh
          key={i}
          ref={(el) => { meshRefs.current[i] = el; }}
          position={[position[0], position[1] + 0.5, position[2]]}
        >
          <sphereGeometry args={[1, 6, 6]} />
          <meshStandardMaterial
            color={colorObj}
            emissive={colorObj}
            emissiveIntensity={2.5}
            transparent
            opacity={1}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}
