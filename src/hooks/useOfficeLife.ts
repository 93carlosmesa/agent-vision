/**
 * useOfficeLife — autonomous agent behavior simulation for idle agents.
 *
 * Runs inside R3F Canvas (uses useFrame). Assigns randomized activities
 * to idle agents, cycling every 20-40 seconds with staggered starts.
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { RoomKey } from '../utils/officePathfinding';

interface AgentActivity {
  simulatedRoom: RoomKey;
  activityLabel: string;
  positionOffset: [number, number, number];
}

interface AgentLifeState {
  activity: AgentActivity;
  nextChangeAt: number;  // elapsed time for next activity change
  wasIdle: boolean;
}

type ActivityType = 'working-solo' | 'chatting' | 'relaxing' | 'browsing-library' | 'coffee-break';

const ACTIVITIES: { type: ActivityType; room: RoomKey; label: string; offset: [number, number, number] }[] = [
  { type: 'working-solo',     room: 'trabajo',      label: '💻 Working solo',      offset: [0, 0, 0] },
  { type: 'chatting',         room: 'comunicacion',  label: '💬 Chatting',           offset: [0, 0, 0] },
  { type: 'relaxing',         room: 'descanso',      label: '☕ Relaxing',           offset: [0, 0, 0] },
  { type: 'browsing-library', room: 'biblioteca',    label: '📚 Browsing library',  offset: [0, 0, 0] },
  { type: 'coffee-break',     room: 'descanso',      label: '☕ Coffee break',       offset: [2, 0, 1.5] },
];

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

function pickActivity(agentId: string, tick: number): AgentActivity {
  const seed = agentId.length * 31 + tick * 17;
  const idx = Math.floor(seededRandom(seed) * ACTIVITIES.length);
  const act = ACTIVITIES[idx];
  return {
    simulatedRoom: act.room,
    activityLabel: act.label,
    positionOffset: act.offset,
  };
}

export interface OfficeLifeEntry {
  simulatedRoom: RoomKey;
  activityLabel: string;
  positionOffset: [number, number, number];
}

export function useOfficeLife(
  idleAgentIds: string[],
): React.MutableRefObject<Map<string, OfficeLifeEntry>> {
  const lifeRef = useRef<Map<string, AgentLifeState>>(new Map());
  const outputRef = useRef<Map<string, OfficeLifeEntry>>(new Map());
  const elapsedRef = useRef(0);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    elapsedRef.current += dt;
    const elapsed = elapsedRef.current;

    const life = lifeRef.current;
    const output = outputRef.current;
    const activeIds = new Set(idleAgentIds);

    // Clean up agents no longer idle
    for (const id of life.keys()) {
      if (!activeIds.has(id)) {
        life.delete(id);
        output.delete(id);
      }
    }

    // Process each idle agent
    for (const id of idleAgentIds) {
      let state = life.get(id);

      if (!state) {
        // New idle agent — staggered start (0-10s delay)
        const stagger = seededRandom(id.length * 7 + 3) * 10;
        const activity = pickActivity(id, 0);
        state = {
          activity,
          nextChangeAt: elapsed + stagger,
          wasIdle: true,
        };
        life.set(id, state);
      }

      // Time to change activity?
      if (elapsed >= state.nextChangeAt) {
        const tick = Math.floor(elapsed / 10);
        state.activity = pickActivity(id, tick);
        // Next change in 20-40 seconds
        const interval = 20 + seededRandom(id.length * 13 + tick) * 20;
        state.nextChangeAt = elapsed + interval;
      }

      output.set(id, {
        simulatedRoom: state.activity.simulatedRoom,
        activityLabel: state.activity.activityLabel,
        positionOffset: state.activity.positionOffset,
      });
    }
  });

  return outputRef;
}
