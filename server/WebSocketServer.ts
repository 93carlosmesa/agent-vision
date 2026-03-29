/**
 * WebSocketServer — Manages WebSocket connections and broadcasting.
 *
 * Single Responsibility: Connection lifecycle and message dispatch.
 * Receives SessionReader + AgentNameResolver as dependencies (DI).
 * Pushes real-time updates to all connected clients every 2.5s.
 */

import { WebSocketServer as WsServer, WebSocket } from 'ws';
import type { Server as HttpServer } from 'http';
import type { SessionReader } from './SessionReader.js';
import type { AgentNameResolver } from './AgentNameResolver.js';
import type { ClaudeWatcher } from './ClaudeWatcher.js';
import type { ServerMessage, ClientMessage, IClaudeEvent } from '../src/types/index.js';

const PUSH_INTERVAL_MS = 1500;
const MAX_CONNECTIONS = 10;          // Local dev tool — no reason for many clients
const MAX_MESSAGE_SIZE_BYTES = 4096; // Reject oversized client messages

export class WebSocketServer {
  private wss: WsServer | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  private readonly httpServer: HttpServer;
  private readonly sessionReader: SessionReader;
  private readonly nameResolver: AgentNameResolver;
  private readonly claudeWatcher: ClaudeWatcher | null;

  constructor(
    httpServer: HttpServer,
    sessionReader: SessionReader,
    nameResolver: AgentNameResolver,
    claudeWatcher?: ClaudeWatcher | null,
  ) {
    this.httpServer = httpServer;
    this.sessionReader = sessionReader;
    this.nameResolver = nameResolver;
    this.claudeWatcher = claudeWatcher ?? null;
  }

  /**
   * Initialize the WebSocket server, bind to httpServer.
   * Starts push interval once at least one client connects.
   */
  setup(): void {
    this.wss = new WsServer({
      server: this.httpServer,
      maxPayload: MAX_MESSAGE_SIZE_BYTES,
    });

    this.wss.on('connection', (ws: WebSocket) => {
      // Security: enforce max concurrent connections
      if (this.wss!.clients.size > MAX_CONNECTIONS) {
        ws.close(1013, 'Too many connections');
        return;
      }
      // Send initial state to the new client
      this.sendTo(ws, {
        type: 'sessions:update',
        sessions: this.sessionReader.getSessions(),
      });
      this.sendTo(ws, {
        type: 'agentNames:update',
        names: this.nameResolver.resolve(),
      });

      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString()) as ClientMessage;
          this.handleClientMessage(msg, ws);
        } catch {
          // Ignore malformed messages
        }
      });

      ws.on('error', () => {
        // Client error — will close automatically
      });
    });

    // Start periodic push
    this.intervalId = setInterval(() => {
      this.broadcastSessions();
    }, PUSH_INTERVAL_MS);

    // Subscribe to ClaudeWatcher events for real-time tool activity
    if (this.claudeWatcher) {
      this.claudeWatcher.on('claude-event', (event: IClaudeEvent) => {
        this.handleClaudeEvent(event);
      });
    }
  }

  /**
   * Broadcast sessions + interactions update to all connected clients.
   * Enriches sessions with ClaudeWatcher data when available.
   */
  private broadcastSessions(): void {
    if (!this.wss) return;
    const sessions = this.sessionReader.getSessions();
    const names = this.nameResolver.resolve();
    const interactions = this.sessionReader.getInteractions(sessions);

    // Enrich sessions with active tool data from ClaudeWatcher
    if (this.claudeWatcher) {
      for (const session of sessions) {
        const tools = this.claudeWatcher.getActiveToolsForAgent(session.agentId);
        if (tools.length > 0) {
          session.activeTools = tools;
          session.currentActivity = tools[tools.length - 1].status;
        }
      }
    }

    this.broadcast({ type: 'sessions:update', sessions });
    this.broadcast({ type: 'agentNames:update', names });
    this.broadcast({ type: 'interactions:update', interactions });
  }

  /**
   * Broadcast a message to all connected clients.
   */
  broadcast(message: ServerMessage): void {
    if (!this.wss) return;
    const payload = JSON.stringify(message);
    for (const client of this.wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }

  /**
   * Send a message to a single WebSocket client.
   */
  private sendTo(ws: WebSocket, message: ServerMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Handle an incoming client message.
   */
  private static ALLOWED_CLIENT_TYPES = new Set([
    'session:subscribe',
    'session:unsubscribe',
  ]);

  handleClientMessage(message: ClientMessage, ws?: WebSocket): void {
    // Security: reject unknown message types
    if (!message.type || !WebSocketServer.ALLOWED_CLIENT_TYPES.has(message.type)) {
      return;
    }

    switch (message.type) {
      case 'session:subscribe':
        // Send tool history for this session if available
        if (ws && this.claudeWatcher) {
          const history = this.claudeWatcher.getToolHistory(message.sessionKey);
          this.sendTo(ws, {
            type: 'agent:tool_history',
            sessionKey: message.sessionKey,
            history,
          });
        }
        break;
      case 'session:unsubscribe':
        break;
    }
  }

  /**
   * Handle a ClaudeWatcher event and broadcast immediately.
   */
  private handleClaudeEvent(event: IClaudeEvent): void {
    switch (event.type) {
      case 'tool_start':
        this.broadcast({
          type: 'agent:tool_activity',
          agentId: event.agentId,
          sessionKey: event.sessionKey,
          toolId: event.toolId ?? '',
          toolName: event.toolName ?? '',
          status: event.toolStatus ?? '',
          action: 'start',
          timestamp: event.timestamp,
        });
        break;

      case 'tool_done':
        this.broadcast({
          type: 'agent:tool_activity',
          agentId: event.agentId,
          sessionKey: event.sessionKey,
          toolId: event.toolId ?? '',
          toolName: event.toolName ?? '',
          status: '',
          action: 'done',
          timestamp: event.timestamp,
        });
        break;

      case 'turn_end':
        this.broadcast({
          type: 'agent:status_change',
          agentId: event.agentId,
          sessionKey: event.sessionKey,
          status: 'waiting',
          turnCompleted: true,
          timestamp: event.timestamp,
        });
        // Clear all tools for this agent
        this.broadcast({
          type: 'agent:tool_activity',
          agentId: event.agentId,
          sessionKey: event.sessionKey,
          toolId: '',
          toolName: '',
          status: '',
          action: 'clear',
          timestamp: event.timestamp,
        });
        break;

      case 'waiting':
        this.broadcast({
          type: 'agent:status_change',
          agentId: event.agentId,
          sessionKey: event.sessionKey,
          status: 'waiting',
          timestamp: event.timestamp,
        });
        break;

      case 'permission_needed':
        this.broadcast({
          type: 'agent:status_change',
          agentId: event.agentId,
          sessionKey: event.sessionKey,
          status: 'waiting',
          isWaitingPermission: true,
          activity: event.toolStatus ?? `Permiso: ${event.toolName ?? 'tool'}`,
          timestamp: event.timestamp,
        });
        break;

      case 'permission_clear':
        this.broadcast({
          type: 'agent:status_change',
          agentId: event.agentId,
          sessionKey: event.sessionKey,
          status: 'running',
          isWaitingPermission: false,
          timestamp: event.timestamp,
        });
        break;

      case 'subagent_spawn':
        this.broadcast({
          type: 'agent:tool_activity',
          agentId: event.agentId,
          sessionKey: event.sessionKey,
          toolId: event.toolId ?? '',
          toolName: event.toolName ?? 'Agent',
          status: event.toolStatus ?? 'Subagente iniciado',
          action: 'start',
          timestamp: event.timestamp,
        });
        break;

      case 'subagent_done':
        this.broadcast({
          type: 'agent:tool_activity',
          agentId: event.agentId,
          sessionKey: event.sessionKey,
          toolId: event.toolId ?? '',
          toolName: 'Agent',
          status: '',
          action: 'done',
          timestamp: event.timestamp,
        });
        break;

      // new_session — no broadcast needed, next poll cycle picks it up
    }
  }

  /**
   * Gracefully stop the push interval.
   */
  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
