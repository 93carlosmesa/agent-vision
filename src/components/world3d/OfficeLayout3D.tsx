/**
 * OfficeLayout3D — Procedural multi-room office building: walls, floors, doorways, room labels.
 *
 * Layout (top-down, Z+ = front/south, Z- = back/north):
 *   Lobby:         z = 10..14,  x = -20..20
 *   Descanso:      z = 3..10,   x = -20..0
 *   Comunicación:  z = 3..10,   x = 0..20
 *   Trabajo:       z = -5..3,   x = -20..20
 *   Biblioteca:    z = -15..-5, x = -20..20
 */

import { Html } from '@react-three/drei';

const WALL_H = 2.8;
const WALL_T = 0.1;
const WALL_COLOR = '#4a4440';
const WALL_ROUGHNESS = 0.85;

/* ── Wall segment helper ── */
function Wall({ position, size, rotation = 0 }: {
  position: [number, number, number];
  size: [number, number]; // [width, height]
  rotation?: number;
}) {
  return (
    <mesh position={position} rotation={[0, rotation, 0]}>
      <boxGeometry args={[size[0], size[1], WALL_T]} />
      <meshStandardMaterial color={WALL_COLOR} roughness={WALL_ROUGHNESS} />
    </mesh>
  );
}

/* ── Glass wall (translucent) ── */
function GlassWall({ position, size, rotation = 0 }: {
  position: [number, number, number];
  size: [number, number];
  rotation?: number;
}) {
  return (
    <mesh position={position} rotation={[0, rotation, 0]}>
      <boxGeometry args={[size[0], size[1], 0.06]} />
      <meshStandardMaterial
        color="#88aacc"
        transparent
        opacity={0.15}
        metalness={0.3}
        roughness={0.1}
      />
    </mesh>
  );
}

/* ── Floor plane for a room ── */
function RoomFloor({ position, size, color }: {
  position: [number, number, number];
  size: [number, number];
  color: string;
}) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={position} receiveShadow>
      <planeGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.85} />
    </mesh>
  );
}

/* ── Floating room label ── */
function RoomLabel({ position, label, color }: {
  position: [number, number, number];
  label: string;
  color: string;
}) {
  return (
    <Html position={position} center distanceFactor={22} style={{ pointerEvents: 'none', whiteSpace: 'nowrap' }}>
      <div style={{
        background: 'rgba(20,18,15,0.75)',
        color,
        padding: '4px 14px',
        borderRadius: '4px',
        fontSize: '13px',
        fontFamily: 'monospace',
        fontWeight: 700,
        letterSpacing: '2px',
        textTransform: 'uppercase',
        border: `1px solid ${color}40`,
      }}>
        {label}
      </div>
    </Html>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   OFFICE LAYOUT — All walls, floors, and labels
   ═══════════════════════════════════════════════════════════════════ */

export function OfficeLayout3D() {
  const wy = WALL_H / 2; // wall center y

  return (
    <group>
      {/* ── FLOORS ── */}
      {/* Lobby floor (lighter) */}
      <RoomFloor position={[0, -0.01, 12]} size={[40, 4]} color="#4a4540" />
      {/* Descanso floor */}
      <RoomFloor position={[-10, -0.01, 6.5]} size={[20, 7]} color="#3a3530" />
      {/* Comunicación floor */}
      <RoomFloor position={[10, -0.01, 6.5]} size={[20, 7]} color="#3a3530" />
      {/* Trabajo floor (slightly brighter) */}
      <RoomFloor position={[0, -0.01, -1]} size={[40, 8]} color="#3d3832" />
      {/* Biblioteca floor (slightly darker) */}
      <RoomFloor position={[0, -0.01, -10]} size={[40, 10]} color="#352f2a" />

      {/* ── OUTER WALLS ── */}
      {/* Front wall — glass (lobby front), z=14 */}
      <GlassWall position={[0, wy, 14]} size={[40, WALL_H]} />
      {/* Back wall, z=-15 */}
      <Wall position={[0, wy, -15]} size={[40, WALL_H]} />
      {/* Left wall, x=-20 */}
      <Wall position={[-20, wy, -0.5]} size={[29, WALL_H]} rotation={Math.PI / 2} />
      {/* Right wall, x=20 */}
      <Wall position={[20, wy, -0.5]} size={[29, WALL_H]} rotation={Math.PI / 2} />

      {/* ── LOBBY / TOP ROOMS DIVIDER — z=10 ── */}
      {/* Left section (x=-20 to -2), with door gap at center ~x=-10 */}
      <Wall position={[-14.25, wy, 10]} size={[11.5, WALL_H]} />
      <Wall position={[-5, wy, 10]} size={[6, WALL_H]} />
      {/* Right section (x=2 to 20), with door gap at center ~x=10 */}
      <Wall position={[5, wy, 10]} size={[6, WALL_H]} />
      <Wall position={[14.25, wy, 10]} size={[11.5, WALL_H]} />
      {/* Door gap at x=-8.5 (1.5 wide) for descanso */}
      {/* Door gap at x=8.5 (1.5 wide) for comunicación */}
      {/* Central pillar / wall between the two door areas */}

      {/* ── MIDDLE VERTICAL DIVIDER (Descanso | Comunicación) — x=0, z=3..10 ── */}
      {/* Top segment (z=7.25 to 10) */}
      <Wall position={[0, wy, 8.625]} size={[2.75, WALL_H]} rotation={Math.PI / 2} />
      {/* Bottom segment (z=3 to 5.75) */}
      <Wall position={[0, wy, 4.375]} size={[2.75, WALL_H]} rotation={Math.PI / 2} />
      {/* Door gap at z=6.5 (1.5 wide) */}

      {/* ── TOP ROOMS / TRABAJO DIVIDER — z=3 ── */}
      {/* Left section: x=-20 to -8.25 */}
      <Wall position={[-14.125, wy, 3]} size={[11.75, WALL_H]} />
      {/* Gap at x=-7.5 (1.5 wide) — door from descanso to trabajo */}
      {/* Center-left section: x=-6.75 to -0.75 */}
      <Wall position={[-3.75, wy, 3]} size={[6, WALL_H]} />
      {/* Gap at x=0 (1.5 wide) — central corridor */}
      {/* Center-right section: x=0.75 to 6.75 */}
      <Wall position={[3.75, wy, 3]} size={[6, WALL_H]} />
      {/* Gap at x=7.5 (1.5 wide) — door from comunicación to trabajo */}
      {/* Right section: x=8.25 to 20 */}
      <Wall position={[14.125, wy, 3]} size={[11.75, WALL_H]} />

      {/* ── TRABAJO / BIBLIOTECA DIVIDER — z=-5 ── */}
      {/* Left section: x=-20 to -0.75 */}
      <Wall position={[-10.375, wy, -5]} size={[19.25, WALL_H]} />
      {/* Door gap at x=0 (1.5 wide) */}
      {/* Right section: x=0.75 to 20 */}
      <Wall position={[10.375, wy, -5]} size={[19.25, WALL_H]} />

      {/* ── ROOM LABELS ── */}
      <RoomLabel position={[0, 3.5, 12.5]} label="Entrada" color="#88bbdd" />
      <RoomLabel position={[-10, 3.5, 6.5]} label="Sala de Descanso" color="#ff9f43" />
      <RoomLabel position={[10, 3.5, 6.5]} label="Sala de Comunicación" color="#53e3c2" />
      <RoomLabel position={[0, 3.5, -1]} label="Sala de Trabajo" color="#7c9cff" />
      <RoomLabel position={[0, 3.5, -10]} label="Biblioteca" color="#c4a35a" />
    </group>
  );
}
