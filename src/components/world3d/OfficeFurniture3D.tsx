import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import type { WorldEnvironment } from './officeTheme';

/* ═══════════════════════════════════════════════════════════════════
   SHARED FURNITURE PRIMITIVES
   ═══════════════════════════════════════════════════════════════════ */

function Plant({ position, seed = 0, scale = 1, color = '#2D7E58' }: {
  position: [number, number, number]; seed?: number; scale?: number; color?: string;
}) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.z = Math.sin(clock.elapsedTime * 0.55 + seed) * 0.02;
  });
  return (
    <group position={position} scale={scale} ref={ref}>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.12, 0.1, 0.24, 12]} />
        <meshStandardMaterial color="#D2B48C" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.55, 0]}>
        <sphereGeometry args={[0.22, 10, 10]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      <mesh position={[0.12, 0.72, 0]}>
        <sphereGeometry args={[0.15, 10, 10]} />
        <meshStandardMaterial color="#39A06A" roughness={0.85} />
      </mesh>
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   OFFICE-SPECIFIC FURNITURE
   ═══════════════════════════════════════════════════════════════════ */

/** Walnut wooden desk with metal legs */
function WoodDesk({ position, rotation = 0, w = 1.4 }: {
  position: [number, number, number]; rotation?: number; w?: number;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Desk top — walnut */}
      <mesh position={[0, 0.74, 0]} castShadow>
        <boxGeometry args={[w, 0.05, 0.72]} />
        <meshStandardMaterial color="#6B5040" roughness={0.6} />
      </mesh>
      {/* Metal legs */}
      {[[-w / 2 + 0.08, -0.28], [w / 2 - 0.08, -0.28], [-w / 2 + 0.08, 0.28], [w / 2 - 0.08, 0.28]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.35, z]}>
          <boxGeometry args={[0.04, 0.7, 0.04]} />
          <meshStandardMaterial color="#404040" metalness={0.5} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

/** iMac-style monitor: silver cylinder stand + thin screen */
function IMac({ position, rotation = 0 }: {
  position: [number, number, number]; rotation?: number;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Silver stand cylinder */}
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.08, 0.12, 0.16, 12]} />
        <meshStandardMaterial color="#C0C0C0" metalness={0.7} roughness={0.2} />
      </mesh>
      {/* Screen */}
      <mesh position={[0, 0.3, -0.02]}>
        <boxGeometry args={[0.5, 0.34, 0.02]} />
        <meshStandardMaterial color="#1A1A1A" />
      </mesh>
      {/* Screen glow */}
      <mesh position={[0, 0.3, -0.008]}>
        <planeGeometry args={[0.44, 0.28]} />
        <meshStandardMaterial color="#D0E8FF" emissive="#A0C8FF" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

/** Tan upholstered chair with wood legs */
function OfficeChair({ position, rotation = 0 }: {
  position: [number, number, number]; rotation?: number;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Seat — tan upholstery */}
      <mesh position={[0, 0.45, 0]}>
        <boxGeometry args={[0.42, 0.08, 0.42]} />
        <meshStandardMaterial color="#A89070" roughness={0.85} />
      </mesh>
      {/* Backrest */}
      <mesh position={[0, 0.73, -0.17]}>
        <boxGeometry args={[0.42, 0.5, 0.06]} />
        <meshStandardMaterial color="#A89070" roughness={0.85} />
      </mesh>
      {/* Wood legs */}
      {[[-0.16, -0.16], [0.16, -0.16], [-0.16, 0.16], [0.16, 0.16]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.2, z]}>
          <cylinderGeometry args={[0.02, 0.02, 0.4, 6]} />
          <meshStandardMaterial color="#6B5040" roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

/** Dark leather lounge chair */
function LoungeChair({ position, rotation = 0 }: {
  position: [number, number, number]; rotation?: number;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Thick cushion seat */}
      <mesh position={[0, 0.28, 0]}>
        <boxGeometry args={[0.7, 0.2, 0.65]} />
        <meshStandardMaterial color="#5A3A28" roughness={0.9} />
      </mesh>
      {/* Backrest */}
      <mesh position={[0, 0.6, -0.28]}>
        <boxGeometry args={[0.7, 0.5, 0.1]} />
        <meshStandardMaterial color="#5A3A28" roughness={0.9} />
      </mesh>
      {/* Armrests */}
      {[-0.32, 0.32].map((x, i) => (
        <mesh key={i} position={[x, 0.42, 0]}>
          <boxGeometry args={[0.06, 0.12, 0.65]} />
          <meshStandardMaterial color="#4A2A18" roughness={0.9} />
        </mesh>
      ))}
      {/* Wood legs */}
      {[[-0.28, -0.25], [0.28, -0.25], [-0.28, 0.25], [0.28, 0.25]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.07, z]}>
          <cylinderGeometry args={[0.025, 0.025, 0.14, 6]} />
          <meshStandardMaterial color="#6B5040" roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

/** Coffee table with hairpin legs */
function CoffeeTable({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.38, 0]} castShadow>
        <boxGeometry args={[1.0, 0.04, 0.55]} />
        <meshStandardMaterial color="#6B5040" roughness={0.6} />
      </mesh>
      {[[-0.4, -0.2], [0.4, -0.2], [-0.4, 0.2], [0.4, 0.2]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.18, z]}>
          <cylinderGeometry args={[0.015, 0.015, 0.36, 6]} />
          <meshStandardMaterial color="#333333" metalness={0.6} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

/** Bookshelf with colorful book blocks */
function Bookshelf({ position, width = 3 }: {
  position: [number, number, number]; width?: number;
}) {
  const bookColors = ['#C02020', '#2050A0', '#D0A020', '#208040', '#6030A0', '#D06020', '#2080A0', '#A03060'];
  return (
    <group position={position}>
      {/* Back panel — walnut */}
      <mesh position={[0, 1.1, -0.18]}>
        <boxGeometry args={[width, 2.2, 0.04]} />
        <meshStandardMaterial color="#6B5040" roughness={0.7} />
      </mesh>
      {/* Side panels */}
      {[-width / 2, width / 2].map((x, i) => (
        <mesh key={i} position={[x, 1.1, 0]}>
          <boxGeometry args={[0.05, 2.2, 0.4]} />
          <meshStandardMaterial color="#6B5040" roughness={0.7} />
        </mesh>
      ))}
      {/* Shelves */}
      {[0, 0.55, 1.1, 1.65, 2.2].map((y, i) => (
        <mesh key={i} position={[0, y, 0]}>
          <boxGeometry args={[width, 0.04, 0.4]} />
          <meshStandardMaterial color="#7B6050" roughness={0.7} />
        </mesh>
      ))}
      {/* Colorful books on each shelf */}
      {[0.25, 0.8, 1.35, 1.9].map((shelfY, si) => {
        const numBooks = Math.floor(width / 0.12);
        return Array.from({ length: numBooks }).map((_, bi) => {
          const bx = -width / 2 + 0.15 + bi * 0.12;
          const bh = 0.3 + Math.sin(bi * 3 + si) * 0.08;
          const color = bookColors[(bi + si * 3) % bookColors.length];
          return (
            <mesh key={`${si}-${bi}`} position={[bx, shelfY + bh / 2 + 0.02, 0]}>
              <boxGeometry args={[0.08, bh, 0.28]} />
              <meshStandardMaterial color={color} roughness={0.8} />
            </mesh>
          );
        });
      })}
    </group>
  );
}

/** Fiddle leaf fig plant — dark green spheres on brown stem in beige pot */
function FiddleLeafFig({ position, scale = 1 }: {
  position: [number, number, number]; scale?: number;
}) {
  return (
    <group position={position} scale={scale}>
      {/* Beige pot */}
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.18, 0.14, 0.3, 12]} />
        <meshStandardMaterial color="#D2C4A8" roughness={0.85} />
      </mesh>
      {/* Brown stem */}
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.03, 0.04, 0.9, 6]} />
        <meshStandardMaterial color="#5A3A20" roughness={0.9} />
      </mesh>
      {/* Dark green leaf clusters */}
      {[[0, 1.05, 0], [-0.15, 0.9, 0.1], [0.15, 0.95, -0.08], [0, 0.8, 0.12]].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]}>
          <sphereGeometry args={[0.18 - i * 0.02, 8, 8]} />
          <meshStandardMaterial color="#2A5A2A" roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}

/** Vending machine */
function VendingMachine({ position, rotation = 0 }: {
  position: [number, number, number]; rotation?: number;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Body */}
      <mesh position={[0, 1.0, 0]} castShadow>
        <boxGeometry args={[0.8, 2.0, 0.6]} />
        <meshStandardMaterial color="#404850" metalness={0.3} roughness={0.5} />
      </mesh>
      {/* Front panel / display */}
      <mesh position={[0, 1.2, 0.31]}>
        <planeGeometry args={[0.6, 1.2]} />
        <meshStandardMaterial color="#203040" emissive="#304860" emissiveIntensity={0.4} />
      </mesh>
      {/* Light strip */}
      <mesh position={[0, 1.9, 0.31]}>
        <planeGeometry args={[0.7, 0.08]} />
        <meshStandardMaterial color="#F0F0F0" emissive="#FFFFFF" emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

/** Water cooler */
function WaterCooler({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Body */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[0.35, 1.0, 0.35]} />
        <meshStandardMaterial color="#E8E0D8" roughness={0.6} />
      </mesh>
      {/* Water bottle on top */}
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.5, 12]} />
        <meshStandardMaterial color="#C0E0FF" transparent opacity={0.6} />
      </mesh>
    </group>
  );
}

/** Gold-framed painting */
function Painting({ position, rotation = 0 }: {
  position: [number, number, number]; rotation?: number;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Gold frame */}
      <mesh>
        <boxGeometry args={[1.2, 0.9, 0.06]} />
        <meshStandardMaterial color="#C8A040" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Canvas */}
      <mesh position={[0, 0, 0.02]}>
        <planeGeometry args={[1.0, 0.7]} />
        <meshStandardMaterial color="#3A5060" roughness={0.9} />
      </mesh>
    </group>
  );
}

/** Meeting table */
function MeetingTable({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.72, 0]} castShadow>
        <boxGeometry args={[3.2, 0.06, 1.5]} />
        <meshStandardMaterial color="#6B5040" roughness={0.6} />
      </mesh>
      {[[-1.35, -0.6], [1.35, -0.6], [-1.35, 0.6], [1.35, 0.6]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.35, z]}>
          <cylinderGeometry args={[0.04, 0.04, 0.7, 10]} />
          <meshStandardMaterial color="#404040" metalness={0.4} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   BEACH-SPECIFIC FURNITURE
   ═══════════════════════════════════════════════════════════════════ */

/** Beach lounger — honey-teak slatted with optional striped towel */
function BeachLounger({ position, rotation = 0, towelColor = '#E04040' }: {
  position: [number, number, number]; rotation?: number; towelColor?: string;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Frame */}
      <mesh position={[0, 0.25, 0]} castShadow>
        <boxGeometry args={[0.65, 0.06, 1.8]} />
        <meshStandardMaterial color="#C09860" roughness={0.75} />
      </mesh>
      {/* Slats */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={i} position={[0, 0.28, -0.7 + i * 0.2]}>
          <boxGeometry args={[0.6, 0.02, 0.14]} />
          <meshStandardMaterial color="#B08848" roughness={0.8} />
        </mesh>
      ))}
      {/* Raised back */}
      <mesh position={[0, 0.45, -0.75]} rotation={[0.4, 0, 0]}>
        <boxGeometry args={[0.6, 0.04, 0.5]} />
        <meshStandardMaterial color="#C09860" roughness={0.75} />
      </mesh>
      {/* Legs */}
      {[[-0.25, -0.7], [0.25, -0.7], [-0.25, 0.7], [0.25, 0.7]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.1, z]}>
          <cylinderGeometry args={[0.02, 0.02, 0.2, 6]} />
          <meshStandardMaterial color="#A08040" roughness={0.8} />
        </mesh>
      ))}
      {/* Striped towel */}
      <mesh position={[0, 0.3, 0.1]}>
        <boxGeometry args={[0.55, 0.02, 1.2]} />
        <meshStandardMaterial color={towelColor} roughness={0.9} />
      </mesh>
      {/* Towel stripe */}
      <mesh position={[0, 0.31, 0.1]}>
        <boxGeometry args={[0.55, 0.01, 0.15]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.9} />
      </mesh>
    </group>
  );
}

/** Hammock — simple catenary curve between two posts */
function Hammock({ position, rotation = 0 }: {
  position: [number, number, number]; rotation?: number;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Two posts */}
      {[-1.5, 1.5].map((x, i) => (
        <mesh key={i} position={[x, 0.8, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.05, 1.6, 8]} />
          <meshStandardMaterial color="#5A3A20" roughness={0.9} />
        </mesh>
      ))}
      {/* Hammock fabric — approximated with curved boxes */}
      {Array.from({ length: 7 }).map((_, i) => {
        const t = (i - 3) / 3;
        const x = t * 1.2;
        const y = 1.1 - t * t * 0.5; // catenary-ish curve
        return (
          <mesh key={i} position={[x, y, 0]} rotation={[0, 0, t * 0.15]}>
            <boxGeometry args={[0.4, 0.02, 0.7]} />
            <meshStandardMaterial color="#F0E0C0" roughness={0.9} />
          </mesh>
        );
      })}
    </group>
  );
}

/** Laptop on low table (beach version) */
function LaptopOnTable({ position, rotation = 0 }: {
  position: [number, number, number]; rotation?: number;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Low bamboo table */}
      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[0.6, 0.04, 0.4]} />
        <meshStandardMaterial color="#B09060" roughness={0.8} />
      </mesh>
      {[[-0.24, -0.14], [0.24, -0.14], [-0.24, 0.14], [0.24, 0.14]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.14, z]}>
          <cylinderGeometry args={[0.02, 0.02, 0.28, 6]} />
          <meshStandardMaterial color="#A08050" roughness={0.8} />
        </mesh>
      ))}
      {/* Laptop */}
      <mesh position={[0, 0.34, 0]}>
        <boxGeometry args={[0.34, 0.02, 0.22]} />
        <meshStandardMaterial color="#222222" />
      </mesh>
      <mesh position={[0, 0.46, -0.1]} rotation={[-1.2, 0, 0]}>
        <boxGeometry args={[0.34, 0.24, 0.01]} />
        <meshStandardMaterial color="#1A2A3A" emissive="#40A0D0" emissiveIntensity={0.7} />
      </mesh>
    </group>
  );
}

/** Tiki bar counter */
function TikiBar({ position, rotation = 0 }: {
  position: [number, number, number]; rotation?: number;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Bar top */}
      <mesh position={[0, 1.0, 0]} castShadow>
        <boxGeometry args={[3.0, 0.08, 0.7]} />
        <meshStandardMaterial color="#5A3A20" roughness={0.7} />
      </mesh>
      {/* Bar front */}
      <mesh position={[0, 0.5, -0.3]}>
        <boxGeometry args={[3.0, 1.0, 0.06]} />
        <meshStandardMaterial color="#6B4A30" roughness={0.85} />
      </mesh>
      {/* Bamboo texture strips on front */}
      {Array.from({ length: 10 }).map((_, i) => (
        <mesh key={i} position={[-1.35 + i * 0.3, 0.5, -0.27]}>
          <cylinderGeometry args={[0.04, 0.04, 0.9, 6]} />
          <meshStandardMaterial color="#A08050" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

/** Tropical palm tree */
function PalmTree({ position, height = 5, seed = 0 }: {
  position: [number, number, number]; height?: number; seed?: number;
}) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.z = Math.sin(clock.elapsedTime * 0.3 + seed) * 0.02;
  });
  return (
    <group position={position} ref={ref}>
      {/* Trunk — slightly curved using stacked cylinders */}
      {Array.from({ length: 6 }).map((_, i) => {
        const t = i / 5;
        const y = t * height;
        const lean = Math.sin(t * 0.5 + seed) * 0.3;
        const r = 0.15 - t * 0.06;
        return (
          <mesh key={i} position={[lean, y, 0]}>
            <cylinderGeometry args={[r, r + 0.02, height / 5.5, 8]} />
            <meshStandardMaterial color="#7A5A30" roughness={0.9} />
          </mesh>
        );
      })}
      {/* Fan leaf clusters at top */}
      {[0, Math.PI * 0.5, Math.PI, Math.PI * 1.5, Math.PI * 0.25, Math.PI * 0.75].map((angle, i) => {
        const lx = Math.cos(angle) * 0.8;
        const lz = Math.sin(angle) * 0.8;
        return (
          <mesh key={i} position={[lx, height - 0.2, lz]} rotation={[0.5, angle, -0.3]}>
            <boxGeometry args={[0.15, 1.8, 0.02]} />
            <meshStandardMaterial color={i % 2 === 0 ? '#2A8A3A' : '#348A40'} roughness={0.85} />
          </mesh>
        );
      })}
      {/* Coconut cluster */}
      {[[0.1, height - 0.6, 0.1], [-0.1, height - 0.55, -0.05]].map(([x, y, z], i) => (
        <mesh key={`c${i}`} position={[x, y, z]}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshStandardMaterial color="#5A4020" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

/** Seashell small decoration */
function Seashell({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position} rotation={[0.3, Math.random() * Math.PI, 0]}>
      <coneGeometry args={[0.06, 0.04, 8]} />
      <meshStandardMaterial color="#F0E0D0" roughness={0.8} />
    </mesh>
  );
}

/** Surfboard leaning */
function Surfboard({ position, rotation = 0, color = '#E06030' }: {
  position: [number, number, number]; rotation?: number; color?: string;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0.25]}>
      <mesh position={[0, 1.0, 0]}>
        <boxGeometry args={[0.3, 2.0, 0.05]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      {/* Fin */}
      <mesh position={[0, 0.15, -0.04]}>
        <boxGeometry args={[0.08, 0.2, 0.06]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
    </group>
  );
}

/** Sun umbrella */
function SunUmbrella({ position, color = '#E06040' }: {
  position: [number, number, number]; color?: string;
}) {
  return (
    <group position={position}>
      <mesh position={[0, 1.8, 0]}>
        <coneGeometry args={[1.4, 0.4, 16]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 1.8, 8]} />
        <meshStandardMaterial color="#C0C0C0" metalness={0.5} roughness={0.3} />
      </mesh>
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ROOM FURNITURE EXPORTS — conditional on beachMode
   ═══════════════════════════════════════════════════════════════════ */

function DensityRows(density: WorldEnvironment['density']) {
  if (density === 'high') return { rows: 5, cols: 5 };
  if (density === 'low') return { rows: 3, cols: 4 };
  return { rows: 4, cols: 5 };
}

export function LobbyFurniture({ environment }: { environment: WorldEnvironment }) {
  const isBeach = !!environment.beachMode;

  if (isBeach) {
    return (
      <group>
        {/* Welcome tiki bar */}
        <TikiBar position={[0, 0, 15]} />
        <PalmTree position={[-14, 0, 16]} height={5.5} seed={1} />
        <PalmTree position={[14, 0, 16]} height={6} seed={2} />
        <PalmTree position={[-8, 0, 17]} height={4.5} seed={10} />
        <BeachLounger position={[-8, 0, 13.5]} rotation={0} towelColor="#3080C0" />
        <BeachLounger position={[8, 0, 13.5]} rotation={0} towelColor="#C04040" />
        <SunUmbrella position={[-8, 0, 13.5]} color="#F0A040" />
        <SunUmbrella position={[8, 0, 13.5]} color="#40A0D0" />
        {/* Investment lounge — 3 beach chairs with umbrella */}
        <BeachLounger position={[16, 0, 14]} rotation={-Math.PI / 6} towelColor="#53e3c2" />
        <BeachLounger position={[19, 0, 14]} rotation={0} towelColor="#a855f7" />
        <BeachLounger position={[22, 0, 14]} rotation={Math.PI / 6} towelColor="#06b6d4" />
        <SunUmbrella position={[19, 0, 14]} color="#53e3c2" />
        <Seashell position={[-3, 0, 16.5]} />
        <Seashell position={[5, 0, 17.2]} />
        <Seashell position={[1, 0, 16.8]} />
      </group>
    );
  }

  return (
    <group>
      {/* Reception desk */}
      <mesh position={[0, 0.5, 15]} castShadow>
        <boxGeometry args={[3.4, 1.0, 1.0]} />
        <meshStandardMaterial color="#6B5040" roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.03, 15]}>
        <boxGeometry args={[3.6, 0.05, 1.05]} />
        <meshStandardMaterial color="#8B6538" roughness={0.5} />
      </mesh>
      {/* Bench seating */}
      <LoungeChair position={[-8, 0, 13.5]} rotation={Math.PI / 4} />
      <LoungeChair position={[8, 0, 13.5]} rotation={-Math.PI / 4} />

      {/* ── Investment Squad Lounge ── */}
      {/* Round coffee table */}
      <mesh position={[19, 0.36, 14.5]} castShadow>
        <cylinderGeometry args={[0.6, 0.6, 0.04, 16]} />
        <meshStandardMaterial color="#6B5040" roughness={0.6} />
      </mesh>
      <mesh position={[19, 0.17, 14.5]}>
        <cylinderGeometry args={[0.04, 0.04, 0.34, 8]} />
        <meshStandardMaterial color="#404040" metalness={0.5} roughness={0.3} />
      </mesh>
      {/* Ginny's chair — center, facing table */}
      <LoungeChair position={[19, 0, 16.2]} rotation={Math.PI} />
      {/* Psych Market's chair — left, facing table */}
      <LoungeChair position={[16.5, 0, 15]} rotation={Math.PI * 0.75} />
      {/* US Open's chair — right, facing table */}
      <LoungeChair position={[21.5, 0, 15]} rotation={-Math.PI * 0.75} />

      {/* Fiddle leaf figs */}
      <FiddleLeafFig position={[-14, 0, 16]} scale={1.2} />
      <FiddleLeafFig position={[14, 0, 16]} scale={1.2} />
      <FiddleLeafFig position={[0, 0, 12.2]} />
      <FiddleLeafFig position={[23, 0, 16.5]} scale={1.0} />
    </group>
  );
}

export function DescansoFurniture({ environment }: { environment: WorldEnvironment }) {
  const isBeach = !!environment.beachMode;

  if (isBeach) {
    return (
      <group>
        {/* Beach loungers */}
        <BeachLounger position={[-19, 0, 7]} rotation={Math.PI / 2} towelColor="#D04040" />
        <BeachLounger position={[-17, 0, 9]} rotation={0} towelColor="#4080C0" />
        <BeachLounger position={[-15, 0, 7]} rotation={-Math.PI / 2} towelColor="#40B060" />
        <BeachLounger position={[-12, 0, 5]} rotation={Math.PI / 4} towelColor="#D0A040" />
        {/* Hammocks */}
        <Hammock position={[-10, 0, 8]} rotation={Math.PI / 6} />
        <Hammock position={[-7, 0, 6]} rotation={-Math.PI / 6} />
        {/* Palm trees */}
        <PalmTree position={[-22, 0, 4]} height={5} seed={4} />
        <PalmTree position={[-21, 0, 10]} height={6} seed={5} />
        {/* Sun umbrella over loungers */}
        <SunUmbrella position={[-17, 0, 8]} color="#F06040" />
      </group>
    );
  }

  return (
    <group>
      {/* Leather lounge chairs around coffee table */}
      <LoungeChair position={[-19, 0, 7]} rotation={Math.PI / 2} />
      <LoungeChair position={[-16.8, 0, 9]} rotation={0} />
      <LoungeChair position={[-14.6, 0, 7]} rotation={-Math.PI / 2} />
      <CoffeeTable position={[-16.8, 0, 7]} />

      {/* Second seating group */}
      <LoungeChair position={[-10.5, 0, 5.1]} rotation={Math.PI} />
      <LoungeChair position={[-8.8, 0, 8.7]} rotation={0} />
      <CoffeeTable position={[-9.7, 0, 6.8]} />

      {/* Fiddle leaf figs */}
      <FiddleLeafFig position={[-22, 0, 4]} scale={1.3} />
      <FiddleLeafFig position={[-21, 0, 10]} scale={1.4} />
      <FiddleLeafFig position={[-11.5, 0, 10.2]} />

      {/* Gold-framed painting on wall */}
      <Painting position={[-23.9, 1.8, 7]} rotation={Math.PI / 2} />
    </group>
  );
}

export function ComunicacionFurniture({ environment }: { environment: WorldEnvironment }) {
  const isBeach = !!environment.beachMode;
  const chairs = environment.density === 'low' ? [-1.2, 0, 1.2] : [-1.7, -0.6, 0.6, 1.7];

  if (isBeach) {
    return (
      <group>
        {/* Low meeting table (beach bamboo) */}
        <MeetingTable position={[10, 0, 6.3]} />
        {/* Beach-style chairs around table */}
        {chairs.map((x, i) => (
          <OfficeChair key={`n${i}`} position={[10 + x, 0, 4.9]} rotation={Math.PI} />
        ))}
        {chairs.map((x, i) => (
          <OfficeChair key={`s${i}`} position={[10 + x, 0, 7.7]} rotation={0} />
        ))}
        {/* Whiteboard on bamboo easel */}
        <mesh position={[19, 1.4, 9.8]}>
          <boxGeometry args={[3.2, 1.5, 0.06]} />
          <meshStandardMaterial color="#FFFFF0" roughness={0.3} />
        </mesh>
        <PalmTree position={[5, 0, 9.8]} height={4.5} seed={8} />
        <PalmTree position={[20.5, 0, 4]} height={5} seed={9} />
      </group>
    );
  }

  return (
    <group>
      <MeetingTable position={[10, 0, 6.3]} />
      {chairs.map((x, i) => (
        <OfficeChair key={`n${i}`} position={[10 + x, 0, 4.9]} rotation={Math.PI} />
      ))}
      {chairs.map((x, i) => (
        <OfficeChair key={`s${i}`} position={[10 + x, 0, 7.7]} rotation={0} />
      ))}
      <OfficeChair position={[8, 0, 6.3]} rotation={Math.PI / 2} />
      <OfficeChair position={[12, 0, 6.3]} rotation={-Math.PI / 2} />
      {/* Whiteboard */}
      <mesh position={[19, 1.4, 9.8]}>
        <boxGeometry args={[3.2, 1.5, 0.06]} />
        <meshStandardMaterial color="#F0F0F0" roughness={0.25} />
      </mesh>
      <FiddleLeafFig position={[5, 0, 9.8]} />
      <FiddleLeafFig position={[20.5, 0, 4]} />
    </group>
  );
}

export function TrabajoFurniture({ environment }: { environment: WorldEnvironment }) {
  const { cols, rows } = DensityRows(environment.density);
  const isBeach = !!environment.beachMode;
  const startX = -16;
  const startZ = -6;
  const dx = 8;
  const dz = 2.2;

  if (isBeach) {
    return (
      <group>
        {Array.from({ length: rows * cols }).map((_, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const x = startX + col * dx;
          const z = startZ + row * dz;
          return (
            <group key={i}>
              <LaptopOnTable position={[x, 0, z]} />
              <OfficeChair position={[x, 0, z + 0.95]} rotation={Math.PI} />
            </group>
          );
        })}
        <PalmTree position={[-2, 0, 1]} height={4} seed={11} />
        <PalmTree position={[14, 0, 1]} height={4.5} seed={12} />
      </group>
    );
  }

  return (
    <group>
      {Array.from({ length: rows * cols }).map((_, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = startX + col * dx;
        const z = startZ + row * dz;
        return (
          <group key={i}>
            <WoodDesk position={[x, 0, z]} />
            <IMac position={[x, 0.76, z - 0.08]} />
            <OfficeChair position={[x, 0, z + 0.95]} rotation={Math.PI} />
          </group>
        );
      })}
      <FiddleLeafFig position={[-2, 0, 1]} scale={1.2} />
      <FiddleLeafFig position={[14, 0, 1]} scale={1.2} />
    </group>
  );
}

export function BibliotecaFurniture({ environment }: { environment: WorldEnvironment }) {
  const isBeach = !!environment.beachMode;

  if (isBeach) {
    return (
      <group>
        {/* Quiet reading loungers */}
        <BeachLounger position={[-17, 0, -12]} rotation={0} towelColor="#6080A0" />
        <BeachLounger position={[-12, 0, -12]} rotation={0} towelColor="#A06040" />
        <BeachLounger position={[-7, 0, -12]} rotation={0} towelColor="#40A080" />
        <BeachLounger position={[-2, 0, -12]} rotation={0} towelColor="#A04080" />
        {/* Low tables with laptops */}
        <LaptopOnTable position={[-17, 0, -14.5]} />
        <LaptopOnTable position={[-7, 0, -14.5]} />
        <PalmTree position={[-20, 0, -18]} height={5} seed={20} />
        <PalmTree position={[2, 0, -18]} height={4.5} seed={21} />
        <pointLight position={[-12, 2.8, -12]} intensity={1.5} color="#FFF0D0" distance={8} />
        <pointLight position={[-2, 2.8, -12]} intensity={1.5} color="#FFF0D0" distance={8} />
      </group>
    );
  }

  return (
    <group>
      <Bookshelf position={[-20, 0, -18]} width={5.5} />
      <Bookshelf position={[-12.5, 0, -18]} width={5.5} />
      <Bookshelf position={[-5, 0, -18]} width={5.5} />
      <Bookshelf position={[2.5, 0, -18]} width={5.5} />

      {[-17, -12, -7, -2].map((x) => (
        <group key={x}>
          <WoodDesk position={[x, 0, -12]} rotation={0} w={1.6} />
          <IMac position={[x, 0.76, -12.08]} />
          <OfficeChair position={[x, 0, -10.9]} rotation={Math.PI} />
        </group>
      ))}

      <pointLight position={[-12, 2.8, -12]} intensity={1.8} color="#FFF0D0" distance={8} />
      <pointLight position={[-2, 2.8, -12]} intensity={1.8} color="#FFF0D0" distance={8} />
    </group>
  );
}

export function ExteriorFurniture({ environment }: { environment: WorldEnvironment }) {
  const isBeach = !!environment.beachMode;

  if (isBeach) {
    return (
      <group>
        {/* Beach loungers with umbrellas */}
        <BeachLounger position={[14, 0, -12.5]} rotation={Math.PI / 2} towelColor="#C04040" />
        <BeachLounger position={[20, 0, -12.5]} rotation={Math.PI / 2} towelColor="#4080C0" />
        <BeachLounger position={[17, 0, -17.5]} rotation={0} towelColor="#40C060" />
        <SunUmbrella position={[14, 0, -12.5]} color="#F0A040" />
        <SunUmbrella position={[20, 0, -12.5]} color="#40C0C0" />

        {/* Surfboards leaning against tiki hut */}
        <Surfboard position={[13, 0, -10.5]} rotation={0.2} color="#E06030" />
        <Surfboard position={[13.5, 0, -10.3]} rotation={-0.1} color="#3090D0" />

        {/* Palm trees */}
        <PalmTree position={[11.5, 0, -10.2]} height={6} seed={13} />
        <PalmTree position={[22.2, 0, -10.5]} height={6.5} seed={14} />
        <PalmTree position={[22, 0, -18]} height={5.5} seed={15} />
        <PalmTree position={[12.2, 0, -18.1]} height={5} seed={16} />

        {/* Seashells scattered on sand */}
        <Seashell position={[15, 0, -15]} />
        <Seashell position={[19, 0, -16]} />
        <Seashell position={[16, 0, -18.5]} />
        <Seashell position={[21, 0, -13]} />
        <Seashell position={[13.5, 0, -17]} />
      </group>
    );
  }

  return (
    <group>
      {/* Outdoor seating */}
      <LoungeChair position={[14, 0, -12.5]} rotation={Math.PI / 2} />
      <LoungeChair position={[20, 0, -12.5]} rotation={Math.PI / 2} />
      <LoungeChair position={[17, 0, -17.5]} rotation={0} />
      <CoffeeTable position={[17, 0, -14]} />

      {/* Vending machines */}
      <VendingMachine position={[12, 0, -10]} rotation={Math.PI / 2} />
      <WaterCooler position={[12, 0, -11.5]} />

      {/* Plants */}
      <FiddleLeafFig position={[11.5, 0, -10.2]} scale={1.4} />
      <FiddleLeafFig position={[22.2, 0, -10.5]} scale={1.5} />
      <Plant position={[22, 0, -18]} seed={15} scale={1.4} />
      <Plant position={[12.2, 0, -18.1]} seed={16} scale={1.3} />
    </group>
  );
}
