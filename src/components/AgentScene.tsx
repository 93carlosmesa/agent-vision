/**
 * AgentScene — renders zones + absolute-positioned avatars.
 * Avatars transition between zone slots to simulate walking.
 */

import type { CSSProperties } from 'react';
import type { ISession, AgentNameMap, ISceneConfig } from '../types';
import { SessionService } from '../services/SessionService';
import { PixelAvatar } from './PixelAvatar';

interface AgentSceneProps {
  sessions: ISession[];
  agentNames: AgentNameMap;
  sceneConfig: ISceneConfig;
  memberMetaBySession: Record<string, {
    squadId: string;
    squadLabel: string;
    roleLabel: string;
    collaborationTag: string;
  }>;
}

const STATUS_EMOJI: Record<string, string> = {
  running: '🟢',
  waiting: '🟡',
  idle: '⚫',
};

const ZONE_STYLES: Record<string, CSSProperties> = {
  running: { left: '0%', top: '0%', width: '50%', height: '100%' },
  waiting: { left: '50%', top: '0%', width: '50%', height: '50%' },
  idle: { left: '50%', top: '50%', width: '50%', height: '50%' },
};

const ZONE_ORIGIN: Record<string, { x: number; y: number; cols: number }> = {
  running: { x: 6, y: 16, cols: 4 },
  waiting: { x: 56, y: 16, cols: 3 },
  idle: { x: 56, y: 62, cols: 3 },
};

function getAgentDisplay(session: ISession, agentNames: AgentNameMap): { name: string; seed: string } {
  const agentId = session.agentId || SessionService.extractAgentId(session.key);
  const resolvedName = agentNames[agentId];
  if (resolvedName) {
    const parts = resolvedName.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)\s*(.*)/u);
    if (parts) return { seed: agentId, name: parts[2] };
    return { seed: agentId, name: resolvedName };
  }
  return { seed: agentId, name: agentId };
}

function positionFor(status: ISession['status'], index: number): { left: string; top: string } {
  const zone = ZONE_ORIGIN[status];
  const col = index % zone.cols;
  const row = Math.floor(index / zone.cols);

  const left = zone.x + col * 10;
  const top = zone.y + row * 18;
  return { left: `${left}%`, top: `${top}%` };
}

export function AgentScene({ sessions, agentNames, sceneConfig, memberMetaBySession }: AgentSceneProps) {
  const grouped: Record<string, ISession[]> = { running: [], waiting: [], idle: [] };

  for (const session of sessions) {
    if (grouped[session.status]) {
      grouped[session.status].push(session);
    }
  }

  const positioned = (['running', 'waiting', 'idle'] as const).flatMap((status) =>
    grouped[status].map((session, index) => ({
      session,
      position: positionFor(status, index),
    })),
  );

  return (
    <div
      className="agent-scene"
      style={{
        backgroundImage: `url(${sceneConfig.backgroundImage})`,
      }}
    >
      {(['running', 'waiting', 'idle'] as const).map((status) => {
        const zoneDef = sceneConfig.zoneDefs[status];

        return (
          <div
            key={status}
            className={`scene-zone scene-zone--${status}`}
            style={ZONE_STYLES[status]}
          >
            <div className="scene-zone-header">
              <span className="scene-zone-deco">{zoneDef.deco}</span>
              <span className="scene-zone-label">{sceneConfig.zoneLabels[status]}</span>
            </div>
          </div>
        );
      })}

      <div className="scene-avatar-layer">
        {positioned.map(({ session, position }) => {
          const { name, seed } = getAgentDisplay(session, agentNames);
          const memberMeta = memberMetaBySession[session.key];
          const squadClass = memberMeta?.squadId === 'squad-naming' ? 'agent-avatar--squad-naming' : 'agent-avatar--squad-movement';

          return (
            <div
              key={session.key}
              className={`agent-avatar agent-avatar--walking agent-avatar--${session.status} ${squadClass}`}
              style={position}
            >
              <div className="agent-avatar-squad">{memberMeta?.squadLabel ?? 'Sin squad'}</div>
              <div className="agent-avatar-sprite"><PixelAvatar seed={seed} /></div>
              <div className="agent-avatar-name" title={name}>{name}</div>
              <div className="agent-avatar-role" title={memberMeta?.roleLabel}>{memberMeta?.roleLabel ?? 'Rol pendiente'}</div>
              <div className={`agent-avatar-badge agent-avatar-badge--${session.status}`}>
                {STATUS_EMOJI[session.status]} {memberMeta?.collaborationTag ?? session.status}
              </div>
            </div>
          );
        })}
        {positioned.length === 0 && <div className="scene-zone-empty scene-zone-empty--global">Sin agentes</div>}
      </div>
    </div>
  );
}
