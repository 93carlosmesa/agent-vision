/**
 * RoomPositions — Named seat positions per room for agent placement.
 * Coordinates match OfficeFurniture3D layout.
 */

import type { RoomKey } from '../utils/officePathfinding';
import { ALL_DESKS } from './DeskManager';

export interface SeatPosition {
  pos: [number, number, number];
  facingAngle: number; // radians, Y-axis
}

const COMUNICACION_SEATS: SeatPosition[] = [
  // Conference table chairs (around table at cx=10, cz=6.3)
  { pos: [8,   0, 5.8],  facingAngle: 0 },
  { pos: [10,  0, 5.8],  facingAngle: 0 },
  { pos: [12,  0, 5.8],  facingAngle: 0 },
  { pos: [8,   0, 6.8],  facingAngle: Math.PI },
  { pos: [10,  0, 6.8],  facingAngle: Math.PI },
  { pos: [12,  0, 6.8],  facingAngle: Math.PI },
  // Side chairs
  { pos: [4.5, 0, 4.5],  facingAngle: Math.PI / 4 },
  { pos: [19,  0, 9.0],  facingAngle: Math.PI },
  { pos: [21,  0, 9.0],  facingAngle: Math.PI },
];

const DESCANSO_SEATS: SeatPosition[] = [
  // Sofas/chairs in descanso
  { pos: [-19, 0, 7.5],  facingAngle: Math.PI / 2 },
  { pos: [-17, 0, 9.0],  facingAngle: 0 },
  { pos: [-15, 0, 7.5],  facingAngle: -Math.PI / 2 },
  { pos: [-11, 0, 5.5],  facingAngle: Math.PI },
  { pos: [-9,  0, 8.5],  facingAngle: 0 },
  { pos: [-6,  0, 9.0],  facingAngle: -Math.PI / 4 },
  { pos: [-13, 0, 7.0],  facingAngle: Math.PI / 4 },
];

const LOBBY_SEATS: SeatPosition[] = [
  { pos: [-1, 0, 14],    facingAngle: 0 },
  { pos: [1,  0, 14],    facingAngle: 0 },
  { pos: [0,  0, 12.5],  facingAngle: Math.PI },
];

const DESPACHO_SEATS: SeatPosition[] = [
  // Samantha's desk (front): chair at z=-9.9
  { pos: [2, 0, -9.9], facingAngle: Math.PI },
  // Emma's desk (behind left): chair at z=-15.1
  { pos: [-1, 0, -15.1], facingAngle: Math.PI },
  // Ginny's desk (behind right): chair at z=-15.1
  { pos: [5, 0, -15.1], facingAngle: Math.PI },
];

const EXTERIOR_SEATS: SeatPosition[] = [
  // Terraza exterior — outdoor relaxation
  { pos: [15, 0, -16], facingAngle: Math.PI / 4 },
  { pos: [17, 0, -13], facingAngle: 0 },
  { pos: [19, 0, -16], facingAngle: -Math.PI / 4 },
  { pos: [21, 0, -13], facingAngle: Math.PI },
];

export const ROOM_SEATS: Record<RoomKey, SeatPosition[]> = {
  lobby:        LOBBY_SEATS,
  descanso:     DESCANSO_SEATS,
  comunicacion: COMUNICACION_SEATS,
  trabajo:      ALL_DESKS
    .filter(d => d.room === 'trabajo' && d.id !== 'samantha-desk')
    .map(d => ({ pos: d.position, facingAngle: d.facingAngle })),
  biblioteca:   ALL_DESKS
    .filter(d => d.room === 'biblioteca')
    .map(d => ({ pos: d.position, facingAngle: d.facingAngle })),
  despacho:     DESPACHO_SEATS,
  exterior:     EXTERIOR_SEATS,
};

export function getRandomSeat(room: RoomKey, seed?: number): SeatPosition {
  const seats = ROOM_SEATS[room];
  if (seats.length === 0) return { pos: [0, 0, 0], facingAngle: 0 };
  const idx = seed !== undefined
    ? Math.abs(Math.floor(seed * 2654435761) % seats.length)
    : Math.floor(Math.random() * seats.length);
  return seats[idx];
}

export function getRoomForStatus(status: 'running' | 'waiting' | 'idle'): RoomKey {
  if (status === 'running')  return 'trabajo';
  if (status === 'waiting')  return 'comunicacion';
  return 'descanso';
}
