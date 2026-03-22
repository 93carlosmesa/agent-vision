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
import type { ISession, ISessionEvent, SessionStatus, IInteraction, InteractionType } from '../src/types/index.js';

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

  /**
   * Detect real interactions between agents from session data.
   * Looks for tool calls that reference other agent IDs (spawn, send, subagents)
   * and user messages that come from another agent.
   */
  getInteractions(sessions: ISession[]): IInteraction[] {
    const now = Date.now();
    const interactions: IInteraction[] = [];
    const agentSessionKeys = new Map<string, string>();
    for (const s of sessions) agentSessionKeys.set(s.agentId, s.key);

    // Only detect interactions for active agents (running/waiting)
    const activeSessions = sessions.filter(s => s.status === 'running' || s.status === 'waiting');

    for (const session of activeSessions) {
      const agentId = session.agentId;
      const sessionsDir = join(this.agentsBase, agentId, 'sessions');
      if (!existsSync(sessionsDir)) continue;

      // Read the most recent session file for this agent
      const sessionFile = session.key.includes(':')
        ? session.key.split(':').pop() + '.jsonl'
        : session.key + '.jsonl';
      const filePath = join(sessionsDir, sessionFile);
      if (!existsSync(filePath)) continue;

      // Security: prevent path traversal
      if (!resolve(filePath).startsWith(resolve(sessionsDir) + '/')) continue;

      const events = this.parseJsonlFile(filePath);
      // Only check recent events (last 20) for performance
      const recentEvents = events.slice(-20);

      for (const ev of recentEvents) {
        if (ev.type !== 'message' || !ev.message) continue;

        const tsStr = ev.timestamp ?? '';
        const tsMs = tsStr ? new Date(tsStr).getTime() : 0;
        // Only consider events from the last 30s
        if (now - tsMs > 30_000) continue;

        const content = ev.message.content;
        if (!content || !Array.isArray(content)) continue;

        for (const part of content) {
          // Look for tool_use blocks that reference other agents
          if (part.type === 'tool_use') {
            const toolName = (part as Record<string, unknown>).name as string | undefined;
            const toolInput = (part as Record<string, unknown>).input as Record<string, unknown> | undefined;

            if (!toolName || !toolInput) continue;

            const { targetId, interactionType } = this.detectToolInteraction(
              toolName,
              toolInput,
              agentSessionKeys,
            );

            if (targetId) {
              const targetKey = agentSessionKeys.get(targetId);
              if (targetKey) {
                interactions.push({
                  id: `real-${agentId}-${targetId}-${tsMs}`,
                  fromSessionKey: session.key,
                  toSessionKey: targetKey,
                  type: interactionType,
                  label: this.getInteractionLabel(interactionType, toolName),
                  startedAt: tsMs,
                  durationMs: Math.max(5000, now - tsMs),
                });
              }
            }
          }

          // Look for text content that references other agent IDs
          if (part.type === 'text' && part.text && ev.message.role === 'user') {
            for (const [otherId, otherKey] of agentSessionKeys) {
              if (otherId === agentId) continue;
              if (part.text.includes(otherId)) {
                interactions.push({
                  id: `ref-${agentId}-${otherId}-${tsMs}`,
                  fromSessionKey: session.key,
                  toSessionKey: otherKey,
                  type: 'consulting',
                  label: 'referencing agent',
                  startedAt: tsMs,
                  durationMs: Math.max(5000, now - tsMs),
                });
              }
            }
          }
        }
      }
    }

    // Deduplicate: keep the most recent interaction per agent pair
    const uniqueMap = new Map<string, IInteraction>();
    for (const interaction of interactions) {
      const pairKey = `${interaction.fromSessionKey}:${interaction.toSessionKey}`;
      const existing = uniqueMap.get(pairKey);
      if (!existing || interaction.startedAt > existing.startedAt) {
        uniqueMap.set(pairKey, interaction);
      }
    }

    return Array.from(uniqueMap.values());
  }

  private detectToolInteraction(
    toolName: string,
    toolInput: Record<string, unknown>,
    knownAgents: Map<string, string>,
  ): { targetId: string | null; interactionType: InteractionType } {
    const lower = toolName.toLowerCase();

    // Spawn/delegate patterns
    if (lower.includes('spawn') || lower.includes('delegate') || lower.includes('dispatch')) {
      const targetId = this.findAgentRef(toolInput, knownAgents);
      return { targetId, interactionType: 'delegating' };
    }

    // Send/message patterns
    if (lower.includes('send') || lower.includes('message') || lower.includes('notify')) {
      const targetId = this.findAgentRef(toolInput, knownAgents);
      return { targetId, interactionType: 'consulting' };
    }

    // Validate/review patterns
    if (lower.includes('validate') || lower.includes('review') || lower.includes('check') || lower.includes('verify')) {
      const targetId = this.findAgentRef(toolInput, knownAgents);
      return { targetId, interactionType: 'validating' };
    }

    // Generic tool call — check if any input value references a known agent
    const targetId = this.findAgentRef(toolInput, knownAgents);
    if (targetId) {
      return { targetId, interactionType: 'consulting' };
    }

    return { targetId: null, interactionType: 'consulting' };
  }

  private findAgentRef(
    input: Record<string, unknown>,
    knownAgents: Map<string, string>,
  ): string | null {
    const text = JSON.stringify(input).toLowerCase();
    for (const agentId of knownAgents.keys()) {
      if (text.includes(agentId.toLowerCase())) {
        return agentId;
      }
    }
    return null;
  }

  private getInteractionLabel(type: InteractionType, toolName: string): string {
    switch (type) {
      case 'delegating': return `delegating via ${toolName}`;
      case 'validating': return `validating via ${toolName}`;
      case 'consulting': return `consulting via ${toolName}`;
    }
  }
}
