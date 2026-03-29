/**
 * ClaudeWatcher — Reads Claude Code JSONL session files in real time.
 *
 * Single Responsibility: Incremental JSONL polling and event emission.
 * Inspired by pixel-agents (pablodelucca/pixel-agents):
 *   - Polling by fileOffset every 500ms
 *   - Max 64KB per read cycle
 *   - Line-by-line parsing with try/catch
 *
 * Does NOT resolve agent names (SessionResolver does that).
 * Does NOT broadcast to clients (WebSocketServer does that).
 */

import { EventEmitter } from 'events';
import { openSync, readSync, fstatSync, closeSync, readdirSync, existsSync } from 'fs';
import { join, basename, resolve } from 'path';
import type { SessionResolver } from './SessionResolver.js';
import type {
  IClaudeEvent,
  IClaudeWatcherSession,
  IClaudeWatcherDebugInfo,
} from '../src/types/IClaudeEvent.js';
import { formatToolStatus } from '../src/utils/toolStatusMapper.js';

const POLL_INTERVAL_MS = 500;
const SCAN_INTERVAL_MS = 5_000;
const MAX_READ_BYTES = 65_536; // 64KB per cycle
const TEXT_IDLE_DELAY_MS = 4_000;
const PERMISSION_TIMER_MS = 8_000;

/** Tools that never require user permission approval */
const PERMISSION_EXEMPT_TOOLS = new Set([
  'Task', 'Agent', 'AskUserQuestion', 'TodoWrite', 'EnterPlanMode',
  'ExitPlanMode', 'Read', 'Glob', 'Grep',
]);

/** Content block with tool_use */
interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

/** Content block with tool_result */
interface ToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content?: string;
}

/** Subagent progress content */
interface SubagentBlock {
  type: 'tool_use' | 'tool_result';
  id?: string;
  tool_use_id?: string;
  name?: string;
  input?: Record<string, unknown>;
}

/** Raw JSONL line structure from Claude Code */
interface ClaudeJsonlLine {
  type?: string;
  subtype?: string;
  role?: string;
  message?: {
    role: string;
    content?: Array<ToolUseBlock | ToolResultBlock | SubagentBlock | { type: string; text?: string }>;
  };
  content?: Array<ToolUseBlock | ToolResultBlock | SubagentBlock | { type: string; text?: string }>;
  operation?: string;
  tool_use_id?: string;
  parentToolId?: string;
  timestamp?: string;
  isoTimestamp?: string;
  duration_ms?: number;
  sessionId?: string;
}

export class ClaudeWatcher extends EventEmitter {
  private readonly claudeBase: string;
  private readonly resolver: SessionResolver;
  private sessions: Map<string, IClaudeWatcherSession> = new Map();
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private scanTimer: ReturnType<typeof setInterval> | null = null;
  private idleTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private permissionTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  constructor(claudeProjectsBase: string, sessionResolver: SessionResolver) {
    super();
    this.claudeBase = claudeProjectsBase;
    this.resolver = sessionResolver;
  }

  /**
   * Start watching Claude Code JSONL files.
   * Performs initial scan, then polls at POLL_INTERVAL_MS.
   */
  start(): void {
    this.scanForSessions();
    this.pollTimer = setInterval(() => this.pollAll(), POLL_INTERVAL_MS);
    this.scanTimer = setInterval(() => this.scanForSessions(), SCAN_INTERVAL_MS);
  }

  /**
   * Stop all timers and clean up.
   */
  stop(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
      this.scanTimer = null;
    }
    for (const timer of this.idleTimers.values()) clearTimeout(timer);
    for (const timer of this.permissionTimers.values()) clearTimeout(timer);
    this.idleTimers.clear();
    this.permissionTimers.clear();
  }

  /**
   * Get all tracked sessions.
   */
  getSessions(): IClaudeWatcherSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get debug info for all tracked sessions.
   */
  getDebugInfo(): IClaudeWatcherDebugInfo[] {
    return Array.from(this.sessions.values()).map((s) => ({
      filePath: s.filePath,
      fileOffset: s.fileOffset,
      agentId: s.agentId,
      sessionKey: s.sessionKey,
      activeToolCount: s.activeToolIds.size,
      activeToolNames: Array.from(s.activeToolNames.values()),
      backgroundAgentCount: s.backgroundAgentToolIds.size,
      linesProcessed: s.linesProcessed,
      lastDataAt: s.lastDataAt,
    }));
  }

  /**
   * Get active tools for a specific agentId.
   */
  getActiveToolsForAgent(agentId: string): Array<{ toolId: string; toolName: string; status: string; startedAt: number }> {
    for (const session of this.sessions.values()) {
      if (session.agentId !== agentId) continue;
      const tools: Array<{ toolId: string; toolName: string; status: string; startedAt: number }> = [];
      for (const toolId of session.activeToolIds) {
        tools.push({
          toolId,
          toolName: session.activeToolNames.get(toolId) ?? 'unknown',
          status: session.activeToolStatuses.get(toolId) ?? '',
          startedAt: session.lastDataAt,
        });
      }
      return tools;
    }
    return [];
  }

  /**
   * Scan ~/.claude/projects/ for JSONL files and register new sessions.
   */
  private scanForSessions(): void {
    if (!existsSync(this.claudeBase)) return;

    const resolvedBase = resolve(this.claudeBase);
    let projectDirs: string[];
    try {
      projectDirs = readdirSync(this.claudeBase);
    } catch {
      return;
    }

    for (const projectDir of projectDirs) {
      const projectPath = join(this.claudeBase, projectDir);
      // Security: path traversal prevention
      if (!resolve(projectPath).startsWith(resolvedBase + '/')) continue;

      let files: string[];
      try {
        files = readdirSync(projectPath);
      } catch {
        continue;
      }

      for (const file of files) {
        if (!file.endsWith('.jsonl')) continue;

        const filePath = join(projectPath, file);
        // Security: path traversal prevention
        if (!resolve(filePath).startsWith(resolve(projectPath) + '/')) continue;

        if (this.sessions.has(filePath)) continue;

        const agentId = this.resolver.resolve(filePath);
        const sessionKey = `claude:${agentId}:${basename(file, '.jsonl')}`;

        this.sessions.set(filePath, {
          filePath,
          fileOffset: 0,
          lineBuffer: '',
          agentId,
          sessionKey,
          activeToolIds: new Set(),
          activeToolStatuses: new Map(),
          activeToolNames: new Map(),
          backgroundAgentToolIds: new Set(),
          hadToolsInTurn: false,
          lastDataAt: 0,
          linesProcessed: 0,
        });

        this.emitEvent({
          type: 'new_session',
          agentId,
          sessionKey,
          timestamp: Date.now(),
        });
      }
    }
  }

  /**
   * Poll all tracked sessions for new data.
   */
  private pollAll(): void {
    for (const session of this.sessions.values()) {
      this.pollSession(session);
    }
  }

  /**
   * Read new data from a single session file and process lines.
   */
  private pollSession(session: IClaudeWatcherSession): void {
    let fd: number;
    try {
      fd = openSync(session.filePath, 'r');
    } catch {
      return;
    }

    try {
      const stat = fstatSync(fd);
      if (stat.size <= session.fileOffset) return;

      const bytesToRead = Math.min(stat.size - session.fileOffset, MAX_READ_BYTES);
      const buffer = Buffer.alloc(bytesToRead);
      const bytesRead = readSync(fd, buffer, 0, bytesToRead, session.fileOffset);

      if (bytesRead === 0) return;

      session.fileOffset += bytesRead;
      const chunk = session.lineBuffer + buffer.toString('utf-8', 0, bytesRead);
      const lines = chunk.split('\n');

      // Last element is either empty (complete line) or partial (keep in buffer)
      session.lineBuffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        try {
          const parsed = JSON.parse(trimmed) as ClaudeJsonlLine;
          this.processLine(session, parsed);
          session.linesProcessed++;
        } catch {
          // Skip malformed lines
        }
      }
    } finally {
      closeSync(fd);
    }
  }

  /**
   * Process a single parsed JSONL line and emit appropriate events.
   */
  private processLine(session: IClaudeWatcherSession, line: ClaudeJsonlLine): void {
    const now = Date.now();
    session.lastDataAt = now;

    const role = line.role ?? line.message?.role;
    const content = line.content ?? line.message?.content;
    const lineType = line.type;

    // Handle assistant messages
    if (role === 'assistant' && Array.isArray(content)) {
      this.processAssistantContent(session, content, now);
    }

    // Handle user/tool_result messages
    if ((role === 'user' || role === 'toolResult') && Array.isArray(content)) {
      this.processToolResults(session, content, now);
    }

    // Handle turn_duration (system subtype)
    if (lineType === 'system' && line.subtype === 'turn_duration') {
      this.handleTurnEnd(session, now);
    }

    // Handle agent progress (subagent events)
    if (lineType === 'progress' || lineType === 'agent_progress') {
      this.processAgentProgress(session, content, now);
    }

    // Handle queue-operation (background agents completing)
    if (lineType === 'queue-operation' && line.operation === 'enqueue') {
      this.handleBackgroundAgentDone(session, line, now);
    }
  }

  /**
   * Process assistant content blocks for tool_use starts.
   */
  private processAssistantContent(
    session: IClaudeWatcherSession,
    content: Array<ToolUseBlock | SubagentBlock | { type: string; text?: string }>,
    now: number,
  ): void {
    let hasTools = false;

    for (const block of content) {
      if (block.type === 'tool_use' && 'id' in block && 'name' in block) {
        const toolBlock = block as ToolUseBlock;
        hasTools = true;
        session.hadToolsInTurn = true;

        const toolStatus = formatToolStatus(toolBlock.name, toolBlock.input ?? {});
        session.activeToolIds.add(toolBlock.id);
        session.activeToolNames.set(toolBlock.id, toolBlock.name);
        session.activeToolStatuses.set(toolBlock.id, toolStatus);

        // Check if this is a subagent spawn
        if (toolBlock.name === 'Agent' || toolBlock.name === 'Task') {
          this.emitEvent({
            type: 'subagent_spawn',
            agentId: session.agentId,
            sessionKey: session.sessionKey,
            timestamp: now,
            toolId: toolBlock.id,
            toolName: toolBlock.name,
            toolStatus,
          });
        }

        this.emitEvent({
          type: 'tool_start',
          agentId: session.agentId,
          sessionKey: session.sessionKey,
          timestamp: now,
          toolId: toolBlock.id,
          toolName: toolBlock.name,
          toolStatus,
        });

        // Clear any existing idle timer
        this.clearIdleTimer(session.sessionKey);

        // Start permission timer for non-exempt tools
        if (!PERMISSION_EXEMPT_TOOLS.has(toolBlock.name)) {
          this.startPermissionTimer(session, toolBlock.id, toolBlock.name, now);
        }
      }
    }

    // If assistant message has only text (no tools), start idle timer
    if (!hasTools) {
      this.startIdleTimer(session, now);
    }
  }

  /**
   * Process tool_result content blocks.
   */
  private processToolResults(
    session: IClaudeWatcherSession,
    content: Array<ToolResultBlock | SubagentBlock | { type: string; text?: string }>,
    now: number,
  ): void {
    for (const block of content) {
      if (block.type === 'tool_result' && 'tool_use_id' in block) {
        const resultBlock = block as ToolResultBlock;
        const toolId = resultBlock.tool_use_id;

        const toolName = session.activeToolNames.get(toolId);
        session.activeToolIds.delete(toolId);
        session.activeToolStatuses.delete(toolId);
        session.activeToolNames.delete(toolId);

        // Clear permission timer for this tool
        this.clearPermissionTimer(toolId);

        // If this was a background agent tool, remove it
        session.backgroundAgentToolIds.delete(toolId);

        this.emitEvent({
          type: 'tool_done',
          agentId: session.agentId,
          sessionKey: session.sessionKey,
          timestamp: now,
          toolId,
          toolName: toolName ?? 'unknown',
        });

        // If no more active tools and no pending permission, emit permission_clear
        if (session.activeToolIds.size === 0) {
          this.emitEvent({
            type: 'permission_clear',
            agentId: session.agentId,
            sessionKey: session.sessionKey,
            timestamp: now,
          });
        }
      }
    }
  }

  /**
   * Handle turn_end (system turn_duration subtype).
   */
  private handleTurnEnd(session: IClaudeWatcherSession, now: number): void {
    // Clear all active tools for this session
    session.activeToolIds.clear();
    session.activeToolStatuses.clear();
    session.activeToolNames.clear();

    this.emitEvent({
      type: 'turn_end',
      agentId: session.agentId,
      sessionKey: session.sessionKey,
      timestamp: now,
    });

    // After turn end, agent is waiting for next user input
    this.emitEvent({
      type: 'waiting',
      agentId: session.agentId,
      sessionKey: session.sessionKey,
      timestamp: now,
    });

    session.hadToolsInTurn = false;
    this.clearIdleTimer(session.sessionKey);
    this.clearAllPermissionTimers(session);
  }

  /**
   * Process subagent/progress events.
   */
  private processAgentProgress(
    session: IClaudeWatcherSession,
    content: Array<ToolUseBlock | ToolResultBlock | SubagentBlock | { type: string; text?: string }> | undefined,
    now: number,
  ): void {
    if (!Array.isArray(content)) return;

    for (const block of content) {
      if (block.type === 'tool_use' && 'id' in block && 'name' in block) {
        const subBlock = block as ToolUseBlock;
        const toolStatus = formatToolStatus(subBlock.name, subBlock.input ?? {});

        this.emitEvent({
          type: 'tool_start',
          agentId: session.agentId,
          sessionKey: session.sessionKey,
          timestamp: now,
          toolId: subBlock.id,
          toolName: subBlock.name,
          toolStatus,
          parentToolId: session.activeToolIds.size > 0
            ? Array.from(session.activeToolIds)[0]
            : undefined,
        });
      }

      if (block.type === 'tool_result' && 'tool_use_id' in block) {
        const resultBlock = block as ToolResultBlock;
        this.emitEvent({
          type: 'tool_done',
          agentId: session.agentId,
          sessionKey: session.sessionKey,
          timestamp: now,
          toolId: resultBlock.tool_use_id,
        });
      }
    }
  }

  /**
   * Handle background agent completion via queue-operation enqueue.
   */
  private handleBackgroundAgentDone(session: IClaudeWatcherSession, line: ClaudeJsonlLine, now: number): void {
    const toolId = line.tool_use_id;
    if (toolId) {
      session.backgroundAgentToolIds.delete(toolId);
    }

    this.emitEvent({
      type: 'subagent_done',
      agentId: session.agentId,
      sessionKey: session.sessionKey,
      timestamp: now,
      toolId: toolId ?? undefined,
    });
  }

  /**
   * Start idle timer — emits 'waiting' after TEXT_IDLE_DELAY_MS if no new tools appear.
   */
  private startIdleTimer(session: IClaudeWatcherSession, now: number): void {
    this.clearIdleTimer(session.sessionKey);

    const timer = setTimeout(() => {
      this.idleTimers.delete(session.sessionKey);
      this.emitEvent({
        type: 'waiting',
        agentId: session.agentId,
        sessionKey: session.sessionKey,
        timestamp: Date.now(),
      });
    }, TEXT_IDLE_DELAY_MS);

    this.idleTimers.set(session.sessionKey, timer);
  }

  private clearIdleTimer(sessionKey: string): void {
    const timer = this.idleTimers.get(sessionKey);
    if (timer) {
      clearTimeout(timer);
      this.idleTimers.delete(sessionKey);
    }
  }

  /**
   * Start permission timer — emits 'permission_needed' if a non-exempt tool
   * doesn't get a result within PERMISSION_TIMER_MS.
   */
  private startPermissionTimer(
    session: IClaudeWatcherSession,
    toolId: string,
    toolName: string,
    now: number,
  ): void {
    this.clearPermissionTimer(toolId);

    const timer = setTimeout(() => {
      this.permissionTimers.delete(toolId);
      // Only emit if tool is still active (no result received)
      if (session.activeToolIds.has(toolId)) {
        this.emitEvent({
          type: 'permission_needed',
          agentId: session.agentId,
          sessionKey: session.sessionKey,
          timestamp: Date.now(),
          toolId,
          toolName,
        });
      }
    }, PERMISSION_TIMER_MS);

    this.permissionTimers.set(toolId, timer);
  }

  private clearPermissionTimer(toolId: string): void {
    const timer = this.permissionTimers.get(toolId);
    if (timer) {
      clearTimeout(timer);
      this.permissionTimers.delete(toolId);
    }
  }

  private clearAllPermissionTimers(session: IClaudeWatcherSession): void {
    for (const toolId of session.activeToolIds) {
      this.clearPermissionTimer(toolId);
    }
  }

  private emitEvent(event: IClaudeEvent): void {
    this.emit('claude-event', event);
  }
}
