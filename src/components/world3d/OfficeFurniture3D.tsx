/**
 * OfficeFurniture3D — Realistic office furniture organized by room.
 *
 * Rooms: Lobby, Sala de Descanso, Sala de Comunicación, Sala de Trabajo, Biblioteca
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';

/* ═══════════════════════════════════════════════════════════════════
   SHARED PRIMITIVES
   ═══════════════════════════════════════════════════════════════════ */

function Desk({ position }: { position: [number, number, number] }) {
  const legR = 0.03;
  const legH = 0.7;
  const topW = 1.4;
  const topD = 0.7;
  const topH = 0.05;
  const topY = legH + topH / 2;
  const lx = topW / 2 - 0.06;
  const lz = topD / 2 - 0.06;

  return (
    <group position={position}>
      <mesh position={[0, topY, 0]}>
        <boxGeometry args={[topW, topH, topD]} />
        <meshStandardMaterial color="#5c4a3a" roughness={0.7} />
      </mesh>
      {[[-lx, -lz], [lx, -lz], [-lx, lz], [lx, lz]].map(([x, z], i) => (
        <mesh key={i} position={[x, legH / 2, z]}>
          <cylinderGeometry args={[legR, legR, legH, 8]} />
          <meshStandardMaterial color="#3a3a3a" metalness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function Laptop({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.01, 0]}>
        <boxGeometry args={[0.35, 0.02, 0.25]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.135, -0.115]} rotation={[-1.22, 0, 0]}>
        <boxGeometry args={[0.35, 0.25, 0.01]} />
        <meshStandardMaterial color="#111122" emissive="#88bbff" emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
}

function OfficeChair({ position }: { position: [number, number, number] }) {
  const wheelAngles = [0, 1, 2, 3, 4].map(i => (i * Math.PI * 2) / 5);
  return (
    <group position={position}>
      <mesh position={[0, 0.45, 0]}>
        <boxGeometry args={[0.4, 0.05, 0.4]} />
        <meshStandardMaterial color="#2a2a3e" />
      </mesh>
      <mesh position={[0, 0.72, -0.175]}>
        <boxGeometry args={[0.4, 0.5, 0.05]} />
        <meshStandardMaterial color="#2a2a3e" />
      </mesh>
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.44, 8]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.7} />
      </mesh>
      {wheelAngles.map((angle, i) => (
        <mesh key={i} position={[Math.cos(angle) * 0.18, 0.03, Math.sin(angle) * 0.18]}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshStandardMaterial color="#222" metalness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function DeskLamp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 0.04, 12]} />
        <meshStandardMaterial color="#333" metalness={0.6} />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.35, 6]} />
        <meshStandardMaterial color="#555" metalness={0.5} />
      </mesh>
      <mesh position={[0, 0.38, 0]}>
        <coneGeometry args={[0.08, 0.06, 12, 1, true]} />
        <meshStandardMaterial color="#444" side={2} />
      </mesh>
      <pointLight position={[0, 0.35, 0]} intensity={2} color="#ffd699" distance={3} />
    </group>
  );
}

function Sofa({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.175, 0]}>
        <boxGeometry args={[1.2, 0.35, 0.6]} />
        <meshStandardMaterial color="#2a2a3e" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.55, -0.275]}>
        <boxGeometry args={[1.2, 0.4, 0.1]} />
        <meshStandardMaterial color="#2a2a3e" roughness={0.9} />
      </mesh>
      <mesh position={[-0.55, 0.35, 0]}>
        <boxGeometry args={[0.1, 0.25, 0.6]} />
        <meshStandardMaterial color="#2a2a3e" roughness={0.9} />
      </mesh>
      <mesh position={[0.55, 0.35, 0]}>
        <boxGeometry args={[0.1, 0.25, 0.6]} />
        <meshStandardMaterial color="#2a2a3e" roughness={0.9} />
      </mesh>
    </group>
  );
}

function CoffeeTable({ position }: { position: [number, number, number] }) {
  const lx = 0.35;
  const lz = 0.2;
  return (
    <group position={position}>
      <mesh position={[0, 0.35, 0]}>
        <boxGeometry args={[0.8, 0.03, 0.5]} />
        <meshStandardMaterial color="#5c4a3a" roughness={0.6} />
      </mesh>
      {[[-lx, -lz], [lx, -lz], [-lx, lz], [lx, lz]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.17, z]}>
          <cylinderGeometry args={[0.025, 0.025, 0.33, 6]} />
          <meshStandardMaterial color="#3a3a3a" metalness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function CoffeeMachine({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[0.3, 0.6, 0.25]} />
        <meshStandardMaterial color="#222" metalness={0.3} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.62, 0]}>
        <boxGeometry args={[0.28, 0.04, 0.23]} />
        <meshStandardMaterial color="#333" metalness={0.4} />
      </mesh>
      <mesh position={[0.0, 0.08, 0.18]}>
        <cylinderGeometry args={[0.04, 0.035, 0.08, 8]} />
        <meshStandardMaterial color="#ddd" roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.5, 0.13]}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshStandardMaterial color="#ff6600" emissive="#ff6600" emissiveIntensity={2} />
      </mesh>
      <pointLight position={[0, 0.3, 0.2]} intensity={0.5} color="#ff9944" distance={1.5} />
    </group>
  );
}

function PottedPlant({ position, seed = 0 }: { position: [number, number, number]; seed?: number }) {
  const groupRef = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.rotation.z = Math.sin(t * 0.5 + seed) * 0.02;
  });

  return (
    <group position={position} ref={groupRef}>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.12, 0.1, 0.24, 12]} />
        <meshStandardMaterial color="#6b4423" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.11, 0.11, 0.02, 12]} />
        <meshStandardMaterial color="#3a2a1a" />
      </mesh>
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

function Whiteboard({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.4, 0]}>
        <boxGeometry args={[2, 1.2, 0.05]} />
        <meshStandardMaterial color="#e8e8e8" roughness={0.3} />
      </mesh>
      <mesh position={[0, 2.01, 0]}><boxGeometry args={[2.06, 0.04, 0.07]} /><meshStandardMaterial color="#333" metalness={0.4} /></mesh>
      <mesh position={[0, 0.79, 0]}><boxGeometry args={[2.06, 0.04, 0.07]} /><meshStandardMaterial color="#333" metalness={0.4} /></mesh>
      <mesh position={[-1.01, 1.4, 0]}><boxGeometry args={[0.04, 1.24, 0.07]} /><meshStandardMaterial color="#333" metalness={0.4} /></mesh>
      <mesh position={[1.01, 1.4, 0]}><boxGeometry args={[0.04, 1.24, 0.07]} /><meshStandardMaterial color="#333" metalness={0.4} /></mesh>
      <mesh position={[-0.8, 0.4, 0]}><cylinderGeometry args={[0.025, 0.025, 0.78, 8]} /><meshStandardMaterial color="#333" metalness={0.5} /></mesh>
      <mesh position={[0.8, 0.4, 0]}><cylinderGeometry args={[0.025, 0.025, 0.78, 8]} /><meshStandardMaterial color="#333" metalness={0.5} /></mesh>
    </group>
  );
}

function MeetingTable({ position }: { position: [number, number, number] }) {
  const lx = 1.1;
  const lz = 0.5;
  return (
    <group position={position}>
      <mesh position={[0, 0.72, 0]}>
        <boxGeometry args={[2.5, 0.05, 1.2]} />
        <meshStandardMaterial color="#5c4a3a" roughness={0.6} />
      </mesh>
      {[[-lx, -lz], [lx, -lz], [-lx, lz], [lx, lz]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.35, z]}>
          <cylinderGeometry args={[0.035, 0.035, 0.7, 8]} />
          <meshStandardMaterial color="#3a3a3a" metalness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

/** Small reception desk */
function ReceptionDesk({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Main counter — curved-front approximation with box */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[2.5, 1, 0.8]} />
        <meshStandardMaterial color="#4a3a2e" roughness={0.7} />
      </mesh>
      {/* Top surface (lighter) */}
      <mesh position={[0, 1.01, 0]}>
        <boxGeometry args={[2.6, 0.04, 0.85]} />
        <meshStandardMaterial color="#6b5a4a" roughness={0.5} />
      </mesh>
    </group>
  );
}

/** Bench / waiting chair for lobby */
function WaitingBench({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[1.8, 0.06, 0.5]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.3} />
      </mesh>
      {/* 4 legs */}
      {[[-0.8, -0.2], [0.8, -0.2], [-0.8, 0.2], [0.8, 0.2]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.14, z]}>
          <cylinderGeometry args={[0.025, 0.025, 0.27, 8]} />
          <meshStandardMaterial color="#333" metalness={0.5} />
        </mesh>
      ))}
      {/* Backrest */}
      <mesh position={[0, 0.55, -0.22]}>
        <boxGeometry args={[1.8, 0.35, 0.04]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.3} />
      </mesh>
    </group>
  );
}

/** Tall bookshelf for Biblioteca */
function TallBookshelf({ position, width = 3 }: { position: [number, number, number]; width?: number }) {
  const shelves = 4;
  const shelfH = 2.2;
  return (
    <group position={position}>
      {/* Side panels */}
      <mesh position={[-width / 2, shelfH / 2, 0]}>
        <boxGeometry args={[0.04, shelfH, 0.4]} />
        <meshStandardMaterial color="#4a3a2e" roughness={0.8} />
      </mesh>
      <mesh position={[width / 2, shelfH / 2, 0]}>
        <boxGeometry args={[0.04, shelfH, 0.4]} />
        <meshStandardMaterial color="#4a3a2e" roughness={0.8} />
      </mesh>
      {/* Back panel */}
      <mesh position={[0, shelfH / 2, -0.18]}>
        <boxGeometry args={[width, shelfH, 0.03]} />
        <meshStandardMaterial color="#3a2a1e" roughness={0.9} />
      </mesh>
      {/* Shelf planks */}
      {Array.from({ length: shelves + 1 }).map((_, i) => (
        <mesh key={i} position={[0, (i * shelfH) / shelves, 0]}>
          <boxGeometry args={[width, 0.04, 0.4]} />
          <meshStandardMaterial color="#5a4a3e" roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

/** Small reading/study table */
function ReadingTable({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.65, 0]}>
        <boxGeometry args={[1.2, 0.04, 0.8]} />
        <meshStandardMaterial color="#5c4a3a" roughness={0.7} />
      </mesh>
      {[[-0.5, -0.3], [0.5, -0.3], [-0.5, 0.3], [0.5, 0.3]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.32, z]}>
          <cylinderGeometry args={[0.025, 0.025, 0.63, 8]} />
          <meshStandardMaterial color="#3a3a3a" metalness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ROOM FURNITURE GROUPS
   ═══════════════════════════════════════════════════════════════════ */

/** Lobby: reception desk + waiting benches */
export function LobbyFurniture() {
  return (
    <group>
      <ReceptionDesk position={[0, 0, 12.5]} />
      <WaitingBench position={[-6, 0, 12]} rotation={0} />
      <WaitingBench position={[6, 0, 12]} rotation={0} />
      <WaitingBench position={[-12, 0, 12.5]} rotation={Math.PI / 6} />
      <WaitingBench position={[12, 0, 12.5]} rotation={-Math.PI / 6} />
    </group>
  );
}

/** Sala de Descanso: sofas, coffee table, coffee machine */
export function DescansoFurniture() {
  return (
    <group>
      {/* L-shaped sofa arrangement */}
      <Sofa position={[-13, 0, 5.5]} rotation={Math.PI / 2} />
      <Sofa position={[-13, 0, 7.5]} rotation={Math.PI / 2} />
      <Sofa position={[-10.5, 0, 8.5]} rotation={0} />
      <CoffeeTable position={[-10.5, 0, 6]} />
      <CoffeeMachine position={[-5, 0, 8.5]} />
      <PottedPlant position={[-3, 0, 5]} seed={1} />
      <PottedPlant position={[-16, 0, 8.5]} seed={3} />
    </group>
  );
}

/** Sala de Comunicación: meeting table, whiteboard, plants */
export function ComunicacionFurniture() {
  return (
    <group>
      <MeetingTable position={[10, 0, 6.5]} />
      <Whiteboard position={[16, 0, 9]} />
      <PottedPlant position={[4, 0, 8.5]} seed={0} />
      <PottedPlant position={[17, 0, 5]} seed={2} />
      <PottedPlant position={[4, 0, 4.5]} seed={4} />
      <PottedPlant position={[16, 0, 4.5]} seed={6} />
      {/* Extra chairs around table */}
      <OfficeChair position={[8, 0, 5.8]} />
      <OfficeChair position={[12, 0, 5.8]} />
      <OfficeChair position={[8, 0, 7.2]} />
      <OfficeChair position={[12, 0, 7.2]} />
      <OfficeChair position={[10, 0, 5.5]} />
      <OfficeChair position={[10, 0, 7.5]} />
    </group>
  );
}

/** Sala de Trabajo: 12+ desks with laptops, chairs, lamps in rows */
export function TrabajoFurniture() {
  // 4 columns x 3 rows = 12 desks
  const desks: [number, number, number][] = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      desks.push([-12 + col * 7, 0, -3.5 + row * 2.5]);
    }
  }

  return (
    <group>
      {desks.map((pos, i) => {
        const deskTopY = 0.75;
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

/** Biblioteca: bookshelves, reading tables, quiet lighting */
export function BibliotecaFurniture() {
  return (
    <group>
      {/* 3 tall bookshelves — one per district */}
      <TallBookshelf position={[-12, 0, -13.5]} width={4} />
      <TallBookshelf position={[0, 0, -13.5]} width={5} />
      <TallBookshelf position={[12, 0, -13.5]} width={4} />

      {/* Reading tables */}
      <ReadingTable position={[-6, 0, -8]} />
      <ReadingTable position={[6, 0, -8]} />

      {/* Chairs at reading tables */}
      <OfficeChair position={[-6, 0, -7.2]} />
      <OfficeChair position={[-6, 0, -8.8]} />
      <OfficeChair position={[6, 0, -7.2]} />
      <OfficeChair position={[6, 0, -8.8]} />

      {/* Subtle warm lights for reading areas */}
      <pointLight position={[-6, 3, -8]} intensity={3} color="#ffd699" distance={6} />
      <pointLight position={[6, 3, -8]} intensity={3} color="#ffd699" distance={6} />
    </group>
  );
}
