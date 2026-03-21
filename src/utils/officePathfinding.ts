/**
 * officePathfinding — BFS-based room graph traversal through door waypoints.
 *
 * Agents must walk THROUGH DOORS between rooms, never through walls.
 * Uses a pre-defined graph of room connections with door positions.
 */

export type RoomKey = 'lobby' | 'descanso' | 'comunicacion' | 'trabajo' | 'biblioteca';

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
