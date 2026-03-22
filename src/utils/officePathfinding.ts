/**
 * officePathfinding — BFS room graph traversal through explicit doors.
 * Layout supports the expanded office footprint and keeps motion compatibility.
 */

export type RoomKey = 'lobby' | 'descanso' | 'comunicacion' | 'trabajo' | 'biblioteca';

export interface Obstacle {
  cx: number;
  cz: number;
  hw: number;
  hd: number;
}

export const FURNITURE_OBSTACLES: Obstacle[] = [
  // Lobby
  { cx: 0, cz: 15, hw: 1.9, hd: 0.7 },
  { cx: -8, cz: 13.5, hw: 1.1, hd: 0.4 },
  { cx: 8, cz: 13.5, hw: 1.1, hd: 0.4 },

  // Descanso
  { cx: -19, cz: 7, hw: 0.8, hd: 0.9 },
  { cx: -16.8, cz: 9, hw: 0.9, hd: 0.45 },
  { cx: -14.6, cz: 7, hw: 0.8, hd: 0.9 },
  { cx: -10.5, cz: 5.1, hw: 0.8, hd: 0.45 },
  { cx: -8.8, cz: 8.7, hw: 0.8, hd: 0.45 },
  { cx: -6, cz: 9.5, hw: 0.9, hd: 0.35 },

  // Comunicación
  { cx: 10, cz: 6.3, hw: 1.8, hd: 0.9 },
  { cx: 19, cz: 9.8, hw: 1.8, hd: 0.8 },
  { cx: 4.8, cz: 4.5, hw: 0.8, hd: 0.3 },

  // Trabajo (20 desks grid)
  ...Array.from({ length: 4 * 5 }).map((_, i) => {
    const col = i % 5;
    const row = Math.floor(i / 5);
    const x = -16 + col * 8;
    const z = -6 + row * 2.2;
    return { cx: x, cz: z, hw: 0.85, hd: 0.45 };
  }),

  // Biblioteca
  { cx: -20, cz: -18, hw: 2.8, hd: 0.45 },
  { cx: -12.5, cz: -18, hw: 2.8, hd: 0.45 },
  { cx: -5, cz: -18, hw: 2.8, hd: 0.45 },
  { cx: 2.5, cz: -18, hw: 2.8, hd: 0.45 },
  { cx: -17, cz: -12, hw: 0.95, hd: 0.45 },
  { cx: -12, cz: -12, hw: 0.95, hd: 0.45 },
  { cx: -7, cz: -12, hw: 0.95, hd: 0.45 },
  { cx: -2, cz: -12, hw: 0.95, hd: 0.45 },
];

interface DoorWaypoint {
  from: RoomKey;
  to: RoomKey;
  point: [number, number, number];
}

const DOORS: DoorWaypoint[] = [
  { from: 'lobby', to: 'descanso', point: [-10, 0, 11] },
  { from: 'lobby', to: 'comunicacion', point: [10, 0, 11] },
  { from: 'descanso', to: 'comunicacion', point: [-4, 0, 6.5] },
  { from: 'descanso', to: 'trabajo', point: [-9.5, 0, 2] },
  { from: 'comunicacion', to: 'trabajo', point: [7.5, 0, 2] },
  { from: 'trabajo', to: 'biblioteca', point: [-5, 0, -8] },
];

const ADJ = new Map<RoomKey, { neighbor: RoomKey; door: [number, number, number] }[]>();
for (const d of DOORS) {
  if (!ADJ.has(d.from)) ADJ.set(d.from, []);
  if (!ADJ.has(d.to)) ADJ.set(d.to, []);
  ADJ.get(d.from)!.push({ neighbor: d.to, door: d.point });
  ADJ.get(d.to)!.push({ neighbor: d.from, door: d.point });
}

export function findPath(fromRoom: RoomKey, toRoom: RoomKey): [number, number, number][] {
  if (fromRoom === toRoom) return [];

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

  return [];
}
