/**
 * IClaudeEvent — Types for Claude Code JSONL watcher events.
 *
 * These types define the internal event system that ClaudeWatcher emits
 * when it detects activity in Claude Code session files (.jsonl).
 */

/** All possible event types emitted by ClaudeWatcher */
export type ClaudeEventType =
  | 'tool_start'
  | 'tool_done'
  | 'turn_end'
  | 'waiting'
  | 'permission_needed'
  | 'permission_clear'
  | 'subagent_spawn'
  | 'subagent_done'
  | 'new_session';

/** A single event emitted by ClaudeWatcher */
export interface IClaudeEvent {
  type: ClaudeEventType;
  agentId: string;
  sessionKey: string;
  timestamp: number;
  toolId?: string;
  toolName?: string;
  /** Human-readable label for current tool activity */
  toolStatus?: string;
  /** For subagent tools, the parent tool_use id */
  parentToolId?: string;
}

/** Internal tracking state for a single Claude Code JSONL session */
export interface IClaudeWatcherSession {
  filePath: string;
  fileOffset: number;
  lineBuffer: string;
  agentId: string;
  sessionKey: string;
  activeToolIds: Set<string>;
  activeToolStatuses: Map<string, string>;
  activeToolNames: Map<string, string>;
  backgroundAgentToolIds: Set<string>;
  hadToolsInTurn: boolean;
  lastDataAt: number;
  linesProcessed: number;
}

/** Debug info snapshot for a watched session */
export interface IClaudeWatcherDebugInfo {
  filePath: string;
  fileOffset: number;
  agentId: string;
  sessionKey: string;
  activeToolCount: number;
  activeToolNames: string[];
  backgroundAgentCount: number;
  linesProcessed: number;
  lastDataAt: number;
}
