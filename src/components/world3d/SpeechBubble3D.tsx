/**
 * SpeechBubble3D — floating speech bubble above an agent.
 *
 * White rounded rectangle with triangular pointer, scale-up animation,
 * auto-disappears after duration with fade-out.
 */

import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { Group } from 'three';

interface SpeechBubble3DProps {
  message: string;
  /** How long to show in seconds (default 3.5) */
  duration?: number;
}

export function SpeechBubble3D({ message, duration = 3.5 }: SpeechBubble3DProps) {
  const groupRef = useRef<Group>(null);
  const startRef = useRef<number | null>(null);
  const [visible, setVisible] = useState(true);

  // Reset when message changes
  useEffect(() => {
    startRef.current = null;
    setVisible(true);
  }, [message]);

  useFrame(({ clock }) => {
    if (!groupRef.current || !visible) return;

    if (startRef.current === null) {
      startRef.current = clock.getElapsedTime();
    }

    const elapsed = clock.getElapsedTime() - startRef.current;

    // Scale-up animation: 0→1 over 0.3s
    const scaleIn = Math.min(elapsed / 0.3, 1);
    const eased = 1 - Math.pow(1 - scaleIn, 3); // ease-out cubic

    // Fade-out in the last 0.5s
    const fadeStart = duration - 0.5;
    let opacity = 1;
    if (elapsed > fadeStart) {
      opacity = Math.max(0, 1 - (elapsed - fadeStart) / 0.5);
    }

    // Hide after duration
    if (elapsed > duration) {
      setVisible(false);
      return;
    }

    const scale = eased;
    groupRef.current.scale.set(scale, scale, scale);
    groupRef.current.visible = true;

    // Store opacity for the HTML element via a data attribute trick
    // We'll handle opacity in the HTML style directly
    groupRef.current.userData.opacity = opacity;
  });

  if (!visible) return null;

  return (
    <group ref={groupRef} position={[0, 2.5, 0]} scale={[0, 0, 0]}>
      <Html center distanceFactor={10} style={{ pointerEvents: 'none', whiteSpace: 'nowrap' }}>
        <BubbleContent message={message} groupRef={groupRef} />
      </Html>
    </group>
  );
}

/** Inner HTML content — reads opacity from groupRef.userData */
function BubbleContent({
  message,
  groupRef,
}: {
  message: string;
  groupRef: React.RefObject<Group | null>;
}) {
  const divRef = useRef<HTMLDivElement>(null);

  // Poll opacity from group userData (updated in useFrame above)
  useEffect(() => {
    let raf: number;
    function update() {
      if (divRef.current && groupRef.current) {
        const op = groupRef.current.userData.opacity ?? 1;
        divRef.current.style.opacity = String(op);
      }
      raf = requestAnimationFrame(update);
    }
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [groupRef]);

  return (
    <div ref={divRef} style={{ opacity: 1, transition: 'none' }}>
      {/* Bubble body */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        color: '#1a1a2e',
        padding: '4px 10px',
        borderRadius: '8px',
        fontSize: '10px',
        fontFamily: 'monospace',
        fontWeight: 600,
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.3)',
        textAlign: 'center',
        position: 'relative',
      }}>
        {message}
        {/* Triangle pointer */}
        <div style={{
          position: 'absolute',
          bottom: '-6px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: '6px solid rgba(255, 255, 255, 0.95)',
        }} />
      </div>
    </div>
  );
}
