/**
 * TurnNotification — Toast notifications for completed agent turns.
 */

import type { INotification } from '../hooks/useNotifications';

interface TurnNotificationProps {
  notifications: INotification[];
  dismiss: (id: string) => void;
}

function resolveDisplayName(notif: INotification): string {
  if (notif.agentName) {
    return notif.agentName.replace(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)\s*/u, '').trim();
  }
  return notif.agentId;
}

export function TurnNotification({ notifications, dismiss }: TurnNotificationProps) {
  if (notifications.length === 0) return null;

  return (
    <div className="turn-notif-stack">
      {notifications.map((notif) => (
        <div
          key={notif.id}
          className="turn-notif-toast"
          onClick={() => dismiss(notif.id)}
        >
          <div className="turn-notif-text">
            {resolveDisplayName(notif)} completo su turno
          </div>
          {notif.activity && (
            <div className="turn-notif-subtext">
              {notif.activity.length > 60
                ? notif.activity.slice(0, 60) + '\u2026'
                : notif.activity}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
