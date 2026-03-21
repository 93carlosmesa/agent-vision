/**
 * useOfficeLife — DEPRECATED: fake autonomous activity simulation removed.
 *
 * Agents now move based on REAL status changes only.
 * This file kept as a stub to avoid breaking imports during transition.
 */

import type { RoomKey } from '../utils/officePathfinding';

export interface OfficeLifeEntry {
  simulatedRoom: RoomKey;
  activityLabel: string;
  positionOffset: [number, number, number];
}

export interface OfficeLifeResult {
  ref: React.MutableRefObject<Map<string, OfficeLifeEntry>>;
  version: number;
}
