# Component Reference

Complete reference for all React and 3D components in Agent Vision.

---

## Component Hierarchy

```
App.tsx (composition root)
├── SceneSelector
├── StatusDot
├── AgentScene (2D) OR World3D (3D, lazy-loaded)
│   ├── [2D path]
│   │   ├── PixelAvatar (per agent)
│   │   └── InteractionLines (SVG overlay)
│   └── [3D path]
│       ├── OfficeLayout3D
│       ├── OfficeFurniture3D (6 room sets)
│       ├── AgentMotionSystem
│       │   └── Agent3D (per agent)
│       │       └── SpeechBubble3D
│       ├── InteractionBeam3D (per interaction)
│       └── SkillFolders3D
│           └── SkillObject3D (per skill)
├── SquadPanel (sidebar)
├── TimelinePanel (sidebar)
├── CreatorPanel (modal)
└── OrchestratorView (modal)
```

---

## Application Shell

### `App.tsx`

**Purpose:** Composition root. Connects hooks to components, manages layout and routing.

**State:**
- `creatorOpen` / `orchestratorOpen` — modal toggles
- `worldEnvironment` — selected 3D environment ID

**Hooks used:**
- `useAgentSessions()` — sessions, names, interactions, connection, scene, squads
- `useSkillVisits(sessions)` — simulated skill room visits
- `useInteractions(serverInteractions)` — filters active interactions

**Layout:** Header (controls) + Main (scene) + Sidebar (SquadPanel + TimelinePanel)

**Key behavior:**
- Routes to `AgentScene` or lazy-loaded `World3D` based on `currentScene.id`
- Computes `memberMetaBySession` (squad metadata per session key)
- Manages favicon: blinking eye when agents are running, static when idle

**File:** `src/App.tsx`

---

### `StatusDot`

**Purpose:** WebSocket connection indicator in the header.

| Prop | Type | Description |
|------|------|-------------|
| `isConnected` | `boolean` | WebSocket connection state |

**Renders:** Green pulsing dot + "WS conectado" when connected; red + "WS desconectado" otherwise.

**File:** `src/components/StatusDot.tsx` (16 lines)

---

### `SceneSelector`

**Purpose:** Dropdown selectors for scene and 3D environment.

| Prop | Type | Description |
|------|------|-------------|
| `currentScene` | `string` | Active scene ID |
| `onSceneChange` | `(id: string) => void` | Scene change callback |
| `currentEnvironment` | `string` | Active 3D environment ID |
| `onEnvironmentChange` | `(id: string) => void` | Environment change callback |

**Behavior:** Shows scene dropdown always. Environment dropdown only appears when scene is `3d`.

**File:** `src/components/SceneSelector.tsx` (62 lines)

---

## 2D Scene Components

### `AgentScene`

**Purpose:** 2D pannable world with status zones, skill districts, and avatar positioning.

| Prop | Type | Description |
|------|------|-------------|
| `sessions` | `ISession[]` | All agent sessions |
| `agentNames` | `AgentNameMap` | Agent ID → display name |
| `sceneConfig` | `ISceneConfig` | Scene configuration (zones, background) |
| `memberMetaBySession` | `Record<string, {...}>` | Squad metadata per session key |
| `skillVisits` | `ISkillVisit[]` | Active skill room visits (optional) |
| `interactions` | `IInteraction[]` | Active interactions (optional) |

**Layout (world is 180% viewport height):**
- **Top 56%:** Three status zones
  - Running (left 50%, full height): "Zona de trabajo"
  - Waiting (right 50%, top half): "Zona de comunicacion"
  - Idle (right 50%, bottom half): "Zona relax"
- **Bottom 44%:** Three skill districts (investment, development, global)

**Key behaviors:**
- Pointer drag to pan, mouse wheel to scroll vertically
- Agents positioned in grid layout within their status zone
- Agents visiting skills animate toward skill room position
- When no agents are active, falls back to squad-based positioning
- Renders `InteractionLines` SVG overlay and `PixelAvatar` per agent

**File:** `src/components/AgentScene.tsx` (330 lines)

---

### `PixelAvatar`

**Purpose:** Deterministic pixel art avatar generator using canvas.

| Prop | Type | Description |
|------|------|-------------|
| `seed` | `string` | Agent ID used for deterministic generation |

**Output:** 16x16 pixel art rendered to canvas, exported as data URL PNG at 54px with `image-rendering: pixelated`.

**Algorithm:** Hash-based selection of 4 color palettes. Draws head, body, arms, legs, hair, and eyes procedurally.

**File:** `src/components/PixelAvatar.tsx` (91 lines)

---

### `InteractionLines`

**Purpose:** SVG overlay drawing animated bezier curves between interacting agents.

| Prop | Type | Description |
|------|------|-------------|
| `interactions` | `IInteraction[]` | Active interactions |
| `positionMap` | `Record<string, {left, top}>` | Session key → CSS position |

**Rendering:**
- Quadratic bezier curves with perpendicular offset for gentle arcs
- Linear gradient stroke colored by interaction type
- Animated dash pattern (CSS `dash-flow` animation)
- Endpoint circles at both agent positions
- Floating labels via SVG `foreignObject`

**Colors:** consulting → blue, validating → green, delegating → orange

**File:** `src/components/InteractionLines.tsx` (126 lines)

---

## Sidebar Components

### `SquadPanel`

**Purpose:** Displays squad composition with member roles and status.

| Prop | Type | Description |
|------|------|-------------|
| `squads` | `ISquad[]` | Squad definitions with members |

**Renders:** Squad cards showing each member's display name, role label, status badge, and collaboration tag. Unfilled slots show "pendiente".

**File:** `src/components/SquadPanel.tsx` (38 lines)

---

### `TimelinePanel`

**Purpose:** Recent events sidebar showing activity across all agents.

| Prop | Type | Description |
|------|------|-------------|
| `sessions` | `ISession[]` | All sessions (events extracted from `recentEvents`) |

**Behavior:**
- Collects events from all sessions, sorts by timestamp (most recent first)
- Relative timestamps: "hace 5s", "hace 2m", "hace 1h"
- Role emojis: 🤖 assistant, 👤 user, 🔧 tool_result

**File:** `src/components/TimelinePanel.tsx` (62 lines)

---

## Modal Components

### `CreatorPanel`

**Purpose:** Agent and skill browser/creator modal.

| Prop | Type | Description |
|------|------|-------------|
| `isOpen` | `boolean` | Modal visibility |
| `onClose` | `() => void` | Close callback |
| `agentNames` | `AgentNameMap` | Current agent names |

**Tabs:**
1. **Agents** — Browse registered agents from the name map
2. **Skills** — Browse skills from `SKILLS` config
3. **+ Agent** — Form to generate JSON config for a new agent
4. **+ Skill** — Form to generate JSON config for a new skill

**Output:** Displays generated JSON for copy-paste into configuration files.

**File:** `src/components/CreatorPanel.tsx` (166 lines)

---

### `OrchestratorView`

**Purpose:** Radial graph visualization with orchestrator (Samantha) at center.

| Prop | Type | Description |
|------|------|-------------|
| `isOpen` | `boolean` | Modal visibility |
| `onClose` | `() => void` | Close callback |
| `sessions` | `ISession[]` | All sessions |
| `agentNames` | `AgentNameMap` | Agent names |

**Layout:**
- Samantha (main) positioned at center (50%, 50%)
- All other agents arranged in a circle around center
- SVG dashed lines from center to each agent, color-coded by status
- Click on agent card (stub for future messaging)

**Status colors:** green (running), yellow (waiting), gray (idle)

**File:** `src/components/OrchestratorView.tsx` (168 lines)

---

## 3D Scene Components

All 3D components use React Three Fiber (R3F) and render inside a `<Canvas>`.

### `World3D`

**Purpose:** Main 3D canvas with multi-room office, agent management, and scene composition.

| Prop | Type | Description |
|------|------|-------------|
| `sessions` | `ISession[]` | All agent sessions |
| `agentNames` | `AgentNameMap` | Agent names |
| `interactions` | `IInteraction[]` | Active interactions (optional) |
| `environmentId` | `string` | Environment ID: `office` or `tropical-beach` |

**Scene graph:**
- Lighting (theme-dependent: office 4500K warm vs tropical sun)
- Ground plane + grid overlay
- `OfficeLayout3D` — walls, floors, glass
- Furniture per room (6 sets: Lobby, Descanso, Comunicacion, Trabajo, Biblioteca, Exterior)
- `AgentMotionSystem` — animated agent avatars
- `InteractionBeam3D` — 3D connection tubes
- `SkillFolders3D` — biblioteca skill shelves
- `OrbitControls` + `CameraControls3D`
- `EffectComposer` with Bloom postprocessing

**Room assignment logic:**
1. Detect work context (investment vs development) from running agents
2. Orchestrators always in-context
3. Status → room: running → Trabajo, waiting → Comunicacion, idle → Descanso
4. Out-of-context agents → Lobby
5. Investment squad idle agents → dedicated lobby seats

**Status debouncing (prevents flickering):**

| Transition | Delay |
|-----------|-------|
| idle → running/waiting | 0ms (immediate) |
| running ↔ waiting | 1000ms |
| running/waiting → idle | 3000ms |

**Speech bubbles:** Chain of command — CEO delegates to Manager, Manager calls specialists. Persistent bubbles when Samantha is `waiting` and others are `running`.

**Camera:** position `[0, 25, 30]`, FOV 50, DPR `[1, 1.5]`, performance min 0.5

**File:** `src/components/world3d/World3D.tsx` (719 lines)

---

### `Agent3D`

**Purpose:** 3D agent avatar with two visual types and status-based animations.

| Prop | Type | Description |
|------|------|-------------|
| `agentId` | `string` | Agent identifier |
| `name` | `string` | Display name |
| `status` | `SessionStatus` | Current status |
| `isMoving` | `boolean` | Whether agent is walking |
| `activityLabel` | `string` | Activity text shown in badge |
| `speechBubble` | `string` | Optional speech bubble text |

**Avatar types (determined by `agentConfig`):**

| Type | Condition | Visual |
|------|-----------|--------|
| **Master** | `hairColor` defined | Humanoid: round head, body, hair, limbs, glowing halo |
| **Robot** | No `hairColor` | Metallic: angular body, visor, antenna with bob |

**Animation states:**

| Status | Body animation | Details |
|--------|---------------|---------|
| Walking | Leg pendulum, arm swing | Bounce + lean forward |
| Running | Typing arms, forward lean | Head nod, bright emissive |
| Waiting | Arm gestures, head turns | Moderate glow |
| Idle | Lean back, slow bob | Slow halo/antenna, dim glow |

**Overlays:** Billboard name label + status badge + optional speech bubble (HTML via CSS)

**File:** `src/components/world3d/Agent3D.tsx`

---

### `AgentMotionSystem`

**Purpose:** Container that renders `Agent3D` instances with shared motion state from `useAgentMotion`.

| Prop | Type | Description |
|------|------|-------------|
| `agents` | `AgentData[]` | Agent list with waypoints, status, labels |

**Key design:** Uses `useAgentMotion` hook which returns `Ref<Map<agentId, MotionState>>`. Each `Agent3D` reads position from this ref inside `useFrame` — zero React re-renders during motion.

**File:** `src/components/world3d/AgentMotionSystem.tsx`

---

### `CameraControls3D`

**Purpose:** Keyboard camera controls + HUD overlay.

**Controls:**
- **WASD** — pan camera
- **Q/E** — orbit left/right
- **Space** — reset camera to default position
- **Arrow keys** — alternative pan
- **Mouse** — OrbitControls (drag to rotate, scroll to zoom)

**HUD:** Small onscreen control hints displayed via `CameraHUD` component.

**File:** `src/components/world3d/CameraControls3D.tsx`

---

### `OfficeLayout3D`

**Purpose:** Static architectural geometry — walls, glass panels, doors, baseboards, floor grids.

| Prop | Type | Description |
|------|------|-------------|
| `environment` | `WorldEnvironment` | Visual theme configuration |

**Rooms rendered:** Lobby, Descanso (break), Comunicacion (meeting), Trabajo (work), Biblioteca (library), Exterior

**Floor grids:** Distinct colors per room per theme. Room labels rendered as billboard text.

**File:** `src/components/world3d/OfficeLayout3D.tsx`

---

### `OfficeFurniture3D`

**Purpose:** Primitive-based furniture sets, one exported component per room.

**Exported components:**
- `LobbyFurniture` — benches, reception desk, welcome sign
- `DescansoFurniture` — sofas, coffee table, plant, standing areas
- `ComunicacionFurniture` — conference table, chairs, whiteboards
- `TrabajoFurniture` — desk grid (5 cols x 4 rows), task lamps, monitors
- `BibliotecaFurniture` — bookshelves (4), reading tables
- `ExteriorFurniture` — lounge chairs, palm trees (beach mode), ocean

All accept `environment: WorldEnvironment` prop for theme-aware colors.

**Construction:** BoxGeometry, CylinderGeometry, SphereGeometry primitives. No external 3D models.

**File:** `src/components/world3d/OfficeFurniture3D.tsx`

---

### `SkillFolders3D` / `Folder3D`

**Purpose:** Skill items displayed on biblioteca bookshelves.

**Layout:** 4 bookshelves in Biblioteca room. 13 skills distributed across shelves.

**Visual:** Floating crystal/folder shapes with glowing auras above shelf positions.

**File:** `src/components/world3d/Folder3D.tsx`

---

### `SkillObject3D`

**Purpose:** Individual floating skill representation.

**Visual:** Floating crystal with glow effect + rotation animation. Icon and label overlay.

**File:** `src/components/world3d/SkillObject3D.tsx`

---

### `InteractionBeam3D`

**Purpose:** Glowing 3D connection tube between two interacting agents.

| Prop | Type | Description |
|------|------|-------------|
| `from` | `[x, y, z]` | Start position |
| `to` | `[x, y, z]` | End position |
| `type` | `InteractionType` | consulting, validating, or delegating |

**Rendering:**
- `TubeGeometry` along Catmull-Rom curve between positions
- Pulsing opacity via sine wave animation in `useFrame`
- Color: blue (consulting), green (validating), orange (delegating)
- Enhanced by Bloom postprocessing

**File:** `src/components/world3d/InteractionBeam3D.tsx`

---

### `SpeechBubble3D`

**Purpose:** Auto-fading speech bubble overlay positioned above agents.

**Rendering:** HTML overlay (CSS2DObject or Html from drei) positioned relative to agent in viewport space. Displays soul phrases or chain-of-command messages.

**Duration:** Auto-fade after `BUBBLE_DURATION = 3.5s`.

**File:** `src/components/world3d/SpeechBubble3D.tsx`

---

## Hooks

### `useAgentSessions`

**Purpose:** Main hook wiring WebSocket + services to React state.

**Returns:**

| Field | Type | Description |
|-------|------|-------------|
| `sessions` | `ISession[]` | All agent sessions |
| `agentNames` | `AgentNameMap` | Agent ID → display name |
| `interactions` | `IInteraction[]` | Server-detected interactions |
| `isConnected` | `boolean` | WebSocket connection state |
| `currentScene` | `ISceneConfig` | Active scene configuration |
| `setScene` | `(id: string) => void` | Scene change function |
| `squads` | `ISquad[]` | Organized squad data |

**Initialization:** Creates `WebSocketClient` + `SessionService` on mount. Wires `onChange` callbacks to `useState` setters.

**File:** `src/hooks/useAgentSessions.ts`

---

### `useAgentMotion`

**Purpose:** 3D agent position interpolation with collision avoidance. Runs at 60fps with zero React overhead.

**Algorithm (three-pass per frame in `useFrame`):**
1. **Movement** — Linear interpolation toward current waypoint at `MOVE_SPEED=3.0` units/s
2. **Agent collisions** — Push apart if distance < `COLLISION_DIST=0.8`
3. **Furniture collisions** — Resolve AABB overlaps with 52 furniture obstacles

**Rotation:** Shortest-path angle interpolation at `ROTATION_SPEED=2.0` rad/s

**Returns:** `Ref<Map<agentId, AgentMotionState>>` — positions updated in refs only, never trigger reconciliation.

**File:** `src/hooks/useAgentMotion.ts`

---

### `useInteractions`

**Purpose:** Filters interactions to only those currently active (within their time window).

**Input:** `IInteraction[]` from server
**Output:** `IInteraction[]` where `Date.now() - startedAt < durationMs`

**File:** `src/hooks/useInteractions.ts`

---

### `useSkillVisits`

**Purpose:** Simulates agents visiting skill rooms (future: driven by real data).

**Constants:** `VISIT_DURATION = 4000ms`, `VISIT_CHANCE = 0.3`

**Behavior:** Agents in `running` status periodically get assigned random skill visits.

**File:** `src/hooks/useSkillVisits.ts`

---

## Services

### `WebSocketClient`

**Purpose:** Low-level WebSocket connection management (SRP).

**API:**
- `connect()` — initiate connection with auto-reconnect (3s delay)
- `onMessage(cb)` — register message handler (raw strings)
- `onConnect(cb)` / `onDisconnect(cb)` — lifecycle callbacks

**No data processing.** Raw string callbacks only.

**File:** `src/services/WebSocketClient.ts`

---

### `SessionService`

**Purpose:** State management and message transformation.

**API:**
- `processRaw(raw)` — parse JSON, dispatch by message type
- `onChange(cb)` — callback-based reactivity (no React Context)
- `extractAgentId(sessionKey)` — extract agent ID from key format

**State:** sessions, agentNames, timeline (capped at 50), interactions

**File:** `src/services/SessionService.ts`

---

## Configuration

### `officeTheme.ts`

**Purpose:** Visual themes, room geometry, and environment definitions.

**Exports:**
- `WORLD_ENVIRONMENTS` — array of `WorldEnvironment` objects
- `getWorldEnvironment(id)` — lookup by ID
- `ROOM_CENTERS` — center coordinates per room
- `OFFICE_CAPACITY` — seating targets per room
- `OFFICE_THEME` — backward compatibility alias

**Environments:**

| ID | Title | Key visual features |
|----|-------|--------------------|
| `office` | Office HQ | Parquet floors, navy walls, 4500K warm lighting |
| `tropical-beach` | Tropical Beach Campus | Wooden deck, tiki hut, turquoise ocean, bright sun |

**File:** `src/components/world3d/officeTheme.ts`
