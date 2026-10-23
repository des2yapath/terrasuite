// Dot-grid crop visualization geometry — pure functions, fully unit-testable.
// Produces the marker layout that fills the parcel polygon on the plan
// minimap: a hex-offset grid clipped by point-in-polygon, capped at 800
// markers total, with per-zone assignment (40% area-weighted random /
// 60% nearest-zone-center) and trees thinned to ~1/60 density.

import type { CropPlan, PlanZone } from "@/lib/crop-engine";

export const MAX_GRID_MARKERS_TOTAL = 800;
export const TREE_FREQUENCY = 60; // 1 tree marker per 60 grid slots
export const RANDOM_ASSIGNMENT_PCT = 40; // % of markers assigned by area-weighted random

export interface PlanMarker {
  lng: number;
  lat: number;
  zoneId: string;
  crop: string;
  color: string;
  sizePx: number;
  isTree: boolean;
}

/** Ray-casting point-in-polygon (ring must be closed or open — both handled). */
export function pointInRing(lng: number, lat: number, ring: [number, number][]): boolean {
  let inside = false;
  const n = ring.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function ringBounds(ring: [number, number][]): { minLng: number; maxLng: number; minLat: number; maxLat: number } {
  const lngs = ring.map((c) => c[0]);
  const lats = ring.map((c) => c[1]);
  return { minLng: Math.min(...lngs), maxLng: Math.max(...lngs), minLat: Math.min(...lats), maxLat: Math.max(...lats) };
}

/** Zone-center lookup from the plan's normalized position (0..1 within bounds). */
export function zoneCenter(zone: PlanZone, bounds: ReturnType<typeof ringBounds>): { lng: number; lat: number } {
  return {
    lng: bounds.minLng + zone.position.x * (bounds.maxLng - bounds.minLng),
    lat: bounds.minLat + zone.position.y * (bounds.maxLat - bounds.minLat),
  };
}

/**
 * Build the marker grid for a parcel ring + plan.
 * Deterministic given the ring and plan (seeded RNG for stable re-renders).
 */
export function buildPlanMarkers(
  ring: [number, number][],
  plan: CropPlan,
  seed = 42,
): PlanMarker[] {
  const bounds = ringBounds(ring);
  const widthDeg = bounds.maxLng - bounds.minLng || 1e-6;
  const heightDeg = bounds.maxLat - bounds.minLat || 1e-6;

  // Grid density: aim for the cap, never exceed it. Hex rows compress ~13%.
  const targetCols = Math.ceil(Math.sqrt(MAX_GRID_MARKERS_TOTAL / 0.87));
  const spacingX = widthDeg / Math.max(1, targetCols - 1);
  const spacingY = spacingX * Math.sqrt(3) / 2; // hex vertical step

  // Deterministic RNG (mulberry32) so a given plan+ring always renders identically.
  let s = seed >>> 0;
  const rand = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const rows = Math.max(1, Math.floor(heightDeg / spacingY) + 1);
  const markers: PlanMarker[] = [];

  for (let row = 0; row < rows && markers.length < MAX_GRID_MARKERS_TOTAL; row++) {
    const offset = row % 2 === 0 ? 0 : spacingX / 2;
    const y = bounds.minLat + row * spacingY;
    if (y > bounds.maxLat) break;
    for (let col = 0; markers.length < MAX_GRID_MARKERS_TOTAL; col++) {
      const x = bounds.minLng + col * spacingX + offset;
      if (x > bounds.maxLng) break;
      if (!pointInRing(x, y, ring)) continue;

      // Zone assignment: 40% area-weighted random, 60% nearest zone center
      let zone: PlanZone;
      if (rand() * 100 < RANDOM_ASSIGNMENT_PCT) {
        const roll = rand() * 100;
        let acc = 0;
        zone = plan.zones[0];
        for (const z of plan.zones) {
          acc += z.areaPct;
          if (roll <= acc) { zone = z; break; }
        }
      } else {
        let best = plan.zones[0];
        let bestD = Infinity;
        for (const z of plan.zones) {
          const c = zoneCenter(z, bounds);
          const d = (x - c.lng) ** 2 + (y - c.lat) ** 2;
          if (d < bestD) { bestD = d; best = z; }
        }
        zone = best;
      }

      // Tree thinning: tree zones only mark every TREE_FREQUENCY-th slot
      const isTreeZone = zone.crop.toLowerCase().includes("tree") ||
        zone.name.toLowerCase().includes("tree");
      if (isTreeZone && rand() > 1 / TREE_FREQUENCY) continue;

      markers.push({
        lng: x,
        lat: y,
        zoneId: zone.id,
        crop: zone.crop,
        color: zone.color,
        sizePx: zone.emoji ? 7 : 6, // visualization sizes refined by the map layer
        isTree: isTreeZone,
      });
    }
  }

  // Post-cap guarantee (hex offset can overshoot slightly on the last row)
  return markers.slice(0, MAX_GRID_MARKERS_TOTAL);
}
