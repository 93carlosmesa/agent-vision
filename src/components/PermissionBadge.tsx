/**
 * PermissionBadge — pulsing red badge when an agent needs permission approval.
 *
 * Positioned above the SpeechBubble. Uses <Html> from drei for billboarding.
 */

import { Html } from '@react-three/drei';

interface PermissionBadgeProps {
  visible: boolean;
  toolName?: string;
}

const pulseKeyframes = `
@keyframes av-permission-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
`;

// Inject keyframes once
let stylesInjected = false;
function ensureStyles() {
  if (stylesInjected) return;
  const style = document.createElement('style');
  style.textContent = pulseKeyframes;
  document.head.appendChild(style);
  stylesInjected = true;
}

export function PermissionBadge({ visible, toolName }: PermissionBadgeProps) {
  if (!visible) return null;
  ensureStyles();

  return (
    <group position={[0, 3.2, 0]}>
      <Html center distanceFactor={10} style={{ pointerEvents: 'none' }}>
        <div style={{
          background: '#FF4444',
          color: '#FFFFFF',
          borderRadius: '4px',
          fontSize: '10px',
          padding: '3px 8px',
          fontFamily: 'monospace',
          fontWeight: 600,
          whiteSpace: 'nowrap',
          animation: 'av-permission-pulse 1.5s infinite',
          boxShadow: '0 2px 8px rgba(255,68,68,0.4)',
        }}>
          {toolName ? `\uD83D\uDD10 ${toolName}` : '\uD83D\uDD10 Aprobaci\u00F3n requerida'}
        </div>
      </Html>
    </group>
  );
}
