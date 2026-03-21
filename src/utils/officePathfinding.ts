/**
 * officePathfinding — BFS-based room graph traversal through door waypoints.
 *
 * Agents must walk THROUGH DOORS between rooms, never through walls.
 * Uses a pre-defined graph of room connections with door positions.
 */

export type RoomKey = 'lobby' | 'descanso' | 'comunicacion' | 'trabajo' | 'biblioteca';

/* ── Furniture obstacles — bounding boxes agents must avoid ── */
export interface Obstacle {
  cx: number; cz: number; // center
  hw: number; hd: number; // half-width (x), half-depth (z)
}

export const FURNITURE_OBSTACLES: Obstacle[] = [
  // ── Lobby ──
  { cx: 0,    cz: 12.5, hw: 1.5, hd: 0.6 },   // Reception desk

  // ── Descanso — 3 seating areas ──
  // Main sofa area (U-shape center)
  { cx: -14,  cz: 6,    hw: 1.0, hd: 0.5 },    // Left sofa (vertical)
  { cx: -12,  cz: 8.5,  hw: 1.5, hd: 0.5 },    // Back sofa (horizontal)
  { cx: -10,  cz: 6,    hw: 0.5, hd: 0.5 },    // Right sofa (vertical)
  { cx: -12,  cz: 6,    hw: 0.5, hd: 0.4 },    // Coffee table (center)
  // Coffee corner
  { cx: -4,   cz: 8.5,  hw: 0.8, hd: 0.4 },    // Coffee counter
  // Lounge area
  { cx: -16,  cz: 4.5,  hw: 0.6, hd: 0.6 },    // Bean bag / armchair
  { cx: -14.5, cz: 4.5, hw: 0.6, hd: 0.6 },    // Armchair
  // Water cooler
  { cx: -18,  cz: 8,    hw: 0.3, hd: 0.3 },    // Water cooler

  // ── Comunicación ──
  { cx: 10,   cz: 6.5,  hw: 1.5, hd: 0.8 },    // Meeting table

  // ── Trabajo — 4x3 desk grid ──
  { cx: -12,  cz: -3.5, hw: 0.9, hd: 0.5 },    // Desk row1 col1
  { cx: -5,   cz: -3.5, hw: 0.9, hd: 0.5 },    // Desk row1 col2
  { cx: 2,    cz: -3.5, hw: 0.9, hd: 0.5 },    // Desk row1 col3
  { cx: 9,    cz: -3.5, hw: 0.9, hd: 0.5 },    // Desk row1 col4
  { cx: -12,  cz: -1.0, hw: 0.9, hd: 0.5 },    // Desk row2 col1
  { cx: -5,   cz: -1.0, hw: 0.9, hd: 0.5 },    // Desk row2 col2
  { cx: 2,    cz: -1.0, hw: 0.9, hd: 0.5 },    // Desk row2 col3
  { cx: 9,    cz: -1.0, hw: 0.9, hd: 0.5 },    // Desk row2 col4
  { cx: -12,  cz: 1.5,  hw: 0.9, hd: 0.5 },    // Desk row3 col1
  { cx: -5,   cz: 1.5,  hw: 0.9, hd: 0.5 },    // Desk row3 col2
  { cx: 2,    cz: 1.5,  hw: 0.9, hd: 0.5 },    // Desk row3 col3
  { cx: 9,    cz: 1.5,  hw: 0.9, hd: 0.5 },    // Desk row3 col4

  // ── Biblioteca ──
  { cx: -12,  cz: -13.5, hw: 2.2, hd: 0.4 },   // Bookshelf left
  { cx: 0,    cz: -13.5, hw: 2.7, hd: 0.4 },   // Bookshelf center
  { cx: 12,   cz: -13.5, hw: 2.2, hd: 0.4 },   // Bookshelf right
  { cx: -6,   cz: -8,    hw: 0.8, hd: 0.5 },   // Reading table left
  { cx: 6,    cz: -8,    hw: 0.8, hd: 0.5 },   // Reading table right
];

interface DoorWaypoint {
  from: RoomKey;
  to: RoomKey;
  point: [number, number, number];
}

const DOORS: DoorWaypoint[] = [
  { from: 'lobby',        to: 'descanso',      point: [-10, 0, 10] },
  { from: 'lobby',        to: 'comunicacion',   point: [10, 0, 10] },
  { from: 'descanso',     to: 'comunicacion',   point: [0, 0, 6.5] },
  { from: 'descanso',     to: 'trabajo',        point: [-7.5, 0, 3] },
  { from: 'comunicacion', to: 'trabajo',        point: [7.5, 0, 3] },
  { from: 'trabajo',      to: 'biblioteca',     point: [0, 0, -5] },
];

// Build adjacency list (bidirectional)
const ADJ = new Map<RoomKey, { neighbor: RoomKey; door: [number, number, number] }[]>();

for (const d of DOORS) {
  if (!ADJ.has(d.from)) ADJ.set(d.from, []);
  if (!ADJ.has(d.to)) ADJ.set(d.to, []);
  ADJ.get(d.from)!.push({ neighbor: d.to, door: d.point });
  ADJ.get(d.to)!.push({ neighbor: d.from, door: d.point });
}

/**
 * Find the sequence of door waypoints an agent must visit to travel
 * from one room to another. Returns empty array if same room.
 */
export function findPath(fromRoom: RoomKey, toRoom: RoomKey): [number, number, number][] {
  if (fromRoom === toRoom) return [];

  // BFS to find shortest room path
  const visited = new Set<RoomKey>([fromRoom]);
  const parent = new Map<RoomKey, { room: RoomKey; door: [number, number, number] }>();
  const queue: RoomKey[] = [fromRoom];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = ADJ.get(current);
    if (!neighbors) continue;

    for (const { neighbor, door } of neighbors) {
      if (visited.has(neighbor)) continue;
      visited.add(neighbor);
      parent.set(neighbor, { room: current, door });

      if (neighbor === toRoom) {
        // Reconstruct path of door waypoints
        const waypoints: [number, number, number][] = [];
        let node: RoomKey = toRoom;
        while (parent.has(node)) {
          const p = parent.get(node)!;
          waypoints.unshift(p.door);
          node = p.room;
        }
        return waypoints;
      }

      queue.push(neighbor);
    }
  }

  // No path found (shouldn't happen in our connected graph)
  return [];
}
