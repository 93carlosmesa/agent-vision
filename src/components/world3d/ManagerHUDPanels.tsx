/**
 * ManagerHUDPanels — Floating 3D HUD panels above Emma & Ginny's desks.
 *
 * Emma  💻 (amber): shows Nexo Board task stats + active work indicator
 * Ginny 📈 (teal):  shows BTC/ETH live prices + market mood
 *
 * Mirrors the pattern of SystemMetricsPanel (Samantha's HQ panel)
 * so the Sala de Dirección has three glowing HUD nodes — one per manager.
 *
 * Data refresh: every 30s (Board) | every 60s (crypto prices)
 */

import { useEffect, useRef, useState } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EMMA_DESK_POSITION, GINNY_DESK_POSITION } from '../../systems/DeskManager';

/* ─────────────────────────────────────────────── */
/*  Types                                          */
/* ─────────────────────────────────────────────── */

interface NexoBoardStats {
  total: number;
  pending: number;
  inProgress: number;
  done: number;
  status: 'ok' | 'error';
}

interface CryptoPrice {
  btc: number | null;
  eth: number | null;
  btcChange24h: number | null;
  mood: string;
  status: 'ok' | 'error';
}

/* ─────────────────────────────────────────────── */
/*  Data fetchers                                  */
/* ─────────────────────────────────────────────── */

async function fetchNexoStats(): Promise<NexoBoardStats> {
  try {
    const res = await fetch('http://localhost:2511/api/tasks', {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error('Board unreachable');
    const tasks = await res.json() as Array<{ column?: string; status?: string }>;

    const pending = tasks.filter(t =>
      (t.column ?? '').toLowerCase().includes('pendiente') ||
      (t.status ?? '').toLowerCase() === 'pending'
    ).length;
    const inProgress = tasks.filter(t =>
      (t.column ?? '').toLowerCase().includes('curso') ||
      (t.column ?? '').toLowerCase().includes('progress') ||
      (t.status ?? '').toLowerCase() === 'in_progress'
    ).length;
    const done = tasks.filter(t =>
      (t.column ?? '').toLowerCase().includes('hecho') ||
      (t.column ?? '').toLowerCase().includes('done') ||
      (t.status ?? '').toLowerCase() === 'done'
    ).length;

    return { total: tasks.length, pending, inProgress, done, status: 'ok' };
  } catch {
    return { total: 0, pending: 0, inProgress: 0, done: 0, status: 'error' };
  }
}

async function fetchCryptoPrices(): Promise<CryptoPrice> {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true',
      { signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) throw new Error('CoinGecko unreachable');
    const data = await res.json() as {
      bitcoin?: { usd?: number; usd_24h_change?: number };
      ethereum?: { usd?: number };
    };
    const btc = data.bitcoin?.usd ?? null;
    const eth = data.ethereum?.usd ?? null;
    const btcChange24h = data.bitcoin?.usd_24h_change ?? null;

    let mood = '😐 Neutral';
    if (btcChange24h !== null) {
      if (btcChange24h > 3) mood = '🚀 Bullish';
      else if (btcChange24h > 1) mood = '📈 Alcista';
      else if (btcChange24h < -3) mood = '🔻 Bearish';
      else if (btcChange24h < -1) mood = '📉 Bajista';
      else mood = '🌊 Lateral';
    }

    return { btc, eth, btcChange24h, mood, status: 'ok' };
  } catch {
    return { btc: null, eth: null, btcChange24h: null, mood: '⚠️ Sin datos', status: 'error' };
  }
}

/* ─────────────────────────────────────────────── */
/*  Float animation wrapper                        */
/* ─────────────────────────────────────────────── */

interface FloatProps {
  basePos: [number, number, number];
  phaseOffset?: number;
  children: React.ReactNode;
}

function FloatWrapper({ basePos, phaseOffset = 0, children }: FloatProps) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.position.y = basePos[1] + Math.sin(clock.elapsedTime * 0.85 + phaseOffset) * 0.06;
    }
  });
  return (
    <group ref={ref} position={[basePos[0], basePos[1], basePos[2]]}>
      {children}
    </group>
  );
}

/* ─────────────────────────────────────────────── */
/*  Emma HUD — amber theme                         */
/* ─────────────────────────────────────────────── */

const EMMA_FLOAT_BASE: [number, number, number] = [EMMA_DESK_POSITION[0], 2.7, EMMA_DESK_POSITION[2] - 0.3];

function EmmaHUDHTML({ stats }: { stats: NexoBoardStats }) {
  const accent = '#f59e0b';      // amber-400
  const glow   = 'rgba(245, 158, 11, 0.45)';
  const bg     = 'rgba(10, 6, 0, 0.88)';
  const border = 'rgba(245, 158, 11, 0.7)';
  const muted  = '#fbbf24';

  return (
    <div
      style={{
        background: bg,
        border: `1.5px solid ${border}`,
        borderRadius: '10px',
        padding: '10px 14px',
        width: '185px',
        boxShadow: `0 0 18px ${glow}, 0 0 40px rgba(245,158,11,0.12)`,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontSize: '11px',
        color: '#fef3c7',
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
          borderBottom: `1px solid rgba(245,158,11,0.3)`,
          paddingBottom: '6px',
        }}
      >
        <span style={{ fontSize: '14px' }}>💻</span>
        <span style={{ color: accent, fontWeight: 700, fontSize: '11px', letterSpacing: '0.5px' }}>
          EMMA DEV
        </span>
        {/* Live pulse dot */}
        <span
          style={{
            marginLeft: 'auto',
            display: 'inline-block',
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            background: stats.status === 'ok' ? '#22c55e' : '#6b7280',
            boxShadow: stats.status === 'ok' ? '0 0 5px rgba(34,197,94,0.8)' : 'none',
          }}
        />
      </div>

      {/* Nexo Board stats */}
      <div style={{ color: muted, fontSize: '10px', marginBottom: '4px' }}>📋 Nexo Board</div>

      {stats.status === 'ok' ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
            <span style={{ color: '#d97706', fontSize: '10px' }}>⏳ Pendientes</span>
            <span style={{ color: '#fef3c7', fontWeight: 600 }}>{stats.pending}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
            <span style={{ color: accent, fontSize: '10px' }}>⚡ En curso</span>
            <span
              style={{
                color: stats.inProgress > 0 ? accent : '#6b7280',
                fontWeight: 600,
              }}
            >
              {stats.inProgress}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ color: '#78716c', fontSize: '10px' }}>✅ Hechas</span>
            <span style={{ color: '#fef3c7', fontWeight: 600 }}>{stats.done}</span>
          </div>

          {/* Progress bar */}
          <div
            style={{
              background: 'rgba(245,158,11,0.15)',
              borderRadius: '4px',
              height: '5px',
              overflow: 'hidden',
              marginBottom: '6px',
            }}
          >
            <div
              style={{
                height: '100%',
                width: stats.total > 0 ? `${Math.round((stats.done / stats.total) * 100)}%` : '0%',
                background: `linear-gradient(90deg, ${accent}, #fbbf24)`,
                borderRadius: '4px',
                transition: 'width 0.6s ease',
              }}
            />
          </div>
          <div style={{ color: '#78716c', fontSize: '9px', textAlign: 'right' }}>
            {stats.total > 0 ? `${Math.round((stats.done / stats.total) * 100)}% complete` : 'No tasks'}
          </div>
        </>
      ) : (
        <div style={{ color: '#6b7280', fontSize: '10px' }}>Board offline…</div>
      )}

      {/* Divider */}
      <div style={{ borderTop: `1px solid rgba(245,158,11,0.2)`, margin: '6px 0 4px' }} />

      {/* Identity tag */}
      <div style={{ color: '#78716c', fontSize: '9px', textAlign: 'center', letterSpacing: '0.3px' }}>
        Dev Manager · Squad Lead
      </div>
    </div>
  );
}

export function EmmaHUDPanel() {
  const [stats, setStats] = useState<NexoBoardStats>({
    total: 0, pending: 0, inProgress: 0, done: 0, status: 'error',
  });

  useEffect(() => {
    fetchNexoStats().then(setStats);
    const interval = setInterval(() => fetchNexoStats().then(setStats), 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <FloatWrapper basePos={EMMA_FLOAT_BASE} phaseOffset={1.1}>
      <Html center distanceFactor={6} style={{ pointerEvents: 'none' }} occlude={false}>
        <EmmaHUDHTML stats={stats} />
      </Html>
    </FloatWrapper>
  );
}

/* ─────────────────────────────────────────────── */
/*  Ginny HUD — teal/emerald theme                 */
/* ─────────────────────────────────────────────── */

const GINNY_FLOAT_BASE: [number, number, number] = [GINNY_DESK_POSITION[0], 2.7, GINNY_DESK_POSITION[2] - 0.3];

function formatPrice(n: number | null): string {
  if (n === null) return '…';
  if (n >= 1000) return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

function formatChange(n: number | null): string {
  if (n === null) return '';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function GinnyHUDHTML({ crypto }: { crypto: CryptoPrice }) {
  const accent  = '#2dd4bf';     // teal-400
  const glow    = 'rgba(45, 212, 191, 0.4)';
  const bg      = 'rgba(0, 8, 10, 0.88)';
  const border  = 'rgba(45, 212, 191, 0.65)';
  const muted   = '#5eead4';
  const changeColor = (n: number | null) =>
    n === null ? '#6b7280' : n >= 0 ? '#34d399' : '#f87171';

  return (
    <div
      style={{
        background: bg,
        border: `1.5px solid ${border}`,
        borderRadius: '10px',
        padding: '10px 14px',
        width: '185px',
        boxShadow: `0 0 18px ${glow}, 0 0 40px rgba(45,212,191,0.1)`,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontSize: '11px',
        color: '#ccfbf1',
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
          borderBottom: `1px solid rgba(45,212,191,0.3)`,
          paddingBottom: '6px',
        }}
      >
        <span style={{ fontSize: '14px' }}>📈</span>
        <span style={{ color: accent, fontWeight: 700, fontSize: '11px', letterSpacing: '0.5px' }}>
          GINNY INVEST
        </span>
        <span
          style={{
            marginLeft: 'auto',
            display: 'inline-block',
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            background: crypto.status === 'ok' ? '#22c55e' : '#6b7280',
            boxShadow: crypto.status === 'ok' ? '0 0 5px rgba(34,197,94,0.8)' : 'none',
          }}
        />
      </div>

      {/* Market mood */}
      <div
        style={{
          background: 'rgba(45,212,191,0.08)',
          border: `1px solid rgba(45,212,191,0.2)`,
          borderRadius: '6px',
          padding: '4px 8px',
          marginBottom: '8px',
          textAlign: 'center',
          fontSize: '11px',
          color: accent,
          fontWeight: 600,
        }}
      >
        {crypto.mood}
      </div>

      {/* Crypto prices */}
      <div style={{ color: muted, fontSize: '10px', marginBottom: '4px' }}>🌐 Crypto Live</div>

      {/* BTC */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '3px' }}>
        <span style={{ color: '#f7931a', fontSize: '10px', fontWeight: 600 }}>₿ BTC</span>
        <div style={{ textAlign: 'right' }}>
          <span style={{ color: '#ccfbf1', fontWeight: 700, marginRight: '4px' }}>
            {formatPrice(crypto.btc)}
          </span>
          <span style={{ color: changeColor(crypto.btcChange24h), fontSize: '9px' }}>
            {formatChange(crypto.btcChange24h)}
          </span>
        </div>
      </div>

      {/* ETH */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
        <span style={{ color: '#627eea', fontSize: '10px', fontWeight: 600 }}>Ξ ETH</span>
        <span style={{ color: '#ccfbf1', fontWeight: 700 }}>
          {formatPrice(crypto.eth)}
        </span>
      </div>

      {/* Mini chart bars — decorative sparkline */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: '2px',
          height: '18px',
          marginBottom: '6px',
          opacity: 0.7,
        }}
      >
        {[0.6, 0.4, 0.7, 0.5, 0.8, 0.65, 0.9, 0.75, 1.0, 0.85].map((h, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: `${h * 100}%`,
              background: `linear-gradient(180deg, ${accent}, rgba(45,212,191,0.3))`,
              borderRadius: '2px 2px 0 0',
            }}
          />
        ))}
      </div>

      {/* Divider */}
      <div style={{ borderTop: `1px solid rgba(45,212,191,0.2)`, margin: '4px 0' }} />

      {/* Identity tag */}
      <div style={{ color: '#4b5563', fontSize: '9px', textAlign: 'center', letterSpacing: '0.3px' }}>
        Investment Manager · Risk Analyst
      </div>
    </div>
  );
}

export function GinnyHUDPanel() {
  const [crypto, setCrypto] = useState<CryptoPrice>({
    btc: null, eth: null, btcChange24h: null, mood: '🔄 Cargando…', status: 'error',
  });

  useEffect(() => {
    fetchCryptoPrices().then(setCrypto);
    const interval = setInterval(() => fetchCryptoPrices().then(setCrypto), 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <FloatWrapper basePos={GINNY_FLOAT_BASE} phaseOffset={2.3}>
      <Html center distanceFactor={6} style={{ pointerEvents: 'none' }} occlude={false}>
        <GinnyHUDHTML crypto={crypto} />
      </Html>
    </FloatWrapper>
  );
}
