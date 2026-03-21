/**
 * SessionReader — Reads and parses .jsonl session files from ALL agent directories.
 *
 * Single Responsibility: File I/O and JSONL parsing.
 * Scans ~/.openclaw/agents/<agentId>/sessions/ for each agent.
 * Does NOT resolve agent names (that's AgentNameResolver).
 * Does NOT broadcast updates (that's WebSocketServer).
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, basename, resolve } from 'path';
import type { ISession, ISessionEvent, SessionStatus } from '../src/types/index.js';

/** Raw event line from a JSONL session file */
interface RawMessage {
  role: string;
  content: Array<{ type: string; text?: string; thinking?: string; name?: string }>;
  timestamp?: number;
}

interface RawEvent {
  type: string;
  id?: string;
  timestamp?: string;
  message?: RawMessage;
  [key: string]: unknown;
}

const SNIPPET_MAX_LEN = 180;
const RECENT_EVENTS_COUNT = 5;
const RUNNING_THRESHOLD_MS = 8_000;   // last event < 8s ago → running
const WAITING_THRESHOLD_MS = 30_000;  // last user msg < 30s ago → waiting

type MessageContent = Array<{ type: string; text?: string; thinking?: string; name?: string }>;

function extractSnippet(content: MessageContent | undefined): string {
  if (!content || !Array.isArray(content)) return '';
  for (const part of content) {
    const text = part.text ?? part.thinking ?? '';
    if (text.trim()) {
      return text.trim().slice(0, SNIPPET_MAX_LEN);
    }
  }
  return '';
}

function deriveStatus(lastRole: string, lastTimestampMs: number): SessionStatus {
  const ageMs = Date.now() - lastTimestampMs;
  if (ageMs < RUNNING_THRESHOLD_MS) {
    return lastRole === 'assistant' ? 'running' : 'waiting';
  }
  if (lastRole === 'user' && ageMs < WAITING_THRESHOLD_MS) {
    return 'waiting';
  }
  return 'idle';
}

export class SessionReader {
  private readonly agentsBase: string;
  private registeredAgentIds: string[] = [];

  constructor(agentsBase: string) {
    this.agentsBase = agentsBase;
  }

  /**
   * Set the list of registered agent IDs (from openclaw.json).
   * Agents with no active sessions will appear as idle.
   */
  setRegisteredAgents(agentIds: string[]): void {
    this.registeredAgentIds = agentIds;
  }

  /**
   * Parse a .jsonl file into an array of raw event objects.
   */
  parseJsonlFile(filePath: string): RawEvent[] {
    try {
      const raw = readFileSync(filePath, 'utf-8');
      return raw
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          try { return JSON.parse(line) as RawEvent; } catch { return null; }
        })
        .filter((e): e is RawEvent => e !== null);
    } catch {
      return [];
    }
  }

  /**
   * Summarize raw events into an ISession.
   */
  summarizeSession(sessionKey: string, events: RawEvent[], agentId: string): ISession | null {
    if (events.length === 0) return null;

    // First event should be the session metadata
    const sessionMeta = events[0];
    const sessionId = (typeof sessionMeta.id === 'string' ? sessionMeta.id : '') || sessionKey;

    const messageEvents: ISessionEvent[] = [];
    let lastRole = 'user';
    let lastTimestampMs = 0;
    let lastSnippet = '';

    for (const ev of events) {
      if (ev.type !== 'message' || !ev.message) continue;

      const role = ev.message.role === 'toolResult' ? 'tool_result' : ev.message.role;
      const tsStr = ev.timestamp ?? '';
      const tsMs = tsStr ? new Date(tsStr).getTime() : (typeof ev.message.timestamp === 'number' ? ev.message.timestamp : 0);
      const snippet = extractSnippet(ev.message.content);

      messageEvents.push({
        id: typeof ev.id === 'string' ? ev.id : String(Math.random()),
        timestamp: tsStr || new Date(tsMs).toISOString(),
        role,
        snippet,
      });

      if (tsMs > lastTimestampMs) {
        lastTimestampMs = tsMs;
        lastRole = role;
        lastSnippet = snippet;
      }
    }

    if (messageEvents.length === 0) return null;

    const updatedAt = new Date(lastTimestampMs).toISOString();
    const status: SessionStatus = deriveStatus(lastRole, lastTimestampMs);
    const recentEvents = messageEvents.slice(-RECENT_EVENTS_COUNT);

    return {
      key: sessionKey,
      id: sessionId,
      agentId,
      status,
      updatedAt,
      updatedAtMs: lastTimestampMs,
      lastRole,
      lastSnippet,
      messageCount: messageEvents.length,
      recentEvents,
    };
  }

  /**
   * Read all .jsonl session files from a single agent's sessions directory.
   */
  private readAgentSessions(agentId: string, sessionsDir: string): ISession[] {
    let files: string[];
    try {
      files = readdirSync(sessionsDir);
    } catch {
      return [];
    }

    const sessions: ISession[] = [];
    const resolvedBase = resolve(sessionsDir);

    for (const filename of files) {
      if (!filename.endsWith('.jsonl')) continue;

      // Security: prevent path traversal via crafted filenames
      const filePath = join(sessionsDir, filename);
      if (!resolve(filePath).startsWith(resolvedBase + '/')) continue;

      const sessionKey = basename(filename, '.jsonl');
      const events = this.parseJsonlFile(filePath);
      const session = this.summarizeSession(sessionKey, events, agentId);
      if (session) {
        sessions.push(session);
      }
    }

    return sessions;
  }

  /**
   * Load all session summaries from ALL agent directories.
   * Returns one session per agent (the most recent), plus idle placeholders
   * for registered agents with no active sessions.
   */
  getSessions(): ISession[] {
    // Discover all agent directories
    let agentDirs: string[];
    try {
      agentDirs = readdirSync(this.agentsBase);
    } catch {
      return [];
    }

    const bestByAgent = new Map<string, ISession>();

    for (const agentDir of agentDirs) {
      const sessionsDir = join(this.agentsBase, agentDir, 'sessions');
      if (!existsSync(sessionsDir)) continue;

      // Security: prevent path traversal
      const resolvedDir = resolve(join(this.agentsBase, agentDir));
      if (!resolvedDir.startsWith(resolve(this.agentsBase) + '/')) continue;

      const agentId = agentDir;
      const sessions = this.readAgentSessions(agentId, sessionsDir);

      // Keep only the most recent session per agent
      for (const session of sessions) {
        const existing = bestByAgent.get(agentId);
        if (!existing || session.updatedAtMs > existing.updatedAtMs) {
          bestByAgent.set(agentId, session);
        }
      }
    }

    // Add idle placeholders for registered agents with no active sessions
    for (const agentId of this.registeredAgentIds) {
      if (!bestByAgent.has(agentId)) {
        bestByAgent.set(agentId, {
          key: `idle:${agentId}`,
          id: `idle:${agentId}`,
          agentId,
          status: 'idle',
          updatedAt: new Date(0).toISOString(),
          updatedAtMs: 0,
          lastRole: '',
          lastSnippet: '',
          messageCount: 0,
          recentEvents: [],
        });
      }
    }

    // Sort by last updated, most recent first
    const result = Array.from(bestByAgent.values());
    result.sort((a, b) => b.updatedAtMs - a.updatedAtMs);
    return result;
  }
}
