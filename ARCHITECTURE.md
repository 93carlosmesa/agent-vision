# Agent Vision v2 — Architecture

## Stack Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER                              │
│                                                             │
│  React + TypeScript (Vite)                                  │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌───────────┐  │
│  │Components│  │  Hooks   │  │ Services  │  │  Scenes   │  │
│  │ (UI/SRP) │←─│useWS     │←─│WSClient   │  │sceneConfig│  │
│  │          │  │useSessions│  │SessionSvc │  │(pure data)│  │
│  └──────────┘  └──────────┘  └─────┬─────┘  └───────────┘  │
│                                    │ WebSocket               │
└────────────────────────────────────┼────────────────────────┘
                                     │
                                     ▼
┌────────────────────────────────────┬────────────────────────┐
│                      SERVER (Express + ws)                   │
│                                                              │
│  ┌────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │ SessionReader  │  │ AgentNameResolver│  │WebSocketServer│ │
│  │ reads .jsonl   │  │ reads config     │  │ push updates  │ │
│  │ summarizes     │  │ resolves names   │  │ manages conns │ │
│  └───────┬────────┘  └────────┬─────────┘  └──────┬───────┘ │
│          │                    │                    │          │
│          └────────────────────┼────────────────────┘          │
│                               │                              │
│                    ┌──────────▼──────────┐                   │
│                    │   index.ts          │                   │
│                    │   (bootstrap only)  │                   │
│                    └──────────┬──────────┘                   │
│                               │                              │
│                    ┌──────────▼──────────┐                   │
│                    │   routes/           │                   │
│                    │   REST endpoints    │                   │
│                    │   (fallback/health) │                   │
│                    └────────────────────┘                    │
└──────────────────────────────────────────────────────────────┘
                               │
                               ▼
                  ┌────────────────────────┐
                  │  ~/.openclaw/agents/   │
                  │  main/sessions/*.jsonl │
                  │  openclaw.json (names) │
                  └────────────────────────┘
```

## Module Responsibilities

### Frontend (`src/`)

| Module | Responsibility |
|--------|---------------|
| `types/` | All TypeScript interfaces. Shared between frontend and server. |
| `scenes/sceneConfig.ts` | Pure data: zone geometry, labels, backgrounds per scene. No logic. |
| `services/` | **WebSocketClient**: connect, reconnect, parse messages. **SessionService**: state management, transforms. |
| `hooks/` | **useWebSocket**: React hook wrapping WSClient with reconnect. **useAgentSessions**: consumes WS data, exposes sessions/timeline/names. |
| `components/` | Pure UI. Each component = one file, one responsibility. Receives data via props/hooks. |
| `utils/` | Pure functions: `timeAgo()`, `escapeHtml()`, `hashOf()`, layout calculations. No side effects. |

### Backend (`server/`)

| Module | Responsibility |
|--------|---------------|
| `index.ts` | Bootstrap only. Creates Express app + HTTP server, wires modules, starts listening. |
| `SessionReader.ts` | Reads `.jsonl` files, parses events, produces `ISession` summaries. Pure I/O. |
| `AgentNameResolver.ts` | Reads `openclaw.json`, returns `AgentNameMap`. Pure config reader. |
| `WebSocketServer.ts` | Manages WS connections, handles subscribe/unsubscribe, broadcasts updates. |
| `routes/` | REST endpoints for health checks, backgrounds API, or any non-WS fallback. |

## WebSocket Protocol (Contracts)

### Server → Client

| Message Type | Payload | When |
|-------------|---------|------|
| `sessions:update` | `{ sessions: ISession[] }` | On connect + every time sessions change |
| `timeline:update` | `{ events: (ISessionEvent & { sessionKey })[] }` | On connect + on new events |
| `agentNames:update` | `{ names: AgentNameMap }` | On connect + when config changes |
| `session:detail` | `{ sessionKey, session, events }` | Response to `session:subscribe` |
| `error` | `{ message: string }` | On any server-side error |

### Client → Server

| Message Type | Payload | Purpose |
|-------------|---------|---------|
| `session:subscribe` | `{ sessionKey: string }` | Request detailed events for a session |
| `session:unsubscribe` | `{ sessionKey: string }` | Stop receiving detail updates |

### Message Format

All messages are JSON with a `type` discriminator:

```typescript
// Server sends:
{ "type": "sessions:update", "sessions": [...] }

// Client sends:
{ "type": "session:subscribe", "sessionKey": "agent:main:abc123" }
```

## SOLID Principles Applied

### S — Single Responsibility
- **SessionReader**: Only reads files and parses JSONL. Does not resolve names or broadcast.
- **AgentNameResolver**: Only resolves names from config. Does not touch sessions.
- **WebSocketServer**: Only manages connections and message dispatch. Does not read files.
- **Each React component**: One file, one visual concern.
- **Each hook**: One data concern (WS connection OR session state, not both).

### O — Open/Closed
- **SceneRegistry**: Add new scenes by adding entries to `sceneConfig.ts` — no existing code changes.
- **WebSocket messages**: Discriminated union allows adding new message types without modifying handlers for existing ones.

### L — Liskov Substitution
- All `ServerMessage` subtypes are interchangeable where `ServerMessage` is expected.
- Zone definitions follow the same `IZoneDef` interface regardless of scene.

### I — Interface Segregation
- Types are split into focused interfaces (`ISession`, `IZone`, `ISceneConfig`) rather than one monolithic type.
- Client and server message types are separate unions (`ClientMessage` vs `ServerMessage`).

### D — Dependency Inversion
- `WebSocketServer` depends on `ISession` (abstraction), not on `SessionReader` (implementation).
- Components depend on hooks (abstraction), not on WebSocket details.
- `index.ts` is the composition root that wires concrete implementations.

## Key Architectural Decisions

1. **Polling → WebSocket**: Replaces 2.5s HTTP polling with push-based WS. Server watches files and broadcasts diffs.
2. **Shared types**: `src/types/` is imported by both frontend and server, ensuring contract consistency at compile time.
3. **Scene config as data**: Zones and scenes are pure configuration objects. Adding a scene = adding data, not code.
4. **Composition root pattern**: `server/index.ts` only wires things together. All logic lives in dedicated classes.

## Migration Path from v1

| v1 (current) | v2 (this project) |
|-------------|-------------------|
| `server.js` (monolith) | Split into `SessionReader` + `AgentNameResolver` + `WebSocketServer` + `routes/` |
| `public/app.js` (vanilla JS) | React components + hooks + services |
| `public/index.html` | Vite-managed `index.html` + React root |
| HTTP polling every 2.5s | WebSocket push |
| No types | Full TypeScript with shared interfaces |
| Global mutable state | React state via hooks |
