/**
 * CreatorPanel — Sidebar modal for creating agents and skills,
 * and browsing existing ones.
 */

import { useState } from 'react';
import type { SkillDistrict } from '../types';
import { SKILLS } from '../config/skills';
import { DISTRICT_META } from '../config/skills';

interface CreatorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  agentNames: Record<string, string>;
}

type Tab = 'agents' | 'skills' | 'create-agent' | 'create-skill';

const DISTRICT_OPTIONS: { value: SkillDistrict; label: string }[] = [
  { value: 'inv', label: 'inv-- (Investment)' },
  { value: 'dev', label: 'dev-- (Development)' },
  { value: 'global', label: 'global-- (Global)' },
];

export function CreatorPanel({ isOpen, onClose, agentNames }: CreatorPanelProps) {
  const [tab, setTab] = useState<Tab>('agents');

  // Create Agent form state
  const [agentName, setAgentName] = useState('');
  const [agentModel, setAgentModel] = useState('claude-sonnet-4-6');
  const [agentRole, setAgentRole] = useState('');
  const [agentSkills, setAgentSkills] = useState('');
  const [agentOutput, setAgentOutput] = useState('');

  // Create Skill form state
  const [skillName, setSkillName] = useState('');
  const [skillDistrict, setSkillDistrict] = useState<SkillDistrict>('dev');
  const [skillDesc, setSkillDesc] = useState('');
  const [skillOutput, setSkillOutput] = useState('');

  if (!isOpen) return null;

  const handleCreateAgent = () => {
    const config = {
      name: agentName,
      model: agentModel,
      role: agentRole,
      skills: agentSkills.split(',').map((s) => s.trim()).filter(Boolean),
    };
    setAgentOutput(JSON.stringify(config, null, 2));
  };

  const handleCreateSkill = () => {
    const fullId = `${skillDistrict}--${skillName.toLowerCase().replace(/\s+/g, '-')}`;
    const config = {
      id: fullId,
      label: skillName,
      district: skillDistrict,
      description: skillDesc,
    };
    setSkillOutput(JSON.stringify(config, null, 2));
  };

  return (
    <div className="creator-overlay" onClick={onClose}>
      <div className="creator-panel" onClick={(e) => e.stopPropagation()}>
        <div className="creator-header">
          <h2 className="creator-title">Agent & Skill Manager</h2>
          <button className="creator-close" onClick={onClose}>&times;</button>
        </div>

        <div className="creator-tabs">
          <button className={`creator-tab${tab === 'agents' ? ' creator-tab--active' : ''}`} onClick={() => setTab('agents')}>Agents</button>
          <button className={`creator-tab${tab === 'skills' ? ' creator-tab--active' : ''}`} onClick={() => setTab('skills')}>Skills</button>
          <button className={`creator-tab${tab === 'create-agent' ? ' creator-tab--active' : ''}`} onClick={() => setTab('create-agent')}>+ Agent</button>
          <button className={`creator-tab${tab === 'create-skill' ? ' creator-tab--active' : ''}`} onClick={() => setTab('create-skill')}>+ Skill</button>
        </div>

        <div className="creator-body">
          {/* ── Browse Agents ── */}
          {tab === 'agents' && (
            <div className="creator-list">
              {Object.entries(agentNames).map(([id, name]) => (
                <div key={id} className="creator-list-item">
                  <span className="creator-list-name">{name}</span>
                  <span className="creator-list-id">{id}</span>
                </div>
              ))}
              {Object.keys(agentNames).length === 0 && (
                <div className="creator-empty">No agents connected</div>
              )}
            </div>
          )}

          {/* ── Browse Skills ── */}
          {tab === 'skills' && (
            <div className="creator-list">
              {SKILLS.map((skill) => {
                const meta = DISTRICT_META[skill.district];
                return (
                  <div key={skill.id} className="creator-list-item">
                    <span className="creator-list-icon">{skill.icon}</span>
                    <span className="creator-list-name">{skill.label}</span>
                    <span className="creator-list-district" style={{ color: meta.color }}>{meta.label}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Create Agent Form ── */}
          {tab === 'create-agent' && (
            <div className="creator-form">
              <label className="creator-field">
                <span>Name</span>
                <input type="text" value={agentName} onChange={(e) => setAgentName(e.target.value)} placeholder="e.g. DataAnalyst" />
              </label>
              <label className="creator-field">
                <span>Model</span>
                <select value={agentModel} onChange={(e) => setAgentModel(e.target.value)}>
                  <option value="claude-opus-4-6">Claude Opus 4.6</option>
                  <option value="claude-sonnet-4-6">Claude Sonnet 4.6</option>
                  <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5</option>
                </select>
              </label>
              <label className="creator-field">
                <span>Role Description</span>
                <textarea value={agentRole} onChange={(e) => setAgentRole(e.target.value)} placeholder="What does this agent do?" rows={3} />
              </label>
              <label className="creator-field">
                <span>Skills (comma-separated)</span>
                <input type="text" value={agentSkills} onChange={(e) => setAgentSkills(e.target.value)} placeholder="dev--code-review, global--web-search" />
              </label>
              <button className="creator-submit" onClick={handleCreateAgent}>Generate Config</button>
              {agentOutput && <pre className="creator-output">{agentOutput}</pre>}
            </div>
          )}

          {/* ── Create Skill Form ── */}
          {tab === 'create-skill' && (
            <div className="creator-form">
              <label className="creator-field">
                <span>Skill Name</span>
                <input type="text" value={skillName} onChange={(e) => setSkillName(e.target.value)} placeholder="e.g. Market Analysis" />
              </label>
              <label className="creator-field">
                <span>District</span>
                <select value={skillDistrict} onChange={(e) => setSkillDistrict(e.target.value as SkillDistrict)}>
                  {DISTRICT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>
              <label className="creator-field">
                <span>Description</span>
                <textarea value={skillDesc} onChange={(e) => setSkillDesc(e.target.value)} placeholder="What does this skill do?" rows={3} />
              </label>
              <button className="creator-submit" onClick={handleCreateSkill}>Generate Config</button>
              {skillOutput && <pre className="creator-output">{skillOutput}</pre>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
