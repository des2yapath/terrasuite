import { describe, it, expect } from "vitest";
import { isUrbanParcel, getAqiLabel, ndviColor, ndviLabel, waterStressLabel } from "@/lib/analytics";

describe("isUrbanParcel", () => {
  it("urban crop value forces urban mode", () => {
    expect(isUrbanParcel("Residential", null)).toBe(true);
    expect(isUrbanParcel("Rooftop / Terrace", { Cropland: 90 })).toBe(true);
  });
  it(">= 30% built-up triggers urban even for a rural crop", () => {
    expect(isUrbanParcel("Wheat", { "Built-up": 30, Cropland: 65 })).toBe(true);
    expect(isUrbanParcel("Wheat", { "Built-up": 29.9, Cropland: 65 })).toBe(false);
  });
  it("null land use with rural crop stays rural", () => {
    expect(isUrbanParcel("Wheat", null)).toBe(false);
  });
});

describe("getAqiLabel", () => {
  it("bands EU AQI correctly", () => {
    expect(getAqiLabel(15).label).toBe("Good");
    expect(getAqiLabel(20).label).toBe("Good");
    expect(getAqiLabel(21).label).toBe("Fair");
    expect(getAqiLabel(60).label).toBe("Moderate");
    expect(getAqiLabel(81).label).toBe("Very Poor");
    expect(getAqiLabel(150).label).toBe("Hazardous");
  });
});

describe("ndvi thresholds", () => {
  it("colors follow the four bands", () => {
    expect(ndviColor(0.1)).toBe("#d73027");
    expect(ndviColor(0.3)).toBe("#fee08b");
    expect(ndviColor(0.5)).toBe("#66bd63");
    expect(ndviColor(0.8)).toBe("#1a9850");
  });
  it("labels match colors", () => {
    expect(ndviLabel(0.1)).toBe("Critical");
    expect(ndviLabel(0.25)).toBe("Stressed");
    expect(ndviLabel(0.45)).toBe("Moderate");
    expect(ndviLabel(0.7)).toBe("Healthy");
  });
});

describe("waterStressLabel", () => {
  it("null moisture → checking state", () => {
    expect(waterStressLabel(null).label).toBe("Checking…");
  });
  it("bands: <15 high stress, <25 moderate, >45 over-irrigated, else adequate", () => {
    expect(waterStressLabel(10).label).toBe("High Stress");
    expect(waterStressLabel(20).label).toBe("Moderate");
    expect(waterStressLabel(50).label).toBe("Over-irrigated");
    expect(waterStressLabel(30).label).toBe("Adequate");
  });
});
