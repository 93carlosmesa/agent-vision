# Agent Vision

Visual dashboard for OpenClaw sessions with animated pixel avatars (“muñequitos”), timeline, and session detail.

## What runs where

- **Backend:** `server.js` (Express)
- **Frontend:** static files in `public/` served by the same Express server
- **Default URL:** `http://127.0.0.1:4173/`

So yes: frontend + server run together in one process.

---

## Quick start

```bash
npm install
npm run start:4173
```

Open:
- App: `http://127.0.0.1:4173/`
- Health: `http://127.0.0.1:4173/health`

If port `4173` is already busy, `start:4173` will fail intentionally so you notice it immediately.

---

## Run modes

### 1) Strict fixed port (recommended)

```bash
npm run start:4173
```

- Binds to `127.0.0.1:4173`
- Exits with clear error if port is occupied

### 2) Default start (same behavior as strict, port 4173)

```bash
npm start
```

- Uses `PORT` env if provided, otherwise `4173`
- Fails if requested port is busy

### 3) Allow automatic fallback port

```bash
npm run start:any
```

- If requested/default port is busy, it auto-picks a free port
- Useful for temporary debugging

---

## Project structure

```text
agent-vision/
├── server.js            # Express API + static hosting
├── public/
│   ├── index.html       # UI shell
│   ├── style.css        # dashboard styles
│   ├── sprites.js       # procedural pixel sprite engine
│   ├── app.js           # scene/timeline rendering + polling
│   └── assets/          # scene backgrounds and static assets
├── package.json
└── README.md
```

---

## API endpoints

- `GET /api/sessions` — active session summaries
- `GET /api/sessions/:sessionKey` — details + events for one session
- `GET /api/timeline?limit=N` — merged recent events across sessions
- `GET /api/agent-names` — display names/emojis from OpenClaw config
- `GET /api/backgrounds` — optional user backgrounds (`~/.openclaw/assets`)
- `GET /health` — service health check

---

## Data source

Reads OpenClaw session JSONL files from:

`~/.openclaw/agents/main/sessions/`

Status mapping:
- **running**: recent assistant activity
- **waiting**: waiting after user/tool_result activity
- **idle**: otherwise

---

## Troubleshooting

### "I don’t know what port it is running on"
Use strict mode:

```bash
npm run start:4173
```

Terminal will print the exact URL and health endpoint.

### "Port 4173 is busy"
Find process:

```bash
lsof -nP -iTCP:4173 -sTCP:LISTEN
```

Then stop it, or run temporary fallback mode:

```bash
npm run start:any
```

### "No avatars appear"
- Confirm `/api/sessions` returns data
- Confirm `~/.openclaw/agents/main/sessions/` contains `.jsonl` files
- Reload page hard (`Cmd+Shift+R`)

---

## Branch policy (team rule)

- No direct push to `main`, `master`, or `develop`
- Work only in `feature/*` or `hotfix/*`
- Merge by MR/PR only

(Repository protections should enforce this on remote.)
