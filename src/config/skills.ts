/**
 * Skill definitions — pure data, no logic.
 *
 * Skills are organized by district prefix:
 * - inv--  : Investment tools & analysis
 * - dev--  : Development & engineering tools
 * - global-- : Shared/cross-domain utilities
 */

import type { ISkill, SkillDistrict } from '../types';

export const SKILLS: ISkill[] = [
  // ── Investment District ──
  { id: 'inv--market-analysis',   label: 'Market Analysis',   district: 'inv',    icon: '📊' },
  { id: 'inv--portfolio-tracker', label: 'Portfolio Tracker',  district: 'inv',    icon: '💼' },
  { id: 'inv--risk-assessment',   label: 'Risk Assessment',   district: 'inv',    icon: '⚠️' },
  { id: 'inv--sentiment-scan',    label: 'Sentiment Scan',    district: 'inv',    icon: '🧠' },

  // ── Development District ──
  { id: 'dev--code-review',       label: 'Code Review',       district: 'dev',    icon: '🔍' },
  { id: 'dev--test-runner',       label: 'Test Runner',       district: 'dev',    icon: '🧪' },
  { id: 'dev--deploy-pipeline',   label: 'Deploy Pipeline',   district: 'dev',    icon: '🚀' },
  { id: 'dev--db-migrate',        label: 'DB Migrate',        district: 'dev',    icon: '🗄️' },
  { id: 'dev--api-scaffold',      label: 'API Scaffold',      district: 'dev',    icon: '🏗️' },

  // ── Global District ──
  { id: 'global--web-search',     label: 'Web Search',        district: 'global', icon: '🌐' },
  { id: 'global--file-manager',   label: 'File Manager',      district: 'global', icon: '📁' },
  { id: 'global--chat-relay',     label: 'Chat Relay',        district: 'global', icon: '💬' },
  { id: 'global--log-viewer',     label: 'Log Viewer',        district: 'global', icon: '📋' },
];

/** Skills grouped by district */
export const SKILLS_BY_DISTRICT: Record<SkillDistrict, ISkill[]> = {
  inv:    SKILLS.filter((s) => s.district === 'inv'),
  dev:    SKILLS.filter((s) => s.district === 'dev'),
  global: SKILLS.filter((s) => s.district === 'global'),
};

/** District display metadata */
export const DISTRICT_META: Record<SkillDistrict, { label: string; icon: string; color: string }> = {
  inv:    { label: 'Investment',  icon: '💰', color: '#f59e0b' },
  dev:    { label: 'Development', icon: '⚡', color: '#3b82f6' },
  global: { label: 'Global',     icon: '🌍', color: '#8b5cf6' },
};
