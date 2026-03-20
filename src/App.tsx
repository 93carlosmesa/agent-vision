/**
 * App — Composition root. No business logic.
 * Wires useAgentSessions hook with UI components.
 */

import { useEffect } from 'react';
import { useAgentSessions } from './hooks/useAgentSessions';
import { AgentScene } from './components/AgentScene';
import { SceneSelector } from './components/SceneSelector';
import { StatusDot } from './components/StatusDot';
import { TimelinePanel } from './components/TimelinePanel';
import { setIdleFavicon, startActiveFavicon } from './utils/favicon';

export default function App() {
  const { sessions, agentNames, isConnected, currentScene, setScene } = useAgentSessions();

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
        <div className="app-title">🧠 Agent Vision v2</div>
        <div className="app-header-controls">
          <SceneSelector currentScene={currentScene.id} onSceneChange={setScene} />
          <StatusDot isConnected={isConnected} />
        </div>
      </header>

      <main className="app-main">
        <AgentScene
          sessions={sessions}
          agentNames={agentNames}
          sceneConfig={currentScene}
        />
      </main>

      <aside className="app-sidebar">
        <TimelinePanel sessions={sessions} />
      </aside>
    </div>
  );
}
