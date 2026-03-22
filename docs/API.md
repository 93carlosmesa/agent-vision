# API Reference

Complete reference for Agent Vision's REST and WebSocket APIs.

## Base URL

```
http://127.0.0.1:4173
```

Server binds to loopback only (`BIND_HOST=127.0.0.1`). Not intended for external access.

---

## REST Endpoints

### `GET /health`

Health check for monitoring.

**Response** `200 OK`

```json
{
  "status": "ok",
  "timestamp": "2026-03-22T10:30:00.000Z"
}
```

---

### `GET /api/sessions`

Returns all agent sessions (one per agent, most recent). Registered agents with no active sessions appear as idle placeholders.

**Response** `200 OK`

```json
{
  "sessions": [
    {
      "key": "session-abc123",
      "id": "session-abc123",
      "agentId": "main",
      "status": "running",
      "updatedAt": "2026-03-22T10:30:00.000Z",
      "updatedAtMs": 1774440600000,
      "lastRole": "assistant",
      "lastSnippet": "Analyzing the market data for...",
      "messageCount": 42,
      "recentEvents": [
        {
          "id": "evt-1",
          "timestamp": "2026-03-22T10:30:00.000Z",
          "role": "assistant",
          "snippet": "Analyzing the market data for..."
        }
      ]
    }
  ]
}
```

**Session fields:**

| Field | Type | Description |
|-------|------|-------------|
| `key` | `string` | Session key (filename stem). Idle placeholders use `idle:<agentId>` |
| `id` | `string` | Session ID from metadata event |
| `agentId` | `string` | Agent identifier (e.g. `main`, `emma`, `dev-linter`) |
| `status` | `'running' \| 'waiting' \| 'idle'` | Derived from last activity timing |
| `updatedAt` | `string` | ISO-8601 timestamp of last event |
| `updatedAtMs` | `number` | Epoch ms of last event (for sorting) |
| `lastRole` | `string` | Role of last message: `user`, `assistant`, `tool_result` |
| `lastSnippet` | `string` | Text preview of last message (max 180 chars) |
| `messageCount` | `number` | Total messages in session |
| `recentEvents` | `ISessionEvent[]` | Last 5 events for quick preview |

**Status derivation logic:**

```
Last event < 8s ago?
  ├── YES → lastRole == "assistant" ? "running" : "waiting"
  └── NO  → lastRole == "user" AND < 30s ago ? "waiting" : "idle"
```

---

### `GET /api/sessions/:sessionKey`

Returns detail for a single session by its key.

**Parameters:**

| Parameter | Location | Description |
|-----------|----------|-------------|
| `sessionKey` | URL path | Session key to look up |

**Response** `200 OK`

```json
{
  "session": { "...ISession fields..." },
  "events": [
    {
      "id": "evt-1",
      "timestamp": "2026-03-22T10:30:00.000Z",
      "role": "assistant",
      "snippet": "Working on the component..."
    }
  ]
}
```

**Response** `404 Not Found`

```json
{
  "error": "Session not found"
}
```

---

### `GET /api/timeline`

Returns recent events from all sessions, merged and sorted by timestamp (most recent first).

**Query parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | `number` | `120` | Max events to return (capped at 500) |

**Response** `200 OK`

```json
{
  "events": [
    {
      "id": "evt-1",
      "timestamp": "2026-03-22T10:30:00.000Z",
      "role": "assistant",
      "snippet": "Analyzing the market...",
      "sessionKey": "session-abc123"
    }
  ]
}
```

---

### `GET /api/agent-names`

Returns the agent name map (ID to display name with emoji).

**Response** `200 OK`

```json
{
  "main": "🧠 Samantha",
  "emma": "🛠️ Emma",
  "dev-linter": "📏 Linter",
  "inv-analyst-stocks": "📊 Stock Analyst"
}
```

**Source:** Reads `~/.openclaw/openclaw.json`. The `main` agent always maps to `🧠 Samantha`.

---

### SPA Fallback

Any request not matching `/api/*` or `/health` returns `index.html` for client-side routing.

---

## WebSocket Protocol

### Connection

```
ws://127.0.0.1:4173
```

Connect via the standard WebSocket upgrade on the same HTTP server. No authentication required (local-only tool).

### Server Constraints

| Parameter | Value |
|-----------|-------|
| Push interval | 2,500 ms |
| Max connections | 10 |
| Max message size (client) | 4,096 bytes |
| Client reconnect delay | 3,000 ms |

### Connection Flow

```
Client connects
    │
    ├── Server sends: sessions:update
    ├── Server sends: agentNames:update
    │
    └── Every 2.5s server broadcasts:
        ├── sessions:update
        ├── agentNames:update
        └── interactions:update
```

If more than 10 clients are connected, new connections are rejected with close code `1013` (Try Again Later).

---

### Server → Client Messages

All messages are JSON with a `type` discriminator field.

#### `sessions:update`

Full session state snapshot. Sent on initial connection and every 2.5s.

```typescript
{
  type: 'sessions:update';
  sessions: ISession[];
}
```

#### `agentNames:update`

Agent name mapping. Sent on initial connection and every 2.5s.

```typescript
{
  type: 'agentNames:update';
  names: Record<string, string>;  // agentId → "emoji displayName"
}
```

#### `interactions:update`

Active agent-to-agent interactions detected from session data. Sent every 2.5s.

```typescript
{
  type: 'interactions:update';
  interactions: IInteraction[];
}
```

**IInteraction fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique interaction ID (e.g. `real-main-emma-1774440600000`) |
| `fromSessionKey` | `string` | Session key of initiating agent |
| `toSessionKey` | `string` | Session key of target agent |
| `type` | `'consulting' \| 'validating' \| 'delegating'` | Interaction type |
| `label` | `string` | Human-readable label (e.g. `delegating via spawn`) |
| `startedAt` | `number` | Start timestamp (epoch ms) |
| `durationMs` | `number` | Duration in ms (min 5000ms) |

**Interaction detection:**

Only active sessions (running/waiting) are analyzed. The server reads the last 20 events within a 30-second window:

| Tool name pattern | Interaction type |
|------------------|-----------------|
| `spawn*`, `delegate*`, `dispatch*` | `delegating` |
| `send*`, `message*`, `notify*` | `consulting` |
| `validate*`, `review*`, `check*`, `verify*` | `validating` |
| Text reference to another agent ID | `consulting` |

Interactions are deduplicated per agent pair (most recent wins).

#### `timeline:update`

Timeline events (not currently broadcast; reserved for future use).

```typescript
{
  type: 'timeline:update';
  events: Array<ISessionEvent & { sessionKey: string }>;
}
```

#### `session:detail`

Detailed session data (sent in response to `session:subscribe`; currently a stub).

```typescript
{
  type: 'session:detail';
  sessionKey: string;
  session: ISession;
  events: ISessionEvent[];
}
```

#### `error`

Server error message.

```typescript
{
  type: 'error';
  message: string;
}
```

---

### Client → Server Messages

#### `session:subscribe`

Request detailed updates for a specific session. Currently accepted but a no-op (reserved for future detail panels).

```json
{
  "type": "session:subscribe",
  "sessionKey": "session-abc123"
}
```

#### `session:unsubscribe`

Cancel subscription for a specific session.

```json
{
  "type": "session:unsubscribe",
  "sessionKey": "session-abc123"
}
```

**Security:** Unknown message types are silently rejected. Malformed JSON is ignored.

---

## TypeScript Types

All message types are defined in `src/types/IWebSocketMessage.ts` as discriminated unions:

```typescript
// Server → Client
export type ServerMessage =
  | IWsSessionsUpdate
  | IWsTimelineUpdate
  | IWsAgentNamesUpdate
  | IWsSessionDetail
  | IWsInteractionsUpdate
  | IWsError;

// Client → Server
export type ClientMessage =
  | IWsRequestDetail
  | IWsUnsubscribeDetail;
```

These types are shared between frontend and server via `src/types/` (compiled with `tsconfig.server.json`).

---

## Data Sources

| Source | Path | Purpose |
|--------|------|---------|
| Session files | `~/.openclaw/agents/<agentId>/sessions/*.jsonl` | Raw event streams (one JSON per line) |
| Agent config | `~/.openclaw/openclaw.json` | Agent names, emojis, identity |

### JSONL Format

Each line in a session file is a JSON object representing a raw event:

```json
{"type": "message", "id": "evt-1", "timestamp": "2026-03-22T10:30:00.000Z", "message": {"role": "assistant", "content": [{"type": "text", "text": "Working on..."}]}}
```

### openclaw.json Format

```json
{
  "agents": {
    "list": [
      {
        "id": "emma",
        "identity": {
          "name": "Emma",
          "emoji": "🛠️"
        }
      }
    ]
  }
}
```
