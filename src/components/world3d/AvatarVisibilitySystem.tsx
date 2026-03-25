/**
 * AvatarVisibilitySystem — Spawn/despawn avatars based on real session status.
 *
 * LOGIC (replaces AgentMotionSystem + pathfinding):
 *   - Avatar appears when agent status === "running" OR "waiting"
 *   - Spawns DIRECTLY at desk position (no walking/pathfinding)
 *   - Spawn animation: scale 0→1 + opacity 0→1 over 0.5s
 *   - Despawn animation: scale 1→0 + opacity 1→0 over 0.4s, then remove
 *   - Running agents: seated at their desk
 *   - Waiting agents: standing near desk area (lobby/comunicacion rooms)
 *
 * This component is rendered inside R3F Canvas (uses useFrame).
 */

import { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Group } from 'three';
import { Agent3D } from './Agent3D';
import type { AgentMotionState } from '../../hooks/useAgentMotion';
import type { ISession, AgentNameMap, SessionStatus } from '../../types';
import type { Desk } from '../../systems/DeskManager';
import { DeskManager, SAMANTHA_DESK } from '../../systems/DeskManager';
import { isCEO } from '../../config/agentConfig';

const SPAWN_DURATION = 0.5;   // seconds
const DESPAWN_DURATION = 0.4; // seconds

type SpawnPhase = 'spawning' | 'visible' | 'despawning';

interface SpawnedAgent {
  agentId: string;
  name: string;
  desk: Desk;
  phase: SpawnPhase;
  phaseStartTime: number; // clock time when phase began
  sessionStatus: SessionStatus; // 'running' or 'waiting'
}

interface AvatarVisibilitySystemProps {
  sessions: ISession[];
  agentNames: AgentNameMap;
  bubbleMap: Map<string, string>;
}

/** Clean agent name — strip leading emoji */
function cleanName(raw: string): string {
  return raw.replace(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)\s*/u, '').trim() || raw;
}

/* ── Single spawned avatar with scale/opacity animation ── */
function SpawnedAvatarWrapper({
  agent,
  motionRef,
  onDespawnComplete,
  speechBubble,
}: {
  agent: SpawnedAgent;
  motionRef: React.RefObject<Map<string, AgentMotionState>>;
  onDespawnComplete: (agentId: string) => void;
  speechBubble?: string;
}) {
  const groupRef = useRef<Group>(null);
  const doneRef = useRef(false);

  useFrame(({ clock }) => {
    if (!groupRef.current || doneRef.current) return;
    const elapsed = clock.getElapsedTime() - agent.phaseStartTime;

    let scale = 1;
    let opacity = 1;

    if (agent.phase === 'spawning') {
      const t = Math.min(elapsed / SPAWN_DURATION, 1);
      // Ease out cubic
      scale = 1 - Math.pow(1 - t, 3);
      opacity = t;
    } else if (agent.phase === 'despawning') {
      const t = Math.min(elapsed / DESPAWN_DURATION, 1);
      // Ease in cubic
      scale = Math.pow(1 - t, 3);
      opacity = 1 - t;
      if (t >= 1 && !doneRef.current) {
        doneRef.current = true;
        onDespawnComplete(agent.agentId);
      }
    } else {
      scale = 1;
      opacity = 1;
    }

    groupRef.current.scale.setScalar(Math.max(scale, 0.001));
    // Traverse and set opacity on materials
    groupRef.current.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.material) {
        const mat = obj.material as THREE.MeshStandardMaterial;
        if (!mat.transparent) {
          mat.transparent = true;
        }
        mat.opacity = opacity;
      }
    });
  });

  // Update motionRef for this agent
  motionRef.current?.set(agent.agentId, {
    currentPos: agent.desk.position,
    isMoving: false,
    facingAngle: agent.desk.facingAngle,
  });

  return (
    <group ref={groupRef}>
      <Agent3D
        name={agent.name}
        agentId={agent.agentId}
        position={agent.desk.position}
        status={agent.sessionStatus}
        visualState={agent.sessionStatus === 'running' ? 'running' : 'waiting'}
        isActive={true}
        motionRef={motionRef}
        activityLabel={agent.sessionStatus === 'running' ? '🔧 Working' : '⏳ Waiting'}
        speechBubble={speechBubble}
      />
    </group>
  );
}

/* ── Main system ── */
export function AvatarVisibilitySystem({
  sessions,
  agentNames,
  bubbleMap,
}: AvatarVisibilitySystemProps) {
  const deskManagerRef = useRef(new DeskManager());
  const motionRef = useRef(new Map<string, AgentMotionState>());

  // spawned agents: agentId → SpawnedAgent
  const [spawnedMap, setSpawnedMap] = useState<Map<string, SpawnedAgent>>(new Map());

  // We need current clock time for phaseStartTime — use a ref updated each frame
  const clockRef = useRef(0);
  useFrame(({ clock }) => {
    clockRef.current = clock.getElapsedTime();
  });

  useEffect(() => {
    // Show both running AND waiting agents
    const activeSessions = sessions.filter(s => s.status === 'running' || s.status === 'waiting');
    const activeIds = new Set(activeSessions.map(s => s.agentId));

    setSpawnedMap(prev => {
      const next = new Map(prev);
      const now = clockRef.current;

      // Spawn new active agents (running or waiting)
      for (const session of activeSessions) {
        const id = session.agentId;
        const existing = next.get(id);

        if (!existing) {
          // Claim desk
          let desk: Desk;
          if (isCEO(id)) {
            desk = SAMANTHA_DESK;
          } else {
            const claimed = deskManagerRef.current.claimNearestDesk(id, [0, 0, 0]);
            if (!claimed) continue; // no free desk
            desk = claimed;
          }

          const rawName = agentNames[id] ?? id;
          next.set(id, {
            agentId: id,
            name: cleanName(rawName),
            desk,
            phase: 'spawning',
            phaseStartTime: now,
            sessionStatus: session.status,
          });
        } else if (existing.phase === 'despawning') {
          // Agent came back online during despawn → re-spawn
          next.set(id, {
            ...existing,
            phase: 'spawning',
            phaseStartTime: now,
            sessionStatus: session.status,
          });
        }
        // If spawning or visible → no change
      }

      // Despawn agents no longer active (idle or idle)
      for (const [id, agent] of next) {
        if (!activeIds.has(id) && agent.phase !== 'despawning') {
          next.set(id, {
            ...agent,
            phase: 'despawning',
            phaseStartTime: now,
          });
        }
      }

      return next;
    });
  }, [sessions, agentNames]);

  // Transition spawning → visible after duration (poll via useFrame to avoid timer drift)
  useFrame(({ clock }) => {
    const now = clock.getElapsedTime();
    let needsUpdate = false;

    setSpawnedMap(prev => {
      const next = new Map(prev);
      for (const [id, agent] of next) {
        if (agent.phase === 'spawning') {
          const elapsed = now - agent.phaseStartTime;
          if (elapsed >= SPAWN_DURATION) {
            next.set(id, { ...agent, phase: 'visible' });
            needsUpdate = true;
          }
        }
      }
      return needsUpdate ? next : prev;
    });
  });

  const handleDespawnComplete = (agentId: string) => {
    deskManagerRef.current.releaseDesk(agentId);
    motionRef.current.delete(agentId);
    setSpawnedMap(prev => {
      const next = new Map(prev);
      next.delete(agentId);
      return next;
    });
  };

  const agents = useMemo(() => [...spawnedMap.values()], [spawnedMap]);

  return (
    <>
      {agents.map(agent => (
        <SpawnedAvatarWrapper
          key={agent.agentId}
          agent={agent}
          motionRef={motionRef}
          onDespawnComplete={handleDespawnComplete}
          speechBubble={bubbleMap.get(agent.agentId)}
        />
      ))}
    </>
  );
}

/** Get the desk position for a known agent (helper for external use) */
export function getAgentDeskPosition(
  agentId: string,
  deskManager: DeskManager,
): [number, number, number] | null {
  if (isCEO(agentId)) return SAMANTHA_DESK.position;
  const desk = deskManager.getDeskForAgent(agentId);
  return desk?.position ?? null;
}
