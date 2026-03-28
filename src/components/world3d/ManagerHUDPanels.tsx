/**
 * ManagerHUDPanels — Floating HUD panels above Emma & Ginny desks
 * showing their current active task from sessions.
 */

import { useMemo } from 'react';
import { Text, Billboard } from '@react-three/drei';
import { EMMA_DESK_POSITION, GINNY_DESK_POSITION } from '../../systems/DeskManager';
import type { ISession } from '../../types';

interface ManagerHUDPanelProps {
  sessions: ISession[];
}

function ManagerHUDPanelUnit({
  position,
  label,
  agentId,
  color,
  sessions,
}: {
  position: [number, number, number];
  label: string;
  agentId: string;
  color: string;
  sessions: ISession[];
}) {
  const taskText = useMemo(() => {
    const session = sessions.find(s => s.agentId === agentId && s.status === 'running');
    if (!session) return null;
    const text = session.lastSnippet || 'Working...';
    return text.length > 60 ? text.slice(0, 57) + '...' : text;
  }, [sessions, agentId]);

  if (!taskText) return null;

  const [x, , z] = position;

  return (
    <Billboard position={[x, 2.6, z]} follow lockX={false} lockY={false} lockZ={false}>
      {/* Background */}
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[1.8, 0.35]} />
        <meshBasicMaterial color="#0a0a1a" transparent opacity={0.75} />
      </mesh>
      {/* Label */}
      <Text
        position={[-0.75, 0.08, 0]}
        fontSize={0.08}
        color={color}
        anchorX="left"
        anchorY="middle"
        font="/fonts/Inter-Bold.woff"
      >
        {label}
      </Text>
      {/* Task text */}
      <Text
        position={[-0.75, -0.06, 0]}
        fontSize={0.065}
        color="#e0e0e0"
        anchorX="left"
        anchorY="middle"
        maxWidth={1.6}
      >
        {taskText}
      </Text>
    </Billboard>
  );
}

export function EmmaHUDPanel({ sessions = [] }: Partial<ManagerHUDPanelProps>) {
  return (
    <ManagerHUDPanelUnit
      position={EMMA_DESK_POSITION}
      label="EMMA"
      agentId="emma"
      color="#ff9f43"
      sessions={sessions}
    />
  );
}

export function GinnyHUDPanel({ sessions = [] }: Partial<ManagerHUDPanelProps>) {
  return (
    <ManagerHUDPanelUnit
      position={GINNY_DESK_POSITION}
      label="GINNY"
      agentId="ginny"
      color="#53e3c2"
      sessions={sessions}
    />
  );
}
