/**
 * useAgentMotion — smooth position interpolation for agents.
 *
 * Must be used inside R3F Canvas (uses useFrame).
 * Tracks per-agent animated position, movement state, and facing angle.
 */

import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';

export interface AgentTarget {
  id: string;
  targetPos: [number, number, number];
}

export interface AgentMotionState {
  currentPos: [number, number, number];
  isMoving: boolean;
  facingAngle: number; // Y-axis rotation in radians
}

interface InternalState {
  currentPos: [number, number, number];
  targetPos: [number, number, number];
  facingAngle: number;
  targetFacingAngle: number;
  isMoving: boolean;
  hasInitialized: boolean;
}

const MOVE_SPEED = 3.0;       // units per second
const ROTATION_SPEED = 2.0;   // radians per second
const ARRIVAL_THRESHOLD = 0.15;

export function useAgentMotion(
  targets: AgentTarget[],
): React.MutableRefObject<Map<string, AgentMotionState>> {
  const stateRef = useRef<Map<string, InternalState>>(new Map());
  const outputRef = useRef<Map<string, AgentMotionState>>(new Map());

  // Sync targets into internal state
  useEffect(() => {
    const state = stateRef.current;
    const activeIds = new Set<string>();

    for (const { id, targetPos } of targets) {
      activeIds.add(id);
      const existing = state.get(id);

      if (!existing) {
        // New agent — snap to position
        state.set(id, {
          currentPos: [...targetPos],
          targetPos: [...targetPos],
          facingAngle: 0,
          targetFacingAngle: 0,
          isMoving: false,
          hasInitialized: true,
        });
      } else {
        // Update target (only if changed)
        const dx = targetPos[0] - existing.targetPos[0];
        const dz = targetPos[2] - existing.targetPos[2];
        if (Math.abs(dx) > 0.01 || Math.abs(dz) > 0.01) {
          existing.targetPos = [...targetPos];
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

    for (const [id, s] of state) {
      const dx = s.targetPos[0] - s.currentPos[0];
      const dz = s.targetPos[2] - s.currentPos[2];
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist > ARRIVAL_THRESHOLD) {
        // Moving
        s.isMoving = true;
        const step = Math.min(MOVE_SPEED * dt, dist);
        const ratio = step / dist;
        s.currentPos[0] += dx * ratio;
        s.currentPos[2] += dz * ratio;
        // Y stays at target
        s.currentPos[1] = s.targetPos[1];

        // Face movement direction
        s.targetFacingAngle = Math.atan2(dx, dz);
      } else {
        // Arrived
        if (s.isMoving) {
          s.currentPos[0] = s.targetPos[0];
          s.currentPos[1] = s.targetPos[1];
          s.currentPos[2] = s.targetPos[2];
        }
        s.isMoving = false;
      }

      // Smooth rotation (shortest path)
      let angleDiff = s.targetFacingAngle - s.facingAngle;
      // Normalize to [-PI, PI]
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      const rotStep = ROTATION_SPEED * dt;
      if (Math.abs(angleDiff) > 0.02) {
        s.facingAngle += Math.sign(angleDiff) * Math.min(rotStep, Math.abs(angleDiff));
      } else {
        s.facingAngle = s.targetFacingAngle;
      }

      // Write output
      output.set(id, {
        currentPos: [s.currentPos[0], s.currentPos[1], s.currentPos[2]],
        isMoving: s.isMoving,
        facingAngle: s.facingAngle,
      });
    }
  });

  return outputRef;
}
