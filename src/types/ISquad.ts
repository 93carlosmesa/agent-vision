export type AgentRole =
  | 'seniorFrontendArchitect'
  | 'codeReviewer'
  | 'slinter'
  | 'formateur';

export interface ISquadMember {
  squadId: string;
  role: AgentRole;
  roleLabel: string;
  sessionKey: string;
  agentId: string;
  displayName: string;
  status: 'running' | 'waiting' | 'idle';
  zoneLabel: string;
}

export interface ISquad {
  id: string;
  name: string;
  focus: string;
  members: ISquadMember[];
}
