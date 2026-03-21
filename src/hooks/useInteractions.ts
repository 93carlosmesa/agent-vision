/**
 * useInteractions — Simulates agent-to-agent interactions.
 *
 * When multiple agents are running/waiting, they periodically form
 * interaction pairs with visible connection lines.
 *
 * Future: driven by real WebSocket events. For now, deterministically
 * simulated from agent sessions.
 */

import { useState, useEffect, useRef } from 'react';
import type { ISession, IInteraction, InteractionType } from '../types';

const INTERACTION_DURATION = 5000;
const CHECK_INTERVAL = 4000;
const INTERACTION_CHANCE = 0.35;

const TYPES: InteractionType[] = ['consulting', 'validating', 'delegating'];
const LABELS: Record<InteractionType, string[]> = {
  consulting: ['asking advice', 'reviewing approach', 'checking strategy'],
  validating: ['verifying output', 'cross-checking', 'confirming result'],
  delegating: ['assigning task', 'dispatching work', 'forwarding request'],
};

function simpleHash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

let interactionCounter = 0;

export function useInteractions(sessions: ISession[]): IInteraction[] {
  const [interactions, setInteractions] = useState<IInteraction[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const active = sessions.filter((s) => s.status === 'running' || s.status === 'waiting');

      setInteractions((prev) => {
        // Prune expired
        const current = prev.filter((i) => now - i.startedAt < i.durationMs);

        if (active.length < 2) return current;

        // Already-connected session keys
        const connected = new Set<string>();
        for (const i of current) {
          connected.add(i.fromSessionKey);
          connected.add(i.toSessionKey);
        }

        const newInteractions: IInteraction[] = [];
        interactionCounter++;

        // Try to form one new pair
        const seed = simpleHash('interact' + String(interactionCounter));
        if ((seed % 100) / 100 > INTERACTION_CHANCE) return current;

        // Pick two agents that aren't already connected
        const available = active.filter((s) => !connected.has(s.key));
        if (available.length < 2) return current;

        const i1 = seed % available.length;
        let i2 = (seed * 7 + 3) % available.length;
        if (i2 === i1) i2 = (i1 + 1) % available.length;

        const type = TYPES[seed % TYPES.length];
        const labels = LABELS[type];
        const label = labels[seed % labels.length];

        newInteractions.push({
          id: `interaction-${interactionCounter}`,
          fromSessionKey: available[i1].key,
          toSessionKey: available[i2].key,
          type,
          label,
          startedAt: now,
          durationMs: INTERACTION_DURATION + (seed % 3000),
        });

        return [...current, ...newInteractions];
      });
    }, CHECK_INTERVAL);

    return () => clearInterval(timer);
  }, [sessions]);

  return interactions;
}
