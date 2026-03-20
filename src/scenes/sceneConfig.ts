/**
 * Scene configurations — pure data, no logic.
 *
 * Each scene defines zones where agents are placed based on status:
 * - running  → Zona de trabajo (left half, full height)
 * - waiting  → Zona de comunicación (right half, top)
 * - idle     → Zona relax (right half, bottom)
 */

import type { ISceneConfig, SceneRegistry } from '../types';

export const oficina: ISceneConfig = {
  id: 'oficina',
  title: 'Oficina',
  backgroundImage: '/assets/bg-office.png',
  zoneLabels: {
    running: 'Zona de trabajo',
    waiting: 'Zona de comunicación',
    idle: 'Zona relax',
  },
  zoneDefs: {
    running: { key: 'trabajo', label: 'Trabajo', x: 25, y: 50, w: 44, h: 70, deco: '🖥️' },
    waiting: { key: 'comunicacion', label: 'Comunicación', x: 75, y: 28, w: 44, h: 40, deco: '🗣️' },
    idle: { key: 'relax', label: 'Relax', x: 75, y: 74, w: 44, h: 40, deco: '☕' },
  },
};

export const playa: ISceneConfig = {
  id: 'playa',
  title: 'Playa',
  backgroundImage: '/assets/bg-beach.png',
  zoneLabels: {
    running: 'Zona de trabajo',
    waiting: 'Zona de comunicación',
    idle: 'Zona relax',
  },
  zoneDefs: {
    running: { key: 'trabajo', label: 'Trabajo', x: 25, y: 50, w: 44, h: 70, deco: '💻' },
    waiting: { key: 'comunicacion', label: 'Comunicación', x: 75, y: 28, w: 44, h: 40, deco: '🗣️' },
    idle: { key: 'relax', label: 'Relax', x: 75, y: 74, w: 44, h: 40, deco: '🌴' },
  },
};

/** All available scenes */
export const scenes: SceneRegistry = {
  oficina,
  playa,
};

/** Default scene ID */
export const DEFAULT_SCENE = 'oficina';
