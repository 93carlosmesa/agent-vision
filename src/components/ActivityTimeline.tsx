/**
 * ActivityTimeline — Tool execution history for a selected agent session.
 * Subscribes via WS and updates in real time.
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import type { IToolHistoryEntry, IWsToolActivity, IWsToolHistory, ServerMessage } from '../types';

interface ActivityTimelineProps {
  sessionKey: string | null;
  agentName?: string;
  onClose: () => void;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function ActivityTimeline({ sessionKey, agentName, onClose }: ActivityTimelineProps) {
  const [history, setHistory] = useState<IToolHistoryEntry[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  const handleMessage = useCallback((event: MessageEvent) => {
    let msg: ServerMessage;
    try {
      msg = JSON.parse(event.data as string) as ServerMessage;
    } catch {
      return;
    }

    if (msg.type === 'agent:tool_history') {
      const toolHistory = msg as IWsToolHistory;
      if (toolHistory.sessionKey === sessionKey) {
        setHistory(toolHistory.history);
      }
    }

    if (msg.type === 'agent:tool_activity') {
      const activity = msg as IWsToolActivity;
      if (activity.sessionKey !== sessionKey) return;

      setHistory((prev) => {
        if (activity.action === 'start') {
          const entry: IToolHistoryEntry = {
            toolId: activity.toolId,
            toolName: activity.toolName,
            status: activity.status,
            startedAt: activity.timestamp,
          };
          const next = [...prev, entry];
          if (next.length > 50) next.shift();
          return next;
        }

        if (activity.action === 'done') {
          return prev.map((e) => {
            if (e.toolId === activity.toolId && !e.endedAt) {
              return {
                ...e,
                endedAt: activity.timestamp,
                durationMs: activity.timestamp - e.startedAt,
              };
            }
            return e;
          });
        }

        return prev;
      });
    }
  }, [sessionKey]);

  useEffect(() => {
    if (!sessionKey) return;

    setHistory([]);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'session:subscribe', sessionKey }));
    };

    ws.onmessage = handleMessage;

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [sessionKey, handleMessage]);

  if (!sessionKey) return null;

  const sorted = [...history].reverse();

  return (
    <div className="activity-timeline">
      <div className="activity-timeline-header">
        <span className="activity-timeline-title">
          {agentName ?? sessionKey}
        </span>
        <button className="activity-timeline-close" onClick={onClose}>
          &times;
        </button>
      </div>
      <div className="activity-timeline-list">
        {sorted.length === 0 && (
          <div className="activity-timeline-empty">Sin actividad registrada</div>
        )}
        {sorted.map((entry, i) => {
          const isRunning = !entry.endedAt;
          return (
            <div
              key={`${entry.toolId}-${i}`}
              className={`activity-timeline-item${isRunning ? ' activity-timeline-item--running' : ''}`}
            >
              <span className="activity-timeline-icon">
                {isRunning ? (
                  <span className="activity-timeline-spinner" />
                ) : (
                  '\u2705'
                )}
              </span>
              <span className={`activity-timeline-label${isRunning ? '' : ' activity-timeline-label--done'}`}>
                {entry.status || entry.toolName}
              </span>
              {entry.durationMs != null && (
                <span className="activity-timeline-duration">
                  {formatDuration(entry.durationMs)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
