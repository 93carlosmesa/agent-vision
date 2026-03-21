/**
 * AgentScene — renders a pannable world with zones + skill rooms.
 * Avatars transition between zone slots and skill rooms.
 */

import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import type { CSSProperties } from 'react';
import type { ISession, AgentNameMap, ISceneConfig, ISkill, ISkillVisit, SkillDistrict } from '../types';
import { SessionService } from '../services/SessionService';
import { PixelAvatar } from './PixelAvatar';
import { SKILLS_BY_DISTRICT, DISTRICT_META } from '../config/skills';

interface AgentSceneProps {
  sessions: ISession[];
  agentNames: AgentNameMap;
  sceneConfig: ISceneConfig;
  memberMetaBySession: Record<string, {
    squadId: string;
    squadLabel: string;
    roleLabel: string;
    collaborationTag: string;
  }>;
  skillVisits?: ISkillVisit[];
}

/** World is 180% tall to accommodate skill district below zones */
const WORLD_HEIGHT_RATIO = 1.8;

const STATUS_EMOJI: Record<string, string> = {
  running: '🟢',
  waiting: '🟡',
  idle: '⚫',
};

/** Zone styles — positioned in top 56% of the world (original zones) */
const ZONE_STYLES: Record<string, CSSProperties> = {
  running: { left: '0%', top: '0%', width: '50%', height: '55.5%' },
  waiting: { left: '50%', top: '0%', width: '50%', height: '27.75%' },
  idle: { left: '50%', top: '27.75%', width: '50%', height: '27.75%' },
};

/** Zone layout for avatar positioning — scaled to upper portion */
const ZONE_LAYOUT: Record<string, { x: number; y: number; width: number; height: number }> = {
  running: { x: 0, y: 0, width: 50, height: 55.5 },
  waiting: { x: 50, y: 0, width: 50, height: 27.75 },
  idle: { x: 50, y: 27.75, width: 50, height: 27.75 },
};

const AVATAR_SLOT = { width: 14, height: 14.4 };
const ZONE_PADDING = 4;
const ZONE_HEADER_SPACE = 6.1;

/** District layout — positioned in bottom 44% of world */
const DISTRICT_POSITIONS: Record<SkillDistrict, { x: number; y: number; width: number }> = {
  inv:    { x: 2,    y: 59, width: 30 },
  dev:    { x: 35,   y: 59, width: 30 },
  global: { x: 68,   y: 59, width: 30 },
};

/** Calculate position of a skill room within its district */
function skillRoomPosition(skill: ISkill, indexInDistrict: number, totalInDistrict: number): { left: number; top: number } {
  const district = DISTRICT_POSITIONS[skill.district];
  const cols = Math.min(totalInDistrict, 3);
  const col = indexInDistrict % cols;
  const row = Math.floor(indexInDistrict / cols);
  const cellW = district.width / cols;
  return {
    left: district.x + col * cellW + cellW / 2,
    top: district.y + 6 + row * 12,
  };
}

function getAgentDisplay(session: ISession, agentNames: AgentNameMap): { name: string; seed: string } {
  const agentId = session.agentId || SessionService.extractAgentId(session.key);
  const resolvedName = agentNames[agentId];
  if (resolvedName) {
    const parts = resolvedName.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)\s*(.*)/u);
    if (parts) return { seed: agentId, name: parts[2] };
    return { seed: agentId, name: resolvedName };
  }
  return { seed: agentId, name: agentId };
}

function positionFor(status: ISession['status'], index: number): { left: string; top: string; topNumber: number } {
  const zone = ZONE_LAYOUT[status];

  const usableWidth = Math.max(AVATAR_SLOT.width, zone.width - ZONE_PADDING * 2);
  const usableHeight = Math.max(AVATAR_SLOT.height, zone.height - ZONE_PADDING * 2 - ZONE_HEADER_SPACE);

  const cols = Math.max(1, Math.floor(usableWidth / AVATAR_SLOT.width));
  const rows = Math.max(1, Math.ceil((index + 1) / cols));

  const col = index % cols;
  const row = Math.floor(index / cols);

  const stepX = cols <= 1 ? 0 : (usableWidth - AVATAR_SLOT.width) / (cols - 1);
  const stepY = rows <= 1 ? 0 : Math.min(AVATAR_SLOT.height - 2, (usableHeight - AVATAR_SLOT.height) / (rows - 1));

  const left = zone.x + ZONE_PADDING + AVATAR_SLOT.width / 2 + col * stepX;
  const top = zone.y + ZONE_PADDING + ZONE_HEADER_SPACE + AVATAR_SLOT.height / 2 + row * stepY;

  return { left: `${left}%`, top: `${top}%`, topNumber: top };
}

/** Pre-compute skill room positions for visit targeting */
const SKILL_POSITIONS: Record<string, { left: number; top: number }> = {};
for (const [district, skills] of Object.entries(SKILLS_BY_DISTRICT)) {
  skills.forEach((skill, i) => {
    SKILL_POSITIONS[skill.id] = skillRoomPosition(skill, i, skills.length);
  });
}

export function AgentScene({ sessions, agentNames, sceneConfig, memberMetaBySession, skillVisits = [] }: AgentSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);

  // ── Pan state ──
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragState = useRef<{ dragging: boolean; startX: number; startY: number; startPanX: number; startPanY: number }>({
    dragging: false, startX: 0, startY: 0, startPanX: 0, startPanY: 0,
  });

  const clampPan = useCallback((x: number, y: number) => {
    const container = containerRef.current;
    if (!container) return { x, y };
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const worldH = ch * WORLD_HEIGHT_RATIO;
    return {
      x: Math.min(0, Math.max(x, 0)),  // no horizontal overflow for now
      y: Math.min(0, Math.max(y, -(worldH - ch))),
    };
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.agent-avatar, .skill-room')) return;
    dragState.current = { dragging: true, startX: e.clientX, startY: e.clientY, startPanX: pan.x, startPanY: pan.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [pan]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragState.current.dragging) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    setPan(clampPan(dragState.current.startPanX + dx, dragState.current.startPanY + dy));
  }, [clampPan]);

  const onPointerUp = useCallback(() => {
    dragState.current.dragging = false;
  }, []);

  // ── Wheel to pan vertically ──
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
    setPan((prev) => clampPan(prev.x, prev.y - e.deltaY));
  }, [clampPan]);

  // ── Active skill visits (map sessionKey → target skill position) ──
  const activeVisitMap = useMemo(() => {
    const now = Date.now();
    const map: Record<string, { left: number; top: number; skillId: string }> = {};
    for (const visit of skillVisits) {
      if (now - visit.startedAt < visit.durationMs) {
        const pos = SKILL_POSITIONS[visit.skillId];
        if (pos) map[visit.sessionKey] = { ...pos, skillId: visit.skillId };
      }
    }
    return map;
  }, [skillVisits]);

  // ── Position agents ──
  const grouped: Record<string, ISession[]> = { running: [], waiting: [], idle: [] };
  for (const session of sessions) {
    if (grouped[session.status]) grouped[session.status].push(session);
  }

  const hasActiveWork = grouped.running.length > 0 || grouped.waiting.length > 0;

  const positioned = hasActiveWork
    ? (['running', 'waiting', 'idle'] as const).flatMap((status) =>
        grouped[status].map((session, index) => {
          const visit = activeVisitMap[session.key];
          if (visit) {
            return { session, position: { left: `${visit.left}%`, top: `${visit.top - 5}%`, topNumber: visit.top } };
          }
          return { session, position: positionFor(status, index) };
        }),
      )
    : (() => {
        const movement = sessions.filter((s) => memberMetaBySession[s.key]?.squadId !== 'squad-naming');
        const naming = sessions.filter((s) => memberMetaBySession[s.key]?.squadId === 'squad-naming');

        const placeSquad = (items: ISession[], baseLeft: number) =>
          items.map((session, slotInSquad) => {
            const visit = activeVisitMap[session.key];
            if (visit) {
              return { session, position: { left: `${visit.left}%`, top: `${visit.top - 5}%`, topNumber: visit.top } };
            }
            const left = baseLeft + (slotInSquad % 2) * 5;
            const top = 40 + Math.floor(slotInSquad / 2) * 9;
            return {
              session,
              position: { left: `${left}%`, top: `${top}%`, topNumber: top },
            };
          });

        return [...placeSquad(movement, 63), ...placeSquad(naming, 82)];
      })();

  return (
    <div
      ref={containerRef}
      className="agent-scene-viewport"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onWheel={onWheel}
    >
      <div
        ref={worldRef}
        className="agent-scene-world"
        style={{
          height: `${WORLD_HEIGHT_RATIO * 100}%`,
          transform: `translate(${pan.x}px, ${pan.y}px)`,
          backgroundImage: `url(${sceneConfig.backgroundImage})`,
        }}
      >
        {/* ── Status Zones (upper portion) ── */}
        {(['running', 'waiting', 'idle'] as const).map((status) => {
          const zoneDef = sceneConfig.zoneDefs[status];
          return (
            <div key={status} className={`scene-zone scene-zone--${status}`} style={ZONE_STYLES[status]}>
              <div className="scene-zone-header">
                <span className="scene-zone-deco">{zoneDef.deco}</span>
                <span className="scene-zone-label">{sceneConfig.zoneLabels[status]}</span>
              </div>
            </div>
          );
        })}

        {/* ── Skill Districts (lower portion) ── */}
        {(Object.entries(DISTRICT_POSITIONS) as [SkillDistrict, { x: number; y: number; width: number }][]).map(
          ([district, pos]) => {
            const meta = DISTRICT_META[district];
            const skills = SKILLS_BY_DISTRICT[district];
            return (
              <div
                key={district}
                className={`skill-district skill-district--${district}`}
                style={{ left: `${pos.x}%`, top: `${pos.y}%`, width: `${pos.width}%` }}
              >
                <div className="skill-district-header">
                  <span className="skill-district-icon">{meta.icon}</span>
                  <span className="skill-district-label">{meta.label}</span>
                </div>

                {/* Skill rooms */}
                {skills.map((skill, i) => {
                  const roomPos = skillRoomPosition(skill, i, skills.length);
                  // Position relative to district container
                  const relLeft = ((roomPos.left - pos.x) / pos.width) * 100;
                  const relTop = (roomPos.top - pos.y - 6) * 100 / 30; // approximate
                  return (
                    <div
                      key={skill.id}
                      className="skill-room"
                      style={{
                        left: `${relLeft}%`,
                        top: `${20 + i * 38}%`,
                        '--skill-color': meta.color,
                      } as CSSProperties}
                    >
                      <div className="skill-room-icon">{skill.icon}</div>
                      <div className="skill-room-label">{skill.label}</div>
                      <div className="skill-room-glow" />
                    </div>
                  );
                })}
              </div>
            );
          },
        )}

        {/* ── Avatar Layer ── */}
        <div className="scene-avatar-layer">
          {positioned.map(({ session, position }) => {
            const { name, seed } = getAgentDisplay(session, agentNames);
            const memberMeta = memberMetaBySession[session.key];
            const squadClass = memberMeta?.squadId === 'squad-naming' ? 'agent-avatar--squad-naming' : 'agent-avatar--squad-movement';
            const visiting = activeVisitMap[session.key];

            return (
              <div
                key={session.key}
                className={`agent-avatar agent-avatar--walking agent-avatar--${session.status} ${squadClass}${visiting ? ' agent-avatar--visiting' : ''}`}
                style={{ left: position.left, top: position.top, zIndex: Math.round(position.topNumber * 10) }}
              >
                <div className="agent-avatar-squad">{memberMeta?.squadLabel ?? 'Sin squad'}</div>
                <div className="agent-avatar-sprite"><PixelAvatar seed={seed} /></div>
                <div className="agent-avatar-name" title={name}>{name}</div>
                <div className="agent-avatar-role" title={memberMeta?.roleLabel}>{memberMeta?.roleLabel ?? 'Rol pendiente'}</div>
                <div className={`agent-avatar-badge agent-avatar-badge--${session.status}`}>
                  {STATUS_EMOJI[session.status]} {visiting ? `🔧 ${visiting.skillId.split('--')[1]}` : (memberMeta?.collaborationTag ?? session.status)}
                </div>
              </div>
            );
          })}
          {positioned.length === 0 && <div className="scene-zone-empty scene-zone-empty--global">Sin agentes</div>}
        </div>

        {/* ── Scroll hint ── */}
        <div className="world-scroll-hint">
          <span>↕</span> Scroll or drag to explore
        </div>
      </div>
    </div>
  );
}
