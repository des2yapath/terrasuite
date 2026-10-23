import { describe, it, expect, beforeEach } from "vitest";
import {
  getLocalCache,
  setLocalCache,
  getFreshLocalCacheValue,
  isFallbackPayload,
  hasGeeAnalyticsPayload,
  hasSoilPayload,
  hasNdviPayload,
} from "@/lib/query-cache";

describe("local cache", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns empty object when key missing", () => {
    expect(getLocalCache("nope")).toEqual({});
  });

  it("round-trips a value and stays fresh within TTL", () => {
    setLocalCache("k", "id1", { a: 1 });
    const v = getFreshLocalCacheValue<{ a: number }>("k", "id1", 60_000);
    expect(v).toEqual({ a: 1 });
  });

  it("returns null when entry is older than TTL", () => {
    const realNow = Date.now;
    setLocalCache("k", "id1", { a: 1 });
    Date.now = () => realNow() + 61_000; // simulate time passing
    try {
      expect(getFreshLocalCacheValue("k", "id1", 60_000)).toBeNull();
    } finally {
      Date.now = realNow;
    }
  });

  it("returns null for unknown id", () => {
    setLocalCache("k", "id1", { a: 1 });
    expect(getFreshLocalCacheValue("k", "other", 60_000)).toBeNull();
  });

  it("tolerates corrupted JSON", () => {
    localStorage.setItem("bad", "{not json");
    expect(getLocalCache("bad")).toEqual({});
    expect(getFreshLocalCacheValue("bad", "x", 1000)).toBeNull();
  });
});

describe("isFallbackPayload", () => {
  it("matches { fallback: true }", () => {
    expect(isFallbackPayload({ fallback: true })).toBe(true);
    expect(isFallbackPayload({ fallback: true, error: "RATE_LIMITED" })).toBe(true);
  });
  it("rejects real payloads and primitives", () => {
    expect(isFallbackPayload(null)).toBe(false);
    expect(isFallbackPayload({ mean_ndvi: 0.4 })).toBe(false);
    expect(isFallbackPayload("fallback")).toBe(false);
  });
});

describe("hasGeeAnalyticsPayload", () => {
  it("matches any analysis section", () => {
    expect(hasGeeAnalyticsPayload({ land_use: { Cropland: 90 } })).toBe(true);
    expect(hasGeeAnalyticsPayload({ vegetation: { mean_ndvi: 0.5 } })).toBe(true);
    expect(hasGeeAnalyticsPayload({ suitability: { water_access: 70 } })).toBe(true);
    expect(hasGeeAnalyticsPayload({ growth_stage: "Heading" })).toBe(true);
  });
  it("rejects empty, fallback, and foreign objects", () => {
    expect(hasGeeAnalyticsPayload(null)).toBe(false);
    expect(hasGeeAnalyticsPayload({})).toBe(false);
    expect(hasGeeAnalyticsPayload({ fallback: true })).toBe(false);
    expect(hasGeeAnalyticsPayload({ unrelated: 1 })).toBe(false);
  });
});

describe("hasSoilPayload", () => {
  const ok = {
    classification: { soil_class: "Cambisol" },
    metrics: { ph: 6.5 },
    texture: { sand_pct: 40 },
    water_retention: { field_capacity_pct: 22 },
  };
  it("requires all four sections", () => {
    expect(hasSoilPayload(ok)).toBe(true);
    expect(hasSoilPayload({ ...ok, classification: undefined })).toBe(false);
    expect(hasSoilPayload({ fallback: true })).toBe(false);
  });
});

describe("hasNdviPayload", () => {
  it("matches stats object or timeseries array", () => {
    expect(hasNdviPayload({ mean_ndvi: 0.55 })).toBe(true);
    expect(hasNdviPayload({ timeseries: [] })).toBe(true);
  });
  it("rejects fallback and others", () => {
    expect(hasNdviPayload({ fallback: true })).toBe(false);
    expect(hasNdviPayload({ mean_ndvi: "0.55" })).toBe(false);
  });
});
