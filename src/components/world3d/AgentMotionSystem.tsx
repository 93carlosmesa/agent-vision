/**
 * AgentMotionSystem — manages smooth agent transitions inside Canvas.
 *
 * Rendered as a child of R3F Canvas. Takes target positions and renders
 * Agent3D instances with interpolated positions, movement state, and facing.
 */

import { useMemo } from 'react';
import { useAgentMotion } from '../../hooks/useAgentMotion';
import type { AgentTarget } from '../../hooks/useAgentMotion';
import { Agent3D } from './Agent3D';
import type { SessionStatus } from '../../types';
import { useFrame } from '@react-three/fiber';
import { useState } from 'react';

export interface AgentEntry {
  id: string;
  name: string;
  pos: [number, number, number];
  status: SessionStatus;
  isActive: boolean;
}

interface AgentMotionSystemProps {
  agents: AgentEntry[];
}

/** Renders nothing visible — just forces re-render each frame so we read fresh motion state. */
function FrameTicker({ onTick }: { onTick: () => void }) {
  useFrame(() => { onTick(); });
  return null;
}

export function AgentMotionSystem({ agents }: AgentMotionSystemProps) {
  // Build stable target list
  const targets: AgentTarget[] = useMemo(
    () => agents.map(a => ({ id: a.id, targetPos: a.pos })),
    [agents],
  );

  const motionRef = useAgentMotion(targets);

  // Counter to force re-render each frame so we pick up animated positions
  const [, setTick] = useState(0);

  return (
    <>
      <FrameTicker onTick={() => setTick(t => (t + 1) & 0x7fffffff)} />
      {agents.map((a) => {
        const motion = motionRef.current.get(a.id);
        const pos: [number, number, number] = motion?.currentPos ?? a.pos;
        const isMoving = motion?.isMoving ?? false;
        const facingAngle = motion?.facingAngle ?? 0;

        return (
          <Agent3D
            key={a.id}
            name={a.name}
            agentId={a.id}
            position={pos}
            status={a.status}
            isActive={a.isActive}
            isMoving={isMoving}
            facingAngle={facingAngle}
          />
        );
      })}
    </>
  );
}
