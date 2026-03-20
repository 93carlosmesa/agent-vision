import type { AgentRole } from '../types';

export interface SquadDefinition {
  id: string;
  name: string;
  focus: string;
  roles: AgentRole[];
}

export const ROLE_LABELS: Record<AgentRole, string> = {
  seniorFrontendArchitect: 'Arquitectura Frontend',
  codeReviewer: 'Revisión de Código',
  slinter: 'Calidad Lint',
  formateur: 'Formato & Estilo',
};

export const ROLE_TAGS: Record<AgentRole, string> = {
  seniorFrontendArchitect: 'ARQ',
  codeReviewer: 'REV',
  slinter: 'LINT',
  formateur: 'FMT',
};

export const SQUAD_DEFINITIONS: SquadDefinition[] = [
  {
    id: 'squad-movement',
    name: 'Squad 1 · Movimiento',
    focus: 'Ruta y desplazamiento entre zonas',
    roles: ['seniorFrontendArchitect', 'codeReviewer', 'slinter', 'formateur'],
  },
  {
    id: 'squad-naming',
    name: 'Squad 2 · Naming/Collab',
    focus: 'Nombres claros + colaboración visual por rol',
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
