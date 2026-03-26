/**
 * AvatarVisibilitySystem — Full agent movement with room-based pathfinding.
 *
 * Agents walk between rooms when their session status changes:
 *   - running → random desk in Trabajo (Samantha always gets her desk)
 *   - waiting → random seat in Comunicación
 *   - idle    → agent removed (not visible)
 *
 * State changes trigger a real walk: current pos → door waypoints → destination seat.
 */

import { useRef, useState, useEffect, useMemo } from 'react';
import { useAgentMotion } from '../../hooks/useAgentMotion';
import type { AgentTarget } from '../../hooks/useAgentMotion';
import { Agent3D } from './Agent3D';
import { isCEO } from '../../config/agentConfig';
import { SAMANTHA_DESK, EMMA_DESK, GINNY_DESK } from '../../systems/DeskManager';
import { getRoomForStatus, getRandomSeat } from '../../systems/RoomPositions';
import { findPath } from '../../utils/officePathfinding';
import type { RoomKey } from '../../utils/officePathfinding';
import type { ISession, AgentNameMap, SessionStatus } from '../../types';

interface AgentMoveState {
  agentId: string;
  name: string;
  currentRoom: RoomKey;
  targetPos: [number, number, number];
  facingAngle: number;
  sessionStatus: SessionStatus;
  roomSeed: number;
}

function cleanName(raw: string): string {
  return raw.replace(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)\s*/u, '').trim() || raw;
}

/** Idle rooms where agents chill when squad has no work */
const IDLE_ROOMS: RoomKey[] = ['lobby', 'descanso', 'exterior'];

/** Get the fixed desk for managers (Emma/Ginny) when working */
function getManagerDesk(agentId: string): { pos: [number, number, number]; facingAngle: number; room: RoomKey } | null {
  const lower = agentId.toLowerCase();
  if (lower === 'emma') {
    return { pos: EMMA_DESK.position, facingAngle: EMMA_DESK.facingAngle, room: 'despacho' };
  }
  if (lower === 'ginny') {
    return { pos: GINNY_DESK.position, facingAngle: GINNY_DESK.facingAngle, room: 'despacho' };
  }
  return null;
}

function getTargetForStatus(
  agentId: string,
  status: SessionStatus,
  seed: number,
): { pos: [number, number, number]; facingAngle: number; room: RoomKey } {
  // Samantha always stays in her Despacho CEO regardless of status
  if (isCEO(agentId)) {
    return { pos: SAMANTHA_DESK.position, facingAngle: SAMANTHA_DESK.facingAngle, room: 'despacho' };
  }

  // Emma & Ginny go to their fixed desks when running
  if (status === 'running') {
    const mgrDesk = getManagerDesk(agentId);
    if (mgrDesk) return mgrDesk;
    const room = getRoomForStatus('running');
    const seat = getRandomSeat(room, seed);
    return { pos: seat.pos, facingAngle: seat.facingAngle, room };
  }

  if (status === 'waiting') {
    const room = getRoomForStatus('waiting');
    const seat = getRandomSeat(room, seed);
    return { pos: seat.pos, facingAngle: seat.facingAngle, room };
  }

  // Idle — distribute agents across lobby, descanso, exterior
  const idleRoom = IDLE_ROOMS[Math.abs(seed) % IDLE_ROOMS.length];
  const seat = getRandomSeat(idleRoom, seed);
  return { pos: seat.pos, facingAngle: seat.facingAngle, room: idleRoom };
}

interface AvatarVisibilitySystemProps {
  sessions: ISession[];
  agentNames: AgentNameMap;
  bubbleMap: Map<string, string>;
}

export function AvatarVisibilitySystem({
  sessions,
  agentNames,
  bubbleMap,
}: AvatarVisibilitySystemProps) {
  const agentStatesRef = useRef<Map<string, AgentMoveState>>(new Map());
  const [motionTargets, setMotionTargets] = useState<AgentTarget[]>([]);

  useEffect(() => {
    // CEO always visible; others only when running or waiting
    const activeSessions = sessions.filter(s =>
      s.status === 'running' || s.status === 'waiting' || isCEO(s.agentId)
    );
    const activeIds = new Set(activeSessions.map(s => s.agentId));
    const states = agentStatesRef.current;
    const newTargets: AgentTarget[] = [];

    for (const session of activeSessions) {
      const id = session.agentId;
      const name = cleanName(agentNames[id] ?? id);
      const status = session.status;
      const existing = states.get(id);

      if (!existing) {
        // New agent — spawn directly at target position (no walk for first appear)
        const seed = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
        const target = getTargetForStatus(id, status, seed);
        states.set(id, {
          agentId: id,
          name,
          currentRoom: target.room,
          targetPos: target.pos,
          facingAngle: target.facingAngle,
          sessionStatus: status,
          roomSeed: seed,
        });
        newTargets.push({ id, waypoints: [target.pos], facingAngle: target.facingAngle });
      } else if (existing.sessionStatus !== status) {
        // Status changed → compute new target room + walk path
        const seed = existing.roomSeed + Date.now() % 1000;
        const target = getTargetForStatus(id, status, seed);
        const doorWaypoints = findPath(existing.currentRoom, target.room);
        const fullPath: [number, number, number][] = [
          ...doorWaypoints,
          target.pos,
        ];

        existing.sessionStatus = status;
        existing.name = name;
        existing.currentRoom = target.room;
        existing.targetPos = target.pos;
        existing.facingAngle = target.facingAngle;
        existing.roomSeed = seed;

        newTargets.push({ id, waypoints: fullPath, facingAngle: target.facingAngle });
      } else {
        // No change — keep current target
        existing.name = name;
        newTargets.push({ id, waypoints: [existing.targetPos], facingAngle: existing.facingAngle });
      }
    }

    // Remove agents no longer active
    for (const id of states.keys()) {
      if (!activeIds.has(id)) {
        states.delete(id);
      }
    }

    setMotionTargets(newTargets);
  }, [sessions, agentNames]);

  const motionRef = useAgentMotion(motionTargets);

  const activeAgents = useMemo(() => {
    return [...agentStatesRef.current.values()];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motionTargets]);

  return (
    <>
      {activeAgents.map(agent => (
        <Agent3D
          key={agent.agentId}
          name={agent.name}
          agentId={agent.agentId}
          position={agent.targetPos}
          status={agent.sessionStatus}
          visualState={agent.sessionStatus === 'running' ? 'running' : agent.sessionStatus === 'waiting' ? 'waiting' : 'idle'}
          isActive={true}
          motionRef={motionRef}
          activityLabel={agent.sessionStatus === 'running' ? '🔧 Working' : '⏳ Waiting'}
          speechBubble={bubbleMap.get(agent.agentId)}
        />
      ))}
    </>
  );
}
