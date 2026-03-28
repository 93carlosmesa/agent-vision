/**
 * Scene configuration — pure data, no logic.
 *
 * The 3D world is the only scene. Zones define where agents are placed based on status:
 * - running  → Zona de trabajo
 * - waiting  → Zona de comunicación
 * - idle     → Zona relax
 */

import type { ISceneConfig } from '../types';

export const world3d: ISceneConfig = {
  id: '3d',
  title: '3D World',
  backgroundImage: '',
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

/** Default scene ID */
export const DEFAULT_SCENE = '3d';
