/**
 * IInteraction — Visible connection between two agents.
 *
 * Types: consulting (blue), validating (green), delegating (orange).
 */

export type InteractionType = 'consulting' | 'validating' | 'delegating';

export interface IInteraction {
  /** Unique interaction ID */
  id: string;
  /** Session key of the initiating agent */
  fromSessionKey: string;
  /** Session key of the target agent */
  toSessionKey: string;
  /** What kind of interaction */
  type: InteractionType;
  /** Human-readable label (e.g. "consulting market data") */
  label: string;
  /** When interaction started (epoch ms) */
  startedAt: number;
  /** Duration in ms */
  durationMs: number;
}

/** Color mapping for interaction types */
export const INTERACTION_COLORS: Record<InteractionType, string> = {
  consulting: '#3b82f6',  // blue
  validating: '#22c55e',  // green
  delegating: '#f97316',  // orange
};
