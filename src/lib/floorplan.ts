import { Checkpoint } from './types';

export interface FloorPlanNode {
  checkpoint: Checkpoint;
  /** Horizontal position as a percentage of the plan (0–100). */
  x: number;
  /** Vertical position as a percentage of the plan (0–100). */
  y: number;
  aisle: string;
  order: number;
}

export interface FloorPlanConfig {
  venue: string;
  /**
   * Optional floor-plan image (e.g. `/floorplan.png`).
   * When null, the map renders a generated schematic from booth locations.
   */
  image: string | null;
  /**
   * Optional precise overrides, keyed by `qr_token`.
   * Fill these once the real venue plan is available.
   */
  nodes: Record<string, { x: number; y: number }>;
}

export const FLOORPLAN: FloorPlanConfig = {
  venue: 'Marquee Tent, High Impact Research Building, Universiti Malaya',
  image: null,
  nodes: {},
};

/** Parse "Booth A-01, Marquee Tent" → { aisle: 'A', order: 1 } */
function parseBooth(location: string): { aisle: string; order: number } {
  const match = location.match(/booth\s+([a-z]+)\s*-?\s*(\d+)/i);
  if (match) return { aisle: match[1].toUpperCase(), order: Number(match[2]) };
  return { aisle: '—', order: 0 };
}

/**
 * Build map nodes for a set of booths.
 * Uses explicit coordinates when provided, otherwise lays booths out in
 * aisle rows based on their `location` string (A/B/C …).
 */
export function buildFloorPlanNodes(checkpoints: Checkpoint[]): FloorPlanNode[] {
  if (checkpoints.length === 0) return [];

  const parsed = checkpoints.map(checkpoint => ({
    checkpoint,
    ...parseBooth(checkpoint.location),
  }));

  const aisleOrder = Array.from(new Set(parsed.map(item => item.aisle))).sort((a, b) =>
    a.localeCompare(b)
  );

  const rows = aisleOrder.map(aisle =>
    parsed
      .filter(item => item.aisle === aisle)
      .sort((a, b) => a.order - b.order)
  );

  const rowCount = rows.length;

  return rows.flatMap((row, rowIndex) => {
    const y = rowCount === 1 ? 50 : 22 + (rowIndex / (rowCount - 1)) * 56;
    return row.map((item, indexInRow) => {
      const explicit = FLOORPLAN.nodes[item.checkpoint.qr_token];
      const x =
        row.length === 1 ? 50 : 14 + (indexInRow / (row.length - 1)) * 72;
      return {
        checkpoint: item.checkpoint,
        x: explicit?.x ?? x,
        y: explicit?.y ?? y,
        aisle: item.aisle,
        order: item.order,
      };
    });
  });
}
