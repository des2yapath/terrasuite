// ParcelCard SVG polygon normalization tests.
import { describe, it, expect } from "vitest";
import { polygonPoints } from "@/lib/parcel-geometry";

describe("polygonPoints", () => {
  it("returns the fallback shape for fewer than three vertices", () => {
    expect(polygonPoints([])).toBe("10,30 20,8 35,25 25,35");
    expect(polygonPoints([[[0, 0], [1, 1]]])).toBe("10,30 20,8 35,25 25,35");
  });

  it("normalizes a square ring into the 4..36 viewbox box", () => {
    expect(polygonPoints([[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]]))
      .toBe("4.0,36.0 36.0,36.0 36.0,4.0 4.0,4.0");
  });

  it("treats closed and open square rings equivalently", () => {
    const closed = polygonPoints([[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]]);
    const open = polygonPoints([[[0, 0], [10, 0], [10, 10], [0, 10]]]);
    expect(closed).toBe(open);
  });

  it("normalizes a closed triangle to three rendered vertices", () => {
    expect(polygonPoints([[[0, 0], [10, 0], [0, 10], [0, 0]]]).split(" ")).toHaveLength(3);
  });

  it("inverts latitude so north renders higher in the SVG", () => {
    const points = polygonPoints([[[0, 0], [0, 20], [1, 10]]]).split(" ");
    expect(points[0]).toBe("4.0,36.0");
    expect(points[1]).toBe("4.0,4.0");
  });

  it("preserves aspect-ratio positions for a tall thin ring", () => {
    expect(polygonPoints([[[0, 0], [1, 0], [1, 10], [0, 10]]]))
      .toBe("4.0,36.0 36.0,36.0 36.0,4.0 4.0,4.0");
  });

  it("handles a degenerate axis without NaN or Infinity", () => {
    const points = polygonPoints([[[5, 0], [5, 5], [6, 5]]]);
    expect(points).not.toMatch(/NaN|Infinity/);
    expect(points.split(" ")).toHaveLength(3);
  });

  it("uses one decimal place", () => {
    expect(polygonPoints([[[0.123456, 0.654321], [1.987, 2.321], [3.14159, 0.5]]]))
      .toMatch(/^\d+\.\d,\d+\.\d( \d+\.\d,\d+\.\d)*$/);
  });

  it("handles real-world and negative coordinates", () => {
    expect(polygonPoints([[[75.85, 30.90], [75.87, 30.90], [75.87, 30.92], [75.85, 30.92], [75.85, 30.90]]]))
      .toBe("4.0,36.0 36.0,36.0 36.0,4.0 4.0,4.0");
    expect(polygonPoints([[[-93.62, 42.03], [-93.60, 42.03], [-93.60, 42.05], [-93.62, 42.05], [-93.62, 42.03]]]))
      .toBe("4.0,36.0 36.0,36.0 36.0,4.0 4.0,4.0");
  });
});
