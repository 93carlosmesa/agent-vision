/**
 * Barrel export for all types.
 */
export type { ISession, ISessionEvent, SessionStatus } from './ISession';
export type { IAgentIdentity, AgentNameMap } from './IAgent';
export type { IZoneDef, ZoneMapping, ZoneLabelMapping } from './IZone';
export type { ISceneConfig, SceneRegistry } from './ISceneConfig';
export type { AgentRole, ISquad, ISquadMember } from './ISquad';
export type { ISkill, ISkillVisit, SkillDistrict } from './ISkill';
export type { IInteraction, InteractionType } from './IInteraction';
export { INTERACTION_COLORS } from './IInteraction';
export type {
  ServerMessage,
  ClientMessage,
  IWsSessionsUpdate,
  IWsTimelineUpdate,
  IWsAgentNamesUpdate,
  IWsSessionDetail,
  IWsInteractionsUpdate,
  IWsError,
  IWsRequestDetail,
  IWsUnsubscribeDetail,
} from './IWebSocketMessage';
