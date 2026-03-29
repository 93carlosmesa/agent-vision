/**
 * AgentMonitorScreen — Live animated screensavers per agent identity.
 *
 * Uses Three.js CanvasTexture updated every frame via useFrame.
 * Each agent has a unique personality:
 *   - Samantha (violet): Neural network — pulsing nodes + connection lines
 *   - Emma    (amber):   Matrix terminal — green code cascade
 *   - Ginny   (teal):    Market chart — ticker line + price symbols
 *
 * Props:
 *   agentId   — 'samantha' | 'emma' | 'ginny'
 *   isActive  — true = faster/brighter animation
 *   isNight   — true = reduced emissive (dark mode)
 *   position  — [x, y, z] of screen face center
 *   width     — screen plane width  (default 0.42)
 *   height    — screen plane height (default 0.24)
 */

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export type MonitorAgentId = 'samantha' | 'emma' | 'ginny';

interface AgentMonitorScreenProps {
  agentId: MonitorAgentId;
  isActive?: boolean;
  isNight?: boolean;
  position: [number, number, number];
  width?: number;
  height?: number;
}

/* ── Canvas resolution ── */
const CW = 256;
const CH = 144;

/* ══════════════════════════════════════════════════════════════
   SAMANTHA — Neural network (violet)
   Nodes connected by glowing lines that pulse rhythmically.
══════════════════════════════════════════════════════════════ */
function drawSamantha(ctx: CanvasRenderingContext2D, t: number, isActive: boolean, isNight: boolean) {
  const speed = isActive ? 1.0 : 0.45;
  const bright = isNight ? 0.55 : 1.0;

  // Background
  ctx.fillStyle = `rgba(10, 3, 25, ${isNight ? 0.97 : 1})`;
  ctx.fillRect(0, 0, CW, CH);

  // Fixed node positions (normalized to canvas)
  const nodes: [number, number][] = [
    [0.15, 0.3], [0.38, 0.15], [0.62, 0.2], [0.85, 0.35],
    [0.22, 0.65], [0.50, 0.75], [0.78, 0.6], [0.40, 0.50],
    [0.10, 0.55], [0.90, 0.70], [0.68, 0.88], [0.30, 0.85],
  ];

  // Edges
  const edges: [number, number][] = [
    [0, 1], [1, 2], [2, 3], [0, 4], [1, 7], [2, 7],
    [3, 6], [4, 5], [5, 6], [5, 7], [4, 8], [6, 9],
    [5, 10], [4, 11], [7, 5], [2, 6], [0, 8], [3, 9],
  ];

  edges.forEach(([a, b], i) => {
    const phase = (t * speed * 0.8 + i * 0.37) % (Math.PI * 2);
    const alpha = (0.25 + 0.45 * Math.abs(Math.sin(phase))) * bright;
    const [ax, ay] = nodes[a];
    const [bx, by] = nodes[b];
    const grd = ctx.createLinearGradient(ax * CW, ay * CH, bx * CW, by * CH);
    grd.addColorStop(0, `rgba(168, 85, 247, ${alpha})`);
    grd.addColorStop(0.5, `rgba(192, 132, 252, ${alpha * 1.3})`);
    grd.addColorStop(1, `rgba(168, 85, 247, ${alpha})`);
    ctx.beginPath();
    ctx.moveTo(ax * CW, ay * CH);
    ctx.lineTo(bx * CW, by * CH);
    ctx.strokeStyle = grd;
    ctx.lineWidth = 1.0;
    ctx.stroke();
  });

  // Nodes
  nodes.forEach(([nx, ny], i) => {
    const phase = (t * speed * 1.2 + i * 0.52) % (Math.PI * 2);
    const r = 3.5 + 2.0 * Math.abs(Math.sin(phase));
    const alpha = (0.7 + 0.3 * Math.abs(Math.sin(phase))) * bright;

    // Glow halo
    const grd = ctx.createRadialGradient(nx * CW, ny * CH, 0, nx * CW, ny * CH, r * 2.5);
    grd.addColorStop(0, `rgba(192, 132, 252, ${alpha * 0.6})`);
    grd.addColorStop(1, 'rgba(168, 85, 247, 0)');
    ctx.beginPath();
    ctx.arc(nx * CW, ny * CH, r * 2.5, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();

    // Core dot
    ctx.beginPath();
    ctx.arc(nx * CW, ny * CH, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(216, 180, 254, ${alpha})`;
    ctx.fill();
  });

  // "SAMANTHA" label — subtle
  ctx.font = '9px monospace';
  ctx.fillStyle = `rgba(192, 132, 252, ${0.35 * bright})`;
  ctx.textAlign = 'right';
  ctx.fillText('SAMANTHA', CW - 4, CH - 4);
}

/* ══════════════════════════════════════════════════════════════
   EMMA — Matrix terminal (green)
   Falling columns of green characters, classic cyberpunk cascade.
══════════════════════════════════════════════════════════════ */

const MATRIX_CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ01[]{}()!@#$%<>';

function initMatrixColumns(): { y: number[]; speed: number[]; opacity: number[] } {
  const cols = Math.floor(CW / 10);
  return {
    y: Array.from({ length: cols }, () => Math.random() * -CH),
    speed: Array.from({ length: cols }, () => 0.6 + Math.random() * 1.1),
    opacity: Array.from({ length: cols }, () => 0.4 + Math.random() * 0.6),
  };
}

// Persistent state per component instance via closure
const matrixState = new Map<string, ReturnType<typeof initMatrixColumns>>();

function drawEmma(ctx: CanvasRenderingContext2D, _t: number, isActive: boolean, isNight: boolean, instanceId: string) {
  if (!matrixState.has(instanceId)) {
    matrixState.set(instanceId, initMatrixColumns());
  }
  const state = matrixState.get(instanceId)!;
  const speed = isActive ? 1.6 : 0.9;
  const bright = isNight ? 0.5 : 1.0;
  const cols = Math.floor(CW / 10);

  // Dim trail (semi-transparent fill)
  ctx.fillStyle = `rgba(5, 15, 5, ${isNight ? 0.25 : 0.18})`;
  ctx.fillRect(0, 0, CW, CH);

  ctx.font = '9px monospace';
  ctx.textAlign = 'left';

  for (let i = 0; i < cols; i++) {
    state.y[i] += state.speed[i] * speed;
    if (state.y[i] > CH + 10) {
      state.y[i] = -10 - Math.random() * 40;
      state.speed[i] = 0.6 + Math.random() * 1.1;
      state.opacity[i] = 0.4 + Math.random() * 0.6;
    }

    const x = i * 10 + 2;
    const y = state.y[i];

    // Head char — bright white
    const headChar = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
    ctx.fillStyle = `rgba(200, 255, 200, ${state.opacity[i] * bright})`;
    ctx.fillText(headChar, x, y);

    // Trail chars
    const trailLen = 6 + Math.floor(Math.random() * 4);
    for (let j = 1; j <= trailLen; j++) {
      const trailAlpha = ((trailLen - j) / trailLen) * 0.6 * state.opacity[i] * bright;
      const trailChar = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
      ctx.fillStyle = `rgba(0, 220, 60, ${trailAlpha})`;
      ctx.fillText(trailChar, x, y - j * 9);
    }
  }

  // "EMMA" label
  ctx.font = '9px monospace';
  ctx.fillStyle = `rgba(0, 220, 60, ${0.4 * bright})`;
  ctx.textAlign = 'right';
  ctx.fillText('EMMA', CW - 4, CH - 4);
}

/* ══════════════════════════════════════════════════════════════
   GINNY — Market chart (teal)
   Animated price line, ticker symbols, micro-fluctuations.
══════════════════════════════════════════════════════════════ */

// Pre-generate a base price path
function genPricePath(len: number): number[] {
  const path: number[] = [0.5];
  for (let i = 1; i < len; i++) {
    path.push(Math.max(0.05, Math.min(0.95, path[i - 1] + (Math.random() - 0.49) * 0.06)));
  }
  return path;
}
const BASE_PRICE_PATH = genPricePath(120);

function drawGinny(ctx: CanvasRenderingContext2D, t: number, isActive: boolean, isNight: boolean) {
  const speed = isActive ? 1.0 : 0.5;
  const bright = isNight ? 0.55 : 1.0;

  ctx.fillStyle = `rgba(3, 18, 20, ${isNight ? 0.97 : 1})`;
  ctx.fillRect(0, 0, CW, CH);

  // Grid lines
  ctx.strokeStyle = `rgba(83, 227, 194, ${0.08 * bright})`;
  ctx.lineWidth = 0.5;
  for (let i = 1; i < 5; i++) {
    const y = (i / 5) * CH;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CW, y); ctx.stroke();
  }
  for (let i = 1; i < 8; i++) {
    const x = (i / 8) * CW;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CH); ctx.stroke();
  }

  // Price line — scroll through base path + live micro-fluctuation
  const offset = (t * speed * 12) % BASE_PRICE_PATH.length;
  const visible = 64; // points visible
  const chartH = CH * 0.62;
  const chartY = CH * 0.16;
  const chartX = 12;
  const chartW = CW - 24;

  ctx.beginPath();
  let firstMoved = false;
  for (let i = 0; i < visible; i++) {
    const idx = Math.floor(offset + i) % BASE_PRICE_PATH.length;
    const micro = Math.sin(t * speed * 3 + i * 0.4) * 0.018;
    const pNorm = BASE_PRICE_PATH[idx] + micro;
    const px = chartX + (i / (visible - 1)) * chartW;
    const py = chartY + (1 - pNorm) * chartH;
    if (!firstMoved) { ctx.moveTo(px, py); firstMoved = true; }
    else ctx.lineTo(px, py);
  }
  // Gradient fill under line
  const grad = ctx.createLinearGradient(0, chartY, 0, chartY + chartH);
  grad.addColorStop(0, `rgba(83, 227, 194, ${0.25 * bright})`);
  grad.addColorStop(1, `rgba(83, 227, 194, 0)`);
  ctx.save();
  ctx.lineTo(chartX + chartW, chartY + chartH);
  ctx.lineTo(chartX, chartY + chartH);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();

  // Line stroke
  ctx.beginPath();
  firstMoved = false;
  for (let i = 0; i < visible; i++) {
    const idx = Math.floor(offset + i) % BASE_PRICE_PATH.length;
    const micro = Math.sin(t * speed * 3 + i * 0.4) * 0.018;
    const pNorm = BASE_PRICE_PATH[idx] + micro;
    const px = chartX + (i / (visible - 1)) * chartW;
    const py = chartY + (1 - pNorm) * chartH;
    if (!firstMoved) { ctx.moveTo(px, py); firstMoved = true; }
    else ctx.lineTo(px, py);
  }
  ctx.strokeStyle = `rgba(83, 227, 194, ${0.9 * bright})`;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Current price dot
  const lastIdx = Math.floor(offset + visible - 1) % BASE_PRICE_PATH.length;
  const lastMicro = Math.sin(t * speed * 3 + (visible - 1) * 0.4) * 0.018;
  const lastPNorm = BASE_PRICE_PATH[lastIdx] + lastMicro;
  const dotX = chartX + chartW;
  const dotY = chartY + (1 - lastPNorm) * chartH;
  const dotPulse = 2.5 + 1.5 * Math.abs(Math.sin(t * speed * 2.5));
  ctx.beginPath();
  ctx.arc(dotX, dotY, dotPulse, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(200, 255, 245, ${0.95 * bright})`;
  ctx.fill();

  // Ticker symbols row
  const tickers = ['SPX', 'BTC', 'EUR', 'GLD', 'OIL'];
  const tickerScroll = (t * speed * 18) % (tickers.length * 38);
  ctx.font = '7px monospace';
  tickers.forEach((tk, i) => {
    const tx = ((i * 38 - tickerScroll + CW + 38) % (CW + 38)) - 10;
    const up = Math.sin(t * speed + i * 1.1) > 0;
    ctx.fillStyle = up
      ? `rgba(83, 227, 194, ${0.75 * bright})`
      : `rgba(255, 110, 110, ${0.75 * bright})`;
    ctx.textAlign = 'left';
    ctx.fillText(`${tk} ${up ? '▲' : '▼'}`, tx, CH - 5);
  });

  // "GINNY" label
  ctx.font = '9px monospace';
  ctx.fillStyle = `rgba(83, 227, 194, ${0.35 * bright})`;
  ctx.textAlign = 'right';
  ctx.fillText('GINNY', CW - 4, 10);
}

/* ══════════════════════════════════════════════════════════════
   Main component
══════════════════════════════════════════════════════════════ */

let _instanceCounter = 0;

export function AgentMonitorScreen({
  agentId,
  isActive = false,
  isNight = false,
  position,
  width = 0.42,
  height = 0.24,
}: AgentMonitorScreenProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const instanceId = useMemo(() => `monitor-${agentId}-${_instanceCounter++}`, [agentId]);

  // Create canvas + texture once
  const { ctx, texture } = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = CW;
    canvas.height = CH;
    const ctx = canvas.getContext('2d')!;
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return { ctx, texture };
  }, []);

  // Cleanup texture on unmount
  useEffect(() => {
    return () => {
      texture.dispose();
      matrixState.delete(instanceId);
    };
  }, [texture, instanceId]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;

    if (agentId === 'samantha') {
      drawSamantha(ctx, t, isActive, isNight);
    } else if (agentId === 'emma') {
      drawEmma(ctx, t, isActive, isNight, instanceId);
    } else if (agentId === 'ginny') {
      drawGinny(ctx, t, isActive, isNight);
    }

    texture.needsUpdate = true;

    // Adaptive emissive intensity
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      const base = isNight ? 0.45 : 0.85;
      const pulse = isActive ? 0.2 : 0.08;
      mat.emissiveIntensity = base + pulse * Math.sin(t * (isActive ? 3.5 : 2.0));
    }
  });

  const emissiveColor = agentId === 'samantha'
    ? '#a855f7'
    : agentId === 'emma'
    ? '#22c55e'
    : '#14b8a6';

  return (
    <mesh ref={meshRef} position={position}>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial
        map={texture}
        emissiveMap={texture}
        emissive={emissiveColor}
        emissiveIntensity={0.85}
        toneMapped={false}
      />
    </mesh>
  );
}
