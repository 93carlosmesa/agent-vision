/**
 * App — Composition root.
 */

import { useEffect, useMemo } from 'react';
import { useAgentSessions } from './hooks/useAgentSessions';
import { useSkillVisits } from './hooks/useSkillVisits';
import { AgentScene } from './components/AgentScene';
import { SceneSelector } from './components/SceneSelector';
import { StatusDot } from './components/StatusDot';
import { TimelinePanel } from './components/TimelinePanel';
import { SquadPanel } from './components/SquadPanel';
import { setIdleFavicon, startActiveFavicon } from './utils/favicon';

export default function App() {
  const { sessions, agentNames, isConnected, currentScene, setScene, squads } = useAgentSessions();
  const skillVisits = useSkillVisits(sessions);

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
          <SceneSelector currentScene={currentScene.id} onSceneChange={setScene} />
          <StatusDot isConnected={isConnected} />
        </div>
      </header>

      <main className="app-main">
        <AgentScene
          sessions={sessions}
          agentNames={agentNames}
          sceneConfig={currentScene}
          memberMetaBySession={memberMetaBySession}
          skillVisits={skillVisits}
        />
      </main>

      <aside className="app-sidebar">
        <SquadPanel squads={squads} />
        <TimelinePanel sessions={sessions} />
      </aside>
    </div>
  );
}
