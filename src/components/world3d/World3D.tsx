/**
 * World3D — R3F Canvas with multi-room office building.
 *
 * AVATAR PHILOSOPHY (v2 — spawn/despawn):
 *   Avatars ONLY appear when an agent has status === "running".
 *   They spawn directly at their desk (no walking/pathfinding).
 *   Spawn animation: scale 0→1 + fade in (0.5s)
 *   Despawn animation: scale 1→0 + fade out (0.4s)
 *
 *   AvatarVisibilitySystem handles all avatar lifecycle.
 *   World3D just manages environment, lighting, furniture, and scene.
 */

import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { CameraControls3D, CameraHUD } from './CameraControls3D';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { AvatarVisibilitySystem } from './AvatarVisibilitySystem';
// import { SkillFolders3D } from './Folder3D'; // removed — folders were floating mid-room
import { InteractionBeam3D } from './InteractionBeam3D';
import { OfficeLayout3D } from './OfficeLayout3D';
import {
  LobbyFurniture,
  DescansoFurniture,
  ComunicacionFurniture,
  TrabajoFurniture,
  BibliotecaFurniture,
  ExteriorFurniture,
} from './OfficeFurniture3D';
import { getWorldEnvironment } from './officeTheme';
import { SamanthaDesk } from './SamanthaDesk';
import { ManagerDesks } from './ManagerDesks';
import { SystemMetricsPanel } from './SystemMetricsPanel';
import { TaskCompletionParticles } from './TaskCompletionParticles';
import type { ISession, AgentNameMap, IInteraction, SessionStatus } from '../../types';
import { getLightingConfig } from '../../systems/DayNightCycle';
import type { LightingConfig } from '../../systems/DayNightCycle';
import {
  isCEO,
  isManager,
  CEO_ID,
  MANAGER_ID,
  getAgentSoul,
  getAgentColor,
} from '../../config/agentConfig';
import { SAMANTHA_DESK_POSITION } from '../../systems/DeskManager';

export interface World3DProps {
  sessions: ISession[];
  agentNames: AgentNameMap;
  interactions?: IInteraction[];
  environmentId?: string;
}

/* ── Speech bubble types ── */
interface SpeechBubbleEvent {
  agentId: string;
  message: string;
  startTime: number;
}

const BUBBLE_DURATION = 3.5; // seconds

/* ── Speech bubble hook: CEO delegates to Manager, Manager calls robots ── */
function useSpeechBubbles(
  sessions: ISession[],
  agentNames: AgentNameMap,
): { bubbles: SpeechBubbleEvent[]; bubbleMap: Map<string, string> } {
  const prevStatusRef = useRef<Map<string, SessionStatus>>(new Map());
  const [bubbles, setBubbles] = useState<SpeechBubbleEvent[]>([]);
  const waitingBubblesRef = useRef<Map<string, string>>(new Map());

  const cleanName = useCallback((agentId: string) => {
    const rawName = agentNames[agentId] ?? agentId;
    return rawName.replace(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)\s*/u, '').trim() || agentId;
  }, [agentNames]);

  useEffect(() => {
    const prev = prevStatusRef.current;
    const now = Date.now();
    const newBubbles: SpeechBubbleEvent[] = [];

    for (const s of sessions) {
      const status = s.status;
      const prevStatus = prev.get(s.agentId);

      if (status === 'running' && prevStatus !== undefined && prevStatus !== 'running') {
        const ceoSoul = getAgentSoul(CEO_ID);
        const mgrSoul = getAgentSoul(MANAGER_ID);
        const agentSoul = getAgentSoul(s.agentId);

        if (isCEO(s.agentId)) {
          newBubbles.push({
            agentId: s.agentId,
            message: agentSoul?.workingPhrase ?? '🔧 On it',
            startTime: now,
          });
        } else if (isManager(s.agentId)) {
          const phrase = ceoSoul?.delegatingPhrase?.replace('{target}', cleanName(s.agentId))
            ?? `📋 ${cleanName(s.agentId)}, you're up`;
          newBubbles.push({
            agentId: CEO_ID,
            message: phrase,
            startTime: now,
          });
        } else {
          const name = cleanName(s.agentId);
          const ceoPhrase = ceoSoul?.delegatingPhrase?.replace('{target}', 'Emma')
            ?? `📋 Emma, handle ${name}`;
          newBubbles.push({
            agentId: CEO_ID,
            message: ceoPhrase,
            startTime: now,
          });
          const mgrPhrase = mgrSoul?.delegatingPhrase?.replace('{target}', name)
            ?? `📢 ${name}, you're up`;
          newBubbles.push({
            agentId: MANAGER_ID,
            message: mgrPhrase,
            startTime: now,
          });
        }
      }
    }

    if (newBubbles.length > 0) {
      setBubbles(prev => [...prev, ...newBubbles]);
    }

    // "Waiting-with-someone" persistent bubbles
    const newWaiting = new Map<string, string>();
    const ceoSession = sessions.find(s => isCEO(s.agentId));
    if (ceoSession?.status === 'waiting') {
      const runningAgents = sessions.filter(s => s.status === 'running' && !isCEO(s.agentId));
      if (runningAgents.length > 0) {
        const names = runningAgents.map(s => cleanName(s.agentId));
        const nameList = names.length <= 2 ? names.join(' & ') : `${names[0]} +${names.length - 1}`;
        newWaiting.set(CEO_ID, `💬 Talking to ${nameList}`);
        for (const s of runningAgents) {
          newWaiting.set(s.agentId, '📨 Reporting to Samantha');
        }
      }
    }
    waitingBubblesRef.current = newWaiting;

    const newMap = new Map<string, SessionStatus>();
    for (const s of sessions) {
      newMap.set(s.agentId, s.status);
    }
    prevStatusRef.current = newMap;
  }, [sessions, cleanName]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setBubbles(prev => prev.filter(b => now - b.startTime < BUBBLE_DURATION * 1000));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const bubbleMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const [id, msg] of waitingBubblesRef.current) {
      map.set(id, msg);
    }
    const now = Date.now();
    for (const b of bubbles) {
      if (now - b.startTime < BUBBLE_DURATION * 1000) {
        map.set(b.agentId, b.message);
      }
    }
    return map;
  }, [bubbles]);

  return { bubbles, bubbleMap };
}

/* ── Day/Night cycle hook — updates every minute ── */
function useDayNightCycle(): LightingConfig {
  const [config, setConfig] = useState<LightingConfig>(() => getLightingConfig());

  useEffect(() => {
    const now = new Date();
    const msToNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();

    const timeout = setTimeout(() => {
      setConfig(getLightingConfig());
      const interval = setInterval(() => {
        setConfig(getLightingConfig());
      }, 60_000);
      return () => clearInterval(interval);
    }, msToNextMinute);

    return () => clearTimeout(timeout);
  }, []);

  return config;
}

/* ── Scene internals ── */
function SceneContent({ sessions, agentNames, interactions = [], environmentId = 'office' }: World3DProps) {
  const environment = getWorldEnvironment(environmentId);
  const theme = environment.theme;
  const controlsRef = useRef<OrbitControlsImpl>(null);

  // Day/night lighting
  const dnc = useDayNightCycle();

  // Speech bubbles
  const { bubbleMap } = useSpeechBubbles(sessions, agentNames);

  // ── Task completion particle bursts ──────────────────────────────────────
  interface ParticleBurst {
    agentId: string;
    position: [number, number, number];
    color: string;
    startTime: number;
  }
  const prevStatusRef = useRef<Map<string, SessionStatus>>(new Map());
  const [particleBursts, setParticleBursts] = useState<ParticleBurst[]>([]);

  useEffect(() => {
    const prev = prevStatusRef.current;
    const now = Date.now();
    const newBursts: ParticleBurst[] = [];

    for (const s of sessions) {
      const prevStatus = prev.get(s.agentId);
      if (prevStatus === 'running' && (s.status === 'idle' || s.status === 'waiting')) {
        // Burst at Samantha's desk or a generic position
        const pos: [number, number, number] = isCEO(s.agentId)
          ? [...SAMANTHA_DESK_POSITION]
          : [0, 0, -5]; // approximate trabajo center
        newBursts.push({
          agentId: s.agentId,
          position: pos,
          color: getAgentColor(s.agentId),
          startTime: now,
        });
      }
    }

    const newMap = new Map<string, SessionStatus>();
    for (const s of sessions) {
      newMap.set(s.agentId, s.status);
    }
    prevStatusRef.current = newMap;

    if (newBursts.length > 0) {
      setParticleBursts(prev => [
        ...prev.filter(b => now - b.startTime < 2000),
        ...newBursts,
      ]);
    }
  }, [sessions]);

  useEffect(() => {
    if (particleBursts.length === 0) return;
    const timer = setTimeout(() => {
      const now = Date.now();
      setParticleBursts(prev => prev.filter(b => now - b.startTime < 2000));
    }, 2000);
    return () => clearTimeout(timer);
  }, [particleBursts]);

  // Interaction beams — simplified: use Samantha desk for CEO, [0,0,-5] for others
  const beams = useMemo(() => {
    const agentPos = new Map<string, [number, number, number]>();
    for (const s of sessions) {
      if (s.status !== 'running') continue;
      if (isCEO(s.agentId)) {
        agentPos.set(s.agentId, SAMANTHA_DESK_POSITION);
      } else {
        // Approximate desk center — beams are visual only
        agentPos.set(s.agentId, [0, 0, -5]);
      }
    }

    return interactions
      .map((inter) => {
        const fromSession = sessions.find(s => s.key === inter.fromSessionKey);
        const toSession = sessions.find(s => s.key === inter.toSessionKey);
        if (!fromSession || !toSession) return null;
        const from = agentPos.get(fromSession.agentId);
        const to = agentPos.get(toSession.agentId);
        if (!from || !to) return null;
        return {
          id: inter.id,
          from: [from[0], 1, from[2]] as [number, number, number],
          to: [to[0], 1, to[2]] as [number, number, number],
          type: inter.type,
        };
      })
      .filter((b): b is NonNullable<typeof b> => b !== null);
  }, [interactions, sessions]);

  const isBeach = !!environment.beachMode;

  return (
    <>
      {/* ── Lighting ── */}
      {isBeach ? (
        <>
          <ambientLight intensity={0.8} color="#FFF8E8" />
          <directionalLight
            position={[15, 25, 10]}
            intensity={2.5}
            color="#FFF0D0"
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          <hemisphereLight color="#87CEEB" groundColor="#F0E8D8" intensity={1.0} />
          <pointLight position={[0, 8, 14]} intensity={1.2} color="#FFF0D0" distance={30} />
          <pointLight position={[-14, 6, 6.5]} intensity={1.0} color="#FFE8C0" distance={20} />
          <pointLight position={[10, 6, 6.5]} intensity={1.0} color="#FFE8C0" distance={20} />
          <pointLight position={[0, 6, -3]} intensity={1.0} color="#FFF0D0" distance={25} />
          <pointLight position={[17, 6, -14]} intensity={1.0} color="#FFE8C0" distance={20} />
          <fog attach="fog" args={['#B8D8F0', 60, 150]} />
          <Environment preset="sunset" />
        </>
      ) : (
        <>
          <ambientLight intensity={dnc.ambientIntensity} color={dnc.ambientColor} />
          <directionalLight
            position={dnc.sunPosition}
            intensity={dnc.sunIntensity}
            color={dnc.sunColor}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          <hemisphereLight color={dnc.hemiSkyColor} groundColor={dnc.hemiGroundColor} intensity={dnc.hemiIntensity} />
          {/* Reduced from 6+4 pointLights to 3 strategic room lights — major perf win */}
          <pointLight position={[0, 8, 6]}    intensity={1.4 * dnc.roomLightsIntensity} color="#FFF0D0" distance={35} />
          <pointLight position={[-12, 7, -8]} intensity={1.0 * dnc.roomLightsIntensity} color="#FFE8C0" distance={25} />
          <pointLight position={[14, 7, -8]}  intensity={1.0 * dnc.roomLightsIntensity} color="#FFE0B0" distance={25} />
          <fog attach="fog" args={[dnc.fogColor, dnc.fogNear, dnc.fogFar]} />
          <Environment preset="city" />
        </>
      )}

      {/* ── Ground plane ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[76, 70]} />
        <meshStandardMaterial color={theme.floorBase} roughness={0.85} />
      </mesh>

      {/* Grid overlay */}
      <Grid
        position={[0, 0, 0]}
        args={[76, 70]}
        cellSize={isBeach ? 2 : 6}
        cellThickness={isBeach ? 0.12 : 0.12}
        cellColor={theme.gridCell}
        sectionSize={isBeach ? 6 : 12}
        sectionThickness={isBeach ? 0.2 : 0.20}
        sectionColor={theme.gridSection}
        fadeDistance={isBeach ? 35 : 25}
        infiniteGrid
      />

      {/* Office layout — walls, floors, doorways, labels */}
      <OfficeLayout3D environment={environment} />

      {/* Room furniture */}
      <LobbyFurniture environment={environment} />
      <DescansoFurniture environment={environment} />
      <ComunicacionFurniture environment={environment} />
      <TrabajoFurniture environment={environment} />
      <BibliotecaFurniture environment={environment} />
      <ExteriorFurniture environment={environment} />

      {/* ── Avatar spawn/despawn system (replaces AgentMotionSystem) ── */}
      <AvatarVisibilitySystem
        sessions={sessions}
        agentNames={agentNames}
        bubbleMap={bubbleMap}
      />

      {/* Task completion particle bursts */}
      {particleBursts.map((burst) => (
        <TaskCompletionParticles
          key={`${burst.agentId}-${burst.startTime}`}
          position={burst.position}
          color={burst.color}
        />
      ))}

      {/* Interaction beams */}
      {beams.map((b) => (
        <InteractionBeam3D key={b.id} from={b.from} to={b.to} type={b.type} />
      ))}

      {/* Personal desks — always at fixed positions */}
      <SamanthaDesk />
      <ManagerDesks />
      <SystemMetricsPanel />

      {/* Skill folders removed — bookshelves visible via BibliotecaFurniture */}

      {/* Controls — office now matches beach responsiveness */}
      <OrbitControls
        ref={controlsRef}
        makeDefault
        minDistance={5}
        maxDistance={50}
        maxPolarAngle={Math.PI / 2.1}
        target={[0, 0, 0]}
        enableDamping={false}
        rotateSpeed={0.8}
        zoomSpeed={1.2}
        panSpeed={1.0}
      />
      <CameraControls3D controlsRef={controlsRef} />

      {/* Postprocessing — same light bloom for both environments */}
      <EffectComposer>
        <Bloom luminanceThreshold={0.5} luminanceSmoothing={0.9} intensity={0.15} />
      </EffectComposer>
    </>
  );
}

export function World3D({ sessions, agentNames, interactions, environmentId = 'office' }: World3DProps) {
  const environment = getWorldEnvironment(environmentId);
  const dnc = useDayNightCycle();

  useEffect(() => {
    if (environment.beachMode) return;
    document.documentElement.setAttribute('data-time-of-day', dnc.timeOfDay);
    document.documentElement.style.setProperty('--dnc-sky', dnc.skyColor);
    document.documentElement.style.setProperty('--dnc-ambient', dnc.ambientColor);
  }, [dnc, environment.beachMode]);

  const bgColor = environment.beachMode ? '#87CEEB' : dnc.skyColor;

  return (
    <div style={{ width: '100%', height: '100%', background: bgColor, position: 'relative' }}>
      <Canvas
        camera={{ position: [0, 25, 30], fov: 50 }}
        dpr={[1, 1.5]}
        performance={{ min: 0.5 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        scene={{ background: environment.beachMode ? new THREE.Color('#87CEEB') : new THREE.Color(dnc.skyColor) }}
        style={{ width: '100%', height: '100%' }}
      >
        <SceneContent sessions={sessions} agentNames={agentNames} interactions={interactions} environmentId={environmentId} />
      </Canvas>
      <CameraHUD />
    </div>
  );
}
