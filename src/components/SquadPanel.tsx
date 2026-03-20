import type { ISquad } from '../types';

interface SquadPanelProps {
  squads: ISquad[];
}

export function SquadPanel({ squads }: SquadPanelProps) {
  return (
    <div className="squad-panel">
      <div className="timeline-panel-header">
        <span>👥 Squads</span>
        <span className="timeline-count">{squads.length} equipos</span>
      </div>
      <div className="squad-list">
        {squads.map((squad) => (
          <div key={squad.id} className="squad-card">
            <div className="squad-card-header">
              <div className="squad-name">{squad.name}</div>
              <div className="squad-focus">{squad.focus}</div>
            </div>

            <ul className="squad-members">
              {squad.members.map((member) => (
                <li key={`${squad.id}-${member.role}`} className="squad-member">
                  <span className="squad-member-role">{member.roleLabel}</span>
                  <span className="squad-member-name" title={member.displayName}>{member.displayName}</span>
                  <span className={`agent-avatar-badge agent-avatar-badge--${member.status}`}>
                    {member.zoneLabel}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
