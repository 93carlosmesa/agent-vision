# Agent Vision

Real-time 3D dashboard for monitoring OpenClaw AI agent sessions. Visualizes agent status, interactions, squad composition, and skill usage in an interactive 3D office environment built with React Three Fiber.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Vite 8 |
| 3D Rendering | Three.js + React Three Fiber + Drei + Postprocessing |
| Backend | Express 5 + Node.js |
| Real-time | WebSocket (ws) — push every 2.5s |
| Data Source | OpenClaw `.jsonl` session files + `openclaw.json` config |

## Quick Start

```bash
npm install

# Development (Vite hot reload)
npm run dev

# Production (build + Express server)
npm run start:4173
```

Access at `http://127.0.0.1:4173/`

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server with HMR on `127.0.0.1:4173` |
| `npm run build` | TypeScript check + Vite production build to `dist/` |
| `npm run lint` | ESLint static analysis |
| `npm run preview` | Preview production build |
| `npm run preview:4173` | Preview on port 4173 |
| `npm start` | Build + Express server on port 4173 |
| `npm run start:4173` | Alias for `npm start` |

## Architecture Overview

```
Browser (React + R3F)          Server (Express + ws)         Filesystem
┌─────────────────────┐        ┌────────────────────┐        ┌──────────────────┐
│ World3D / AgentScene │◄──WS──│ WebSocketServer    │◄───────│ ~/.openclaw/     │
│ SquadPanel           │        │ SessionReader      │        │   agents/**.jsonl│
│ TimelinePanel        │        │ AgentNameResolver  │        │   openclaw.json  │
└─────────────────────┘        └────────────────────┘        └──────────────────┘
```

**Data flow:** Server reads `.jsonl` session files → parses events → detects interactions → broadcasts via WebSocket every 2.5s → frontend hooks consume messages → components render 2D/3D scenes.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed architecture, data flow diagrams, and system design.

## Project Structure

```
agent-vision/
├── server/                         # Backend
│   ├── index.ts                    # Bootstrap: Express app, routes, WS setup
│   ├── SessionReader.ts            # Reads .jsonl files, derives status, detects interactions
│   ├── AgentNameResolver.ts        # Resolves agent IDs → display names from openclaw.json
│   └── WebSocketServer.ts          # WS connection management, broadcasting
│
├── src/                            # Frontend
│   ├── main.tsx                    # React entry point
│   ├── App.tsx                     # Composition root: hooks, layout, scene routing
│   │
│   ├── types/                      # Shared TypeScript interfaces (used by both frontend + server)
│   │   ├── ISession.ts             # SessionStatus, ISession, ISessionEvent
│   │   ├── IAgent.ts               # IAgentIdentity, AgentNameMap
│   │   ├── IInteraction.ts         # InteractionType, IInteraction, INTERACTION_COLORS
│   │   ├── ISquad.ts               # AgentRole, ISquadMember, ISquad
│   │   ├── ISkill.ts               # SkillDistrict, ISkill, ISkillVisit
│   │   ├── IZone.ts                # IZoneDef, ZoneMapping
│   │   ├── ISceneConfig.ts         # ISceneConfig, SceneRegistry
│   │   ├── IWebSocketMessage.ts    # Server/Client message discriminated unions
│   │   └── index.ts                # Barrel export
│   │
│   ├── config/                     # Static configuration data
│   │   ├── agentConfig.ts          # AGENT_REGISTRY (40+ agents), roles, colors, souls
│   │   ├── squads.ts               # Squad definitions, role labels/tags
│   │   └── skills.ts               # 13 skills across 3 districts (inv/dev/global)
│   │
│   ├── scenes/
│   │   └── sceneConfig.ts          # Scene registry: oficina, playa, 3d (zone geometry)
│   │
│   ├── services/                   # Business logic (non-React)
│   │   ├── WebSocketClient.ts      # Low-level WS connection with auto-reconnect
│   │   └── SessionService.ts       # Message dispatcher, state management
│   │
│   ├── hooks/                      # React hooks
│   │   ├── useAgentSessions.ts     # Main hook: WS + services → sessions, squads, scene
│   │   ├── useAgentMotion.ts       # 3D agent position interpolation + collision avoidance
│   │   ├── useInteractions.ts      # Filters active interactions by time window
│   │   └── useSkillVisits.ts       # Simulates agents visiting skill rooms
│   │
│   ├── components/                 # React components
│   │   ├── AgentScene.tsx          # 2D pannable scene with zones + skill districts
│   │   ├── PixelAvatar.tsx         # Deterministic pixel art avatar generator
│   │   ├── StatusDot.tsx           # WS connection status indicator
│   │   ├── SceneSelector.tsx       # Scene + environment dropdown
│   │   ├── CreatorPanel.tsx        # Agent/skill browser and creator modal
│   │   ├── OrchestratorView.tsx    # Radial graph with orchestrator at center
│   │   ├── TimelinePanel.tsx       # Recent events sidebar
│   │   ├── SquadPanel.tsx          # Squad composition sidebar
│   │   ├── InteractionLines.tsx    # SVG bezier curves between interacting agents
│   │   └── world3d/               # 3D scene components (React Three Fiber)
│   │       ├── World3D.tsx         # Main 3D canvas: room assignment, status debounce
│   │       ├── Agent3D.tsx         # 3D avatar (Master humanoid vs Robot)
│   │       ├── AgentMotionSystem.tsx # Zero-overhead motion via shared refs
│   │       ├── CameraControls3D.tsx  # WASD/arrow keyboard camera + OrbitControls
│   │       ├── OfficeLayout3D.tsx  # Static architecture: walls, floors, glass, rooms
│   │       ├── OfficeFurniture3D.tsx # Furniture primitives + room-specific sets
│   │       ├── Folder3D.tsx        # Skill folders on biblioteca shelves
│   │       ├── SkillObject3D.tsx   # Floating crystal skill representations
│   │       ├── InteractionBeam3D.tsx # Glowing pulsing 3D connection beams
│   │       ├── SpeechBubble3D.tsx  # Auto-fading speech bubble overlay
│   │       └── officeTheme.ts      # Visual themes + room centers + capacity
│   │
│   └── utils/
│       ├── officePathfinding.ts    # BFS room graph + door waypoints + obstacle AABBs
│       └── favicon.ts             # Animated favicon (idle eye / active blinking)
│
├── public/                         # Static assets
│   ├── favicon.svg
│   ├── icons.svg
│   └── assets/
│       ├── bg-office.jpg
│       └── bg-beach.jpg
│
├── docs/                           # Documentation
│   ├── ARCHITECTURE.md             # System architecture + data flow diagrams
│   ├── COMPONENTS.md               # Component reference
│   ├── API.md                      # REST + WebSocket API reference
│   └── ux-27-agents.md             # UX analysis for 27-agent expansion
│
├── ARCHITECTURE.md                 # Legacy architecture doc (v2 design notes)
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── tsconfig.server.json
└── eslint.config.js
```

## Agent Configuration System

### Agent Registry (`src/config/agentConfig.ts`)

40+ agents defined with:
- **Role**: `ceo`, `manager`, `specialist`, `orchestrator-investment`
- **Department**: `orchestration`, `development`, `investment`
- **Visual**: `color`, `hairColor` (Masters only), `haloColor`, `isFemale`
- **Soul** (`AgentSoul`): Personality phrases for working, delegating, idle states + `interactionStyle`

Helper functions: `getAgentConfig()`, `isMaster()`, `getAgentSoul()`, `getAgentColor()`, `isOrchestrator()`, `isCEO()`, `isManager()`

### Squads (`src/config/squads.ts`)

Two squads with 4 roles each:
- **Development Squad** (`squad-movement`): Senior Frontend Architect, Code Reviewer, Linter, Formatter
- **Investment Squad** (`squad-naming`): 4 investment specialist roles

### Skills (`src/config/skills.ts`)

13 skills across 3 districts:
- **Investment**: market-analysis, portfolio-tracker, risk-assessment, sentiment-scan
- **Development**: code-review, test-runner, deploy-pipeline, db-migrate, api-scaffold
- **Global**: web-search, file-manager, chat-relay, log-viewer

### Scenes (`src/scenes/sceneConfig.ts`)

| Scene | Description |
|-------|-------------|
| `oficina` | 2D office with 3 zones (trabajo, comunicacion, relax) |
| `playa` | 2D beach variant |
| `3d` | Full 3D office environment via React Three Fiber |

## 3D World

The 3D scene (`World3D.tsx`) renders an interactive office with:

- **6 rooms**: Lobby, Descanso (break), Comunicacion (meeting), Trabajo (work), Biblioteca (library), Exterior
- **Agent avatars**: Masters (humanoid with halo) vs Robots (metallic with antenna)
- **Status-based room assignment**: running → trabajo, waiting → comunicacion, idle → descanso
- **Movement system**: BFS pathfinding through doors, waypoint interpolation, collision avoidance
- **Status debouncing**: Prevents flickering (3s hold before marking idle)
- **Interaction beams**: Glowing 3D tubes between collaborating agents
- **Environments**: Office HQ (warm professional) or Tropical Beach Campus

Camera: WASD/arrows to pan, Q/E to orbit, Space to reset, mouse for zoom/rotate.

## API Reference

### REST Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check → `{ status: 'ok', timestamp }` |
| `GET` | `/api/sessions` | All sessions → `{ sessions: ISession[] }` |
| `GET` | `/api/sessions/:key` | Single session detail → `{ session, events }` |
| `GET` | `/api/timeline?limit=N` | Recent events (max 500) |
| `GET` | `/api/agent-names` | Agent name map → `AgentNameMap` |

### WebSocket Protocol

**Server → Client** (broadcast every 2.5s):
- `sessions:update` — `{ sessions: ISession[] }`
- `agentNames:update` — `{ names: AgentNameMap }`
- `interactions:update` — `{ interactions: IInteraction[] }`

**Client → Server**:
- `session:subscribe` — `{ sessionKey: string }`
- `session:unsubscribe` — `{ sessionKey: string }`

See [docs/API.md](docs/API.md) for full API documentation.

## Data Sources

| Source | Path | Purpose |
|--------|------|---------|
| Session files | `~/.openclaw/agents/<agentId>/sessions/*.jsonl` | Raw event streams (one JSON per line) |
| Agent config | `~/.openclaw/openclaw.json` | Agent names, emojis, identity |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4173` | Server port |
| `BIND_HOST` | `127.0.0.1` | Bind address (localhost only) |
| `GITHUB_TOKEN` | — | GitHub API token (optional) |
| `GITHUB_OWNER` | — | GitHub repo owner (optional) |
| `GITHUB_REPO` | — | GitHub repo name (optional) |

## Troubleshooting

### Port 4173 is busy

```bash
lsof -nP -iTCP:4173 -sTCP:LISTEN
# Kill the process, then re-run
```

### No agents visible

1. Check `GET /api/sessions` returns data
2. Verify `.jsonl` files exist in `~/.openclaw/agents/`
3. Verify `~/.openclaw/openclaw.json` has agent definitions
4. Hard refresh browser (`Cmd+Shift+R`)

### WebSocket not connecting

1. Check `StatusDot` indicator (top right) — red = disconnected
2. Verify server is running on same port
3. Check browser console for WS errors
4. Auto-reconnect fires every 3 seconds

### 3D scene performance

1. Close other GPU-intensive tabs
2. Reduce browser window size
3. Switch to 2D scene (oficina/playa) for lower resource usage

## Documentation

| Document | Description |
|----------|-------------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture, data flow, design decisions |
| [docs/COMPONENTS.md](docs/COMPONENTS.md) | All React and 3D components with props and relationships |
| [docs/API.md](docs/API.md) | REST endpoints + WebSocket protocol with full schemas |

## Branch Policy

- No direct push to `main`, `master`, or `develop`
- Use `feature/*` or `hotfix/*` branches
- Merge via PR/MR only
