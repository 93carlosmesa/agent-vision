/**
 * Server entry point — Bootstrap only.
 *
 * Responsibility: Create Express app + HTTP server, wire modules, start listening.
 * NO business logic here; all logic lives in dedicated modules (SRP).
 */

import express from 'express';
import { createServer } from 'http';
import { join, resolve } from 'path';
import { homedir } from 'os';
import { existsSync } from 'fs';
import { SessionReader } from './SessionReader.js';
import { AgentNameResolver } from './AgentNameResolver.js';
import { WebSocketServer } from './WebSocketServer.js';
import { SessionResolver } from './SessionResolver.js';
import { ClaudeWatcher } from './ClaudeWatcher.js';

const PORT = Number(process.env.PORT) || 4173;

// Paths to OpenClaw data
const AGENTS_BASE = join(homedir(), '.openclaw', 'agents');
const OPENCLAW_CONFIG = join(homedir(), '.openclaw', 'openclaw.json');

// Path to Claude Code projects
const CLAUDE_PROJECTS_BASE = join(homedir(), '.claude', 'projects');

// Static files directory: prefer Vite build (dist), fallback to public
const DIST_DIR = resolve('dist');
const PUBLIC_DIR = resolve('public');
const STATIC_DIR = DIST_DIR;

// ─── Express app ───
const app = express();
app.use(express.json());

// Serve static bundle: dist first, fallback to public for safety
const staticDir = existsSync(STATIC_DIR) ? STATIC_DIR : PUBLIC_DIR;
app.use(express.static(staticDir));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Domain modules ───
const sessionReader = new SessionReader(AGENTS_BASE);
const nameResolver = new AgentNameResolver(OPENCLAW_CONFIG);

// Register all known agents so idle ones still appear
sessionReader.setRegisteredAgents(nameResolver.getAgentIds());

// ─── Legacy REST compatibility for v1 UI ───
// v1 frontend expects these routes while v2 uses WebSocket pushes.
app.get('/api/sessions', (_req, res) => {
  const sessions = sessionReader.getSessions();
  res.json({ sessions });
});

app.get('/api/timeline', (req, res) => {
  const sessions = sessionReader.getSessions();
  const limitRaw = Number(req.query.limit);
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 500) : 120;

  const events = sessions
    .flatMap((s) =>
      (s.recentEvents || []).map((ev) => ({
        ...ev,
        sessionKey: s.key,
      }))
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);

  res.json({ events });
});

app.get('/api/agent-names', (_req, res) => {
  res.json(nameResolver.resolve());
});

app.get('/api/sessions/:sessionKey', (req, res) => {
  const sessionKey = req.params.sessionKey;
  const sessions = sessionReader.getSessions();
  const session = sessions.find((s) => s.key === sessionKey);

  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  // v1 detail pane needs `events`; recentEvents are enough for lightweight view.
  res.json({
    session,
    events: session.recentEvents || [],
  });
});

// SPA fallback for React Router or direct deep links
app.use((req, res, next) => {
  if (req.path.startsWith('/api/') || req.path === '/health') return next();
  res.sendFile(resolve(staticDir, 'index.html'));
});

// ─── Claude Code integration (graceful if ~/.claude/ doesn't exist) ───
let claudeWatcher: ClaudeWatcher | null = null;
if (existsSync(CLAUDE_PROJECTS_BASE)) {
  const sessionResolver = new SessionResolver();
  claudeWatcher = new ClaudeWatcher(CLAUDE_PROJECTS_BASE, sessionResolver);
  claudeWatcher.start();
  console.log(`[agent-vision] ClaudeWatcher started — monitoring ${CLAUDE_PROJECTS_BASE}`);
} else {
  console.log('[agent-vision] Claude Code not detected — ClaudeWatcher disabled');
}

// ─── HTTP server ───
const httpServer = createServer(app);

const wsServer = new WebSocketServer(httpServer, sessionReader, nameResolver, claudeWatcher);

// ─── Start WebSocket server ───
wsServer.setup();

// ─── Listen ───
// Security: bind to loopback only — this is a local dev tool, not a public service.
const BIND_HOST = process.env.BIND_HOST || '127.0.0.1';

httpServer.listen(PORT, BIND_HOST, () => {
  console.log(`[agent-vision] Server running at http://${BIND_HOST}:${PORT}`);
  console.log(`[agent-vision] Agents base: ${AGENTS_BASE}`);
  console.log(`[agent-vision] Config: ${OPENCLAW_CONFIG}`);
});

export { app, httpServer };
