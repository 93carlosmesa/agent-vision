/**
 * IWebSocketMessage — Defines the WebSocket protocol between server and client.
 *
 * All messages follow a discriminated union pattern with a `type` field.
 * The server pushes updates; the client can request specific data.
 */

import type { ISession, ISessionEvent, SessionStatus } from './ISession';
import type { IInteraction } from './IInteraction';
import type { AgentNameMap } from './IAgent';
import type { IToolHistoryEntry } from './IClaudeEvent';

// ─── Server → Client messages ───

/** Full state snapshot (sent on initial connection and periodically) */
export interface IWsSessionsUpdate {
  type: 'sessions:update';
  sessions: ISession[];
}

/** Timeline events update */
export interface IWsTimelineUpdate {
  type: 'timeline:update';
  events: Array<ISessionEvent & { sessionKey: string }>;
}

/** Agent name map update */
export interface IWsAgentNamesUpdate {
  type: 'agentNames:update';
  names: AgentNameMap;
}

/** Detail for a specific session */
export interface IWsSessionDetail {
  type: 'session:detail';
  sessionKey: string;
  session: ISession;
  events: ISessionEvent[];
}

/** Real agent-to-agent interactions detected from session data */
export interface IWsInteractionsUpdate {
  type: 'interactions:update';
  interactions: IInteraction[];
}

/** Server error message */
export interface IWsError {
  type: 'error';
  message: string;
}

/** Real-time tool activity from Claude Code (via ClaudeWatcher) */
export interface IWsToolActivity {
  type: 'agent:tool_activity';
  agentId: string;
  sessionKey: string;
  toolId: string;
  toolName: string;
  status: string;
  action: 'start' | 'done' | 'clear';
  timestamp: number;
}

/** Tool execution history for a session */
export interface IWsToolHistory {
  type: 'agent:tool_history';
  sessionKey: string;
  history: IToolHistoryEntry[];
}

/** Agent status change from Claude Code activity */
export interface IWsAgentStatusChange {
  type: 'agent:status_change';
  agentId: string;
  sessionKey: string;
  status: SessionStatus;
  activity?: string;
  isWaitingPermission?: boolean;
  turnCompleted?: boolean;
  timestamp: number;
}

/** Union of all server-to-client messages */
export type ServerMessage =
  | IWsSessionsUpdate
  | IWsTimelineUpdate
  | IWsAgentNamesUpdate
  | IWsSessionDetail
  | IWsInteractionsUpdate
  | IWsError
  | IWsToolActivity
  | IWsToolHistory
  | IWsAgentStatusChange;

// ─── Client → Server messages ───

/** Request detail for a specific session */
export interface IWsRequestDetail {
  type: 'session:subscribe';
  sessionKey: string;
}

/** Unsubscribe from session detail */
export interface IWsUnsubscribeDetail {
  type: 'session:unsubscribe';
  sessionKey: string;
}

/** Union of all client-to-server messages */
export type ClientMessage =
  | IWsRequestDetail
  | IWsUnsubscribeDetail;
