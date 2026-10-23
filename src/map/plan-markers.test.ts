// Plan markers tests — geometry and allocation discipline.

import { describe, it, expect } from "vitest";
import { pointInRing, ringBounds, buildPlanMarkers, MAX_GRID_MARKERS_TOTAL } from "@/map/plan-markers";
import { buildLocalPlan } from "@/lib/crop-engine";

const SQUARE: [number, number][] = [
  [0, 0], [1, 0], [1, 1], [0, 1], [0, 0],
];

const SMALL_RING: [number, number][] = [
  [-0.002, -0.001], [0.002, -0.001], [0.002, 0.001], [-0.002, 0.001], [-0.002, -0.001],
];

function makePlan() {
  return buildLocalPlan({
    parcelName: "T", crop: "Wheat", areaHa: 2,
    location: "Ludhiana, Punjab, India",
    coordinates: SMALL_RING,
    ndvi: null, soil: null,
    weather: { temperature: 22, humidity: 60, windSpeed: 8 },
    suitability: {
      soil_quality: 70, water_access: 75, climate: 80, topography: 85, drainage: 70, nutrient_level: 65,
      raw: { elevation_m: 250, slope_deg: 1, annual_rainfall_mm: 700, soil_organic_carbon: 12 },
    },
  });
}

describe("pointInRing", () => {
  it("contains interior points", () => {
    expect(pointInRing(0.5, 0.5, SQUARE)).toBe(true);
    expect(pointInRing(0.1, 0.9, SQUARE)).toBe(true);
  });
  it("excludes exterior points", () => {
    expect(pointInRing(1.5, 0.5, SQUARE)).toBe(false);
    expect(pointInRing(-0.1, -0.1, SQUARE)).toBe(false);
  });
  it("handles concave rings (L-shape)", () => {
    const lShape: [number, number][] = [
      [0, 0], [2, 0], [2, 1], [1, 1], [1, 2], [0, 2], [0, 0],
    ];
    expect(pointInRing(1.5, 0.5, lShape)).toBe(true);   // inside lower arm
    expect(pointInRing(1.5, 1.5, lShape)).toBe(false);   // notch
    expect(pointInRing(0.5, 1.5, lShape)).toBe(true);    // inside upper arm
  });
});

describe("ringBounds", () => {
  it("computes the bounding box", () => {
    const b = ringBounds(SMALL_RING);
    expect(b.minLng).toBe(-0.002);
    expect(b.maxLng).toBe(0.002);
    expect(b.minLat).toBe(-0.001);
    expect(b.maxLat).toBe(0.001);
  });
});

describe("buildPlanMarkers", () => {
  it("produces markers only inside the ring, capped at 800", () => {
    const plan = makePlan();
    const markers = buildPlanMarkers(SMALL_RING, plan);
    expect(markers.length).toBeGreaterThan(0);
    expect(markers.length).toBeLessThanOrEqual(MAX_GRID_MARKERS_TOTAL);
    markers.forEach((m) => {
      expect(m.lng).toBeGreaterThanOrEqual(-0.002);
      expect(m.lng).toBeLessThanOrEqual(0.002);
      expect(m.lat).toBeGreaterThanOrEqual(-0.001);
      expect(m.lat).toBeLessThanOrEqual(0.001);
    });
  });
  it("every marker references an existing zone", () => {
    const plan = makePlan();
    const markers = buildPlanMarkers(SMALL_RING, plan);
    const zoneIds = new Set(plan.zones.map((z) => z.id));
    markers.forEach((m) => expect(zoneIds.has(m.zoneId)).toBe(true));
  });
  it("is deterministic for the same seed", () => {
    const plan = makePlan();
    const a = buildPlanMarkers(SMALL_RING, plan, 7);
    const b = buildPlanMarkers(SMALL_RING, plan, 7);
    expect(a).toEqual(b);
  });
  it("zone spread roughly matches area allocation (largest zone has most markers)", () => {
    const plan = makePlan();
    const markers = buildPlanMarkers(SMALL_RING, plan);
    const counts: Record<string, number> = {};
    markers.forEach((m) => { counts[m.zoneId] = (counts[m.zoneId] ?? 0) + 1; });
    const topZone = plan.zones.reduce((best, z) => (z.areaPct > best.areaPct ? z : best), plan.zones[0]);
    const topCount = counts[topZone.id] ?? 0;
    const smallest = plan.zones.reduce((worst, z) => (z.areaPct < worst.areaPct ? z : worst), plan.zones[0]);
    expect(topCount).toBeGreaterThan(counts[smallest.id] ?? 0);
  });
});
