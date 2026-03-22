/**
 * CameraControls3D — Keyboard-based camera movement for the 3D office.
 *
 * WASD/Arrows: pan camera   Q/E: orbit   Space: reset to overview
 * Works alongside OrbitControls (mouse zoom/rotate still works).
 */

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
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

  const _forward = useMemo(() => new THREE.Vector3(), []);
  const _right = useMemo(() => new THREE.Vector3(), []);
  const _delta = useMemo(() => new THREE.Vector3(), []);
  const _up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const _offset = useMemo(() => new THREE.Vector3(), []);

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
    camera.getWorldDirection(_forward);
    _forward.y = 0;
    _forward.normalize();
    _right.crossVectors(_forward, _up).normalize();
    _delta.set(0, 0, 0);
    if (keys.has("forward"))  _delta.addScaledVector(_forward, MOVE_SPEED);
    if (keys.has("backward")) _delta.addScaledVector(_forward, -MOVE_SPEED);
    if (keys.has("left"))     _delta.addScaledVector(_right, -MOVE_SPEED);
    if (keys.has("right"))    _delta.addScaledVector(_right, MOVE_SPEED);
    if (_delta.lengthSq() > 0) {
      const newCamX = clamp(camera.position.x + _delta.x, BOUNDS.xMin, BOUNDS.xMax);
      const newCamZ = clamp(camera.position.z + _delta.z, BOUNDS.zMin, BOUNDS.zMax);
      const actualDx = newCamX - camera.position.x;
      const actualDz = newCamZ - camera.position.z;
      camera.position.x = newCamX;
      camera.position.z = newCamZ;
      controls.target.x = clamp(controls.target.x + actualDx, BOUNDS.xMin, BOUNDS.xMax);
      controls.target.z = clamp(controls.target.z + actualDz, BOUNDS.zMin, BOUNDS.zMax);
    }
    if (keys.has("rotateLeft") || keys.has("rotateRight")) {
      const angle = keys.has("rotateLeft") ? ROTATE_SPEED : -ROTATE_SPEED;
      _offset.subVectors(camera.position, controls.target);
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const nx = _offset.x * cosA - _offset.z * sinA;
      const nz = _offset.x * sinA + _offset.z * cosA;
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
