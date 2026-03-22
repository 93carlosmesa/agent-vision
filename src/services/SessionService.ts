/**
 * SessionService — SRP: transforms raw WS messages into UI state.
 * No WS connection logic. Only state management and data transformation.
 */

import type {
  ISession,
  ISessionEvent,
  IInteraction,
  AgentNameMap,
  ServerMessage,
} from '../types';

export interface ITimelineEntry {
  sessionKey: string;
  event: ISessionEvent & { sessionKey: string };
}

export interface ISessionServiceState {
  sessions: ISession[];
  agentNames: AgentNameMap;
  timeline: Array<ISessionEvent & { sessionKey: string }>;
  interactions: IInteraction[];
}

type StateChangeCallback = (state: ISessionServiceState) => void;

const MAX_TIMELINE_ENTRIES = 50;

export class SessionService {
  private sessions: ISession[] = [];
  private agentNames: AgentNameMap = {};
  private timeline: Array<ISessionEvent & { sessionKey: string }> = [];
  private interactions: IInteraction[] = [];
  private callbacks: StateChangeCallback[] = [];

  /**
   * Process a raw JSON string received from WebSocketClient.
   */
  processRaw(raw: string): void {
    let msg: ServerMessage;
    try {
      msg = JSON.parse(raw) as ServerMessage;
    } catch {
      return;
    }
    this._dispatch(msg);
  }

  onChange(cb: StateChangeCallback): void {
    this.callbacks.push(cb);
  }

  getState(): ISessionServiceState {
    return {
      sessions: this.sessions,
      agentNames: this.agentNames,
      timeline: this.timeline,
      interactions: this.interactions,
    };
  }

  /**
   * Extracts agentId from a sessionKey.
   * Format: "agent:<agentId>:<rest...>"
   * Returns the part between "agent:" and the next ":"
   */
  static extractAgentId(sessionKey: string): string {
    const match = sessionKey.match(/^agent:([^:]+)/);
    return match ? match[1] : sessionKey;
  }

  private _dispatch(msg: ServerMessage): void {
    switch (msg.type) {
      case 'sessions:update':
        this.sessions = msg.sessions;
        this._notify();
        break;

      case 'agentNames:update':
        this.agentNames = msg.names;
        this._notify();
        break;

      case 'timeline:update': {
        // Prepend new events and cap at MAX_TIMELINE_ENTRIES
        const incoming = msg.events;
        this.timeline = [...incoming, ...this.timeline].slice(0, MAX_TIMELINE_ENTRIES);
        this._notify();
        break;
      }

      case 'session:detail':
        // Update the specific session in our list
        this.sessions = this.sessions.map((s) =>
          s.key === msg.sessionKey ? msg.session : s
        );
        this._notify();
        break;

      case 'interactions:update':
        this.interactions = msg.interactions;
        this._notify();
        break;

      case 'error':
        console.error('[SessionService] Server error:', msg.message);
        break;
    }
  }

  private _notify(): void {
    const state = this.getState();
    this.callbacks.forEach((cb) => cb(state));
  }
}
