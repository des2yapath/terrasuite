// Edge-case detection suite — thresholds, precedence, and copy integrity.

import { describe, it, expect } from "vitest";
import { detectEdgeCase, EDGE_THRESHOLDS } from "@/lib/edge-cases";
import type { Parcel } from "@/data/parcel";

function parcel(over: Partial<Parcel>): Parcel {
  return {
    id: "fx", name: "Fixture", crop: "Wheat", cropEmoji: "🌾", areaHa: 2,
    color: "#16A34A", group: "", location: "Somewhere", ndviChange: null,
    coordinates: [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]],
    createdAt: new Date(0).toISOString(), updatedAt: new Date(0).toISOString(),
    ...over,
  } as Parcel;
}

const noLandUse = null;
const plainLandUse = { "Cropland": 60, "Grassland": 30, "Built-up": 5, "Water": 5 };
const suit = (raw: { elevation_m?: number | null; annual_rainfall_mm?: number | null }) => ({
  soil_quality: 50, water_access: 50, climate: 50, topography: 50, drainage: 50, nutrient_level: 50,
  raw: { elevation_m: raw.elevation_m ?? 100, slope_deg: 2, annual_rainfall_mm: raw.annual_rainfall_mm ?? 800, soil_organic_carbon: 10 },
});

describe("detectEdgeCase", () => {
  it("null on a normal parcel", () => {
    expect(detectEdgeCase(parcel({}), suit({}), { mean_ndvi: 0.5 }, null, plainLandUse)).toBeNull();
  });

  it("water: >=80% Water class blocks planning", () => {
    const r = detectEdgeCase(parcel({}), suit({}), null, null, { "Water": 80, "Cropland": 20 });
    expect(r?.type).toBe("water");
    expect(r?.blocksPlanning).toBe(true);
  });
  it("water: 79.9% does not trigger", () => {
    const r = detectEdgeCase(parcel({}), suit({}), null, null, { "Water": 79, "Cropland": 21 });
    expect(r).toBeNull();
  });

  it("desert: rainfall < 50 mm triggers", () => {
    const r = detectEdgeCase(parcel({}), suit({ annual_rainfall_mm: 45 }), null, null, plainLandUse);
    expect(r?.type).toBe("desert");
    expect(r?.blocksPlanning).toBe(true);
  });
  it("desert: 50 mm exactly does NOT trigger (strict <)", () => {
    expect(detectEdgeCase(parcel({}), suit({ annual_rainfall_mm: 50 }), null, null, plainLandUse)).toBeNull();
  });
  it("desert: Sahara keyword triggers even without rainfall data", () => {
    const r = detectEdgeCase(parcel({ location: "Somewhere in the Sahara" }), suit({ annual_rainfall_mm: null }), null, null, plainLandUse);
    expect(r?.type).toBe("desert");
  });

  it("polar: |lat| > 66° triggers", () => {
    const r = detectEdgeCase(parcel({ coordinates: [[20, 67], [21, 67], [21, 68], [20, 68], [20, 67]] }), suit({}), null, null, plainLandUse);
    expect(r?.type).toBe("polar");
    expect(r?.blocksPlanning).toBe(true);
  });
  it("polar: |lat| 65.9 does not trigger", () => {
    const r = detectEdgeCase(parcel({ coordinates: [[20, 65], [21, 65], [21, 66], [20, 66], [20, 65]] }), suit({}), null, null, plainLandUse);
    expect(r).toBeNull();
  });
  it("polar: Antarctica keyword triggers at any latitude", () => {
    const r = detectEdgeCase(parcel({ location: "Research Station, Antarctica" }), suit({}), null, null, plainLandUse);
    expect(r?.type).toBe("polar");
  });
  it("polar: southern hemisphere |lat| check", () => {
    const r = detectEdgeCase(parcel({ coordinates: [[0, -67], [1, -67], [1, -68], [0, -68], [0, -67]] }), suit({}), null, null, plainLandUse);
    expect(r?.type).toBe("polar");
  });

  it("altitude: > 5000 m triggers", () => {
    const r = detectEdgeCase(parcel({}), suit({ elevation_m: 5200 }), null, null, plainLandUse);
    expect(r?.type).toBe("altitude");
    expect(r?.blocksPlanning).toBe(true);
  });
  it("altitude: exactly 5000 m does NOT trigger (strict >)", () => {
    expect(detectEdgeCase(parcel({}), suit({ elevation_m: 5000 }), null, null, plainLandUse)).toBeNull();
  });

  it("urban: Built-up >= 30% reported but non-blocking", () => {
    const r = detectEdgeCase(parcel({}), suit({}), null, null, { "Built-up": 30, "Cropland": 40, "Grassland": 30 });
    expect(r?.type).toBe("urban");
    expect(r?.blocksPlanning).toBe(false);
  });
  it("urban: Built-up 29% does not trigger", () => {
    expect(detectEdgeCase(parcel({}), suit({}), null, null, { "Built-up": 29, "Cropland": 71 })).toBeNull();
  });

  it("precedence: polar beats altitude beats water beats desert", () => {
    // polar + altitude + water + desert signals all present
    const r = detectEdgeCase(
      parcel({ location: "Antarctica", coordinates: [[0, -70], [1, -70], [1, -71], [0, -71], [0, -70]] }),
      suit({ elevation_m: 5200, annual_rainfall_mm: 20 }),
      null, null,
      { "Water": 90, "Built-up": 40 },
    );
    expect(r?.type).toBe("polar");
  });
  it("precedence: altitude beats water when not polar", () => {
    const r = detectEdgeCase(parcel({}), suit({ elevation_m: 5400, annual_rainfall_mm: 30 }), null, null, { "Water": 85 });
    expect(r?.type).toBe("altitude");
  });
  it("precedence: water beats desert", () => {
    const r = detectEdgeCase(parcel({}), suit({ annual_rainfall_mm: 30 }), null, null, { "Water": 82 });
    expect(r?.type).toBe("water");
  });

  it("null streams never crash — all-null inputs return null", () => {
    expect(detectEdgeCase(parcel({ location: "Countryside" }), null, null, null, null)).toBeNull();
  });

  it("thresholds are the pinned constants", () => {
    expect(EDGE_THRESHOLDS.WATER_PCT).toBe(80);
    expect(EDGE_THRESHOLDS.DESERT_RAINFALL_MM).toBe(50);
    expect(EDGE_THRESHOLDS.POLAR_ABS_LAT).toBe(66);
    expect(EDGE_THRESHOLDS.ALTITUDE_M).toBe(5000);
    expect(EDGE_THRESHOLDS.URBAN_BUILT_UP_PCT).toBe(30);
  });
});
