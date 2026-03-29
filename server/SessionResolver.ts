/**
 * SessionResolver — Maps Claude Code JSONL project paths to OpenClaw agent IDs.
 *
 * Single Responsibility: Resolve which agent a Claude Code session belongs to.
 *
 * Resolution strategy (in order of reliability):
 * 1. Config manual: ~/.openclaw/claude-code-mapping.json
 * 2. Path match: workdir encoded in project path → workspace-{agentId}/
 * 3. Fallback: "unknown:{basename}"
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, basename, resolve } from 'path';
import { homedir } from 'os';

const MAPPING_CONFIG_PATH = join(homedir(), '.openclaw', 'claude-code-mapping.json');
const OPENCLAW_BASE = join(homedir(), '.openclaw');

export class SessionResolver {
  private cache: Map<string, string> = new Map();
  private manualMappings: Map<string, string> = new Map();

  constructor() {
    this.loadManualMappings();
  }

  /**
   * Resolve a JSONL file path to an agentId.
   * Uses cached result if available.
   */
  resolve(jsonlFilePath: string): string {
    const cached = this.cache.get(jsonlFilePath);
    if (cached) return cached;

    const projectDir = this.extractProjectDir(jsonlFilePath);
    if (!projectDir) {
      const fallback = `unknown:${basename(jsonlFilePath, '.jsonl')}`;
      this.cache.set(jsonlFilePath, fallback);
      return fallback;
    }

    const agentId = this.resolveProjectDir(projectDir);
    const result = agentId ?? `unknown:${projectDir}`;
    this.cache.set(jsonlFilePath, result);
    return result;
  }

  /**
   * Resolve a project directory name to an agentId.
   * Returns null if no mapping found.
   */
  resolveProjectDir(projectDir: string): string | null {
    // 1. Check manual mapping config
    for (const [agentId, dirHash] of this.manualMappings) {
      if (projectDir === dirHash || projectDir.includes(dirHash)) {
        return agentId;
      }
    }

    // 2. Path match: decode project dir and check for workspace-{agentId}
    // Claude Code encodes paths: /Users/foo/bar → -Users-foo-bar
    const decoded = projectDir.replace(/-/g, '/');

    // Check for ~/.openclaw/workspace-{agentId}/
    const workspaceMatch = decoded.match(/\.openclaw\/workspace-([^/]+)/);
    if (workspaceMatch) {
      return workspaceMatch[1];
    }

    // Main workspace (no suffix = main agent)
    if (decoded.includes('.openclaw/workspace/') || decoded.endsWith('.openclaw/workspace')) {
      return 'main';
    }

    // Scan OpenClaw workspace dirs for matches
    const resolvedOpenclaw = resolve(OPENCLAW_BASE);
    if (existsSync(resolvedOpenclaw)) {
      try {
        const dirs = readdirSync(resolvedOpenclaw);
        for (const dir of dirs) {
          if (dir.startsWith('workspace-')) {
            const agentId = dir.slice('workspace-'.length);
            if (decoded.includes(dir)) {
              return agentId;
            }
          }
        }
      } catch {
        // Silently continue
      }
    }

    return null;
  }

  clearCache(): void {
    this.cache.clear();
  }

  getKnownMappings(): Map<string, string> {
    return new Map(this.cache);
  }

  /**
   * Extract project directory name from a JSONL file path.
   * e.g., ~/.claude/projects/-Users-x-dev/abc.jsonl → "-Users-x-dev"
   */
  private extractProjectDir(jsonlFilePath: string): string | null {
    const parts = jsonlFilePath.split('/');
    const projectsIdx = parts.indexOf('projects');
    if (projectsIdx >= 0 && projectsIdx + 1 < parts.length) {
      return parts[projectsIdx + 1];
    }
    return null;
  }

  /**
   * Load manual mappings from ~/.openclaw/claude-code-mapping.json
   * Format: { "agentId": "projectDirHash" }
   */
  private loadManualMappings(): void {
    if (!existsSync(MAPPING_CONFIG_PATH)) return;
    try {
      const raw = readFileSync(MAPPING_CONFIG_PATH, 'utf-8');
      const data = JSON.parse(raw) as Record<string, string>;
      for (const [agentId, dirHash] of Object.entries(data)) {
        if (typeof dirHash === 'string') {
          this.manualMappings.set(agentId, dirHash);
        }
      }
    } catch {
      // Config is optional — ignore parse errors
    }
  }
}
