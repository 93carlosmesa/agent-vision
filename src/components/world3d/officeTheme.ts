import type { RoomKey } from '../../utils/officePathfinding';

export interface OfficeVisualTheme {
  background: string;
  fog: string;
  floorBase: string;
  gridCell: string;
  gridSection: string;
  walls: {
    solid: string;
    inner: string;
    glass: string;
    baseboard: string;
  };
  roomFloors: {
    lobby: string;
    descanso: string;
    comunicacion: string;
    trabajo: string;
    biblioteca: string;
    exterior: string;
  };
  accent: {
    cyan: string;
    violet: string;
    amber: string;
    mint: string;
  };
}

export interface WorldEnvironment {
  id: string;
  title: string;
  inspiration: string;
  summary: string;
  theme: OfficeVisualTheme;
  density: 'low' | 'medium' | 'high';
  beachMode?: boolean;
}

/* ── Office theme — warm professional interior matching bg-office.png ── */
const OFFICE_THEME_DEF: OfficeVisualTheme = {
  background: '#1a2535',
  fog: '#2D3A4A',
  floorBase: '#A07850',       // warm parquet wood
  gridCell: '#8B6B45',
  gridSection: '#6B5040',
  walls: {
    solid: '#2D3A4A',         // navy blue walls
    inner: '#2D3A4A',
    glass: '#A8D4F0',         // frosted glass blue
    baseboard: '#F0EDE8',     // white baseboards
  },
  roomFloors: {
    lobby: '#B08860',         // lighter parquet
    descanso: '#9A7248',
    comunicacion: '#A07850',
    trabajo: '#96703E',
    biblioteca: '#8B6538',
    exterior: '#A07850',
  },
  accent: {
    cyan: '#5BB8D4',
    violet: '#8B7BB0',
    amber: '#E8A850',
    mint: '#6BAA7A',
  },
};

/* ── Beach theme — bright outdoor tropical matching bg-beach.png ── */
const BEACH_THEME: OfficeVisualTheme = {
  background: '#87CEEB',       // sky blue
  fog: '#B0D8F0',              // very light fog
  floorBase: '#A09080',        // weathered deck wood
  gridCell: '#C8B8A0',
  gridSection: '#B0A088',
  walls: {
    solid: '#6B5040',          // tiki hut dark wood
    inner: '#6B5040',
    glass: '#40C8C8',          // turquoise accent
    baseboard: '#A09080',
  },
  roomFloors: {
    lobby: '#B0A088',          // deck planks
    descanso: '#A89878',
    comunicacion: '#A09080',
    trabajo: '#A89878',
    biblioteca: '#A09080',
    exterior: '#F0E8D8',       // white sand
  },
  accent: {
    cyan: '#40C8C8',           // turquoise ocean
    violet: '#C090D0',
    amber: '#F0B060',
    mint: '#60C880',
  },
};

export const WORLD_ENVIRONMENTS: WorldEnvironment[] = [
  {
    id: 'office',
    title: 'Office HQ',
    inspiration: 'Warm professional interior with skylight windows',
    summary: 'Parquet floors, navy walls, warm 4500K lighting, wooden desks with iMacs.',
    theme: OFFICE_THEME_DEF,
    density: 'medium',
  },
  {
    id: 'tropical-beach',
    title: 'Tropical Beach Campus',
    inspiration: 'Outdoor tropical resort office',
    summary: 'Wooden deck on sand, tiki hut, beach loungers, turquoise ocean, bright sunlight.',
    theme: BEACH_THEME,
    density: 'medium',
    beachMode: true,
  },
];

export const DEFAULT_WORLD_ENVIRONMENT = WORLD_ENVIRONMENTS[0].id;

export function getWorldEnvironment(environmentId: string): WorldEnvironment {
  return WORLD_ENVIRONMENTS.find((env) => env.id === environmentId) ?? WORLD_ENVIRONMENTS[0];
}

/** Backward compatibility */
export const OFFICE_THEME = WORLD_ENVIRONMENTS[0].theme;

/** Explicit capacity targets per room for team scaling */
export const OFFICE_CAPACITY = {
  lobbyWaiting: 14,
  descansoSeats: 16,
  comunicacionSeats: 16,
  trabajoStations: 24,
  bibliotecaSeats: 10,
  exteriorSeats: 18,
} as const;

export const ROOM_CENTERS: Record<RoomKey, { cx: number; cz: number }> = {
  lobby: { cx: 0, cz: 14 },
  descanso: { cx: -14, cz: 6.5 },
  comunicacion: { cx: 10, cz: 6.5 },
  trabajo: { cx: 0, cz: -3 },
  biblioteca: { cx: -7, cz: -14 },
  despacho: { cx: 2, cz: -14 },
  exterior: { cx: 17, cz: -14 },
};
