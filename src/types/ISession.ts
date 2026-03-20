/**
 * ISession — Represents a summarized agent session.
 *
 * Each session maps to a .jsonl file in the OpenClaw sessions directory.
 * The server reads raw events and produces this summary for the frontend.
 */

/** Status derived from last activity timing and role */
export type SessionStatus = 'running' | 'waiting' | 'idle';

/** A single recent event within a session (lightweight projection) */
export interface ISessionEvent {
  /** Unique event ID */
  id: string;
  /** ISO-8601 timestamp */
  timestamp: string;
  /** Message role: user, assistant, tool_result */
  role: string;
  /** Short text preview (max ~180 chars, cleaned) */
  snippet: string;
}

/** Full session summary sent to the frontend */
export interface ISession {
  /** Session key (filename stem, e.g. "agent:main:subagent:abc123") */
  key: string;
  /** Session ID from the session event metadata */
  id: string;
  /** Resolved agent ID (e.g. "main") */
  agentId: string;
  /** Current derived status */
  status: SessionStatus;
  /** ISO-8601 of last event */
  updatedAt: string;
  /** Epoch ms of last event (for sorting) */
  updatedAtMs: number;
  /** Role of the last message */
  lastRole: string;
  /** Snippet of the last message */
  lastSnippet: string;
  /** Total message count in session */
  messageCount: number;
  /** Last N events for quick preview */
  recentEvents: ISessionEvent[];
}
