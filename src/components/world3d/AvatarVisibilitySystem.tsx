/**
 * AvatarVisibilitySystem — Full 5-state agent movement with room-based pathfinding.
 *
 * Integrates AgentStateMachine for proper state derivation:
 *   - running       → desk in Trabajo (nearest free) or Despacho (managers)
 *   - waiting       → seat in Comunicación
 *   - idle          → random zone: Lobby / Descanso / Exterior (distributed)
 *   - communicating → Comunicación
 *   - using_skill   → Biblioteca → back to desk
 *
 * State changes trigger a real walk: current pos → door waypoints → destination seat.
 */

import { useRef, useState, useEffect, useMemo } from 'react';
import { useAgentMotion } from '../../hooks/useAgentMotion';
import type { AgentTarget } from '../../hooks/useAgentMotion';
import { Agent3D } from './Agent3D';
import { isCEO } from '../../config/agentConfig';
import { DeskManager, SAMANTHA_DESK } from '../../systems/DeskManager';
import { AgentStateMachine } from '../../systems/AgentStateMachine';
import type { AgentStateInput } from '../../systems/AgentStateMachine';
import { getRandomSeat } from '../../systems/RoomPositions';
import { findPath } from '../../utils/officePathfinding';
import type { RoomKey } from '../../utils/officePathfinding';
import type { AgentVisualState, AgentStateMetrics } from '../../types/AgentState';
import type { ISession, AgentNameMap, SessionStatus } from '../../types';
import type { IAgentActivity } from '../../hooks/useClaudeActivity';

interface AgentMoveState {
  agentId: string;
  name: string;
  currentRoom: RoomKey;
  targetPos: [number, number, number];
  facingAngle: number;
  sessionStatus: SessionStatus;
  visualState: AgentVisualState;
  activityLabel: string;
  roomSeed: number;
}

function cleanName(raw: string): string {
  return raw.replace(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)\s*/u, '').trim() || raw;
}

/** Resolve a target position within a room (desk position or random seat) */
function getSeatInRoom(room: RoomKey, seed: number): { pos: [number, number, number]; facingAngle: number } {
  const seat = getRandomSeat(room, seed);
  return { pos: seat.pos, facingAngle: seat.facingAngle };
}

interface AvatarVisibilitySystemProps {
  sessions: ISession[];
  agentNames: AgentNameMap;
  bubbleMap: Map<string, string>;
  /** When not 'office', agents walk directly without door pathfinding */
  environmentId?: string;
  /** Claude Code activity per agent */
  activities?: Map<string, IAgentActivity>;
}

export function AvatarVisibilitySystem({
  sessions,
  agentNames,
  bubbleMap,
  environmentId = 'office',
  activities,
}: AvatarVisibilitySystemProps) {
  const usePathfinding = environmentId === 'office';
  // Persistent refs — survive re-renders without triggering them
  const deskManagerRef = useRef<DeskManager>(new DeskManager());
  const stateMachineRef = useRef<AgentStateMachine>(new AgentStateMachine(deskManagerRef.current));
  const agentStatesRef = useRef<Map<string, AgentMoveState>>(new Map());
  const metricsRef = useRef<Map<string, AgentStateMetrics>>(new Map());
  const [motionTargets, setMotionTargets] = useState<AgentTarget[]>([]);

  useEffect(() => {
    const stateMachine = stateMachineRef.current;
    const states = agentStatesRef.current;

    // ALL sessions are active — every agent is visible in the 3D world
    const activeIds = new Set(sessions.map(s => s.agentId));

    // Determine squad-level activity: any agent running?
    const squadHasActiveTasks = sessions.some(s => s.status === 'running');

    // Build inputs for the state machine
    const stateInputs: AgentStateInput[] = sessions.map((session, index) => {
      const existing = states.get(session.agentId);
      return {
        agentId: session.agentId,
        agentIndex: index,
        sessionStatus: session.status,
        squadHasActiveTasks,
        previousVisualState: existing?.visualState,
        currentPosition: existing?.targetPos,
      };
    });

    // Run the state machine to get proper visual states + desk assignments
    const stateOutputs = stateMachine.computeStates(stateInputs);

    const newTargets: AgentTarget[] = [];

    for (const session of sessions) {
      const id = session.agentId;
      const name = cleanName(agentNames[id] ?? id);
      const output = stateOutputs.get(id);
      if (!output) continue;

      const existing = states.get(id);
      const seed = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) + (existing?.roomSeed ?? 0);

      // Resolve target position from state machine output
      let targetPos: [number, number, number];
      let facingAngle: number;
      const targetRoom = output.targetRoom;

      if (output.desk) {
        // State machine assigned a desk — use its exact position
        targetPos = output.desk.position;
        facingAngle = output.desk.facingAngle;
      } else if (isCEO(id)) {
        // Samantha always at her desk
        targetPos = SAMANTHA_DESK.position;
        facingAngle = SAMANTHA_DESK.facingAngle;
      } else {
        // Use a seat in the target room
        const seat = getSeatInRoom(targetRoom, seed);
        targetPos = seat.pos;
        facingAngle = seat.facingAngle;
      }

      if (!existing) {
        // New agent — spawn directly at target (no walk for first appearance)
        states.set(id, {
          agentId: id,
          name,
          currentRoom: targetRoom,
          targetPos,
          facingAngle,
          sessionStatus: session.status,
          visualState: output.visualState,
          activityLabel: output.activityLabel,
          roomSeed: seed,
        });
        newTargets.push({ id, waypoints: [targetPos], facingAngle });
      } else if (existing.visualState !== output.visualState || existing.currentRoom !== targetRoom) {
        // State or room changed → walk to new position
        const newSeed = seed + Date.now() % 1000;
        const doorWaypoints = usePathfinding
          ? findPath(existing.currentRoom, targetRoom)
          : [];
        const fullPath: [number, number, number][] = [...doorWaypoints, targetPos];

        existing.sessionStatus = session.status;
        existing.visualState = output.visualState;
        existing.activityLabel = output.activityLabel;
        existing.name = name;
        existing.currentRoom = targetRoom;
        existing.targetPos = targetPos;
        existing.facingAngle = facingAngle;
        existing.roomSeed = newSeed;

        newTargets.push({ id, waypoints: fullPath, facingAngle });
      } else {
        // No change — keep current target
        existing.name = name;
        existing.activityLabel = output.activityLabel;
        newTargets.push({ id, waypoints: [existing.targetPos], facingAngle: existing.facingAngle });
      }
    }

    // Remove agents no longer in sessions
    for (const id of states.keys()) {
      if (!activeIds.has(id)) {
        states.delete(id);
        deskManagerRef.current.releaseDesk(id);
      }
    }

    // Update metrics ref for external access
    const allMetrics = stateMachine.getAllMetrics();
    const metricsMap = metricsRef.current;
    metricsMap.clear();
    for (const m of allMetrics) {
      metricsMap.set(m.agentId, m);
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
      {activeAgents.map(agent => {
        const activity = activities?.get(agent.agentId);
        const claudeToolLabel = activity?.isWaiting
          ? '\u23F8 Esperando...'
          : activity?.isWaitingPermission
            ? '\uD83D\uDD10 Aprobaci\u00F3n requerida'
            : activity?.currentTool ?? '';
        return (
          <Agent3D
            key={agent.agentId}
            name={agent.name}
            agentId={agent.agentId}
            position={agent.targetPos}
            status={agent.sessionStatus}
            visualState={agent.visualState}
            isActive={true}
            motionRef={motionRef}
            activityLabel={agent.activityLabel}
            speechBubble={bubbleMap.get(agent.agentId)}
            claudeToolLabel={claudeToolLabel || undefined}
            claudePermission={activity?.isWaitingPermission}
          />
        );
      })}
    </>
  );
}

/** Access metrics for a specific agent (call from parent via ref if needed) */
export function useAgentMetrics(): React.MutableRefObject<Map<string, AgentStateMetrics>> {
  return useRef<Map<string, AgentStateMetrics>>(new Map());
}
