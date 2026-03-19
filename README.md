# OpenClaw Agent Vision

Real-time animated dashboard for visualizing OpenClaw agent sessions. Agents appear as pixel-art sprites that walk between zones based on their current status.

## Features

- **2D Animated Sprites** — Procedurally generated 16×16 pixel art characters with walk/idle animations and directional facing
- **Smooth Movement** — Agents smoothly walk to their target zones instead of teleporting
- **Three Themes** — People, Creatures (original monster-like designs), and Animals
- **Two Scenes** — Office and Beach, each with 3 status-mapped zones
- **Real-time Updates** — Polls agent sessions every 2.5s with live status indicators
- **Session Inspector** — Click any avatar to view detailed event history

## Quick Start

```bash
npm install
npm start
```

The server starts on port **4173** (auto-selects a free port if busy). Open the URL printed in the terminal.

## Controls & Behavior

| Control | Description |
|---------|-------------|
| **Scene** dropdown | Switch between Office and Beach layouts |
| **Skin** dropdown | Switch character theme: People, Creatures, Animals |
| **Click avatar** | View that session's event history in the sidebar |
| **Green dot** (header) | Server connection status |

### Agent Status → Zone Mapping

| Status | Office Zone | Beach Zone | Color |
|--------|------------|------------|-------|
| Running | Desks | Bar | Green |
| Waiting | Meeting | Orilla | Yellow |
| Idle | Lounge | Sombrillas | Gray |

Agents smoothly walk to their assigned zone when status changes. Walking agents show a blue glow; running agents show a green glow.

### Animation System

- Sprites cycle through 4 animation frames at ~5 fps
- Walk animation plays while agents move between zones
- Idle animation plays when agents reach their target position
- Left/right direction is determined by movement direction

## Architecture

```
server.js          Express server, reads ~/.openclaw session JSONL files
public/
  index.html       Main page
  style.css        Dark theme styles
  sprites.js       Procedural pixel-art sprite engine (16×16, 3× scaled)
  app.js           Animation system, smooth movement, scene rendering
  assets/          Reserved for future static sprite assets
```

## API Endpoints

- `GET /api/sessions` — Summary of all active sessions
- `GET /api/sessions/:sessionKey` — Detailed session with full event history
- `GET /api/timeline?limit=N` — Recent events across all sessions

## Data Source

Reads JSONL session files from `~/.openclaw/agents/main/sessions/`. Each session's status is determined by:
- **Running**: Last message was from assistant, within 20 seconds
- **Waiting**: Last message was user/tool_result, within 60 seconds
- **Idle**: Otherwise

## License Notes

All sprite assets are original procedural art — no copyrighted material is used. See [ASSETS_LICENSES.md](ASSETS_LICENSES.md) for details. The "Creatures" theme contains entirely original designs unrelated to any franchise.

## Dependencies

- [Express](https://expressjs.com/) (MIT) — HTTP server
- No other runtime dependencies; vanilla JS frontend

## Future Improvements

- Replace procedural sprites with hand-crafted PNG sprite sheets
- Add SSE/WebSocket for real-time updates without polling
- Add pathfinding and obstacle avoidance
- Minimap and focus mode for active sessions
