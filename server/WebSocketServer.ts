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
import type { ServerMessage, ClientMessage } from '../src/types/index.js';

const PUSH_INTERVAL_MS = 2500;
const MAX_CONNECTIONS = 10;          // Local dev tool — no reason for many clients
const MAX_MESSAGE_SIZE_BYTES = 4096; // Reject oversized client messages

export class WebSocketServer {
  private wss: WsServer | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  private readonly httpServer: HttpServer;
  private readonly sessionReader: SessionReader;
  private readonly nameResolver: AgentNameResolver;

  constructor(
    httpServer: HttpServer,
    sessionReader: SessionReader,
    nameResolver: AgentNameResolver,
  ) {
    this.httpServer = httpServer;
    this.sessionReader = sessionReader;
    this.nameResolver = nameResolver;
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
          this.handleClientMessage(msg);
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
  }

  /**
   * Broadcast sessions update to all connected clients.
   */
  private broadcastSessions(): void {
    if (!this.wss) return;
    const sessions = this.sessionReader.getSessions();
    const names = this.nameResolver.resolve();

    this.broadcast({ type: 'sessions:update', sessions });
    this.broadcast({ type: 'agentNames:update', names });
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

  handleClientMessage(message: ClientMessage): void {
    // Security: reject unknown message types
    if (!message.type || !WebSocketServer.ALLOWED_CLIENT_TYPES.has(message.type)) {
      return;
    }

    switch (message.type) {
      case 'session:subscribe':
        // Could push detailed session data for this key
        break;
      case 'session:unsubscribe':
        // Could stop sending detail for this key
        break;
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
