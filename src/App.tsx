/**
 * App — Composition root.
 */

import { lazy, Suspense, useEffect, useState } from 'react';
import { useAgentSessions } from './hooks/useAgentSessions';
import { useInteractions } from './hooks/useInteractions';
import { useNotifications } from './hooks/useNotifications';
import { CreatorPanel } from './components/CreatorPanel';
import { OrchestratorView } from './components/OrchestratorView';
import { SceneSelector } from './components/SceneSelector';
import { StatusDot } from './components/StatusDot';
import { DEFAULT_WORLD_ENVIRONMENT } from './components/world3d/officeTheme';
import { TimelinePanel } from './components/TimelinePanel';
import { SquadPanel } from './components/SquadPanel';
import { ActivityTimeline } from './components/ActivityTimeline';
import { TurnNotification } from './components/TurnNotification';
import { DebugPanel, isDebugEnabled } from './components/DebugPanel';
import { setIdleFavicon, startActiveFavicon } from './utils/favicon';

const World3D = lazy(() => import('./components/world3d/World3D').then(m => ({ default: m.World3D })));

export default function App() {
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [orchestratorOpen, setOrchestratorOpen] = useState(false);
  const [worldEnvironment, setWorldEnvironment] = useState(DEFAULT_WORLD_ENVIRONMENT);
  const [timelineSessionKey, setTimelineSessionKey] = useState<string | null>(null);
  const [debugVisible, setDebugVisible] = useState(isDebugEnabled);
  const { sessions, agentNames, interactions: serverInteractions, isConnected, squads, activities, statusChangeRef } = useAgentSessions();
  const interactions = useInteractions(serverInteractions);
  const { notifications, dismiss, processStatusChange: notifProcessStatus } = useNotifications();

  // Wire notification hook to WS status changes via mutable ref
  useEffect(() => {
    statusChangeRef.current = (msg) => notifProcessStatus(msg, agentNames);
  }, [statusChangeRef, notifProcessStatus, agentNames]);

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
            currentEnvironment={worldEnvironment}
            onEnvironmentChange={setWorldEnvironment}
          />
          <button className="header-btn" onClick={() => setDebugVisible((v) => !v)}>Debug</button>
          <StatusDot isConnected={isConnected} />
        </div>
      </header>

      <main className="app-main">
        <Suspense fallback={<div className="scene-loading">Loading 3D…</div>}>
          <World3D
            sessions={sessions}
            agentNames={agentNames}
            interactions={interactions}
            environmentId={worldEnvironment}
            activities={activities}
          />
        </Suspense>
      </main>

      <aside className="app-sidebar">
        <SquadPanel squads={squads} />
        <TimelinePanel sessions={sessions} />
      </aside>
      <CreatorPanel isOpen={creatorOpen} onClose={() => setCreatorOpen(false)} agentNames={agentNames} />
      <OrchestratorView isOpen={orchestratorOpen} onClose={() => setOrchestratorOpen(false)} sessions={sessions} agentNames={agentNames} />
      {timelineSessionKey && (
        <ActivityTimeline
          sessionKey={timelineSessionKey}
          onClose={() => setTimelineSessionKey(null)}
        />
      )}
      <TurnNotification notifications={notifications} dismiss={dismiss} />
      <DebugPanel visible={debugVisible} onClose={() => setDebugVisible(false)} />
    </div>
  );
}
