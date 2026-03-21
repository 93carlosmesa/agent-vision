/**
 * AgentNameResolver — Resolves agent IDs to display names.
 *
 * Single Responsibility: Read openclaw.json config and build name map.
 * Does NOT read sessions (that's SessionReader).
 */

import { readFileSync } from 'fs';
import type { AgentNameMap } from '../src/types/index.js';

/** Shape of openclaw.json agents.list[] entries */
interface AgentListEntry {
  id: string;
  name?: string;
  identity?: {
    name?: string;
    emoji?: string;
  };
}

/** Minimal shape of openclaw.json we care about */
interface OpenClawConfig {
  agents?: {
    list?: AgentListEntry[];
  };
  identity?: {
    name?: string;
    emoji?: string;
  };
}

export class AgentNameResolver {
  private readonly configPath: string;

  constructor(configPath: string) {
    this.configPath = configPath;
  }

  /**
   * Load agent names from openclaw.json and return a map of id → display name.
   * 'main' is always mapped to '🧠 Samantha'.
   */
  resolve(): AgentNameMap {
    const names: AgentNameMap = {
      main: '🧠 Samantha',
    };

    try {
      const raw = readFileSync(this.configPath, 'utf-8');
      const config = JSON.parse(raw) as OpenClawConfig;
      const list = config.agents?.list ?? [];

      for (const entry of list) {
        if (!entry.id || entry.id === 'main') continue;

        const emoji = entry.identity?.emoji ?? '';
        const displayName = entry.identity?.name ?? entry.name ?? entry.id;
        names[entry.id] = emoji ? `${emoji} ${displayName}` : displayName;
      }
    } catch {
      // Config not available or malformed — return defaults
    }

    return names;
  }

  /**
   * Return the list of all registered agent IDs from openclaw.json.
   */
  getAgentIds(): string[] {
    const ids: string[] = ['main'];
    try {
      const raw = readFileSync(this.configPath, 'utf-8');
      const config = JSON.parse(raw) as OpenClawConfig;
      const list = config.agents?.list ?? [];
      for (const entry of list) {
        if (entry.id && entry.id !== 'main') {
          ids.push(entry.id);
        }
      }
    } catch {
      // Config not available
    }
    return ids;
  }
}
