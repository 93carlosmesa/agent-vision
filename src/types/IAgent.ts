/**
 * IAgent — Represents an agent's display identity.
 *
 * Resolved from openclaw.json config. Used to show friendly names
 * and emojis instead of raw agent IDs.
 */

/** Agent identity as read from config */
export interface IAgentIdentity {
  /** Agent ID (e.g. "main", "coder") */
  id: string;
  /** Display name (e.g. "Samantha") */
  name: string;
  /** Optional emoji prefix (e.g. "🧠") */
  emoji: string;
}

/** Map of agentId → display name (with emoji) */
export type AgentNameMap = Record<string, string>;
