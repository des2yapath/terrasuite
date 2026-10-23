// Validation fixtures — 5 reference parcels across known agro-regions.
//
// Each fixture pins a parcel-shaped EngineInput plus the reference values
// (expected outputs) taken from published sources (FAO GAEZ v4 and the
// papers cited in RESEARCH-PAPERS.md). The runner (validation.ts) executes
// the SAME pinned formulas the production engine uses and compares.
//
// IMPORTANT — what each fixture field means:
//   input:         a full EngineInput (fed to buildLocalPlan + the GEE
//                  suitability formulas re-implemented client-side)
//   reference:     expected values from the literature
//   expected:      what TerraSuite's engine SHOULD produce (derived from
//                  reference via the pinned formulas — honest math, not
//                  wishful thinking; see validation.ts for the tolerances)
//
// Sources (cite in the report's evaluation chapter):
//   [FAO GAEZ v4] FAO & IIASA, Global Agro-Ecological Zones v4 data portal
//       https://gaez.fao.org — crop-specific climate-rainfall envelopes.
//   [Peter 2020] Peter, Messina, Lin & Snapp, Scientific Reports 10:15487
//       — GEE suitability-mapping structure (our scores mirror its axes).
//   [AbdelRahman 2025] Sci Rep 15:31370 — AHP/GIS land-suitability
//       vocabulary (S1–N) that our class bands map onto.

import type { EngineInput } from "@/lib/crop-engine";
import type { SoilData } from "@/hooks/useParcelData";

export interface ValidationFixture {
  id: string;
  name: string;
  region: string;           // human-readable agro-region
  sourceNote: string;       // where the reference values come from
  input: EngineInput;
  reference: {
    /** Dominant/indicator crop the literature says is grown or suitable. */
    expectedTopCrop: string;
    /** Annual precipitation mm/yr — long-term station or CHIRPS climatology. */
    annualRainfallMm: number;
    /** Mean growing-season temperature °C. */
    meanTempC: number;
    /** Typical surface soil pH. */
    soilPh: number;
    /** Expected FAO-style suitability class for the dominant crop. */
    suitabilityClass: "S1" | "S2" | "S3" | "N"; // highly/moderately/marginally/not suitable
  };
  expected: {
    /** The engine's top-ranked crop should be this (or in expectedTop3). */
    topCrop: string;
    /** Water-access score band the rainfall must produce (pinned formula). */
    waterAccessBand: [number, number];
    /** Health-score band for the given mean NDVI (pinned mean/0.8×100). */
    healthScoreBand: [number, number];
  };
}

/* ── Shared fixture helpers (soil blocks match SoilGrids-shaped SoilData) ── */

function soilShape(ph: number, soc: number, usdaClass: string): SoilData {
  return {
    classification: { soil_class: "Cambisol", wrb_name: "Cambisol", icon: "🌱", description: "fixture", color: "#8B6F47" },
    metrics: {
      ph, ph_rating: "fixture",
      soc_g_per_kg: soc, soc_rating: "fixture",
      bulk_density: 1.3,
      nitrogen_g_per_kg: Math.round(soc * 0.08 * 10) / 10,
      nitrogen_rating: "fixture",
      cec: 18,
      coarse_fragments_pct: 5,
    },
    texture: { sand_pct: 40, silt_pct: 40, clay_pct: 20, usda_class: usdaClass },
    water_retention: { field_capacity_pct: 28, wilting_point_pct: 15, available_water_pct: 13 },
  };
}

/* ── The five fixtures ── */

export const VALIDATION_FIXTURES: ValidationFixture[] = [
  {
    id: "fx-punjab-wheat",
    name: "Indo-Gangetic Wheat Belt (Ludhiana)",
    region: "Indo-Gangetic Plain, Punjab, India",
    sourceNote: "FAO GAEZ v4: wheat highly suitable (S1) on the Punjab plain; ~700 mm/yr rainfall (monsoon-weighted); pH 6.5–7.5 loamy Cambisols.",
    input: {
      parcelName: "Punjab Validation Parcel",
      crop: "Wheat",
      areaHa: 4,
      location: "Ludhiana, Punjab, India",
      coordinates: [[75.85, 30.90], [75.87, 30.90], [75.87, 30.92], [75.85, 30.92], [75.85, 30.90]],
      ndvi: { mean_ndvi: 0.52, min_ndvi: 0.31, max_ndvi: 0.71, vegetation_health_score: 65 },
      soil: soilShape(7.0, 8.5, "Loam"),
      weather: { temperature: 21, humidity: 62, windSpeed: 7 },
      suitability: {
        soil_quality: 17, water_access: 88, climate: 89, topography: 96, drainage: 88, nutrient_level: 19,
        raw: { elevation_m: 244, slope_deg: 0.8, annual_rainfall_mm: 730, soil_organic_carbon: 8.5 },
      },
    },
    reference: { expectedTopCrop: "Wheat", annualRainfallMm: 730, meanTempC: 21, soilPh: 7.0, suitabilityClass: "S1" },
    expected: { topCrop: "Wheat", waterAccessBand: [85, 92], healthScoreBand: [63, 67] },
  },
  {
    id: "fx-andalusia-olive",
    name: "Andalusian Olive Groves (Jaén)",
    region: "Mediterranean Basin, Jaén, Spain",
    sourceNote: "FAO GAEZ v4 /(IOOC 2024 production survey): olive optimal zone; ~550 mm/yr; pH 7.5–8.0 calcareous Xerolls; hot dry summers.",
    input: {
      parcelName: "Jaén Validation Parcel",
      crop: "Olive",
      areaHa: 12,
      location: "Jaén, Andalusia, Spain",
      coordinates: [[-3.79, 37.77], [-3.77, 37.77], [-3.77, 37.79], [-3.79, 37.79], [-3.79, 37.77]],
      ndvi: { mean_ndvi: 0.48, min_ndvi: 0.30, max_ndvi: 0.62, vegetation_health_score: 60 },
      soil: soilShape(7.7, 12, "Clay Loam"),
      weather: { temperature: 24, humidity: 48, windSpeed: 9 },
      suitability: {
        soil_quality: 24, water_access: 64, climate: 68, topography: 82, drainage: 79, nutrient_level: 26,
        raw: { elevation_m: 573, slope_deg: 3.6, annual_rainfall_mm: 550, soil_organic_carbon: 12 },
      },
    },
    reference: { expectedTopCrop: "Olive", annualRainfallMm: 550, meanTempC: 24, soilPh: 7.7, suitabilityClass: "S1" },
    expected: { topCrop: "Olive", waterAccessBand: [61, 68], healthScoreBand: [58, 62] },
  },
  {
    id: "fx-cornbelt-maize",
    name: "US Corn Belt (Iowa)",
    region: "Temperate Corn Belt, Iowa, USA",
    sourceNote: "USDA NASS + FAO GAEZ v4: maize S1 in central Iowa; ~900 mm/yr; pH 6.0–6.8 Mollisols; 20–25 °C growing season.",
    input: {
      parcelName: "Iowa Validation Parcel",
      crop: "Maize",
      areaHa: 40,
      location: "Ames, Iowa, Midwest, USA",
      coordinates: [[-93.62, 42.03], [-93.60, 42.03], [-93.60, 42.05], [-93.62, 42.05], [-93.62, 42.03]],
      ndvi: { mean_ndvi: 0.72, min_ndvi: 0.48, max_ndvi: 0.88, vegetation_health_score: 90 },
      soil: soilShape(6.3, 28, "Silt Loam"),
      weather: { temperature: 23, humidity: 68, windSpeed: 12 },
      suitability: {
        soil_quality: 56, water_access: 95, climate: 96, topography: 97, drainage: 87, nutrient_level: 62,
        raw: { elevation_m: 288, slope_deg: 0.6, annual_rainfall_mm: 910, soil_organic_carbon: 28 },
      },
    },
    reference: { expectedTopCrop: "Maize", annualRainfallMm: 910, meanTempC: 23, soilPh: 6.3, suitabilityClass: "S1" },
    expected: { topCrop: "Maize", waterAccessBand: [92, 99], healthScoreBand: [88, 92] },
  },
  {
    id: "fx-sahel-sorghum",
    name: "Semi-Arid Sahel (Niger)",
    region: "Sahelian Semi-Arid Zone, Niger",
    sourceNote: "ICRISAT Sahel reports + FAO GAEZ v4: pearl millet/sorghum S2–S3; ~450 mm/yr monsoonal; pH 5.5–6.5 sandy Arenosols; 28–32 °C.",
    input: {
      parcelName: "Niamey Validation Parcel",
      crop: "Sorghum",
      areaHa: 6,
      location: "Niamey, Niger, Sahel",
      coordinates: [[2.11, 13.51], [2.13, 13.51], [2.13, 13.53], [2.11, 13.53], [2.11, 13.51]],
      ndvi: { mean_ndvi: 0.22, min_ndvi: 0.08, max_ndvi: 0.41, vegetation_health_score: 28 },
      soil: soilShape(6.0, 4, "Sand"),
      weather: { temperature: 31, humidity: 38, windSpeed: 14 },
      suitability: {
        soil_quality: 8, water_access: 52, climate: 57, topography: 94, drainage: 67, nutrient_level: 9,
        raw: { elevation_m: 208, slope_deg: 1.2, annual_rainfall_mm: 450, soil_organic_carbon: 4 },
      },
    },
    reference: { expectedTopCrop: "Sorghum", annualRainfallMm: 450, meanTempC: 31, soilPh: 6.0, suitabilityClass: "S2" },
    expected: { topCrop: "Sorghum", waterAccessBand: [49, 56], healthScoreBand: [26, 30] },
  },
  {
    id: "fx-kerala-coconut",
    name: "Malabar Coast Plantation Belt (Kochi)",
    region: "Tropical Malabar Coast, Kerala, India",
    sourceNote: "CPCRI Kasaragod surveys + FAO GAEZ v4: coconut S1 on the Malabar coast; ~3000 mm/yr; pH 5.5–6.5 lateritic Ultisols; 26–30 °C humid.",
    input: {
      parcelName: "Kochi Validation Parcel",
      crop: "Coconut",
      areaHa: 3,
      location: "Kochi, Kerala, India",
      coordinates: [[76.26, 9.94], [76.28, 9.94], [76.28, 9.96], [76.26, 9.96], [76.26, 9.94]],
      ndvi: { mean_ndvi: 0.66, min_ndvi: 0.45, max_ndvi: 0.83, vegetation_health_score: 82 },
      soil: soilShape(5.8, 14, "Sandy Clay Loam"),
      weather: { temperature: 28, humidity: 82, windSpeed: 8 },
      suitability: {
        soil_quality: 28, water_access: 34, climate: 41, topography: 95, drainage: 74, nutrient_level: 31,
        raw: { elevation_m: 8, slope_deg: 1.0, annual_rainfall_mm: 3000, soil_organic_carbon: 14 },
      },
    },
    reference: { expectedTopCrop: "Coconut", annualRainfallMm: 3000, meanTempC: 28, soilPh: 5.8, suitabilityClass: "S1" },
    // NOTE: water_access formula intentionally penalizes >1500 mm (runoff/
    // leaching) — the Kerala fixture demonstrates that the pinned formula
    // still yields a *plantable* (if imperfect) score for a high-rainfall S1
    // region. Report this honestly: formula agreement ≠ ground truth.
    expected: { topCrop: "Coconut", waterAccessBand: [30, 37], healthScoreBand: [80, 84] },
  },
];

/** FAO-style class bands → numeric suitability class for score mapping. */
export function scoreToClass(score: number): "VS" | "S" | "MS" | "N" {
  if (score >= 75) return "VS";
  if (score >= 50) return "S";
  if (score >= 25) return "MS";
  return "N";
}
