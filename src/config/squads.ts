import type { AgentRole } from '../types';

export interface SquadDefinition {
  id: string;
  name: string;
  focus: string;
  roles: AgentRole[];
}

export const ROLE_LABELS: Record<AgentRole, string> = {
  seniorFrontendArchitect: 'Senior Frontend Architect',
  codeReviewer: 'Code Reviewer',
  slinter: 'Slinter',
  formateur: 'Formateur',
};

export const SQUAD_DEFINITIONS: SquadDefinition[] = [
  {
    id: 'squad-movement',
    name: 'Squad 1 · Movement',
    focus: 'Animar desplazamiento caminando entre zonas',
    roles: ['seniorFrontendArchitect', 'codeReviewer', 'slinter', 'formateur'],
  },
  {
    id: 'squad-naming',
    name: 'Squad 2 · Naming',
    focus: 'Nombres claros y colaboración visual en grupo',
    roles: ['seniorFrontendArchitect', 'codeReviewer', 'slinter', 'formateur'],
  },
];

const ROLE_HINTS: Array<{ role: AgentRole; hints: string[] }> = [
  { role: 'seniorFrontendArchitect', hints: ['senior', 'frontend', 'architect'] },
  { role: 'codeReviewer', hints: ['review', 'reviewer', 'code'] },
  { role: 'slinter', hints: ['slinter', 'linter', 'lint'] },
  { role: 'formateur', hints: ['formateur', 'formatter', 'prettier', 'format'] },
];

export function resolveRoleFromText(text: string): AgentRole | null {
  const normalized = text.toLowerCase();

  for (const candidate of ROLE_HINTS) {
    if (candidate.hints.some((hint) => normalized.includes(hint))) {
      return candidate.role;
    }
  }

  return null;
}
