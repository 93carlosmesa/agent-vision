/**
 * DebugPanel — ClaudeWatcher diagnostic overlay.
 * Activated via ?debug=1 in URL or localStorage key 'agent-vision-debug'.
 */

import { useEffect, useState, useCallback } from 'react';
import type { IClaudeWatcherDebugInfo } from '../types';

interface DebugPanelProps {
  visible: boolean;
  onClose: () => void;
}

interface DebugResponse {
  enabled: boolean;
  sessions: IClaudeWatcherDebugInfo[];
}

function timeAgo(epochMs: number): string {
  if (!epochMs) return 'nunca';
  const diff = Date.now() - epochMs;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `hace ${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `hace ${hours}h`;
}

function getBasename(filePath: string): string {
  const idx = filePath.lastIndexOf('/');
  return idx >= 0 ? filePath.slice(idx + 1) : filePath;
}

function getSessionState(info: IClaudeWatcherDebugInfo): { label: string; icon: string } {
  if (!info.lastDataAt) return { label: 'No encontrado', icon: '\u274C' };
  const staleMs = Date.now() - info.lastDataAt;
  if (staleMs > 30_000) return { label: 'Stale', icon: '\u26A0\uFE0F' };
  return { label: 'Activo', icon: '\u2705' };
}

export function DebugPanel({ visible, onClose }: DebugPanelProps) {
  const [data, setData] = useState<DebugResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchDebug = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/debug/claude-watcher');
      const json = await res.json() as DebugResponse;
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) fetchDebug();
  }, [visible, fetchDebug]);

  if (!visible) return null;

  return (
    <div className="debug-panel">
      <div className="debug-panel-header">
        <span className="debug-panel-title">Claude Code Debug</span>
        <div className="debug-panel-actions">
          <button className="debug-panel-refresh" onClick={fetchDebug} disabled={loading}>
            {loading ? '...' : '\u21BB'}
          </button>
          <button className="debug-panel-close" onClick={onClose}>&times;</button>
        </div>
      </div>
      <div className="debug-panel-body">
        {!data || (!data.enabled && data.sessions.length === 0) ? (
          <div className="debug-panel-empty">ClaudeWatcher no activo</div>
        ) : (
          data.sessions.map((info) => {
            const state = getSessionState(info);
            return (
              <div key={info.sessionKey} className="debug-panel-entry">
                <div className="debug-panel-agent">{info.agentId}</div>
                <div className="debug-panel-file">{getBasename(info.filePath)}</div>
                <div className="debug-panel-state">
                  {state.icon} {state.label}
                </div>
                <div className="debug-panel-stats">
                  Lineas: {info.linesProcessed} | Offset: {info.fileOffset}
                </div>
                <div className="debug-panel-last">
                  Ultimo dato: {timeAgo(info.lastDataAt)}
                </div>
                {info.activeToolNames.length > 0 && (
                  <div className="debug-panel-tools">
                    Tools: {info.activeToolNames.join(', ')}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/** Check if debug mode is enabled via URL param or localStorage */
export function isDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get('debug') === '1') return true;
  return localStorage.getItem('agent-vision-debug') === '1';
}
