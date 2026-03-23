/**
 * DayNightCycle.ts — Real-time day/night cycle based on Madrid (Europe/Madrid) clock.
 *
 * Periods:
 *  - night        00:00–06:00  Dark office, blue moonlight, warm desk lamps
 *  - early_morning 06:00–09:00  Soft orange sunrise, slowly brightening
 *  - day          09:00–18:00  Bright natural daylight, white/warm-white lights
 *  - evening      18:00–21:00  Golden hour, warm amber, long shadows
 *  - late_evening  21:00–00:00  Dim office, some desks lit, cozy mood
 */

export type TimeOfDay =
  | 'night'
  | 'early_morning'
  | 'day'
  | 'evening'
  | 'late_evening';

export interface LightingConfig {
  timeOfDay: TimeOfDay;

  /** Sky/background hex color */
  skyColor: string;

  /** Ambient light */
  ambientColor: string;
  ambientIntensity: number;

  /** Primary directional light (sun/moon) */
  sunColor: string;
  sunIntensity: number;
  sunPosition: [number, number, number];

  /** Hemisphere sky/ground */
  hemiSkyColor: string;
  hemiGroundColor: string;
  hemiIntensity: number;

  /** Scene fog */
  fogColor: string;
  fogNear: number;
  fogFar: number;

  /** Room point lights intensity multiplier [0-1] */
  roomLightsIntensity: number;

  /** Warm glow from desk lamps (night/late-evening only) */
  deskLampIntensity: number;
  deskLampColor: string;

  /** Human-readable label */
  label: string;
  emoji: string;
}

// ── Configs per period ───────────────────────────────────────────────────────

export const LIGHTING_CONFIGS: Record<TimeOfDay, LightingConfig> = {
  night: {
    timeOfDay: 'night',
    skyColor: '#060a14',
    ambientColor: '#1a2545',
    ambientIntensity: 0.12,
    sunColor: '#3050c8',      // cool blue moonlight
    sunIntensity: 0.25,
    sunPosition: [-12, 18, -8],
    hemiSkyColor: '#0d1535',
    hemiGroundColor: '#05080f',
    hemiIntensity: 0.15,
    fogColor: '#08101e',
    fogNear: 28,
    fogFar: 65,
    roomLightsIntensity: 0.35, // only some rooms lit
    deskLampIntensity: 1.2,
    deskLampColor: '#ff9040',
    label: 'Night',
    emoji: '🌙',
  },
  early_morning: {
    timeOfDay: 'early_morning',
    skyColor: '#160a05',
    ambientColor: '#d06030',
    ambientIntensity: 0.32,
    sunColor: '#ff8844',      // warm orange sunrise
    sunIntensity: 0.75,
    sunPosition: [-6, 8, 12],
    hemiSkyColor: '#c05020',
    hemiGroundColor: '#20100a',
    hemiIntensity: 0.3,
    fogColor: '#2e1508',
    fogNear: 32,
    fogFar: 72,
    roomLightsIntensity: 0.55,
    deskLampIntensity: 0.8,
    deskLampColor: '#ffb060',
    label: 'Early Morning',
    emoji: '🌅',
  },
  day: {
    timeOfDay: 'day',
    skyColor: '#1a2030',
    ambientColor: '#fff0d8',
    ambientIntensity: 0.90,
    sunColor: '#fff0d0',      // bright warm daylight
    sunIntensity: 2.50,
    sunPosition: [5, 20, 10],
    hemiSkyColor: '#e8d8c8',
    hemiGroundColor: '#a07850',
    hemiIntensity: 0.70,
    fogColor: '#2d3a4a',
    fogNear: 40,
    fogFar: 85,
    roomLightsIntensity: 1.0,
    deskLampIntensity: 0.0,   // natural light dominates
    deskLampColor: '#fffde8',
    label: 'Day',
    emoji: '☀️',
  },
  evening: {
    timeOfDay: 'evening',
    skyColor: '#140a04',
    ambientColor: '#c86820',
    ambientIntensity: 0.50,
    sunColor: '#ffa030',      // golden hour amber
    sunIntensity: 1.20,
    sunPosition: [18, 10, 6],
    hemiSkyColor: '#b85020',
    hemiGroundColor: '#1a0a04',
    hemiIntensity: 0.40,
    fogColor: '#241208',
    fogNear: 34,
    fogFar: 78,
    roomLightsIntensity: 0.75,
    deskLampIntensity: 0.4,
    deskLampColor: '#ffa050',
    label: 'Evening',
    emoji: '🌇',
  },
  late_evening: {
    timeOfDay: 'late_evening',
    skyColor: '#090c18',
    ambientColor: '#1e2840',
    ambientIntensity: 0.22,
    sunColor: '#4060b0',      // bluish dusk
    sunIntensity: 0.38,
    sunPosition: [10, 14, -6],
    hemiSkyColor: '#151c30',
    hemiGroundColor: '#080c15',
    hemiIntensity: 0.18,
    fogColor: '#0e1420',
    fogNear: 30,
    fogFar: 68,
    roomLightsIntensity: 0.45,
    deskLampIntensity: 0.95,
    deskLampColor: '#ff8830',
    label: 'Late Evening',
    emoji: '🌆',
  },
};

// ── Time helpers ─────────────────────────────────────────────────────────────

/** Returns the current fractional hour (0–24) in Europe/Madrid timezone */
export function getMadridHour(): number {
  const now = new Date();
  // Use Intl to get Madrid time components
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Madrid',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(now);

  let h = 0, m = 0;
  for (const p of parts) {
    if (p.type === 'hour')   h = parseInt(p.value, 10);
    if (p.type === 'minute') m = parseInt(p.value, 10);
  }
  // Handle midnight edge case (24:00 → 0)
  if (h === 24) h = 0;
  return h + m / 60;
}

/** Returns the current TimeOfDay period for Madrid */
export function getTimeOfDay(): TimeOfDay {
  const h = getMadridHour();
  if (h < 6)  return 'night';
  if (h < 9)  return 'early_morning';
  if (h < 18) return 'day';
  if (h < 21) return 'evening';
  return 'late_evening';
}

/** Returns the full lighting config for the current Madrid time */
export function getLightingConfig(): LightingConfig {
  return LIGHTING_CONFIGS[getTimeOfDay()];
}
