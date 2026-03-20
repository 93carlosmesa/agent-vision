/**
 * IZone — Defines a visual zone within a scene.
 *
 * Zones are rectangular regions where agents are placed
 * based on their session status. Coordinates are percentages
 * relative to the scene container.
 */

import type { SessionStatus } from './ISession';

/** Definition of a single zone's geometry and appearance */
export interface IZoneDef {
  /** Internal key (e.g. "trabajo", "comunicacion", "relax") */
  key: string;
  /** Human-readable label */
  label: string;
  /** Center X position (%) */
  x: number;
  /** Center Y position (%) */
  y: number;
  /** Width (%) */
  w: number;
  /** Height (%) */
  h: number;
  /** Decorative emoji shown in zone header */
  deco: string;
}

/** Maps session status to the zone where agents with that status are placed */
export type ZoneMapping = Record<SessionStatus, IZoneDef>;

/** Maps session status to a human-readable zone label */
export type ZoneLabelMapping = Record<SessionStatus, string>;
