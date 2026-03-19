/* global SPRITE_THEMES, renderSprite */

// ── Theme / scene configuration ──

const THEMES = SPRITE_THEMES; // from sprites.js

const SCENES = {
  oficina: {
    title: 'Oficina',
    zoneLabels: { running: 'Zona de trabajo', waiting: 'Zona de comunicación', idle: 'Zona relax' },
    zoneDefs: {
      running: { key: 'trabajo', label: 'Trabajo', x: 25, y: 50, w: 44, h: 70, deco: '🖥️' },
      waiting: { key: 'comunicacion', label: 'Comunicación', x: 75, y: 28, w: 44, h: 40, deco: '🗣️' },
      idle: { key: 'relax', label: 'Relax', x: 75, y: 74, w: 44, h: 40, deco: '☕' },
    },
  },
  playa: {
    title: 'Playa',
    zoneLabels: { running: 'Zona de trabajo', waiting: 'Zona de comunicación', idle: 'Zona relax' },
    zoneDefs: {
      running: { key: 'trabajo', label: 'Trabajo', x: 25, y: 50, w: 44, h: 70, deco: '💻' },
      waiting: { key: 'comunicacion', label: 'Comunicación', x: 75, y: 28, w: 44, h: 40, deco: '🗣️' },
      idle: { key: 'relax', label: 'Relax', x: 75, y: 74, w: 44, h: 40, deco: '🌴' },
    },
  },
};

// ── DOM refs ──

const themeSelect = document.getElementById('theme-select');
const sceneSelect = document.getElementById('scene-select');
const officeScene = document.getElementById('office-scene');
const timelineList = document.getElementById('timeline-list');
const sessionDetail = document.getElementById('session-detail');
const connectionDot = document.getElementById('connection-status');
const sessionCount = document.getElementById('session-count');
const sceneTitle = document.getElementById('scene-title');
const sceneLegend = document.getElementById('scene-legend');

// ── State ──

let currentTheme = localStorage.getItem('ocv-theme') || 'personas';
// Migrate old "pokemon" saved preference
if (currentTheme === 'pokemon') currentTheme = 'criaturas';
let currentScene = localStorage.getItem('ocv-scene') || 'oficina';
let sessions = [];
let timeline = [];
let selectedSessionKey = null;
let selectedSessionEvents = [];
let animFrame = 0;

// Local background images — no API dependency
const sceneBackgrounds = {
  office: '/assets/bg-office.png',
  beach: '/assets/bg-beach.png',
};

// Agent display names loaded from config
let agentNames = {};

// Smooth movement: track current visual positions per agent key
const agentPositions = {}; // key → { x, y, targetX, targetY, direction }
const MOVE_SPEED = 0.04; // fraction of distance per frame (~12% per 300ms tick)

// ── Helpers ──

function themeFor(sessionKey) {
  const theme = THEMES[currentTheme];
  if (!theme) return { id: 'dev', name: 'Agent', seed: 0 };
  let hash = 0;
  for (let i = 0; i < sessionKey.length; i++) {
    hash = ((hash << 5) - hash + sessionKey.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % theme.ids.length;
  return { id: theme.ids[idx], name: theme.names[idx], seed: idx };
}

function hashOf(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = String(str || '');
  return d.innerHTML;
}

function timeAgo(isoStr) {
  if (!isoStr) return '—';
  const diff = Date.now() - new Date(isoStr).getTime();
  const sec = Math.max(0, Math.floor(diff / 1000));
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  return `${Math.floor(hr / 24)}d`;
}

// ── Zone layout ──

function layoutAgentsInZone(zone, zoneMembers) {
  const cols = Math.max(1, Math.ceil(Math.sqrt(zoneMembers.length)));
  return zoneMembers.map((s, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const rows = Math.ceil(zoneMembers.length / cols);

    const stepX = zone.w / (cols + 1);
    const stepY = zone.h / (rows + 1);

    const baseX = zone.x - zone.w / 2 + stepX * (col + 1);
    const baseY = zone.y - zone.h / 2 + stepY * (row + 1);

    const h = hashOf(s.key);
    const jitterX = ((h % 7) - 3) * 0.4;
    const jitterY = (((h >> 3) % 7) - 3) * 0.35;

    return {
      ...s,
      _targetX: Math.min(95, Math.max(5, baseX + jitterX)),
      _targetY: Math.min(92, Math.max(8, baseY + jitterY)),
    };
  });
}

// ── Smooth position interpolation ──

function updateAgentPosition(key, targetX, targetY) {
  if (!agentPositions[key]) {
    agentPositions[key] = { x: targetX, y: targetY, targetX, targetY, direction: 'right' };
    return;
  }
  const pos = agentPositions[key];
  pos.targetX = targetX;
  pos.targetY = targetY;
}

function interpolatePositions() {
  for (const key in agentPositions) {
    const pos = agentPositions[key];
    const dx = pos.targetX - pos.x;
    const dy = pos.targetY - pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 0.15) {
      pos.x = pos.targetX;
      pos.y = pos.targetY;
    } else {
      // Smooth lerp
      const step = Math.max(MOVE_SPEED, dist * 0.08);
      pos.x += (dx / dist) * Math.min(step, dist);
      pos.y += (dy / dist) * Math.min(step, dist);

      // Set direction based on horizontal movement
      if (Math.abs(dx) > 0.2) {
        pos.direction = dx > 0 ? 'right' : 'left';
      }
    }
  }
}

function isWalking(key) {
  const pos = agentPositions[key];
  if (!pos) return false;
  const dx = pos.targetX - pos.x;
  const dy = pos.targetY - pos.y;
  return Math.sqrt(dx * dx + dy * dy) > 0.3;
}

// ── Legend ──

function renderSceneLegend(scene) {
  const defs = scene.zoneDefs;
  sceneLegend.innerHTML = `
    <div class="legend-title">Legend</div>
    <div class="legend-row"><span class="dot running"></span> running → ${defs.running.label}</div>
    <div class="legend-row"><span class="dot waiting"></span> waiting → ${defs.waiting.label}</div>
    <div class="legend-row"><span class="dot idle"></span> idle → ${defs.idle.label}</div>
  `;
}

// ── Scene rendering ──

// ── Scene decoration builders ──

function renderScene() {
  const scene = SCENES[currentScene] || SCENES.oficina;
  sceneTitle.textContent = scene.title;

  const bgUrl = currentScene === 'playa' ? sceneBackgrounds.beach : sceneBackgrounds.office;
  officeScene.className = `office-scene scene-${currentScene}`;
  if (bgUrl) {
    officeScene.classList.add('scene-has-custom-bg');
    officeScene.style.setProperty('--scene-bg-image', `url("${bgUrl}")`);
  } else {
    officeScene.classList.remove('scene-has-custom-bg');
    officeScene.style.removeProperty('--scene-bg-image');
  }

  officeScene.innerHTML = '';

  if (!sessions.length) {
    officeScene.insertAdjacentHTML('beforeend', '<div class="empty-state">No active sessions.</div>');
    renderSceneLegend(scene);
    sessionCount.textContent = '0 sessions';
    return;
  }

  // Draw zone areas
  Object.values(scene.zoneDefs).forEach((z) => {
    const zoneNode = document.createElement('div');
    zoneNode.className = `zone zone-${z.key}`;
    zoneNode.style.left = `${z.x}%`;
    zoneNode.style.top = `${z.y}%`;
    zoneNode.style.width = `${z.w}%`;
    zoneNode.style.height = `${z.h}%`;
    zoneNode.style.transform = 'translate(-50%, -50%)';
    zoneNode.innerHTML = `<span class="zone-label">${z.deco} ${escapeHtml(z.label)}</span>`;
    officeScene.appendChild(zoneNode);
  });

  // Group by status
  const grouped = {
    running: sessions.filter((s) => s.status === 'running'),
    waiting: sessions.filter((s) => s.status === 'waiting'),
    idle: sessions.filter((s) => s.status !== 'running' && s.status !== 'waiting'),
  };

  const placed = [
    ...layoutAgentsInZone(scene.zoneDefs.running, grouped.running),
    ...layoutAgentsInZone(scene.zoneDefs.waiting, grouped.waiting),
    ...layoutAgentsInZone(scene.zoneDefs.idle, grouped.idle),
  ];

  // Update target positions for smooth movement
  placed.forEach((s) => {
    updateAgentPosition(s.key, s._targetX, s._targetY);
  });

  // Interpolate toward targets
  interpolatePositions();

  // Render agents
  placed.forEach((s) => {
    const t = themeFor(s.key);
    const pos = agentPositions[s.key];
    if (!pos) return;

    const walking = isWalking(s.key);
    const spriteState = walking ? 'walk' : (s.status === 'idle' ? 'idle' : 'idle');
    const actualState = walking ? 'walk' : 'idle';
    const direction = pos.direction;

    // Get the zone label for destination indicator
    const zoneLabel = (scene.zoneLabels || {})[s.status] || 'Idle';

    const node = document.createElement('div');
    node.className = `avatar-agent status-${s.status}`;
    if (selectedSessionKey === s.key) node.classList.add('selected');
    if (walking) node.classList.add('walking');

    node.style.left = `${pos.x}%`;
    node.style.top = `${pos.y}%`;

    // Render sprite
    const spriteCanvas = renderSprite(t.id, animFrame, actualState, direction);

    // Create sprite image from cached canvas
    const spriteImg = document.createElement('canvas');
    spriteImg.className = 'sprite-canvas';
    spriteImg.width = spriteCanvas.width;
    spriteImg.height = spriteCanvas.height;
    const sCtx = spriteImg.getContext('2d');
    sCtx.imageSmoothingEnabled = false;
    sCtx.drawImage(spriteCanvas, 0, 0);

    // Name label — use real agent name from config
    const agentId = s.agentId || 'main';
    const displayName = agentNames[agentId] || agentId;
    const label = document.createElement('div');
    label.className = 'avatar-label';
    label.textContent = displayName;

    // Status badge with destination
    const badge = document.createElement('span');
    badge.className = `status-badge ${s.status}`;
    badge.innerHTML = `${s.status} <span class="dest-indicator">→ ${escapeHtml(zoneLabel)}</span>`;

    node.appendChild(spriteImg);
    node.appendChild(label);
    node.appendChild(badge);

    node.addEventListener('click', () => {
      selectedSessionKey = s.key;
      renderScene();
      renderSessionDetail();
      fetchSessionDetail();
    });

    officeScene.appendChild(node);
  });

  renderSceneLegend(scene);
  sessionCount.textContent = `${sessions.length} sessions`;
}

// ── Timeline ──

function renderTimeline() {
  if (!timeline.length) {
    timelineList.innerHTML = '<div class="empty-state">No recent activity.</div>';
    return;
  }

  timelineList.innerHTML = timeline.slice(0, 60).map((e) => {
    const t = themeFor(e.sessionKey);
    return `
      <div class="timeline-item">
        <div class="line-head">
          <span class="timeline-sprite-name">${escapeHtml(t.name)}</span>
          <strong class="role-${escapeHtml(e.role)}">${escapeHtml(e.role)}</strong>
          <span>${timeAgo(e.timestamp)}</span>
        </div>
        <div>${escapeHtml(e.snippet || '—')}</div>
      </div>
    `;
  }).join('');
}

// ── Session detail ──

function renderSessionDetail() {
  if (!selectedSessionKey) {
    sessionDetail.className = 'session-detail empty';
    sessionDetail.innerHTML = 'Select an avatar to view session history.';
    return;
  }

  const session = sessions.find((s) => s.key === selectedSessionKey);
  if (!session) {
    sessionDetail.className = 'session-detail empty';
    sessionDetail.innerHTML = 'Selected session is no longer available.';
    return;
  }

  const t = themeFor(session.key);
  const scene = SCENES[currentScene] || SCENES.oficina;
  const zoneLabel = (scene.zoneLabels || {})[session.status] || scene.zoneLabels.idle;

  const head = `
    <div class="detail-item detail-header">
      <div class="line-head">
        <span class="detail-name">${escapeHtml(t.name)}</span>
        <strong>${escapeHtml(session.key.slice(0, 16))}</strong>
      </div>
      <div class="detail-status-row">
        <span class="status-badge ${session.status}">${session.status}</span>
        <span class="detail-zone">Zone: <strong>${escapeHtml(zoneLabel)}</strong></span>
      </div>
      <div class="muted">Messages: <strong>${session.messageCount}</strong> · Updated ${timeAgo(session.updatedAt)} ago</div>
      <div class="detail-snippet">${escapeHtml(session.lastSnippet || 'No snippet')}</div>
    </div>
  `;

  const events = selectedSessionEvents.length ? selectedSessionEvents : session.recentEvents || [];
  const history = events.slice(-50).reverse().map((e) => `
    <div class="detail-item">
      <div class="line-head"><strong class="role-${escapeHtml(e.role)}">${escapeHtml(e.role)}</strong><span>${timeAgo(e.timestamp)}</span></div>
      <div>${escapeHtml(e.snippet || '—')}</div>
    </div>
  `).join('');

  sessionDetail.className = 'session-detail';
  sessionDetail.innerHTML = head + history;
}

// ── Data fetching ──

async function fetchSessionDetail() {
  if (!selectedSessionKey) return;
  try {
    const res = await fetch(`/api/sessions/${encodeURIComponent(selectedSessionKey)}`);
    if (!res.ok) return;
    const data = await res.json();
    selectedSessionEvents = data.events || [];
    renderSessionDetail();
  } catch {
    // ignored
  }
}

async function poll() {
  try {
    const [sessRes, tlRes] = await Promise.all([
      fetch('/api/sessions'),
      fetch('/api/timeline?limit=120'),
    ]);

    if (sessRes.ok) {
      const data = await sessRes.json();
      sessions = data.sessions || [];
      if (!selectedSessionKey && sessions.length) selectedSessionKey = sessions[0].key;
      renderScene();
      renderSessionDetail();
    }

    if (tlRes.ok) {
      const data = await tlRes.json();
      timeline = data.events || [];
      renderTimeline();
    }

    if (selectedSessionKey) await fetchSessionDetail();
    connectionDot.className = 'status-dot ok';
  } catch {
    connectionDot.className = 'status-dot idle';
  }
}

// ── Initialization ──

themeSelect.value = currentTheme;
sceneSelect.value = currentScene;

themeSelect.addEventListener('change', () => {
  currentTheme = themeSelect.value;
  localStorage.setItem('ocv-theme', currentTheme);
  renderScene();
  renderTimeline();
  renderSessionDetail();
});

sceneSelect.addEventListener('change', () => {
  currentScene = sceneSelect.value;
  localStorage.setItem('ocv-scene', currentScene);
  renderScene();
  renderSessionDetail();
});

// Load agent names from config on startup
async function loadAgentNames() {
  try {
    const res = await fetch('/api/agent-names');
    if (res.ok) agentNames = await res.json();
  } catch { /* ignore */ }
}

loadAgentNames();
renderScene();
poll();

// Poll data every 2.5s
setInterval(poll, 2500);
// Refresh agent names every 30s
setInterval(loadAgentNames, 30000);

// Animation loop: update sprite frame and smooth positions at ~10fps
let lastAnimTime = 0;
const FRAME_INTERVAL = 200; // ms per animation frame
const MOVE_TICK = 50; // ms per position update

function animationLoop(timestamp) {
  if (timestamp - lastAnimTime >= FRAME_INTERVAL) {
    animFrame = (animFrame + 1) % 4;
    lastAnimTime = timestamp;
    renderScene();
  }
  requestAnimationFrame(animationLoop);
}

requestAnimationFrame(animationLoop);
