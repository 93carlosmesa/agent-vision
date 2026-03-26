import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Mesh } from 'three';
import type { WorldEnvironment } from './officeTheme';

const WALL_H = 3;
const WALL_T = 0.12;

/* ── Shared primitives ── */

function Wall({ position, size, rotation = 0, color }: {
  position: [number, number, number];
  size: [number, number];
  rotation?: number;
  color: string;
}) {
  return (
    <mesh position={position} rotation={[0, rotation, 0]} castShadow receiveShadow>
      <boxGeometry args={[size[0], size[1], WALL_T]} />
      <meshStandardMaterial color={color} roughness={0.7} metalness={0.05} />
    </mesh>
  );
}

function Baseboard({ position, width, rotation = 0, color }: {
  position: [number, number, number];
  width: number;
  rotation?: number;
  color: string;
}) {
  return (
    <mesh position={position} rotation={[0, rotation, 0]}>
      <boxGeometry args={[width, 0.15, WALL_T + 0.02]} />
      <meshStandardMaterial color={color} roughness={0.4} />
    </mesh>
  );
}

function GlassWall({ position, size, rotation = 0, color }: {
  position: [number, number, number];
  size: [number, number];
  rotation?: number;
  color: string;
}) {
  return (
    <mesh position={position} rotation={[0, rotation, 0]}>
      <boxGeometry args={[size[0], size[1], 0.06]} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={0.22}
        metalness={0.3}
        roughness={0.1}
      />
    </mesh>
  );
}

function RoomFloor({ position, size, color }: {
  position: [number, number, number];
  size: [number, number];
  color: string;
}) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={position} receiveShadow>
      <planeGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.85} metalness={0.02} />
    </mesh>
  );
}

function RoomLabel({ position, label, color }: {
  position: [number, number, number];
  label: string;
  color: string;
}) {
  return (
    <Html position={position} center distanceFactor={24} style={{ pointerEvents: 'none', whiteSpace: 'nowrap' }}>
      <div style={{
        background: 'rgba(30,36,48,0.82)',
        color,
        padding: '5px 14px',
        borderRadius: '6px',
        fontSize: '12px',
        fontFamily: 'monospace',
        fontWeight: 700,
        letterSpacing: '2px',
        textTransform: 'uppercase',
        border: `1px solid ${color}66`,
        boxShadow: `0 0 8px ${color}33`,
      }}>
        {label}
      </div>
    </Html>
  );
}

/* ── Parquet basketweave pattern for office (optimized: instanced mesh) ── */
function ParquetFloor({ position, size }: {
  position: [number, number, number];
  size: [number, number];
}) {
  const tileW = 4;
  const tileD = 4;
  const colorA = '#A07850';
  const colorB = '#8B6538';

  const cols = Math.ceil(size[0] / tileW);
  const rows = Math.ceil(size[1] / tileD);
  const ox = position[0] - size[0] / 2 + tileW / 2;
  const oz = position[2] - size[1] / 2 + tileD / 2;

  // Split tiles into two instanced meshes by color
  const tilesA: [number, number, number][] = [];
  const tilesB: [number, number, number][] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const pos: [number, number, number] = [ox + c * tileW, position[1], oz + r * tileD];
      if ((r + c) % 2 === 0) tilesA.push(pos);
      else tilesB.push(pos);
    }
  }

  return (
    <group>
      {/* Color A tiles — single instanced mesh */}
      <instancedMesh args={[undefined, undefined, tilesA.length]} receiveShadow
        ref={(mesh) => {
          if (!mesh) return;
          const dummy = new THREE.Object3D();
          tilesA.forEach((p, i) => {
            dummy.position.set(p[0], p[1], p[2]);
            dummy.rotation.set(-Math.PI / 2, 0, 0);
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
          });
          mesh.instanceMatrix.needsUpdate = true;
        }}
      >
        <planeGeometry args={[tileW - 0.06, tileD - 0.06]} />
        <meshStandardMaterial color={colorA} roughness={0.75} metalness={0.02} />
      </instancedMesh>
      {/* Color B tiles — single instanced mesh */}
      <instancedMesh args={[undefined, undefined, tilesB.length]} receiveShadow
        ref={(mesh) => {
          if (!mesh) return;
          const dummy = new THREE.Object3D();
          tilesB.forEach((p, i) => {
            dummy.position.set(p[0], p[1], p[2]);
            dummy.rotation.set(-Math.PI / 2, 0, 0);
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
          });
          mesh.instanceMatrix.needsUpdate = true;
        }}
      >
        <planeGeometry args={[tileW - 0.06, tileD - 0.06]} />
        <meshStandardMaterial color={colorB} roughness={0.75} metalness={0.02} />
      </instancedMesh>
    </group>
  );
}


/* ── Tiki hut structure for beach ── */
function TikiHut({ position }: { position: [number, number, number] }) {
  const postColor = '#5A3A20';
  const roofColor = '#B89050';
  const hw = 5;
  const hd = 4;
  const h = 3.2;

  return (
    <group position={position}>
      {/* 4 corner posts */}
      {[[-hw / 2, -hd / 2], [hw / 2, -hd / 2], [-hw / 2, hd / 2], [hw / 2, hd / 2]].map(([x, z], i) => (
        <mesh key={i} position={[x, h / 2, z]} castShadow>
          <cylinderGeometry args={[0.1, 0.12, h, 8]} />
          <meshStandardMaterial color={postColor} roughness={0.9} />
        </mesh>
      ))}
      {/* Thatched roof — layered cones */}
      <mesh position={[0, h + 0.4, 0]}>
        <coneGeometry args={[hw * 0.75, 1.2, 6]} />
        <meshStandardMaterial color={roofColor} roughness={0.95} />
      </mesh>
      <mesh position={[0, h + 0.15, 0]}>
        <boxGeometry args={[hw + 0.6, 0.15, hd + 0.6]} />
        <meshStandardMaterial color={roofColor} roughness={0.95} />
      </mesh>
    </group>
  );
}

/* ── Ocean plane with gentle wave animation ── */
function OceanPlane() {
  const ref = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.position.y = -0.15 + Math.sin(clock.elapsedTime * 0.5) * 0.08;
    }
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.15, -40]} receiveShadow>
      <planeGeometry args={[200, 80]} />
      <meshStandardMaterial
        color="#40C8C8"
        transparent
        opacity={0.85}
        roughness={0.15}
        metalness={0.3}
      />
    </mesh>
  );
}

/* ── Sand plane for beach ── */
function SandPlane() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
      <planeGeometry args={[120, 100]} />
      <meshStandardMaterial color="#F0E8D8" roughness={0.95} />
    </mesh>
  );
}

/* ── LED strip lights on walls ── */
interface WallSegment {
  position: [number, number, number];
  width: number;
  height: number;
  rotation: number;
}

function LEDStrips({ walls }: { walls: WallSegment[] }) {
  return (
    <group>
      {walls.map((w, i) => {
        const topY = w.position[1] + w.height / 2 + 0.025;
        return (
          <group key={`led-${i}`}>
            {/* Top LED strip */}
            <mesh
              position={[w.position[0], topY, w.position[2]]}
              rotation={[0, w.rotation, 0]}
            >
              <boxGeometry args={[w.width, 0.05, 0.1]} />
              <meshStandardMaterial
                color="#ffe8c0"
                emissive="#ffe8c0"
                emissiveIntensity={0.55}
                transparent
                opacity={0.28}
              />
            </mesh>
            <pointLight
              position={[w.position[0], topY + 0.12, w.position[2]]}
              color="#ffe8c0"
              intensity={0.35}
              distance={7}
            />
            {/* Base LED strip */}
            <mesh
              position={[w.position[0], 0.025, w.position[2]]}
              rotation={[0, w.rotation, 0]}
            >
              <boxGeometry args={[w.width, 0.05, 0.1]} />
              <meshStandardMaterial
                color="#ffe8c0"
                emissive="#ffe8c0"
                emissiveIntensity={0.35}
                transparent
                opacity={0.22}
              />
            </mesh>
            <pointLight
              position={[w.position[0], 0.1, w.position[2]]}
              color="#ffe8c0"
              intensity={0.2}
              distance={4}
            />
          </group>
        );
      })}
    </group>
  );
}

/* ── Main layout component ── */

export function OfficeLayout3D({ environment }: { environment: WorldEnvironment }) {
  const wy = WALL_H / 2;
  const theme = environment.theme;
  const isBeach = !!environment.beachMode;

  if (isBeach) {
    return (
      <group>
        {/* Sand ground */}
        <SandPlane />

        {/* Ocean in background */}
        <OceanPlane />

        {/* Wooden deck platform */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
          <planeGeometry args={[52, 44]} />
          <meshStandardMaterial color="#A09080" roughness={0.8} metalness={0.02} />
        </mesh>

        {/* Deck plank lines */}
        {Array.from({ length: 13 }).map((_, i) => (
          <mesh key={`plank-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[-24 + i * 4, 0.03, 0]}>
            <planeGeometry args={[0.05, 44]} />
            <meshStandardMaterial color="#8A7868" roughness={0.9} />
          </mesh>
        ))}

        {/* Room floor tints on deck */}
        <RoomFloor position={[0, 0.04, 14.5]} size={[48, 7]} color={theme.roomFloors.lobby} />
        <RoomFloor position={[-14, 0.04, 6.5]} size={[20, 9]} color={theme.roomFloors.descanso} />
        <RoomFloor position={[10, 0.04, 6.5]} size={[28, 9]} color={theme.roomFloors.comunicacion} />
        <RoomFloor position={[0, 0.04, -3]} size={[48, 10]} color={theme.roomFloors.trabajo} />
        <RoomFloor position={[-15, 0.04, -14]} size={[18, 12]} color={theme.roomFloors.biblioteca} />
      <RoomFloor position={[2, 0.04, -14]} size={[16, 12]} color="#1a1030" />
        <RoomFloor position={[17, 0.04, -14]} size={[14, 12]} color={theme.roomFloors.exterior} />

        {/* Tiki hut over break/relax area */}
        <TikiHut position={[-14, 0, 6.5]} />

        {/* Second smaller tiki hut for exterior */}
        <TikiHut position={[17, 0, -14]} />

        {/* Low rope boundary markers (instead of walls) */}
        {[[-24, 0.4, 0], [24, 0.4, 0]].map(([x, y, z], i) => (
          <mesh key={`rope-${i}`} position={[x, y, z]}>
            <cylinderGeometry args={[0.03, 0.03, 40, 8]} />
            <meshStandardMaterial color="#C0A070" roughness={0.9} />
          </mesh>
        ))}

        {/* Labels */}
        <RoomLabel position={[0, 3.7, 15]} label="Welcome Deck" color={theme.accent.cyan} />
        <RoomLabel position={[-14, 3.7, 6.5]} label="Beach Lounge" color={theme.accent.amber} />
        <RoomLabel position={[10, 3.7, 6.5]} label="Meeting Palapa" color={theme.accent.mint} />
        <RoomLabel position={[0, 3.7, -3]} label="Beach Work Hub" color={theme.accent.violet} />
        <RoomLabel position={[-15, 3.7, -14]} label="Quiet Cove" color="#E8D8B0" />
        <RoomLabel position={[2, 3.7, -14]} label="Command Deck" color="#c084fc" />
        <RoomLabel position={[17, 3.7, -14]} label="Tiki Terrace" color="#80D8A0" />
      </group>
    );
  }

  /* ── OFFICE layout ── */
  return (
    <group>
      {/* Parquet basketweave floor */}
      <ParquetFloor position={[0, -0.01, 0]} size={[52, 44]} />

      {/* Room floor tints on top of parquet */}
      <RoomFloor position={[0, 0.005, 14.5]} size={[48, 7]} color={theme.roomFloors.lobby} />
      <RoomFloor position={[-14, 0.005, 6.5]} size={[20, 9]} color={theme.roomFloors.descanso} />
      <RoomFloor position={[10, 0.005, 6.5]} size={[28, 9]} color={theme.roomFloors.comunicacion} />
      <RoomFloor position={[0, 0.005, -3]} size={[48, 10]} color={theme.roomFloors.trabajo} />
      <RoomFloor position={[-15, 0.005, -14]} size={[18, 12]} color={theme.roomFloors.biblioteca} />
      <RoomFloor position={[2, 0.005, -14]} size={[16, 12]} color="#1a1030" />
      <RoomFloor position={[17, 0.005, -14]} size={[14, 12]} color={theme.roomFloors.exterior} />

      {/* Outer walls — navy blue */}
      <GlassWall position={[0, wy, 18]} size={[48, WALL_H]} color={theme.walls.glass} />
      <Wall position={[-7, wy, -20]} size={[34, WALL_H]} color={theme.walls.solid} />
      <GlassWall position={[17, 1.1, -20]} size={[14, 1.2]} color={theme.walls.glass} />
      <Wall position={[-24, wy, -1]} size={[38, WALL_H]} rotation={Math.PI / 2} color={theme.walls.solid} />
      <Wall position={[24, wy, 4.5]} size={[27, WALL_H]} rotation={Math.PI / 2} color={theme.walls.solid} />
      <GlassWall position={[24, 1.2, -13]} size={[12, 1.4]} rotation={Math.PI / 2} color={theme.walls.glass} />

      {/* White baseboards along outer walls */}
      <Baseboard position={[-7, 0.075, -20]} width={34} color={theme.walls.baseboard} />
      <Baseboard position={[-24, 0.075, -1]} width={38} rotation={Math.PI / 2} color={theme.walls.baseboard} />
      <Baseboard position={[24, 0.075, 4.5]} width={27} rotation={Math.PI / 2} color={theme.walls.baseboard} />

      {/* Inner walls — navy */}
      <Wall position={[-17, wy, 11]} size={[14, WALL_H]} color={theme.walls.inner} />
      <Wall position={[0, wy, 11]} size={[16, WALL_H]} color={theme.walls.inner} />
      <Wall position={[17, wy, 11]} size={[14, WALL_H]} color={theme.walls.inner} />

      <Wall position={[-4, wy, 9]} size={[3.6, WALL_H]} rotation={Math.PI / 2} color={theme.walls.inner} />
      <Wall position={[-4, wy, 4]} size={[3.6, WALL_H]} rotation={Math.PI / 2} color={theme.walls.inner} />

      <Wall position={[-16, wy, 2]} size={[13, WALL_H]} color={theme.walls.inner} />
      <Wall position={[0, wy, 2]} size={[15, WALL_H]} color={theme.walls.inner} />
      <Wall position={[16, wy, 2]} size={[13, WALL_H]} color={theme.walls.inner} />

      <Wall position={[-14, wy, -8]} size={[18, WALL_H]} color={theme.walls.inner} />
      <Wall position={[1, wy, -8]} size={[8, WALL_H]} color={theme.walls.inner} />

      {/* Dividing wall: Biblioteca | Despacho CEO (gap at z=-11 to z=-13 for door) */}
      <Wall position={[-5, wy, -16.5]} size={[7, WALL_H]} rotation={Math.PI / 2} color={theme.walls.inner} />
      <Wall position={[-5, wy, -9.5]} size={[3, WALL_H]} rotation={Math.PI / 2} color={theme.walls.inner} />
      <GlassWall position={[12, 1.2, -8]} size={[10, 1.4]} color={theme.walls.glass} />

      {/* White baseboards along inner walls */}
      <Baseboard position={[-17, 0.075, 11]} width={14} color={theme.walls.baseboard} />
      <Baseboard position={[0, 0.075, 11]} width={16} color={theme.walls.baseboard} />
      <Baseboard position={[17, 0.075, 11]} width={14} color={theme.walls.baseboard} />
      <Baseboard position={[-16, 0.075, 2]} width={13} color={theme.walls.baseboard} />
      <Baseboard position={[0, 0.075, 2]} width={15} color={theme.walls.baseboard} />
      <Baseboard position={[16, 0.075, 2]} width={13} color={theme.walls.baseboard} />

      {/* LED accent strips — reduced to 4 key walls for ambient glow (was 19, massive perf drain) */}
      <LEDStrips walls={[
        { position: [0, wy, 18], width: 48, height: WALL_H, rotation: 0 },
        { position: [0, wy, 2], width: 15, height: WALL_H, rotation: 0 },
        { position: [-14, wy, -8], width: 18, height: WALL_H, rotation: 0 },
        { position: [17, 1.1, -20], width: 14, height: 1.2, rotation: 0 },
      ]} />

      {/* Room labels */}
      <RoomLabel position={[0, 3.7, 15]} label="Lobby / Recepcion" color={theme.accent.cyan} />
      <RoomLabel position={[-14, 3.7, 6.5]} label="Sala de Descanso" color={theme.accent.amber} />
      <RoomLabel position={[10, 3.7, 6.5]} label="Comunicacion & Reuniones" color={theme.accent.mint} />
      <RoomLabel position={[0, 3.7, -3]} label="Work Hub" color={theme.accent.violet} />
      <RoomLabel position={[-15, 3.7, -14]} label="Biblioteca" color="#E0D2A8" />
      <RoomLabel position={[2, 3.7, -14]} label="Sala de Dirección" color="#c084fc" />
      <RoomLabel position={[17, 3.7, -14]} label="Terraza Exterior" color="#9EF3BE" />
    </group>
  );
}
