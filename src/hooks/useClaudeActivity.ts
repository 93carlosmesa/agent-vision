/**
 * useClaudeActivity — tracks real-time Claude Code tool activity per agent.
 *
 * Processes 'agent:tool_activity' and 'agent:status_change' WS messages
 * and maintains a Map<agentId, IAgentActivity> with stale-tool cleanup.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { IWsToolActivity, IWsAgentStatusChange } from '../types';

export interface IAgentActivity {
  agentId: string;
  currentTool?: string;
  activeToolCount: number;
  isWaitingPermission: boolean;
  isWaiting: boolean;
  turnCompleted: boolean;
  subagentCount: number;
  lastUpdated: number;
}

/** If no tool_activity arrives for an agent within this window, clear currentTool */
const TOOL_STALE_MS = 10_000;
const STALE_CHECK_INTERVAL_MS = 3_000;

function makeDefaultActivity(agentId: string): IAgentActivity {
  return {
    agentId,
    activeToolCount: 0,
    isWaitingPermission: false,
    isWaiting: false,
    turnCompleted: false,
    subagentCount: 0,
    lastUpdated: Date.now(),
  };
}

export function useClaudeActivity() {
  const activitiesRef = useRef<Map<string, IAgentActivity>>(new Map());
  const [activities, setActivities] = useState<Map<string, IAgentActivity>>(new Map());

  // Periodic stale-tool cleanup
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      let changed = false;
      for (const [, activity] of activitiesRef.current) {
        if (activity.currentTool && now - activity.lastUpdated > TOOL_STALE_MS) {
          activity.currentTool = undefined;
          activity.activeToolCount = 0;
          changed = true;
        }
      }
      if (changed) {
        setActivities(new Map(activitiesRef.current));
      }
    }, STALE_CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const processToolActivity = useCallback((msg: IWsToolActivity) => {
    const map = activitiesRef.current;
    const existing = map.get(msg.agentId) ?? makeDefaultActivity(msg.agentId);

    if (msg.action === 'start') {
      existing.currentTool = msg.toolName;
      existing.activeToolCount = Math.max(existing.activeToolCount + 1, 1);
      existing.turnCompleted = false;
    } else if (msg.action === 'done') {
      existing.activeToolCount = Math.max(existing.activeToolCount - 1, 0);
      if (existing.activeToolCount === 0) {
        existing.currentTool = undefined;
      }
    } else if (msg.action === 'clear') {
      existing.currentTool = undefined;
      existing.activeToolCount = 0;
    }

    existing.lastUpdated = msg.timestamp || Date.now();
    map.set(msg.agentId, existing);
    setActivities(new Map(map));
  }, []);

  const processStatusChange = useCallback((msg: IWsAgentStatusChange) => {
    const map = activitiesRef.current;
    const existing = map.get(msg.agentId) ?? makeDefaultActivity(msg.agentId);

    existing.isWaitingPermission = msg.isWaitingPermission ?? false;
    existing.isWaiting = msg.status === 'waiting';
    existing.turnCompleted = msg.turnCompleted ?? false;
    if (msg.activity) {
      existing.currentTool = msg.activity;
    }
    existing.lastUpdated = msg.timestamp || Date.now();
    map.set(msg.agentId, existing);
    setActivities(new Map(map));
  }, []);

  const getActivity = useCallback((agentId: string): IAgentActivity | null => {
    return activities.get(agentId) ?? null;
  }, [activities]);

  return { activities, getActivity, processToolActivity, processStatusChange };
}
