/**
 * useInteractions — Consumes REAL agent-to-agent interactions from WebSocket.
 *
 * The server detects interactions from session events (tool calls referencing
 * other agents, spawn/delegation patterns) and broadcasts them via
 * 'interactions:update'. This hook simply passes them through, filtering
 * out expired interactions.
 */

import { useMemo } from 'react';
import type { IInteraction } from '../types';

/**
 * Filters interactions to only include those still within their duration window.
 * Interactions from the server have a startedAt + durationMs — we prune expired ones
 * so stale beams don't linger.
 */
export function useInteractions(serverInteractions: IInteraction[]): IInteraction[] {
  return useMemo(() => {
    const now = Date.now();
    return serverInteractions.filter(
      (i) => now - i.startedAt < i.durationMs,
    );
  }, [serverInteractions]);
}
