/**
 * DeskManager — Tracks desk occupation in the work zone.
 *
 * Rules:
 *   - Each desk has a unique ID and explicit 3D coordinates
 *   - Maximum 1 agent per desk at any time
 *   - Agents claim nearest free desk on RUNNING transition
 *   - Agents release desk on WAITING/COMMUNICATING/IDLE transition
 *   - When USING_SKILL: desk stays reserved (agent will return)
 */

export interface Desk {
  id: string;
  /** 3D position [x, y, z] */
  position: [number, number, number];
  /** Facing angle (radians) when seated */
  facingAngle: number;
  /** Which room this desk is in */
  room: 'trabajo' | 'biblioteca' | 'despacho';
}

export interface DeskOccupancy {
  deskId: string;
  agentId: string | null;
  reservedAt: number | null;  // epoch ms when claimed
}

/**
 * Samantha's permanent personal desk — CEO workstation in Sala de Trabajo.
 * Always reserved for agentId 'main' or 'samantha'. Other agents cannot claim it.
 */
export const SAMANTHA_DESK_ID = 'samantha-desk';
/** Center of the desk FURNITURE — used for mueble rendering in SamanthaDesk.tsx */
export const SAMANTHA_DESK_POSITION: [number, number, number] = [2, 0, -11];
/** Where Samantha's avatar sits — in front of the desk, on the chair */
export const SAMANTHA_AVATAR_POSITION: [number, number, number] = [2, 0, -9.9];

export const SAMANTHA_DESK: Desk = {
  id: SAMANTHA_DESK_ID,
  position: SAMANTHA_AVATAR_POSITION,  // avatar goes here (on the chair)
  facingAngle: Math.PI,
  room: 'despacho',
};

/**
 * Explicit desk positions in Sala de Trabajo — grouped by squad.
 *
 * Layout (no overlap, gap ≥ 2.5 between avatars):
 *   dev_core:    left upper  — X: -20 to -8,  Z: -4
 *   dev_quality: left lower  — X: -20 to -8,  Z: -8
 *   dev_vision:  center      — X: -5  to +7,  Z: -4
 *   inv_core:    right       — X: +8  to +20, Z: -4 and -8 (2 rows)
 *   other:       center low  — X: -2  to +1,  Z: -12
 */
const SQUAD_DESKS: Desk[] = [
  // ── dev_core (5 desks) — row at Z=-4, X from -20 ──
  { id: 'dev-core-0', position: [-20, 0, -4], facingAngle: Math.PI, room: 'trabajo' },
  { id: 'dev-core-1', position: [-17, 0, -4], facingAngle: Math.PI, room: 'trabajo' },
  { id: 'dev-core-2', position: [-14, 0, -4], facingAngle: Math.PI, room: 'trabajo' },
  { id: 'dev-core-3', position: [-11, 0, -4], facingAngle: Math.PI, room: 'trabajo' },
  { id: 'dev-core-4', position: [ -8, 0, -4], facingAngle: Math.PI, room: 'trabajo' },

  // ── dev_quality (5 desks) — row at Z=-8, X from -20 ──
  { id: 'dev-quality-0', position: [-20, 0, -8], facingAngle: Math.PI, room: 'trabajo' },
  { id: 'dev-quality-1', position: [-17, 0, -8], facingAngle: Math.PI, room: 'trabajo' },
  { id: 'dev-quality-2', position: [-14, 0, -8], facingAngle: Math.PI, room: 'trabajo' },
  { id: 'dev-quality-3', position: [-11, 0, -8], facingAngle: Math.PI, room: 'trabajo' },
  { id: 'dev-quality-4', position: [ -8, 0, -8], facingAngle: Math.PI, room: 'trabajo' },

  // ── dev_vision (5 desks) — row at Z=-4, X from -5 ──
  { id: 'dev-vision-0', position: [-5, 0, -4], facingAngle: Math.PI, room: 'trabajo' },
  { id: 'dev-vision-1', position: [-2, 0, -4], facingAngle: Math.PI, room: 'trabajo' },
  { id: 'dev-vision-2', position: [ 1, 0, -4], facingAngle: Math.PI, room: 'trabajo' },
  { id: 'dev-vision-3', position: [ 4, 0, -4], facingAngle: Math.PI, room: 'trabajo' },
  { id: 'dev-vision-4', position: [ 7, 0, -4], facingAngle: Math.PI, room: 'trabajo' },

  // ── inv_core (9 desks) — 2 rows ──
  { id: 'inv-0', position: [ 8, 0, -4], facingAngle: Math.PI, room: 'trabajo' },
  { id: 'inv-1', position: [11, 0, -4], facingAngle: Math.PI, room: 'trabajo' },
  { id: 'inv-2', position: [14, 0, -4], facingAngle: Math.PI, room: 'trabajo' },
  { id: 'inv-3', position: [17, 0, -4], facingAngle: Math.PI, room: 'trabajo' },
  { id: 'inv-4', position: [20, 0, -4], facingAngle: Math.PI, room: 'trabajo' },
  { id: 'inv-5', position: [ 9, 0, -8], facingAngle: Math.PI, room: 'trabajo' },
  { id: 'inv-6', position: [12, 0, -8], facingAngle: Math.PI, room: 'trabajo' },
  { id: 'inv-7', position: [15, 0, -8], facingAngle: Math.PI, room: 'trabajo' },
  { id: 'inv-8', position: [18, 0, -8], facingAngle: Math.PI, room: 'trabajo' },

  // ── other (2 desks) — center bottom ──
  { id: 'other-0', position: [-2, 0, -12], facingAngle: Math.PI, room: 'trabajo' },
  { id: 'other-1', position: [ 1, 0, -12], facingAngle: Math.PI, room: 'trabajo' },
];

/** Legacy alias — all trabajo desks now come from SQUAD_DESKS */
const TRABAJO_DESKS: Desk[] = SQUAD_DESKS;

/**
 * Desk positions in Biblioteca (4 desks for overflow / library work)
 */
const BIBLIOTECA_DESKS: Desk[] = [-20, -15, -10].map((x, i) => ({
  id: `biblioteca-${i}`,
  position: [x, 0, -10.9],  // chair at z=-10.9 (desk at -12, chair offset +1.1)
  facingAngle: Math.PI,
  room: 'biblioteca',
}));

/**
 * Emma's permanent desk — Dev Manager, left side of Work Hub
 */
export const EMMA_DESK_ID = 'emma-desk';
export const EMMA_DESK: Desk = {
  id: EMMA_DESK_ID,
  position: [-1, 0, -15.1],  // avatar sits here — behind Samantha, left
  facingAngle: Math.PI,
  room: 'despacho',
};

/** Emma desk furniture position (for rendering) */
export const EMMA_DESK_POSITION: [number, number, number] = [-1, 0, -16];

/**
 * Ginny's permanent desk — Investment Manager, behind Samantha, right
 */
export const GINNY_DESK_ID = 'ginny-desk';
export const GINNY_DESK: Desk = {
  id: GINNY_DESK_ID,
  position: [5, 0, -15.1],   // avatar sits here — behind Samantha, right
  facingAngle: Math.PI,
  room: 'despacho',
};

/** Ginny desk furniture position (for rendering) */
export const GINNY_DESK_POSITION: [number, number, number] = [5, 0, -16];

export const ALL_DESKS: Desk[] = [SAMANTHA_DESK, EMMA_DESK, GINNY_DESK, ...TRABAJO_DESKS, ...BIBLIOTECA_DESKS];

/**
 * Fixed desk assignment per specialist agentId.
 * When an agent transitions to running, it gets its predetermined desk
 * instead of claiming the nearest free one dynamically.
 */
export const FIXED_DESKS: Partial<Record<string, string>> = {
  // dev_core
  'dev-git-guardian':              'dev-core-0',
  'dev-senior-frontend-architect': 'dev-core-1',
  'dev-backend-socket-architect':  'dev-core-2',
  'dev-ui-usability-analyst':      'dev-core-3',
  'dev-tester':                    'dev-core-4',
  // dev_quality
  'dev-codereviewer':   'dev-quality-0',
  'dev-cybersec':       'dev-quality-1',
  'dev-linter':         'dev-quality-2',
  'dev-prettier':       'dev-quality-3',
  'dev-controlnaming':  'dev-quality-4',
  // dev_vision
  'dev-vision-3d-architect':     'dev-vision-0',
  'dev-vision-world-designer':   'dev-vision-1',
  'dev-vision-avatar-creator':   'dev-vision-2',
  'dev-vision-fx-animator':      'dev-vision-3',
  'dev-vision-office-decorator': 'dev-vision-4',
  // inv_core (2 rows)
  'inv-risk-profiler':         'inv-0',
  'inv-strategist':            'inv-1',
  'inv-analyst-stocks':        'inv-2',
  'inv-analyst-crypto':        'inv-3',
  'inv-analyst-forex':         'inv-4',
  'inv-analyst-commodities':   'inv-5',
  'inv-analyst-ai':            'inv-6',
  'inv-technical-analyst':     'inv-7',
  'inv-psych-market':          'inv-8',
  // other
  'hedwig': 'other-0',
};

/** Get the fixed desk for an agent, or null if not mapped */
export function getFixedDesk(agentId: string): Desk | null {
  const deskId = FIXED_DESKS[agentId];
  if (!deskId) return null;
  return ALL_DESKS.find(d => d.id === deskId) ?? null;
}

/** Distance between two 3D points (ignoring Y) */
function dist2D(a: [number, number, number], b: [number, number, number]): number {
  const dx = a[0] - b[0];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dz * dz);
}

/**
 * DeskManager — singleton-style class to track desk state.
 * Used inside World3D as a ref to avoid React re-renders.
 */
export class DeskManager {
  /** Map from deskId → occupancy state */
  private occupancy: Map<string, DeskOccupancy> = new Map();

  constructor() {
    for (const desk of ALL_DESKS) {
      this.occupancy.set(desk.id, {
        deskId: desk.id,
        agentId: null,
        reservedAt: null,
      });
    }
    // Permanently reserve manager desks
    this.occupancy.set(SAMANTHA_DESK_ID, {
      deskId: SAMANTHA_DESK_ID,
      agentId: 'main',
      reservedAt: Date.now(),
    });
    this.occupancy.set(EMMA_DESK_ID, {
      deskId: EMMA_DESK_ID,
      agentId: 'emma',
      reservedAt: Date.now(),
    });
    this.occupancy.set(GINNY_DESK_ID, {
      deskId: GINNY_DESK_ID,
      agentId: 'ginny',
      reservedAt: Date.now(),
    });
  }

  /** Get all desks */
  getDesks(): Desk[] {
    return ALL_DESKS;
  }

  /** Get occupancy for a desk */
  getOccupancy(deskId: string): DeskOccupancy | undefined {
    return this.occupancy.get(deskId);
  }

  /** Check if a desk is free */
  isFree(deskId: string): boolean {
    const occ = this.occupancy.get(deskId);
    return occ?.agentId === null;
  }

  /** Get the desk currently assigned to an agent */
  getDeskForAgent(agentId: string): Desk | null {
    for (const [deskId, occ] of this.occupancy) {
      if (occ.agentId === agentId) {
        return ALL_DESKS.find(d => d.id === deskId) ?? null;
      }
    }
    return null;
  }

  /**
   * Find and claim the nearest free desk to a given position.
   * Returns the claimed desk, or null if all desks are occupied.
   */
  claimNearestDesk(agentId: string, fromPosition: [number, number, number]): Desk | null {
    // First release any desk this agent already holds
    this.releaseDesk(agentId);

    // Find free desks, sorted by distance
    // Reserved desk IDs — only the owner can claim them
    const RESERVED: Record<string, string[]> = {
      [SAMANTHA_DESK_ID]: ['main', 'samantha'],
      [EMMA_DESK_ID]: ['emma'],
      [GINNY_DESK_ID]: ['ginny'],
    };

    const freeDesks = ALL_DESKS
      .filter(d => {
        if (!this.isFree(d.id)) return false;
        const owners = RESERVED[d.id];
        if (owners && !owners.includes(agentId)) return false;
        return true;
      })
      .sort((a, b) => dist2D(a.position, fromPosition) - dist2D(b.position, fromPosition));

    if (freeDesks.length === 0) return null;

    const desk = freeDesks[0];
    this.occupancy.set(desk.id, {
      deskId: desk.id,
      agentId,
      reservedAt: Date.now(),
    });
    return desk;
  }

  /**
   * Release the desk held by an agent (does NOT release when using_skill —
   * the caller must decide this based on state transition).
   */
  releaseDesk(agentId: string): void {
    for (const [deskId, occ] of this.occupancy) {
      if (occ.agentId === agentId) {
        this.occupancy.set(deskId, {
          deskId,
          agentId: null,
          reservedAt: null,
        });
        break;
      }
    }
  }

  /**
   * Keep desk reserved (no release) — used for USING_SKILL state.
   * Agent will return to same desk after skill visit.
   */
  keepDesk(agentId: string): Desk | null {
    return this.getDeskForAgent(agentId);
  }

  /** Get snapshot of all occupancy for debugging */
  getOccupancySnapshot(): Record<string, string | null> {
    const snap: Record<string, string | null> = {};
    for (const [id, occ] of this.occupancy) {
      snap[id] = occ.agentId;
    }
    return snap;
  }

  /** Count of occupied desks */
  get occupiedCount(): number {
    let count = 0;
    for (const occ of this.occupancy.values()) {
      if (occ.agentId !== null) count++;
    }
    return count;
  }

  /** Count of free desks */
  get freeCount(): number {
    return ALL_DESKS.length - this.occupiedCount;
  }
}
