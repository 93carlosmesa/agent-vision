/**
 * ISceneConfig — Configuration for a visual scene (office, beach, etc.).
 *
 * Each scene defines its zones, labels, background, and title.
 * Scenes are pure data — no behavior, just configuration.
 */

import type { ZoneMapping, ZoneLabelMapping } from './IZone';

/** Configuration for a single scene */
export interface ISceneConfig {
  /** Scene identifier (e.g. "oficina", "playa") */
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

/** Registry of all available scenes, keyed by scene ID */
export type SceneRegistry = Record<string, ISceneConfig>;
