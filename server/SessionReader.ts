/**
 * SessionReader — Reads and parses .jsonl session files.
 *
 * Single Responsibility: File I/O and JSONL parsing.
 * Does NOT resolve agent names (that's AgentNameResolver).
 * Does NOT broadcast updates (that's WebSocketServer).
 */

import { readFileSync, readdirSync } from 'fs';
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
  private readonly sessionsDir: string;

  constructor(sessionsDir: string) {
    this.sessionsDir = sessionsDir;
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
  summarizeSession(sessionKey: string, events: RawEvent[]): ISession | null {
    if (events.length === 0) return null;

    // First event should be the session metadata
    const sessionMeta = events[0];
    const sessionId = (typeof sessionMeta.id === 'string' ? sessionMeta.id : '') || sessionKey;

    // Derive agentId from file path / session key (filename stem)
    const agentId = 'main';

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
   * Load all session summaries from the sessions directory.
   */
  getSessions(): ISession[] {
    let files: string[];
    try {
      files = readdirSync(this.sessionsDir);
    } catch {
      return [];
    }

    const sessions: ISession[] = [];

    for (const filename of files) {
      // Only process active .jsonl files (skip .reset, .deleted, etc.)
      if (!filename.endsWith('.jsonl')) continue;

      // Security: prevent path traversal via crafted filenames
      const filePath = join(this.sessionsDir, filename);
      if (!resolve(filePath).startsWith(resolve(this.sessionsDir) + '/')) continue;
      const sessionKey = basename(filename, '.jsonl');
      const events = this.parseJsonlFile(filePath);
      const session = this.summarizeSession(sessionKey, events);
      if (session) {
        sessions.push(session);
      }
    }

    // Sort by last updated, most recent first
    sessions.sort((a, b) => b.updatedAtMs - a.updatedAtMs);
    return sessions;
  }
}
