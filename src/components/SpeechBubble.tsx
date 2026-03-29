/**
 * SpeechBubble — Html-based bubble for persistent Claude Code activity display.
 *
 * Uses <Html> from drei for automatic billboarding.
 * Shows tool name / waiting status above the avatar with fade transitions.
 */

import { Html } from '@react-three/drei';

interface SpeechBubbleProps {
  text: string;
  visible: boolean;
  position?: [number, number, number];
}

const MAX_TEXT_LENGTH = 45;

export function SpeechBubble({
  text,
  visible,
  position = [0, 2.5, 0],
}: SpeechBubbleProps) {
  if (!visible || !text) return null;

  const displayText = text.length > MAX_TEXT_LENGTH
    ? text.slice(0, 42) + '...'
    : text;

  return (
    <group position={position}>
      <Html center distanceFactor={10} style={{ pointerEvents: 'none' }}>
        <div style={{
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.3s',
          whiteSpace: 'nowrap',
        }}>
          <div style={{
            background: '#FFFDF5',
            color: '#1a1a1a',
            border: '1px solid #CCC',
            borderRadius: '8px',
            padding: '6px 10px',
            fontSize: '11px',
            fontFamily: 'monospace',
            maxWidth: '160px',
            whiteSpace: 'normal',
            wordBreak: 'break-word',
            textAlign: 'center',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
          }}>
            {displayText}
          </div>
        </div>
      </Html>
    </group>
  );
}
