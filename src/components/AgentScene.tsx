/**
 * AgentScene — SRP: renders the visual scene canvas with agent avatars in zones.
 */

import type { ISession, AgentNameMap, ISceneConfig } from '../types';
import { SessionService } from '../services/SessionService';
import { PixelAvatar } from './PixelAvatar';

interface AgentSceneProps {
  sessions: ISession[];
  agentNames: AgentNameMap;
  sceneConfig: ISceneConfig;
}

const STATUS_EMOJI: Record<string, string> = {
  running: '🟢',
  waiting: '🟡',
  idle: '⚫',
};

const ZONE_STYLES: Record<string, React.CSSProperties> = {
  running: { left: '0%', top: '0%', width: '50%', height: '100%' },
  waiting: { left: '50%', top: '0%', width: '50%', height: '50%' },
  idle: { left: '50%', top: '50%', width: '50%', height: '50%' },
};

export function AgentScene({ sessions, agentNames, sceneConfig }: AgentSceneProps) {
  // Group sessions by status
  const grouped: Record<string, ISession[]> = { running: [], waiting: [], idle: [] };
  for (const session of sessions) {
    if (grouped[session.status]) {
      grouped[session.status].push(session);
    }
  }

  const getAgentDisplay = (session: ISession): { name: string; seed: string } => {
    const agentId = session.agentId || SessionService.extractAgentId(session.key);
    const resolvedName = agentNames[agentId];
    if (resolvedName) {
      // resolvedName may include emoji prefix like "🧠 Samantha"
      const parts = resolvedName.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)\s*(.*)/u);
      if (parts) return { seed: agentId, name: parts[2] };
      return { seed: agentId, name: resolvedName };
    }
    return { seed: agentId, name: agentId };
  };

  return (
    <div
      className="agent-scene"
      style={{
        backgroundImage: `url(${sceneConfig.backgroundImage})`,
      }}
    >
      {(['running', 'waiting', 'idle'] as const).map((status) => {
        const zoneDef = sceneConfig.zoneDefs[status];
        const zoneSessions = grouped[status];
        const zoneStyle = ZONE_STYLES[status];

        return (
          <div
            key={status}
            className={`scene-zone scene-zone--${status}`}
            style={zoneStyle}
          >
            <div className="scene-zone-header">
              <span className="scene-zone-deco">{zoneDef.deco}</span>
              <span className="scene-zone-label">{sceneConfig.zoneLabels[status]}</span>
            </div>

            <div className="scene-zone-agents">
              {zoneSessions.map((session) => {
                const { name, seed } = getAgentDisplay(session);
                return (
                  <div key={session.key} className="agent-avatar">
                    <div className="agent-avatar-sprite"><PixelAvatar seed={seed} /></div>
                    <div className="agent-avatar-name">{name}</div>
                    <div className={`agent-avatar-badge agent-avatar-badge--${session.status}`}>
                      {STATUS_EMOJI[session.status]} {session.status}
                    </div>
                  </div>
                );
              })}
              {zoneSessions.length === 0 && (
                <div className="scene-zone-empty">vacío</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
