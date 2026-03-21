/**
 * OrchestratorView — Special view showing Samantha at center
 * with delegation paths to all agents. Click an agent to chat.
 */

import { useState, useMemo } from 'react';
import type { ISession, AgentNameMap } from '../types';
import { SessionService } from '../services/SessionService';
import { PixelAvatar } from './PixelAvatar';

interface OrchestratorViewProps {
  sessions: ISession[];
  agentNames: AgentNameMap;
  isOpen: boolean;
  onClose: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  running: '#22c55e',
  waiting: '#eab308',
  idle: '#64748b',
};

function getDisplay(session: ISession, agentNames: AgentNameMap): { name: string; seed: string } {
  const agentId = session.agentId || SessionService.extractAgentId(session.key);
  const resolved = agentNames[agentId];
  if (resolved) {
    const parts = resolved.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)\s*(.*)/u);
    if (parts) return { seed: agentId, name: parts[2] };
    return { seed: agentId, name: resolved };
  }
  return { seed: agentId, name: agentId };
}

export function OrchestratorView({ sessions, agentNames, isOpen, onClose }: OrchestratorViewProps) {
  const [chatTarget, setChatTarget] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ from: string; text: string }>>([]);

  // Samantha is the orchestrator (main agent)
  const orchestrator = sessions.find((s) => s.agentId === 'main');
  const delegates = sessions.filter((s) => s.agentId !== 'main');

  // Arrange delegates in a circle around center
  const positions = useMemo(() => {
    return delegates.map((session, i) => {
      const angle = (2 * Math.PI * i) / Math.max(delegates.length, 1) - Math.PI / 2;
      const radius = 35; // % from center
      return {
        session,
        x: 50 + radius * Math.cos(angle),
        y: 50 + radius * Math.sin(angle),
      };
    });
  }, [delegates]);

  if (!isOpen) return null;

  const handleSendChat = () => {
    if (!chatInput.trim() || !chatTarget) return;
    const targetName = chatTarget === 'main' ? 'Samantha' : chatTarget;
    setChatMessages((prev) => [...prev, { from: 'You', text: chatInput }, { from: targetName, text: `[${targetName} is processing your request...]` }]);
    setChatInput('');
  };

  const chatSession = chatTarget ? sessions.find((s) => s.agentId === chatTarget || s.key === chatTarget) : null;
  const chatName = chatSession ? getDisplay(chatSession, agentNames).name : chatTarget ?? '';

  return (
    <div className="orchestrator-overlay" onClick={onClose}>
      <div className="orchestrator-container" onClick={(e) => e.stopPropagation()}>
        <div className="orchestrator-header">
          <h2>Super-Orchestrator View</h2>
          <button className="creator-close" onClick={onClose}>&times;</button>
        </div>

        <div className="orchestrator-canvas">
          {/* SVG lines from center to each delegate */}
          <svg className="orchestrator-lines" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
            {positions.map(({ session, x, y }) => {
              const color = STATUS_COLORS[session.status] || STATUS_COLORS.idle;
              return (
                <g key={session.key}>
                  <line
                    x1="50" y1="50" x2={x} y2={y}
                    stroke={color} strokeWidth="0.3"
                    strokeDasharray="1 0.5"
                    opacity="0.5"
                  />
                  <circle cx={x} cy={y} r="0.6" fill={color} opacity="0.8" />
                </g>
              );
            })}
            {/* Center glow */}
            <circle cx="50" cy="50" r="2" fill="none" stroke="#22c55e" strokeWidth="0.2" opacity="0.4">
              <animate attributeName="r" values="2;3.5;2" dur="3s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.4;0.15;0.4" dur="3s" repeatCount="indefinite" />
            </circle>
          </svg>

          {/* Orchestrator (center) */}
          {orchestrator && (
            <div
              className="orchestrator-node orchestrator-node--main"
              style={{ left: '50%', top: '50%' }}
              onClick={() => setChatTarget('main')}
            >
              <div className="orchestrator-node-sprite"><PixelAvatar seed="main" /></div>
              <div className="orchestrator-node-name">{getDisplay(orchestrator, agentNames).name}</div>
              <div className="orchestrator-node-role">Orchestrator</div>
              <div className={`orchestrator-node-status orchestrator-node-status--${orchestrator.status}`}>{orchestrator.status}</div>
            </div>
          )}

          {/* Delegates */}
          {positions.map(({ session, x, y }) => {
            const { name, seed } = getDisplay(session, agentNames);
            return (
              <div
                key={session.key}
                className={`orchestrator-node orchestrator-node--delegate`}
                style={{ left: `${x}%`, top: `${y}%` }}
                onClick={() => setChatTarget(session.agentId)}
              >
                <div className="orchestrator-node-sprite"><PixelAvatar seed={seed} /></div>
                <div className="orchestrator-node-name">{name}</div>
                <div className={`orchestrator-node-status orchestrator-node-status--${session.status}`}>{session.status}</div>
                {session.lastSnippet && (
                  <div className="orchestrator-node-task" title={session.lastSnippet}>
                    {session.lastSnippet.slice(0, 30)}{session.lastSnippet.length > 30 ? '...' : ''}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Chat Panel */}
        {chatTarget && (
          <div className="orchestrator-chat">
            <div className="orchestrator-chat-header">
              <span>Chat with {chatName}</span>
              <button className="creator-close" onClick={() => setChatTarget(null)}>&times;</button>
            </div>
            <div className="orchestrator-chat-messages">
              {chatMessages.filter(() => true).map((msg, i) => (
                <div key={i} className={`orchestrator-chat-msg${msg.from === 'You' ? ' orchestrator-chat-msg--you' : ''}`}>
                  <span className="orchestrator-chat-from">{msg.from}:</span> {msg.text}
                </div>
              ))}
              {chatMessages.length === 0 && <div className="creator-empty">Send a message to {chatName}</div>}
            </div>
            <div className="orchestrator-chat-input">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                placeholder={`Message ${chatName}...`}
              />
              <button onClick={handleSendChat}>Send</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
