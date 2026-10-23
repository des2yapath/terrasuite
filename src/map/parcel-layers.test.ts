import { describe, it, expect } from "vitest";
import {
  parcelLayerIds,
  parcelToFeature,
  ringToFeature,
  pointsToFeatureCollection,
} from "@/map/parcel-layers";
import type { Parcel } from "@/data/parcel";

const parcel: Parcel = {
  id: "c-1",
  name: "Alpha",
  area: 2.5,
  crop: "Wheat",
  location: "Murcia, Spain",
  color: "#E5C07B",
  coordinates: [[[0, 0], [0.01, 0], [0.01, 0.01], [0, 0.01], [0, 0]]],
};

describe("parcelLayerIds", () => {
  it("derives stable ids", () => {
    const ids = parcelLayerIds("c-1");
    expect(ids).toEqual({
      sourceId: "parcel-c-1",
      fillId: "parcel-fill-c-1",
      lineId: "parcel-line-c-1",
    });
  });
});

describe("parcelToFeature", () => {
  it("produces a GeoJSON Feature with the parcel id in properties", () => {
    const f = parcelToFeature(parcel);
    expect(f.type).toBe("Feature");
    expect(f.properties).toEqual({ parcelId: "c-1" });
    expect(f.geometry).toEqual({
      type: "Polygon",
      coordinates: parcel.coordinates,
    });
  });
});

describe("ringToFeature", () => {
  it("wraps a single ring into a Polygon feature", () => {
    const ring: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 0]];
    const f = ringToFeature("x", ring);
    expect((f.geometry as { coordinates: number[][][] }).coordinates).toEqual([ring]);
    expect(f.properties).toEqual({ parcelId: "x" });
  });
});

describe("pointsToFeatureCollection", () => {
  it("maps each vertex to a Point feature", () => {
    const fc = pointsToFeatureCollection([[0, 0], [1, 2]]);
    expect(fc.type).toBe("FeatureCollection");
    expect(fc.features).toHaveLength(2);
    expect(fc.features[0].geometry).toEqual({ type: "Point", coordinates: [0, 0] });
  });
});
