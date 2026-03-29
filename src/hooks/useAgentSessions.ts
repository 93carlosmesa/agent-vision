/**
 * useAgentSessions — wires WebSocket + services to React state.
 */

import { useEffect, useRef, useState, useMemo } from 'react';
import { WebSocketClient } from '../services/WebSocketClient';
import { SessionService } from '../services/SessionService';
import { useClaudeActivity } from './useClaudeActivity';
import type { IAgentActivity } from './useClaudeActivity';
import type { ISession, IInteraction, AgentNameMap, ISceneConfig, ISquad, AgentRole, ServerMessage } from '../types';
import { world3d } from '../scenes/sceneConfig';
import { ROLE_LABELS, ROLE_TAGS, SQUAD_DEFINITIONS, resolveRoleFromText } from '../config/squads';

export type { IAgentActivity };

export interface IUseAgentSessions {
  sessions: ISession[];
  agentNames: AgentNameMap;
  interactions: IInteraction[];
  isConnected: boolean;
  squads: ISquad[];
  activities: Map<string, IAgentActivity>;
}

const ROLE_ORDER: AgentRole[] = ['seniorFrontendArchitect', 'codeReviewer', 'slinter', 'formateur'];

function resolveDisplayName(session: ISession, agentNames: AgentNameMap): string {
  const agentId = session.agentId || SessionService.extractAgentId(session.key);
  const resolvedName = agentNames[agentId] ?? agentId;
  return resolvedName.replace(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)\s*/u, '').trim();
}

function inferSquadLane(agentId: string, displayName: string): 'development' | 'investment' {
  const text = `${agentId} ${displayName}`.toLowerCase();
  const investmentHints = [
    'ginny', 'inv', 'inversion', 'invest', 'market', 'trading', 'radar', 'predictor', 'sp500', 'nasdaq',
  ];

  if (investmentHints.some((hint) => text.includes(hint))) {
    return 'investment';
  }

  return 'development';
}

function mapSquads(sessions: ISession[], agentNames: AgentNameMap, currentScene: ISceneConfig): ISquad[] {
  const enriched = sessions.map((session) => {
    const displayName = resolveDisplayName(session, agentNames);
    const roleFromName = resolveRoleFromText(`${session.agentId} ${displayName}`);
    const lane = inferSquadLane(session.agentId, displayName);
    return {
      session,
      displayName,
      role: roleFromName,
      lane,
    };
  }).filter((item) => {
    const name = item.displayName.toLowerCase();
    return item.session.agentId !== 'main' && !name.includes('samantha');
  });

  const roleBuckets = new Map<AgentRole, typeof enriched>();
  for (const role of ROLE_ORDER) roleBuckets.set(role, []);

  const leftovers: typeof enriched = [];

  for (const item of enriched) {
    if (item.role) {
      roleBuckets.get(item.role)?.push(item);
    } else {
      leftovers.push(item);
    }
  }

  // Orden estable por lane: Desarrollo primero (squad 1), Inversión segundo (squad 2).
  const laneRank = (lane: 'development' | 'investment') => (lane === 'development' ? 0 : 1);
  for (const role of ROLE_ORDER) {
    roleBuckets.get(role)?.sort((a, b) => laneRank(a.lane) - laneRank(b.lane));
  }
  leftovers.sort((a, b) => laneRank(a.lane) - laneRank(b.lane));

  // Fill missing role buckets with leftovers to keep both squads populated.
  for (const role of ROLE_ORDER) {
    const bucket = roleBuckets.get(role);
    if (!bucket || bucket.length >= 2) continue;
    while (bucket.length < 2 && leftovers.length > 0) {
      const next = leftovers.shift();
      if (next) bucket.push({ ...next, role });
    }
  }

  return SQUAD_DEFINITIONS.map((definition, squadIndex) => {
    const members = definition.roles.map((role) => {
      const candidate = roleBuckets.get(role)?.[squadIndex];

      if (!candidate) {
        const roleTag = ROLE_TAGS[role];
        const zoneLabel = currentScene.zoneLabels.idle;
        return {
          squadId: definition.id,
          squadLabel: definition.name,
          role,
          roleLabel: ROLE_LABELS[role],
          roleTag,
          sessionKey: `${definition.id}-${role}-placeholder`,
          agentId: 'unassigned',
          displayName: 'Pendiente',
          status: 'idle' as const,
          zoneLabel,
          collaborationTag: `${roleTag} · ${zoneLabel}`,
        };
      }

      const roleTag = ROLE_TAGS[role];
      const zoneLabel = currentScene.zoneLabels[candidate.session.status];

      return {
        squadId: definition.id,
        squadLabel: definition.name,
        role,
        roleLabel: ROLE_LABELS[role],
        roleTag,
        sessionKey: candidate.session.key,
        agentId: candidate.session.agentId,
        displayName: candidate.displayName,
        status: candidate.session.status,
        zoneLabel,
        collaborationTag: `${roleTag} · ${zoneLabel}`,
      };
    });

    return {
      id: definition.id,
      name: definition.name,
      focus: definition.focus,
      members,
    };
  });
}

export function useAgentSessions(): IUseAgentSessions {
  const wsClientRef = useRef<WebSocketClient | null>(null);
  const sessionServiceRef = useRef<SessionService | null>(null);

  const [sessions, setSessions] = useState<ISession[]>([]);
  const [agentNames, setAgentNames] = useState<AgentNameMap>({});
  const [interactions, setInteractions] = useState<IInteraction[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const currentScene = world3d;

  const { activities, processToolActivity, processStatusChange } = useClaudeActivity();

  useEffect(() => {
    const wsClient = new WebSocketClient();
    const sessionService = new SessionService();

    wsClientRef.current = wsClient;
    sessionServiceRef.current = sessionService;

    wsClient.onMessage((raw) => {
      sessionService.processRaw(raw);

      // Route Claude Code messages to activity tracker
      try {
        const msg = JSON.parse(raw) as ServerMessage;
        if (msg.type === 'agent:tool_activity') {
          processToolActivity(msg);
        } else if (msg.type === 'agent:status_change') {
          processStatusChange(msg);
        }
      } catch {
        // JSON parse errors already handled by SessionService
      }
    });

    sessionService.onChange((state) => {
      setSessions([...state.sessions]);
      setAgentNames({ ...state.agentNames });
      setInteractions([...state.interactions]);
    });

    wsClient.onConnect(() => setIsConnected(true));
    wsClient.onDisconnect(() => setIsConnected(false));

    wsClient.connect();

    return () => {
      wsClient.disconnect();
    };
  }, [processToolActivity, processStatusChange]);

  const squads = useMemo(
    () => mapSquads(sessions, agentNames, currentScene),
    [sessions, agentNames, currentScene],
  );

  return { sessions, agentNames, interactions, isConnected, squads, activities };
}
