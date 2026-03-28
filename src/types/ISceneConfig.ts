/**
 * ISceneConfig — Configuration for the 3D world scene.
 *
 * Defines zones, labels, background, and title.
 * Pure data — no behavior, just configuration.
 */

import type { ZoneMapping, ZoneLabelMapping } from './IZone';

/** Configuration for the scene */
export interface ISceneConfig {
  /** Scene identifier */
  id: string;
  /** Display title */
  title: string;
  /** Background image path (relative to public/) */
  backgroundImage: string;
  /** Zone definitions — where each status group is placed */
  zoneDefs: ZoneMapping;
  /** Human-readable labels per status zone */
  zoneLabels: ZoneLabelMapping;
}
