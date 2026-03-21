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

/** TV / flat screen on wall */
function WallTV({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Screen bezel */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1.6, 0.9, 0.05]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.4} roughness={0.3} />
      </mesh>
      {/* Screen surface — emissive glow */}
      <mesh position={[0, 0, 0.028]}>
        <boxGeometry args={[1.45, 0.78, 0.005]} />
        <meshStandardMaterial color="#112244" emissive="#4488cc" emissiveIntensity={1.2} roughness={0.1} />
      </mesh>
      {/* Wall mount bracket */}
      <mesh position={[0, 0, -0.04]}>
        <boxGeometry args={[0.3, 0.2, 0.06]} />
        <meshStandardMaterial color="#333" metalness={0.6} />
      </mesh>
    </group>
  );
}

/** Water cooler / dispenser */
function WaterCooler({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Base cabinet */}
      <mesh position={[0, 0.25, 0]}>
        <boxGeometry args={[0.3, 0.5, 0.3]} />
        <meshStandardMaterial color="#e0e0e0" roughness={0.5} />
      </mesh>
      {/* Water bottle (inverted) */}
      <mesh position={[0, 0.72, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.45, 12]} />
        <meshStandardMaterial color="#aaddff" transparent opacity={0.5} roughness={0.1} />
      </mesh>
      {/* Bottle cap */}
      <mesh position={[0, 0.95, 0]}>
        <sphereGeometry args={[0.1, 10, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#aaddff" transparent opacity={0.4} roughness={0.1} />
      </mesh>
      {/* Tap area */}
      <mesh position={[0, 0.48, 0.16]}>
        <boxGeometry args={[0.08, 0.04, 0.02]} />
        <meshStandardMaterial color="#888" metalness={0.6} />
      </mesh>
      {/* Drip tray */}
      <mesh position={[0, 0.38, 0.12]}>
        <boxGeometry args={[0.18, 0.02, 0.08]} />
        <meshStandardMaterial color="#999" metalness={0.4} />
      </mesh>
    </group>
  );
}

/** Small decorative bookshelf */
function SmallBookshelf({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  const bookColors = ['#8b2500', '#1a4a6b', '#2d5a27', '#6b3a8a', '#8a6b3a'];
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Shelf frame */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[0.6, 1.0, 0.25]} />
        <meshStandardMaterial color="#4a3a2e" roughness={0.8} />
      </mesh>
      {/* Shelves */}
      {[0.15, 0.5, 0.85].map((y, i) => (
        <mesh key={i} position={[0, y, 0]}>
          <boxGeometry args={[0.56, 0.03, 0.23]} />
          <meshStandardMaterial color="#5a4a3e" roughness={0.7} />
        </mesh>
      ))}
      {/* Books on shelves */}
      {bookColors.map((col, i) => {
        const shelfY = i < 2 ? 0.28 : i < 4 ? 0.63 : 0.93;
        const xOff = (i % 2 === 0 ? -0.12 : 0.12) + (i % 3) * 0.04;
        const h = 0.18 + (i % 3) * 0.03;
        return (
          <mesh key={i} position={[xOff, shelfY, 0]}>
            <boxGeometry args={[0.06, h, 0.16]} />
            <meshStandardMaterial color={col} roughness={0.7} />
          </mesh>
        );
      })}
    </group>
  );
}

/** Wall clock */
function WallClock({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Clock face */}
      <mesh>
        <circleGeometry args={[0.25, 24]} />
        <meshStandardMaterial color="#f5f0e8" roughness={0.5} />
      </mesh>
      {/* Rim */}
      <mesh>
        <ringGeometry args={[0.24, 0.27, 24]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.5} />
      </mesh>
      {/* Hour marks */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i * Math.PI * 2) / 12;
        const r = 0.20;
        return (
          <mesh key={i} position={[Math.sin(angle) * r, Math.cos(angle) * r, 0.01]}>
            <boxGeometry args={[0.015, 0.04, 0.005]} />
            <meshStandardMaterial color="#333" />
          </mesh>
        );
      })}
      {/* Hour hand */}
      <mesh position={[0, 0.06, 0.015]} rotation={[0, 0, -0.8]}>
        <boxGeometry args={[0.015, 0.12, 0.005]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      {/* Minute hand */}
      <mesh position={[0, 0.08, 0.02]} rotation={[0, 0, 0.4]}>
        <boxGeometry args={[0.01, 0.16, 0.005]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      {/* Center dot */}
      <mesh position={[0, 0, 0.025]}>
        <sphereGeometry args={[0.015, 8, 8]} />
        <meshStandardMaterial color="#333" metalness={0.5} />
      </mesh>
    </group>
  );
}

/** Coffee cup (small) */
function CoffeeCup({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.03, 0.025, 0.06, 8]} />
        <meshStandardMaterial color="#f0f0f0" roughness={0.4} />
      </mesh>
      {/* Handle */}
      <mesh position={[0.04, 0.04, 0]}>
        <torusGeometry args={[0.015, 0.004, 6, 12, Math.PI]} />
        <meshStandardMaterial color="#f0f0f0" roughness={0.4} />
      </mesh>
    </group>
  );
}

/** Coffee counter surface */
function CoffeeCounter({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Counter base */}
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[1.2, 0.8, 0.5]} />
        <meshStandardMaterial color="#4a3a2e" roughness={0.7} />
      </mesh>
      {/* Counter top */}
      <mesh position={[0, 0.81, 0]}>
        <boxGeometry args={[1.3, 0.04, 0.55]} />
        <meshStandardMaterial color="#6b5a4a" roughness={0.5} />
      </mesh>
    </group>
  );
}

/** Stool for coffee counter */
function Stool({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.04, 10]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.17, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.33, 8]} />
        <meshStandardMaterial color="#444" metalness={0.6} />
      </mesh>
      {[0, 1.57, 3.14, 4.71].map((a, i) => (
        <mesh key={i} position={[Math.cos(a) * 0.12, 0.02, Math.sin(a) * 0.12]}>
          <sphereGeometry args={[0.025, 6, 6]} />
          <meshStandardMaterial color="#333" metalness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

/** Bean bag / armchair for lounge */
function BeanBag({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.22, 0]} scale={[1, 0.6, 0.9]}>
        <sphereGeometry args={[0.35, 12, 12]} />
        <meshStandardMaterial color="#3a2a4e" roughness={0.92} />
      </mesh>
      <mesh position={[0, 0.42, -0.18]} scale={[0.9, 0.8, 0.5]}>
        <sphereGeometry args={[0.28, 10, 10]} />
        <meshStandardMaterial color="#3a2a4e" roughness={0.92} />
      </mesh>
    </group>
  );
}

/** Sala de Descanso — 3 distinct seating areas, spread out.
 *  Area 1: Main U-shaped sofa (center-left ~x=-12, z=6)
 *  Area 2: Coffee corner (upper-right ~x=-4, z=8)
 *  Area 3: Lounge area (lower-left ~x=-16, z=4.5) with bean bags + TV
 */
export function DescansoFurniture() {
  return (
    <group>
      {/* ═══ AREA 1: Main sofa U-shape (x=-14 to -10, z=5 to 8.5) ═══ */}
      {/* Left arm (vertical, facing inward) */}
      <Sofa position={[-14, 0, 6]} rotation={Math.PI / 2} />
      {/* Back sofa (horizontal, facing south) */}
      <Sofa position={[-12, 0, 8.5]} rotation={0} />
      {/* Right arm (vertical, facing inward) */}
      <Sofa position={[-10, 0, 6]} rotation={-Math.PI / 2} />
      {/* Coffee table in the center */}
      <CoffeeTable position={[-12, 0, 6]} />

      {/* ── Rug under sofa area ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-12, 0.015, 6.5]}>
        <planeGeometry args={[6, 5]} />
        <meshStandardMaterial color="#8b4513" roughness={0.95} opacity={0.7} transparent />
      </mesh>

      {/* ═══ AREA 2: Coffee corner (x=-5 to -3, z=8 to 9) ═══ */}
      <CoffeeCounter position={[-4, 0, 8.5]} />
      <CoffeeMachine position={[-4, 0.83, 8.5]} />
      <CoffeeCup position={[-4.4, 0.83, 8.3]} />
      <CoffeeCup position={[-3.6, 0.83, 8.3]} />
      {/* Stools for sitting at counter */}
      <Stool position={[-4.5, 0, 7.8]} />
      <Stool position={[-3.5, 0, 7.8]} />

      {/* ═══ AREA 3: Lounge (x=-18 to -14, z=3.5 to 5.5) ═══ */}
      {/* Bean bags / armchairs */}
      <BeanBag position={[-16, 0, 4.5]} rotation={0} />
      <BeanBag position={[-14.5, 0, 4.5]} rotation={0.3} />
      {/* TV on the south wall */}
      <WallTV position={[-10, 1.6, 3.2]} rotation={0} />

      {/* ═══ UTILITIES ═══ */}
      {/* Water cooler (far left wall) */}
      <WaterCooler position={[-18, 0, 8]} />
      {/* Small bookshelf (far left wall) */}
      <SmallBookshelf position={[-18, 0, 6]} rotation={Math.PI / 2} />

      {/* ── Wall clock ── */}
      <WallClock position={[-7, 2.2, 3.25]} />

      {/* ── Plants (decorative) ── */}
      <PottedPlant position={[-2, 0, 5]} seed={1} />
      <PottedPlant position={[-19, 0, 9]} seed={3} />
      <PottedPlant position={[-7, 0, 4]} seed={5} />
      <PottedPlant position={[-8, 0, 9]} seed={7} />
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
