/**
 * CameraControls3D — Keyboard-based camera movement for the 3D office.
 *
 * WASD/Arrows: pan camera   Q/E: orbit   Space: reset to overview
 * Works alongside OrbitControls (mouse zoom/rotate still works).
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

interface CameraControls3DProps {
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}

const MOVE_SPEED = 0.3;
const ROTATE_SPEED = 0.025;
const BOUNDS = { xMin: -25, xMax: 25, zMin: -20, zMax: 20 };
const DEFAULT_CAMERA: [number, number, number] = [0, 25, 30];
const DEFAULT_TARGET: [number, number, number] = [0, 0, 0];

type KeyAction = 'forward' | 'backward' | 'left' | 'right' | 'rotateLeft' | 'rotateRight' | 'reset';

const KEY_MAP: Record<string, KeyAction> = {
  ArrowUp: 'forward', KeyW: 'forward',
  ArrowDown: 'backward', KeyS: 'backward',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  KeyQ: 'rotateLeft',
  KeyE: 'rotateRight',
  Space: 'reset',
};

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function CameraControls3D({ controlsRef }: CameraControls3DProps) {
  const { camera } = useThree();
  const activeKeys = useRef(new Set<KeyAction>());

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Don't capture when user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const action = KEY_MAP[e.code];
      if (!action) return;
      e.preventDefault();
      if (action === 'reset') {
        // Instant reset
        camera.position.set(...DEFAULT_CAMERA);
        if (controlsRef.current) {
          controlsRef.current.target.set(...DEFAULT_TARGET);
          controlsRef.current.update();
        }
        return;
      }
      activeKeys.current.add(action);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const action = KEY_MAP[e.code];
      if (action) activeKeys.current.delete(action);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [camera, controlsRef]);

  useFrame(() => {
    const keys = activeKeys.current;
    if (keys.size === 0) return;

    const controls = controlsRef.current;
    if (!controls) return;

    // Camera forward/right vectors projected onto XZ plane
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    const delta = new THREE.Vector3();

    if (keys.has('forward'))  delta.add(forward.clone().multiplyScalar(MOVE_SPEED));
    if (keys.has('backward')) delta.add(forward.clone().multiplyScalar(-MOVE_SPEED));
    if (keys.has('left'))     delta.add(right.clone().multiplyScalar(-MOVE_SPEED));
    if (keys.has('right'))    delta.add(right.clone().multiplyScalar(MOVE_SPEED));

    if (delta.lengthSq() > 0) {
      // Move camera and target together (pan, not orbit)
      const newCamX = clamp(camera.position.x + delta.x, BOUNDS.xMin, BOUNDS.xMax);
      const newCamZ = clamp(camera.position.z + delta.z, BOUNDS.zMin, BOUNDS.zMax);

      const actualDx = newCamX - camera.position.x;
      const actualDz = newCamZ - camera.position.z;

      camera.position.x = newCamX;
      camera.position.z = newCamZ;

      controls.target.x = clamp(controls.target.x + actualDx, BOUNDS.xMin, BOUNDS.xMax);
      controls.target.z = clamp(controls.target.z + actualDz, BOUNDS.zMin, BOUNDS.zMax);
    }

    // Orbit rotation (Q/E) — rotate camera around target on Y axis
    if (keys.has('rotateLeft') || keys.has('rotateRight')) {
      const angle = keys.has('rotateLeft') ? ROTATE_SPEED : -ROTATE_SPEED;
      const offset = new THREE.Vector3().subVectors(camera.position, controls.target);
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const nx = offset.x * cosA - offset.z * sinA;
      const nz = offset.x * sinA + offset.z * cosA;
      camera.position.x = clamp(controls.target.x + nx, BOUNDS.xMin, BOUNDS.xMax);
      camera.position.z = clamp(controls.target.z + nz, BOUNDS.zMin, BOUNDS.zMax);
    }

    controls.update();
  });

  return null;
}

/* ── HUD overlay (outside Canvas) ── */
export function CameraHUD() {
  const [visible, setVisible] = useState(true);
  const [hovered, setHovered] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startFadeTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(false), 5000);
  }, []);

  useEffect(() => {
    startFadeTimer();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [startFadeTimer]);

  const show = visible || hovered;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'absolute',
        bottom: 12,
        right: 12,
        padding: '6px 12px',
        background: 'rgba(0,0,0,0.55)',
        color: '#ccc',
        fontSize: 11,
        fontFamily: 'monospace',
        borderRadius: 6,
        pointerEvents: 'auto',
        opacity: show ? 1 : 0,
        transition: 'opacity 0.6s ease',
        zIndex: 10,
      }}
    >
      WASD/Arrows: Mover &nbsp;|&nbsp; Q/E: Rotar &nbsp;|&nbsp; Scroll: Zoom &nbsp;|&nbsp; Space: Reset
    </div>
  );
}
