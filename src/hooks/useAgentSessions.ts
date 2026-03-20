/**
 * useAgentSessions — SRP: connects WebSocketClient + SessionService to React lifecycle.
 * No business logic. Just wires services to state and exposes clean API.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { WebSocketClient } from '../services/WebSocketClient';
import { SessionService } from '../services/SessionService';
import type { ISession, AgentNameMap, ISceneConfig } from '../types';
import { scenes, DEFAULT_SCENE } from '../scenes/sceneConfig';

export interface IUseAgentSessions {
  sessions: ISession[];
  agentNames: AgentNameMap;
  isConnected: boolean;
  currentScene: ISceneConfig;
  setScene: (sceneId: string) => void;
}

export function useAgentSessions(): IUseAgentSessions {
  const wsClientRef = useRef<WebSocketClient | null>(null);
  const sessionServiceRef = useRef<SessionService | null>(null);

  const [sessions, setSessions] = useState<ISession[]>([]);
  const [agentNames, setAgentNames] = useState<AgentNameMap>({});
  const [isConnected, setIsConnected] = useState(false);
  const [sceneId, setSceneId] = useState<string>(DEFAULT_SCENE);

  useEffect(() => {
    const wsClient = new WebSocketClient();
    const sessionService = new SessionService();

    wsClientRef.current = wsClient;
    sessionServiceRef.current = sessionService;

    // Wire WS → SessionService
    wsClient.onMessage((raw) => {
      sessionService.processRaw(raw);
    });

    // Wire SessionService → React state
    sessionService.onChange((state) => {
      setSessions([...state.sessions]);
      setAgentNames({ ...state.agentNames });
    });

    // Connection status
    wsClient.onConnect(() => setIsConnected(true));
    wsClient.onDisconnect(() => setIsConnected(false));

    wsClient.connect();

    return () => {
      wsClient.disconnect();
    };
  }, []);

  const setScene = useCallback((id: string) => {
    if (scenes[id]) {
      setSceneId(id);
    }
  }, []);

  const currentScene = scenes[sceneId] ?? scenes[DEFAULT_SCENE];

  return { sessions, agentNames, isConnected, currentScene, setScene };
}
