/**
 * AgentMotionSystem — manages smooth agent transitions inside Canvas.
 *
 * Rendered as a child of R3F Canvas. Takes waypoint-based targets and renders
 * Agent3D instances with interpolated positions, movement state, and facing.
 *
 * Uses a shared ref (no React re-renders) so each Agent3D reads its own
 * motion state inside useFrame — zero React overhead per frame.
 */

import { useMemo } from 'react';
import { useAgentMotion } from '../../hooks/useAgentMotion';
import type { AgentTarget } from '../../hooks/useAgentMotion';
import { Agent3D } from './Agent3D';
import type { SessionStatus } from '../../types';

export interface AgentEntry {
  id: string;
  name: string;
  waypoints: [number, number, number][];
  /** Optional desired facing when stationary (e.g. seated agents facing table) */
  facingAngle?: number;
  status: SessionStatus;
  isActive: boolean;
  activityLabel?: string;
  speechBubble?: string;
}

interface AgentMotionSystemProps {
  agents: AgentEntry[];
}

export function AgentMotionSystem({ agents }: AgentMotionSystemProps) {
  // Build stable target list with waypoints
  const targets: AgentTarget[] = useMemo(
    () => agents.map(a => ({ id: a.id, waypoints: a.waypoints, facingAngle: a.facingAngle })),
    [agents],
  );

  const motionRef = useAgentMotion(targets);

  return (
    <>
      {agents.map((a) => (
        <Agent3D
          key={a.id}
          name={a.name}
          agentId={a.id}
          position={a.waypoints.length > 0 ? a.waypoints[a.waypoints.length - 1] : [0, 0, 0]}
          status={a.status}
          isActive={a.isActive}
          motionRef={motionRef}
          activityLabel={a.activityLabel}
          speechBubble={a.speechBubble}
        />
      ))}
    </>
  );
}
