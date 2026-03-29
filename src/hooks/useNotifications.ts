/**
 * useNotifications — tracks agent turn completions and manages toast queue.
 */

import { useState, useCallback, useRef } from 'react';
import type { IWsAgentStatusChange } from '../types';

export interface INotification {
  id: string;
  agentId: string;
  agentName?: string;
  activity?: string;
  createdAt: number;
}

const MAX_NOTIFICATIONS = 3;
const ANTI_SPAM_MS = 5_000;
const AUTO_DISMISS_MS = 4_000;

export function useNotifications() {
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const lastNotifByAgent = useRef<Map<string, number>>(new Map());
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const processStatusChange = useCallback(
    (msg: IWsAgentStatusChange, agentNames?: Record<string, string>) => {
      if (!msg.turnCompleted) return;

      const now = Date.now();
      const lastTime = lastNotifByAgent.current.get(msg.agentId) ?? 0;
      if (now - lastTime < ANTI_SPAM_MS) return;

      lastNotifByAgent.current.set(msg.agentId, now);

      const id = `${msg.agentId}-${now}`;
      const notif: INotification = {
        id,
        agentId: msg.agentId,
        agentName: agentNames?.[msg.agentId],
        activity: msg.activity,
        createdAt: now,
      };

      setNotifications((prev) => {
        const next = [...prev, notif];
        if (next.length > MAX_NOTIFICATIONS) next.shift();
        return next;
      });

      const timer = setTimeout(() => {
        timersRef.current.delete(id);
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, AUTO_DISMISS_MS);
      timersRef.current.set(id, timer);
    },
    [],
  );

  return { notifications, dismiss, processStatusChange };
}
