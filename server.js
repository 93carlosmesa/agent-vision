const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');
const net = require('net');

const app = express();
const SESSIONS_DIR = path.join(os.homedir(), '.openclaw', 'agents', 'main', 'sessions');
const USER_ASSETS_DIR = path.join(os.homedir(), '.openclaw', 'assets');
const DEFAULT_PORT = 4173;

app.use(express.static(path.join(__dirname, 'public')));
app.use('/user-assets', express.static(USER_ASSETS_DIR));

function parseJsonlFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    return lines.map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(Boolean);
  } catch {
    return [];
  }
}

function extractSnippet(content) {
  if (!Array.isArray(content)) return '';
  for (const block of content) {
    if (block.type === 'text' && block.text) return String(block.text).slice(0, 180);
    if (block.type === 'tool_use') return `Tool: ${block.name || 'unknown'}`;
    if (block.type === 'tool_result') return 'Tool result';
  }
  return '';
}

function cleanSnippet(snippet) {
  return String(snippet || '')
    .replace(/\[\[reply_to_current\]\]\s*/g, '')
    .replace(/^Sender \(untrusted metadata\):[\s\S]*?\n\n/m, '')
    .replace(/^```json[\s\S]*?```\s*/m, '')
    .trim();
}

function getStatus(lastRole, lastEvent, lastTimestamp) {
  const now = Date.now();
  const ageSec = (now - lastTimestamp) / 1000;

  if (lastRole === 'assistant' && ageSec < 20) return 'running';
  if (lastEvent?.type === 'message' && (lastRole === 'user' || lastRole === 'tool_result') && ageSec < 60) return 'waiting';
  return 'idle';
}

function summarizeSession(sessionKey, events) {
  if (!events.length) return null;

  const sessionMeta = events.find((e) => e.type === 'session');
  const messages = events.filter((e) => e.type === 'message' && e.message);
  const lastEvent = events[events.length - 1];
  const lastMessage = messages[messages.length - 1];

  const lastTimestamp = lastEvent?.timestamp ? new Date(lastEvent.timestamp).getTime() : 0;

  let lastRole = '';
  let lastSnippet = '';
  if (lastMessage?.message) {
    lastRole = lastMessage.message.role || '';
    lastSnippet = cleanSnippet(extractSnippet(lastMessage.message.content));
  }

  const status = getStatus(lastRole, lastEvent, lastTimestamp);

  const recentEvents = messages.slice(-12).map((e) => ({
    id: e.id,
    timestamp: e.timestamp,
    role: e.message.role,
    snippet: cleanSnippet(extractSnippet(e.message.content)),
  }));

  return {
    key: sessionKey,
    id: sessionMeta ? sessionMeta.id : sessionKey,
    updatedAt: new Date(lastTimestamp).toISOString(),
    updatedAtMs: lastTimestamp,
    lastRole,
    lastSnippet,
    status,
    messageCount: messages.length,
    recentEvents,
  };
}

function resolveAgentIdFromKey(sessionKey) {
  // session keys look like: agent:<agentId>:<rest> or just a UUID
  // Also check sessions.json for mapping
  try {
    const sessionsJsonPath = path.join(SESSIONS_DIR, 'sessions.json');
    const sessionsMap = JSON.parse(fs.readFileSync(sessionsJsonPath, 'utf-8'));
    for (const [key, val] of Object.entries(sessionsMap)) {
      // Match by session ID in the key
      if (key.includes(sessionKey) || (val && val.sessionId === sessionKey)) {
        // Extract agentId from session key like "agent:main:..."
        const parts = key.split(':');
        if (parts.length >= 2 && parts[0] === 'agent') return parts[1];
      }
    }
  } catch { /* ignore */ }
  return 'main';
}

function loadSessionSummaries() {
  const files = fs.readdirSync(SESSIONS_DIR).filter((f) => f.endsWith('.jsonl') && !f.includes('.reset.') && !f.includes('.lock'));
  const sessions = [];

  for (const file of files) {
    const sessionKey = file.replace('.jsonl', '');
    const events = parseJsonlFile(path.join(SESSIONS_DIR, file));
    const summary = summarizeSession(sessionKey, events);
    if (summary) {
      summary.agentId = resolveAgentIdFromKey(sessionKey);
      sessions.push(summary);
    }
  }

  sessions.sort((a, b) => b.updatedAtMs - a.updatedAtMs);
  return sessions;
}

app.get('/api/sessions', (_req, res) => {
  try {
    res.json({ sessions: loadSessionSummaries() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sessions/:sessionKey', (req, res) => {
  try {
    const { sessionKey } = req.params;
    const filePath = path.join(SESSIONS_DIR, `${sessionKey}.jsonl`);
    const events = parseJsonlFile(filePath);
    const summary = summarizeSession(sessionKey, events);

    if (!summary) {
      return res.status(404).json({ error: 'Session not found' });
    }

    return res.json({
      session: summary,
      events: events
        .filter((e) => e.type === 'message' && e.message)
        .slice(-120)
        .map((e) => ({
          id: e.id,
          timestamp: e.timestamp,
          role: e.message.role,
          snippet: cleanSnippet(extractSnippet(e.message.content)),
        })),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/timeline', (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 300);
    const sessions = loadSessionSummaries();
    const allEvents = [];

    for (const s of sessions) {
      for (const e of s.recentEvents) {
        allEvents.push({
          sessionKey: s.key,
          ...e,
        });
      }
    }

    allEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json({ events: allEvents.slice(0, limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/agent-names', (_req, res) => {
  try {
    const configPath = path.join(os.homedir(), '.openclaw', 'openclaw.json');
    const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const agents = (cfg.agents && cfg.agents.list) || [];
    const nameMap = {};
    for (const a of agents) {
      const id = a.id || '';
      const name = a.name || (a.identity && a.identity.name) || id;
      const emoji = (a.identity && a.identity.emoji) || '';
      nameMap[id] = (emoji + ' ' + name).trim();
    }
    // Default for main — always use identity name
    if (!nameMap.main || nameMap.main === 'main') nameMap.main = '🧠 Samantha';
    res.json(nameMap);
  } catch (err) {
    res.json({ main: '🧠 Samantha' });
  }
});

app.get('/api/backgrounds', (_req, res) => {
  const officeFile = 'agentvision-office.png';
  const beachFile = 'agentvision-beach.png';
  const assetsDir = path.join(os.homedir(), '.openclaw', 'assets');

  const officePath = path.join(assetsDir, officeFile);
  const beachPath = path.join(assetsDir, beachFile);

  const officeExists = fs.existsSync(officePath);
  const beachExists = fs.existsSync(beachPath);

  res.json({
    office: officeExists ? `/user-assets/${officeFile}` : null,
    beach: beachExists ? `/user-assets/${beachFile}` : null,
  });
});

function isPortFree(port) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once('error', () => resolve(false));
    srv.once('listening', () => {
      srv.close();
      resolve(true);
    });
    srv.listen(port);
  });
}

async function startServer() {
  let port = DEFAULT_PORT;
  if (!(await isPortFree(port))) {
    port = await new Promise((resolve) => {
      const srv = net.createServer();
      srv.listen(0, () => {
        const p = srv.address().port;
        srv.close(() => resolve(p));
      });
    });
  }

  app.listen(port, () => {
    console.log(`Agent Vision running at http://localhost:${port}`);
  });
}

startServer();
