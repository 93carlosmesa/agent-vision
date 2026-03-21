/**
 * OfficeFurniture3D — Realistic office furniture built from Three.js primitives.
 *
 * Zona de Trabajo: desks with laptops, office chairs, desk lamps
 * Zona de Comunicación: whiteboard, potted plants, meeting table
 * Zona Relax: sofas, coffee table, coffee machine
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';

/* ═══════════════════════════════════════════════════════════════════
   ZONA DE TRABAJO — Desks, laptops, chairs, lamps
   ═══════════════════════════════════════════════════════════════════ */

/** Single realistic desk: flat tabletop on 4 thin legs */
function Desk({ position }: { position: [number, number, number] }) {
  const legR = 0.03;
  const legH = 0.7;
  const topW = 1.4;
  const topD = 0.7;
  const topH = 0.05;
  const topY = legH + topH / 2;

  // Leg offsets from center
  const lx = topW / 2 - 0.06;
  const lz = topD / 2 - 0.06;

  return (
    <group position={position}>
      {/* Tabletop */}
      <mesh position={[0, topY, 0]}>
        <boxGeometry args={[topW, topH, topD]} />
        <meshStandardMaterial color="#5c4a3a" roughness={0.7} />
      </mesh>

      {/* 4 legs */}
      {[[-lx, -lz], [lx, -lz], [-lx, lz], [lx, lz]].map(([x, z], i) => (
        <mesh key={i} position={[x, legH / 2, z]}>
          <cylinderGeometry args={[legR, legR, legH, 8]} />
          <meshStandardMaterial color="#3a3a3a" metalness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

/** Laptop: base slab + angled screen with emissive glow */
function Laptop({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Base */}
      <mesh position={[0, 0.01, 0]}>
        <boxGeometry args={[0.35, 0.02, 0.25]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.4} />
      </mesh>
      {/* Screen — angled ~110° from base (20° tilt back) */}
      <mesh position={[0, 0.135, -0.115]} rotation={[-1.22, 0, 0]}>
        <boxGeometry args={[0.35, 0.25, 0.01]} />
        <meshStandardMaterial
          color="#111122"
          emissive="#88bbff"
          emissiveIntensity={0.8}
        />
      </mesh>
    </group>
  );
}

/** Office chair: seat + backrest + central leg + 5 wheel spheres */
function OfficeChair({ position }: { position: [number, number, number] }) {
  const wheelAngles = [0, 1, 2, 3, 4].map(i => (i * Math.PI * 2) / 5);
  return (
    <group position={position}>
      {/* Seat */}
      <mesh position={[0, 0.45, 0]}>
        <boxGeometry args={[0.4, 0.05, 0.4]} />
        <meshStandardMaterial color="#2a2a3e" />
      </mesh>
      {/* Backrest */}
      <mesh position={[0, 0.72, -0.175]}>
        <boxGeometry args={[0.4, 0.5, 0.05]} />
        <meshStandardMaterial color="#2a2a3e" />
      </mesh>
      {/* Central leg */}
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.44, 8]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.7} />
      </mesh>
      {/* 5 wheels */}
      {wheelAngles.map((angle, i) => (
        <mesh
          key={i}
          position={[Math.cos(angle) * 0.18, 0.03, Math.sin(angle) * 0.18]}
        >
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshStandardMaterial color="#222" metalness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

/** Desk lamp with warm point light */
function DeskLamp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Base */}
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 0.04, 12]} />
        <meshStandardMaterial color="#333" metalness={0.6} />
      </mesh>
      {/* Arm */}
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.35, 6]} />
        <meshStandardMaterial color="#555" metalness={0.5} />
      </mesh>
      {/* Shade */}
      <mesh position={[0, 0.38, 0]}>
        <coneGeometry args={[0.08, 0.06, 12, 1, true]} />
        <meshStandardMaterial color="#444" side={2} />
      </mesh>
      {/* Warm light */}
      <pointLight position={[0, 0.35, 0]} intensity={2} color="#ffd699" distance={3} />
    </group>
  );
}

/** All furniture for Zona de Trabajo */
export function TrabajoFurniture() {
  // 6 desk positions matching the old Desks component layout
  const deskPositions: [number, number, number][] = [
    [-7, 0, -1], [-5, 0, -1], [-3, 0, -1],
    [-7, 0, 1.5], [-5, 0, 1.5], [-3, 0, 1.5],
  ];

  return (
    <group>
      {deskPositions.map((pos, i) => {
        const deskTopY = 0.75; // leg height + half tabletop
        return (
          <group key={i}>
            <Desk position={pos} />
            <Laptop position={[pos[0], deskTopY, pos[2]]} />
            <OfficeChair position={[pos[0], 0, pos[2] + 0.6]} />
            <DeskLamp position={[pos[0] + 0.5, deskTopY, pos[2] - 0.2]} />
          </group>
        );
      })}
    </group>
  );
}


/* ═══════════════════════════════════════════════════════════════════
   ZONA DE COMUNICACIÓN — Whiteboard, plants, meeting table
   ═══════════════════════════════════════════════════════════════════ */

/** Whiteboard on legs with dark frame */
function Whiteboard({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Board surface */}
      <mesh position={[0, 1.4, 0]}>
        <boxGeometry args={[2, 1.2, 0.05]} />
        <meshStandardMaterial color="#e8e8e8" roughness={0.3} />
      </mesh>
      {/* Frame — top */}
      <mesh position={[0, 2.01, 0]}>
        <boxGeometry args={[2.06, 0.04, 0.07]} />
        <meshStandardMaterial color="#333" metalness={0.4} />
      </mesh>
      {/* Frame — bottom */}
      <mesh position={[0, 0.79, 0]}>
        <boxGeometry args={[2.06, 0.04, 0.07]} />
        <meshStandardMaterial color="#333" metalness={0.4} />
      </mesh>
      {/* Frame — left */}
      <mesh position={[-1.01, 1.4, 0]}>
        <boxGeometry args={[0.04, 1.24, 0.07]} />
        <meshStandardMaterial color="#333" metalness={0.4} />
      </mesh>
      {/* Frame — right */}
      <mesh position={[1.01, 1.4, 0]}>
        <boxGeometry args={[0.04, 1.24, 0.07]} />
        <meshStandardMaterial color="#333" metalness={0.4} />
      </mesh>
      {/* Left leg */}
      <mesh position={[-0.8, 0.4, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.78, 8]} />
        <meshStandardMaterial color="#333" metalness={0.5} />
      </mesh>
      {/* Right leg */}
      <mesh position={[0.8, 0.4, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.78, 8]} />
        <meshStandardMaterial color="#333" metalness={0.5} />
      </mesh>
    </group>
  );
}

/** Potted plant: cylinder pot + sphere/cone leaf clusters */
function PottedPlant({ position, seed = 0 }: { position: [number, number, number]; seed?: number }) {
  const groupRef = useRef<Group>(null);

  // Gentle sway
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.rotation.z = Math.sin(t * 0.5 + seed) * 0.02;
  });

  return (
    <group position={position} ref={groupRef}>
      {/* Pot */}
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.12, 0.1, 0.24, 12]} />
        <meshStandardMaterial color="#6b4423" roughness={0.8} />
      </mesh>
      {/* Soil */}
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.11, 0.11, 0.02, 12]} />
        <meshStandardMaterial color="#3a2a1a" />
      </mesh>
      {/* Leaf clusters */}
      <mesh position={[0, 0.55, 0]}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshStandardMaterial color="#2d6b30" roughness={0.8} />
      </mesh>
      <mesh position={[0.08, 0.7, 0.05]}>
        <sphereGeometry args={[0.14, 8, 8]} />
        <meshStandardMaterial color="#3a8a3e" roughness={0.8} />
      </mesh>
      <mesh position={[-0.06, 0.65, -0.04]}>
        <coneGeometry args={[0.12, 0.25, 8]} />
        <meshStandardMaterial color="#256b28" roughness={0.8} />
      </mesh>
    </group>
  );
}

/** Meeting table with legs */
function MeetingTable({ position }: { position: [number, number, number] }) {
  const lx = 1.1;
  const lz = 0.5;
  return (
    <group position={position}>
      {/* Tabletop */}
      <mesh position={[0, 0.72, 0]}>
        <boxGeometry args={[2.5, 0.05, 1.2]} />
        <meshStandardMaterial color="#5c4a3a" roughness={0.6} />
      </mesh>
      {/* 4 legs */}
      {[[-lx, -lz], [lx, -lz], [-lx, lz], [lx, lz]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.35, z]}>
          <cylinderGeometry args={[0.035, 0.035, 0.7, 8]} />
          <meshStandardMaterial color="#3a3a3a" metalness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

/** All furniture for Zona de Comunicación */
export function ComunicacionFurniture() {
  return (
    <group>
      <Whiteboard position={[7, 0, -4.5]} />
      <MeetingTable position={[5, 0, -3]} />
      <PottedPlant position={[3.2, 0, -4.5]} seed={0} />
      <PottedPlant position={[3.5, 0, -1.5]} seed={2} />
      <PottedPlant position={[6.8, 0, -1.3]} seed={4} />
    </group>
  );
}


/* ═══════════════════════════════════════════════════════════════════
   ZONA RELAX — Sofas, coffee table, coffee machine
   ═══════════════════════════════════════════════════════════════════ */

/** Low-poly sofa: seat + backrest + 2 armrests */
function Sofa({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Seat cushion */}
      <mesh position={[0, 0.175, 0]}>
        <boxGeometry args={[1.2, 0.35, 0.6]} />
        <meshStandardMaterial color="#2a2a3e" roughness={0.9} />
      </mesh>
      {/* Backrest */}
      <mesh position={[0, 0.55, -0.275]}>
        <boxGeometry args={[1.2, 0.4, 0.1]} />
        <meshStandardMaterial color="#2a2a3e" roughness={0.9} />
      </mesh>
      {/* Left armrest */}
      <mesh position={[-0.55, 0.35, 0]}>
        <boxGeometry args={[0.1, 0.25, 0.6]} />
        <meshStandardMaterial color="#2a2a3e" roughness={0.9} />
      </mesh>
      {/* Right armrest */}
      <mesh position={[0.55, 0.35, 0]}>
        <boxGeometry args={[0.1, 0.25, 0.6]} />
        <meshStandardMaterial color="#2a2a3e" roughness={0.9} />
      </mesh>
    </group>
  );
}

/** Low coffee table */
function CoffeeTable({ position }: { position: [number, number, number] }) {
  const lx = 0.35;
  const lz = 0.2;
  return (
    <group position={position}>
      {/* Top */}
      <mesh position={[0, 0.35, 0]}>
        <boxGeometry args={[0.8, 0.03, 0.5]} />
        <meshStandardMaterial color="#5c4a3a" roughness={0.6} />
      </mesh>
      {/* 4 short legs */}
      {[[-lx, -lz], [lx, -lz], [-lx, lz], [lx, lz]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.17, z]}>
          <cylinderGeometry args={[0.025, 0.025, 0.33, 6]} />
          <meshStandardMaterial color="#3a3a3a" metalness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

/** Coffee machine with a small cup and warm glow */
function CoffeeMachine({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Machine body */}
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[0.3, 0.6, 0.25]} />
        <meshStandardMaterial color="#222" metalness={0.3} roughness={0.6} />
      </mesh>
      {/* Top section */}
      <mesh position={[0, 0.62, 0]}>
        <boxGeometry args={[0.28, 0.04, 0.23]} />
        <meshStandardMaterial color="#333" metalness={0.4} />
      </mesh>
      {/* Small cup */}
      <mesh position={[0.0, 0.08, 0.18]}>
        <cylinderGeometry args={[0.04, 0.035, 0.08, 8]} />
        <meshStandardMaterial color="#ddd" roughness={0.3} />
      </mesh>
      {/* Warm glow indicator */}
      <mesh position={[0, 0.5, 0.13]}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshStandardMaterial color="#ff6600" emissive="#ff6600" emissiveIntensity={2} />
      </mesh>
      <pointLight position={[0, 0.3, 0.2]} intensity={0.5} color="#ff9944" distance={1.5} />
    </group>
  );
}

/** All furniture for Zona Relax */
export function RelaxFurniture() {
  return (
    <group>
      <Sofa position={[4, 0, 4.5]} rotation={0.3} />
      <Sofa position={[6, 0, 5.5]} rotation={-0.5} />
      <Sofa position={[4.5, 0, 6.5]} rotation={0.8} />
      <CoffeeTable position={[5, 0, 5]} />
      <CoffeeMachine position={[7.2, 0, 4]} />
    </group>
  );
}


/* ═══════════════════════════════════════════════════════════════════
   ENVIRONMENT — Glass walls around perimeter
   ═══════════════════════════════════════════════════════════════════ */

/** Translucent glass wall panel */
function GlassWall({ position, size, rotation = 0 }: {
  position: [number, number, number];
  size: [number, number];
  rotation?: number;
}) {
  return (
    <mesh position={position} rotation={[0, rotation, 0]}>
      <boxGeometry args={[size[0], 2.5, 0.06]} />
      <meshStandardMaterial
        color="#aabbcc"
        transparent
        opacity={0.12}
        metalness={0.3}
        roughness={0.1}
      />
    </mesh>
  );
}

/** Glass perimeter walls */
export function GlassPerimeter() {
  return (
    <group>
      {/* Front wall (positive Z) */}
      <GlassWall position={[0, 1.25, 12]} size={[26, 2.5]} />
      {/* Back wall (negative Z) */}
      <GlassWall position={[0, 1.25, -12]} size={[26, 2.5]} />
      {/* Left wall */}
      <GlassWall position={[-13, 1.25, 0]} size={[24, 2.5]} rotation={Math.PI / 2} />
      {/* Right wall */}
      <GlassWall position={[13, 1.25, 0]} size={[24, 2.5]} rotation={Math.PI / 2} />
    </group>
  );
}
