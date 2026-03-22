/**
 * App — Composition root.
 */

import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useAgentSessions } from './hooks/useAgentSessions';
import { useSkillVisits } from './hooks/useSkillVisits';
import { useInteractions } from './hooks/useInteractions';
import { AgentScene } from './components/AgentScene';
import { CreatorPanel } from './components/CreatorPanel';
import { OrchestratorView } from './components/OrchestratorView';
import { SceneSelector } from './components/SceneSelector';
import { StatusDot } from './components/StatusDot';
import { DEFAULT_WORLD_ENVIRONMENT } from './components/world3d/officeTheme';
import { TimelinePanel } from './components/TimelinePanel';
import { SquadPanel } from './components/SquadPanel';
import { setIdleFavicon, startActiveFavicon } from './utils/favicon';

/** Lazy-load 3D world (Three.js) — only downloaded when user selects 3D scene */
const World3D = lazy(() => import('./components/world3d/World3D').then(m => ({ default: m.World3D })));

export default function App() {
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [orchestratorOpen, setOrchestratorOpen] = useState(false);
  const [worldEnvironment, setWorldEnvironment] = useState(DEFAULT_WORLD_ENVIRONMENT);
  const { sessions, agentNames, interactions: serverInteractions, isConnected, currentScene, setScene, squads } = useAgentSessions();
  const skillVisits = useSkillVisits(sessions);
  const interactions = useInteractions(serverInteractions);

  const memberMetaBySession = useMemo(
    () => Object.fromEntries(
      squads.flatMap((squad) => squad.members.map((member) => [member.sessionKey, {
        squadId: member.squadId,
        squadLabel: member.squadLabel,
        roleLabel: member.roleLabel,
        collaborationTag: member.collaborationTag,
      }])),
    ),
    [squads],
  );

  useEffect(() => {
    const hasRunningAgents = sessions.some((s) => s.status === 'running');

    if (hasRunningAgents) {
      const stop = startActiveFavicon();
      return () => stop();
    }

    setIdleFavicon();
    return undefined;
  }, [sessions]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-title">🧠 Agent Vision</div>
        <div className="app-header-controls">
          <button className="header-btn" onClick={() => setOrchestratorOpen(true)}>Orchestrator</button>
          <button className="header-btn" onClick={() => setCreatorOpen(true)}>+ Create</button>
          <SceneSelector
            currentScene={currentScene.id}
            onSceneChange={setScene}
            currentEnvironment={worldEnvironment}
            onEnvironmentChange={setWorldEnvironment}
          />
          <StatusDot isConnected={isConnected} />
        </div>
      </header>

      <main className="app-main">
        {currentScene.id === '3d' ? (
          <Suspense fallback={<div className="scene-loading">Loading 3D…</div>}>
            <World3D
              sessions={sessions}
              agentNames={agentNames}
              interactions={interactions}
              environmentId={worldEnvironment}
            />
          </Suspense>
        ) : (
          <AgentScene
            sessions={sessions}
            agentNames={agentNames}
            sceneConfig={currentScene}
            memberMetaBySession={memberMetaBySession}
            skillVisits={skillVisits}
            interactions={interactions}
          />
        )}
      </main>

      <aside className="app-sidebar">
        <SquadPanel squads={squads} />
        <TimelinePanel sessions={sessions} />
      </aside>
      <CreatorPanel isOpen={creatorOpen} onClose={() => setCreatorOpen(false)} agentNames={agentNames} />
      <OrchestratorView isOpen={orchestratorOpen} onClose={() => setOrchestratorOpen(false)} sessions={sessions} agentNames={agentNames} />
    </div>
  );
}
