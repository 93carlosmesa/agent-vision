/**
 * ISkill — Skill definition for skill rooms in the world.
 *
 * Skills are grouped by prefix into districts:
 * - inv-- : Investment district
 * - dev-- : Development district
 * - global-- : Global/shared district
 */

/** Skill district prefix */
export type SkillDistrict = 'inv' | 'dev' | 'global';

/** A single skill definition */
export interface ISkill {
  /** Full skill name (e.g. "inv--market-analysis") */
  id: string;
  /** Short display label (e.g. "Market Analysis") */
  label: string;
  /** District this skill belongs to */
  district: SkillDistrict;
  /** Small icon/emoji for the skill room */
  icon: string;
}

/** An agent visiting a skill room */
export interface ISkillVisit {
  /** Session key of the visiting agent */
  sessionKey: string;
  /** Skill ID being visited */
  skillId: string;
  /** Timestamp when visit started */
  startedAt: number;
  /** Duration in ms (for animation timing) */
  durationMs: number;
}
