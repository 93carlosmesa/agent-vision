# Agent Vision (React + TypeScript)

Dashboard visual en tiempo real para sesiones OpenClaw: escena de agentes, timeline y detalle por sesión.

## Runtime actual (cerrado y estable)

- **Frontend:** React + TypeScript (Vite)
- **Backend/API:** Express + WebSocket (`server/index.ts`)
- **URL objetivo:** `http://127.0.0.1:4173/`
- **Healthcheck:** `http://127.0.0.1:4173/health`

Sí: el objetivo final es que funcione como conjunto frontend + server, y quede accesible desde el mismo puerto 4173.

---

## Comandos

```bash
npm install
```

### Desarrollo UI (Vite, hot reload)

```bash
npm run dev
```

> Arranca React en `127.0.0.1:4173`.

### Modo integrado (build + server Express)

```bash
npm run start:4173
```

Hace build y levanta backend sirviendo la app compilada en `127.0.0.1:4173`.

### Preview estático de Vite

```bash
npm run preview:4173
```

---

## Endpoints API

- `GET /health`
- `GET /api/sessions`
- `GET /api/sessions/:sessionKey`
- `GET /api/timeline?limit=N`
- `GET /api/agent-names`

---

## Fuentes de datos

- Sesiones: `~/.openclaw/agents/main/sessions`
- Config agentes: `~/.openclaw/openclaw.json`

---

## Troubleshooting

### El puerto 4173 está ocupado

```bash
lsof -nP -iTCP:4173 -sTCP:LISTEN
```

Cierra el proceso que lo ocupa y vuelve a ejecutar `npm run start:4173`.

### No aparecen agentes

1. Comprueba `GET /api/sessions`
2. Verifica que existan `.jsonl` en `~/.openclaw/agents/main/sessions`
3. Hard refresh en navegador (`Cmd+Shift+R`)

---

## Política de ramas

- No push directo a `main/master/develop`
- Siempre `feature/*` o `hotfix/*`
- Merge solo por MR/PR
