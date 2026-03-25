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
  room: 'trabajo' | 'biblioteca';
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
export const SAMANTHA_DESK_POSITION: [number, number, number] = [3, 0, -14];

export const SAMANTHA_DESK: Desk = {
  id: SAMANTHA_DESK_ID,
  position: SAMANTHA_DESK_POSITION,
  facingAngle: Math.PI,
  room: 'biblioteca',  // Despacho CEO is within biblioteca zone for pathfinding
};

/**
 * Explicit desk positions in Sala de Trabajo.
 * Layout: 4 cols × 5 rows starting at (-16, 0, -6), dx=8, dz=2.2
 * Chair is at z+0.95, so agent sits facing the screen (rotation Math.PI)
 */
const TRABAJO_DESKS: Desk[] = (() => {
  const desks: Desk[] = [];
  const startX = -16;
  const startZ = -6;
  const dx = 8;
  const dz = 2.2;
  const cols = 4;  // medium density
  const rows = 4;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = startX + col * dx;
      const z = startZ + row * dz;
      desks.push({
        id: `trabajo-${col}-${row}`,
        position: [x, 0, z + 0.95],   // seated at chair
        facingAngle: Math.PI,           // facing the screen
        room: 'trabajo',
      });
    }
  }
  return desks;
})();

/**
 * Desk positions in Biblioteca (4 desks for overflow / library work)
 */
const BIBLIOTECA_DESKS: Desk[] = [-20, -15, -10].map((x, i) => ({
  id: `biblioteca-${i}`,
  position: [x, 0, -10.9],  // chair at z=-10.9 (desk at -12, chair offset +1.1)
  facingAngle: Math.PI,
  room: 'biblioteca',
}));

export const ALL_DESKS: Desk[] = [SAMANTHA_DESK, ...TRABAJO_DESKS, ...BIBLIOTECA_DESKS];

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
    // Permanently reserve Samantha's desk
    this.occupancy.set(SAMANTHA_DESK_ID, {
      deskId: SAMANTHA_DESK_ID,
      agentId: 'main',
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
    // Never let other agents claim Samantha's desk
    const isSamantha = agentId === 'main' || agentId === 'samantha';
    const freeDesks = ALL_DESKS
      .filter(d => this.isFree(d.id) && (isSamantha || d.id !== SAMANTHA_DESK_ID))
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
