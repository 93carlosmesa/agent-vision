/**
 * useSkillVisits — Simulates agents visiting skill rooms.
 *
 * When agents are in "running" status, they periodically get assigned
 * a skill visit, causing their avatar to animate toward a skill room.
 *
 * In the future this will be driven by real WebSocket data showing
 * which skills agents are invoking. For now, it picks skills based
 * on a simple hash of the agent session key + time.
 */

import { useState, useEffect, useRef } from 'react';
import type { ISession, ISkillVisit } from '../types';
import { SKILLS } from '../config/skills';

/** How long an agent stays at a skill room (ms) */
const VISIT_DURATION = 4000;
/** How often we check for new visits (ms) */
const CHECK_INTERVAL = 3000;
/** Probability a running agent starts a visit per check */
const VISIT_CHANCE = 0.3;

function simpleHash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function useSkillVisits(sessions: ISession[]): ISkillVisit[] {
  const [visits, setVisits] = useState<ISkillVisit[]>([]);
  const visitCountRef = useRef(0);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const runningSessions = sessions.filter((s) => s.status === 'running');

      setVisits((prev) => {
        // Remove expired visits
        const active = prev.filter((v) => now - v.startedAt < v.durationMs);

        // Sessions already visiting
        const visitingKeys = new Set(active.map((v) => v.sessionKey));

        // Potentially start new visits for running agents
        const newVisits: ISkillVisit[] = [];
        for (const session of runningSessions) {
          if (visitingKeys.has(session.key)) continue;

          // Use a deterministic-ish check so visits feel organic
          const seed = simpleHash(session.key + String(visitCountRef.current));
          if ((seed % 100) / 100 > VISIT_CHANCE) continue;

          const skillIndex = seed % SKILLS.length;
          newVisits.push({
            sessionKey: session.key,
            skillId: SKILLS[skillIndex].id,
            startedAt: now,
            durationMs: VISIT_DURATION + (seed % 2000),
          });
        }

        visitCountRef.current += 1;
        return newVisits.length > 0 ? [...active, ...newVisits] : active;
      });
    }, CHECK_INTERVAL);

    return () => clearInterval(timer);
  }, [sessions]);

  return visits;
}
