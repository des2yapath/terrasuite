import { describe, it, expect } from "vitest";
import { haToAcres, acresToHa, parcelCenter, parcelBounds, estimateAreaHa } from "@/data/parcel";
import type { Parcel } from "@/data/parcel";

const square: Parcel = {
  id: "t1",
  name: "Test",
  area: 1,
  crop: "Wheat",
  location: "Testville",
  color: "#7BC75B",
  coordinates: [
    [
      [0, 0],
      [0.01, 0],
      [0.01, 0.01],
      [0, 0.01],
      [0, 0],
    ],
  ],
};

describe("haToAcres", () => {
  it("converts 1 ha to ~2.5 acres", () => expect(haToAcres(1)).toBe(2.5));
  it("converts 0 ha to 0 acres", () => expect(haToAcres(0)).toBe(0));
  it("rounds to one decimal", () => expect(haToAcres(10)).toBe(24.7));
  it("handles fractional input", () => expect(haToAcres(0.5)).toBe(1.2));
});

describe("acresToHa", () => {
  it("round-trips within rounding error", () => {
    expect(acresToHa(haToAcres(3))).toBeCloseTo(3, 0);
  });
});

describe("parcelCenter", () => {
  it("returns vertex mean of outer ring", () => {
    const c = parcelCenter(square);
    expect(c.lat).toBeCloseTo(0.005, 5);
    expect(c.lng).toBeCloseTo(0.005, 5);
  });
});

describe("parcelBounds", () => {
  it("computes bbox of outer ring", () => {
    const b = parcelBounds(square);
    expect(b.minLng).toBe(0);
    expect(b.maxLng).toBeCloseTo(0.01, 10);
    expect(b.minLat).toBe(0);
    expect(b.maxLat).toBeCloseTo(0.01, 10);
  });
});

describe("estimateAreaHa", () => {
  it("returns 0 for < 3 points", () => {
    expect(estimateAreaHa([[0, 0], [1, 1]])).toBe(0);
  });
  it("approximates a ~1.21 km square (121 ha) near the equator", () => {
    // 0.01 deg ≈ 1.113 km at the equator → ~1.239 km² ≈ 124 ha
    const ha = estimateAreaHa(square.coordinates[0]);
    expect(ha).toBeGreaterThan(100);
    expect(ha).toBeLessThan(130);
  });
});
