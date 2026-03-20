/**
 * TimelinePanel — SRP: renders the list of recent session events only.
 */

import type { ISession } from '../types';

interface TimelinePanelProps {
  sessions: ISession[];
}

function timeAgo(isoTimestamp: string): string {
  const diff = Date.now() - new Date(isoTimestamp).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `hace ${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `hace ${hours}h`;
}

const ROLE_LABEL: Record<string, string> = {
  assistant: '🤖',
  user: '👤',
  tool_result: '🔧',
};

export function TimelinePanel({ sessions }: TimelinePanelProps) {
  // Collect recent events from all sessions, sorted by timestamp descending
  const events = sessions
    .flatMap((s) =>
      s.recentEvents.map((ev) => ({
        ...ev,
        sessionKey: s.key,
        agentId: s.agentId,
        status: s.status,
      }))
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 30);

  return (
    <div className="timeline-panel">
      <div className="timeline-panel-header">
        <span>📜 Timeline</span>
        <span className="timeline-count">{events.length} eventos</span>
      </div>
      <ul className="timeline-list">
        {events.length === 0 && (
          <li className="timeline-empty">Sin eventos recientes</li>
        )}
        {events.map((ev) => (
          <li key={`${ev.sessionKey}-${ev.id}`} className="timeline-item">
            <span className="timeline-role">{ROLE_LABEL[ev.role] ?? '💬'}</span>
            <span className="timeline-agent">{ev.agentId}</span>
            <span className="timeline-snippet">{ev.snippet}</span>
            <span className="timeline-time">{timeAgo(ev.timestamp)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
