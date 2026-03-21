/**
 * useAgentMotion — smooth multi-waypoint position interpolation with collision avoidance.
 *
 * Must be used inside R3F Canvas (uses useFrame).
 * Tracks per-agent animated position, movement state, and facing angle.
 * Agents follow a sequence of waypoints (door positions) before reaching destination.
 */

import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';

export interface AgentTarget {
  id: string;
  waypoints: [number, number, number][];
}

export interface AgentMotionState {
  currentPos: [number, number, number];
  isMoving: boolean;
  facingAngle: number; // Y-axis rotation in radians
}

interface InternalState {
  currentPos: [number, number, number];
  waypoints: [number, number, number][];
  waypointIndex: number;
  facingAngle: number;
  targetFacingAngle: number;
  isMoving: boolean;
  hasInitialized: boolean;
}

const MOVE_SPEED = 3.0;       // units per second
const ROTATION_SPEED = 2.0;   // radians per second
const ARRIVAL_THRESHOLD = 0.15;
const COLLISION_DIST = 0.8;   // minimum distance between agents
const PUSH_OFFSET = 0.4;     // perpendicular push when too close

function getCurrentTarget(s: InternalState): [number, number, number] | null {
  if (s.waypointIndex < s.waypoints.length) {
    return s.waypoints[s.waypointIndex];
  }
  return null;
}

export function useAgentMotion(
  targets: AgentTarget[],
): React.MutableRefObject<Map<string, AgentMotionState>> {
  const stateRef = useRef<Map<string, InternalState>>(new Map());
  const outputRef = useRef<Map<string, AgentMotionState>>(new Map());

  // Sync targets into internal state
  useEffect(() => {
    const state = stateRef.current;
    const activeIds = new Set<string>();

    for (const { id, waypoints } of targets) {
      activeIds.add(id);
      const existing = state.get(id);

      if (!existing) {
        // New agent — snap to final position (last waypoint)
        const finalPos: [number, number, number] = waypoints.length > 0
          ? [...waypoints[waypoints.length - 1]]
          : [0, 0, 0];
        state.set(id, {
          currentPos: finalPos,
          waypoints: waypoints.map(w => [...w] as [number, number, number]),
          waypointIndex: waypoints.length, // already at destination
          facingAngle: 0,
          targetFacingAngle: 0,
          isMoving: false,
          hasInitialized: true,
        });
      } else {
        // Check if waypoints changed (compare final destination)
        const oldFinal = existing.waypoints.length > 0
          ? existing.waypoints[existing.waypoints.length - 1]
          : null;
        const newFinal = waypoints.length > 0
          ? waypoints[waypoints.length - 1]
          : null;

        const changed = !oldFinal || !newFinal ||
          Math.abs(oldFinal[0] - newFinal[0]) > 0.01 ||
          Math.abs(oldFinal[2] - newFinal[2]) > 0.01;

        if (changed) {
          existing.waypoints = waypoints.map(w => [...w] as [number, number, number]);
          existing.waypointIndex = 0;
        }
      }
    }

    // Remove agents no longer in targets
    for (const id of state.keys()) {
      if (!activeIds.has(id)) {
        state.delete(id);
        outputRef.current.delete(id);
      }
    }
  }, [targets]);

  useFrame((_, delta) => {
    // Clamp delta to avoid huge jumps on tab switch
    const dt = Math.min(delta, 0.1);
    const state = stateRef.current;
    const output = outputRef.current;

    // First pass: calculate desired positions
    for (const [, s] of state) {
      const target = getCurrentTarget(s);

      if (!target) {
        // All waypoints consumed — arrived
        if (s.isMoving) {
          s.isMoving = false;
        }
      } else {
        const dx = target[0] - s.currentPos[0];
        const dz = target[2] - s.currentPos[2];
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist > ARRIVAL_THRESHOLD) {
          // Moving toward current waypoint
          s.isMoving = true;
          const step = Math.min(MOVE_SPEED * dt, dist);
          const ratio = step / dist;
          s.currentPos[0] += dx * ratio;
          s.currentPos[2] += dz * ratio;
          s.currentPos[1] = target[1];

          // Face movement direction
          s.targetFacingAngle = Math.atan2(dx, dz);
        } else {
          // Arrived at this waypoint — advance to next
          s.currentPos[0] = target[0];
          s.currentPos[1] = target[1];
          s.currentPos[2] = target[2];
          s.waypointIndex++;

          // Check if there are more waypoints
          if (s.waypointIndex >= s.waypoints.length) {
            s.isMoving = false;
          }
        }
      }

      // Smooth rotation (shortest path)
      let angleDiff = s.targetFacingAngle - s.facingAngle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      const rotStep = ROTATION_SPEED * dt;
      if (Math.abs(angleDiff) > 0.02) {
        s.facingAngle += Math.sign(angleDiff) * Math.min(rotStep, Math.abs(angleDiff));
      } else {
        s.facingAngle = s.targetFacingAngle;
      }
    }

    // Second pass: collision avoidance (only between moving agents)
    const entries = Array.from(state.entries());
    for (let i = 0; i < entries.length; i++) {
      const [, a] = entries[i];
      if (!a.isMoving) continue;

      for (let j = i + 1; j < entries.length; j++) {
        const [, b] = entries[j];
        if (!b.isMoving) continue;

        const dx = b.currentPos[0] - a.currentPos[0];
        const dz = b.currentPos[2] - a.currentPos[2];
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < COLLISION_DIST && dist > 0.01) {
          // Push apart perpendicular to their relative direction
          const perpX = -dz / dist;
          const perpZ = dx / dist;
          const push = PUSH_OFFSET * dt;

          a.currentPos[0] -= perpX * push;
          a.currentPos[2] -= perpZ * push;
          b.currentPos[0] += perpX * push;
          b.currentPos[2] += perpZ * push;
        }
      }
    }

    // Write output
    for (const [id, s] of state) {
      output.set(id, {
        currentPos: [s.currentPos[0], s.currentPos[1], s.currentPos[2]],
        isMoving: s.isMoving,
        facingAngle: s.facingAngle,
      });
    }
  });

  return outputRef;
}
