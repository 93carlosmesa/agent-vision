/**
 * SystemMetricsPanel — Floating 3D panel above Samantha's desk.
 *
 * Displays live system metrics:
 *  - Current time (Madrid)
 *  - Day/night label
 *  - Nexo Board status (fetched from /api/health)
 *  - Agent Vision health dot
 */

import { useEffect, useRef, useState } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SAMANTHA_DESK_POSITION } from '../../systems/DeskManager';

/* ── Types ── */
interface BoardHealth {
  totalTasks: number;
  activeTasks: number;
  status: 'ok' | 'error';
}

interface SystemMetrics {
  time: string;
  dayNightLabel: string;
  board: BoardHealth | null;
  agentVisionOk: boolean;
  lastUpdated: number;
}

/* ── Helpers ── */
function getMadridTime(): string {
  return new Date().toLocaleTimeString('es-ES', {
    timeZone: 'Europe/Madrid',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function getDayNightLabel(): string {
  const hour = parseInt(
    new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid', hour: 'numeric', hour12: false }),
    10,
  );
  if (hour >= 6 && hour < 9) return '🌅 Amanecer';
  if (hour >= 9 && hour < 18) return '☀️ Día';
  if (hour >= 18 && hour < 21) return '🌆 Tarde';
  if (hour >= 21 && hour < 24) return '🌙 Noche';
  return '🌑 Madrugada';
}

async function fetchBoardHealth(): Promise<BoardHealth | null> {
  try {
    const res = await fetch('http://localhost:2511/api/health', { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = await res.json();
    // Nexo Board health endpoint — adapt to actual shape
    const totalTasks = data.totalTasks ?? data.tasks?.total ?? (Array.isArray(data.tasks) ? data.tasks.length : 0);
    const activeTasks = data.activeTasks ?? data.tasks?.active ?? (Array.isArray(data.tasks) ? data.tasks.filter((t: { status?: string }) => t.status === 'in_progress' || t.status === 'active').length : 0);
    return { totalTasks, activeTasks, status: 'ok' };
  } catch {
    return null;
  }
}

async function checkAgentVision(): Promise<boolean> {
  try {
    const res = await fetch('/health', { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

/* ── Animated panel float ── */
function FloatWrapper({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.position.y = 2.6 + Math.sin(clock.elapsedTime * 0.9) * 0.06;
    }
  });
  return (
    <group
      ref={ref}
      position={[SAMANTHA_DESK_POSITION[0], 2.6, SAMANTHA_DESK_POSITION[2] - 0.3]}
    >
      {children}
    </group>
  );
}

/* ── HTML panel ── */
function MetricsPanelHTML({ metrics }: { metrics: SystemMetrics }) {
  return (
    <div
      style={{
        background: 'rgba(10, 3, 25, 0.88)',
        border: '1.5px solid rgba(168, 85, 247, 0.75)',
        borderRadius: '10px',
        padding: '10px 14px',
        width: '190px',
        boxShadow: '0 0 18px rgba(168, 85, 247, 0.45), 0 0 40px rgba(168, 85, 247, 0.15)',
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontSize: '11px',
        color: '#e9d5ff',
        userSelect: 'none',
        pointerEvents: 'none',
        lineHeight: '1.6',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginBottom: '7px',
          borderBottom: '1px solid rgba(168, 85, 247, 0.35)',
          paddingBottom: '6px',
        }}
      >
        <span style={{ fontSize: '14px' }}>🧠</span>
        <span style={{ color: '#c084fc', fontWeight: 700, fontSize: '11px', letterSpacing: '0.5px' }}>
          SAMANTHA HQ
        </span>
      </div>

      {/* Time */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
        <span style={{ color: '#a78bfa', fontSize: '10px' }}>⏰ Madrid</span>
        <span style={{ color: '#f0e6ff', fontWeight: 600 }}>{metrics.time}</span>
      </div>

      {/* Day/night */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ color: '#a78bfa', fontSize: '10px' }}>Modo</span>
        <span style={{ color: '#f0e6ff' }}>{metrics.dayNightLabel}</span>
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid rgba(168, 85, 247, 0.2)', margin: '5px 0' }} />

      {/* Nexo Board */}
      <div style={{ marginBottom: '3px', color: '#a78bfa', fontSize: '10px' }}>📋 Nexo Board</div>
      {metrics.board ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#ddd6fe', fontSize: '10px' }}>Total tasks</span>
            <span style={{ color: '#f0e6ff', fontWeight: 600 }}>{metrics.board.totalTasks}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
            <span style={{ color: '#ddd6fe', fontSize: '10px' }}>Active</span>
            <span
              style={{
                color: metrics.board.activeTasks > 0 ? '#c084fc' : '#6b7280',
                fontWeight: 600,
              }}
            >
              {metrics.board.activeTasks}
            </span>
          </div>
        </>
      ) : (
        <div style={{ color: '#6b7280', fontSize: '10px', marginBottom: '5px' }}>Connecting…</div>
      )}

      {/* Divider */}
      <div style={{ borderTop: '1px solid rgba(168, 85, 247, 0.2)', margin: '4px 0' }} />

      {/* Agent Vision health */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#a78bfa', fontSize: '10px' }}>🌐 Agent Vision</span>
        <span
          style={{
            display: 'inline-block',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: metrics.agentVisionOk ? '#22c55e' : '#ef4444',
            boxShadow: metrics.agentVisionOk
              ? '0 0 6px rgba(34,197,94,0.8)'
              : '0 0 6px rgba(239,68,68,0.8)',
          }}
        />
      </div>
    </div>
  );
}

/* ── Main export ── */
export function SystemMetricsPanel() {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    time: getMadridTime(),
    dayNightLabel: getDayNightLabel(),
    board: null,
    agentVisionOk: true,
    lastUpdated: Date.now(),
  });

  // Time updates every second
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        time: getMadridTime(),
        dayNightLabel: getDayNightLabel(),
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Board + AV health updates every 30s
  useEffect(() => {
    async function fetchAll() {
      const [board, avOk] = await Promise.all([fetchBoardHealth(), checkAgentVision()]);
      setMetrics(prev => ({
        ...prev,
        board,
        agentVisionOk: avOk,
        lastUpdated: Date.now(),
      }));
    }
    fetchAll();
    const interval = setInterval(fetchAll, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <FloatWrapper>
      <Html
        center
        distanceFactor={6}
        style={{ pointerEvents: 'none' }}
        occlude={false}
      >
        <MetricsPanelHTML metrics={metrics} />
      </Html>
    </FloatWrapper>
  );
}
