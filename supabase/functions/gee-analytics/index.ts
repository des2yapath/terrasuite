// Edge function: gee-analytics
// Multi-analysis in one call: land_use (ESA WorldCover), vegetation
// (median-composite NDVI + EVI + canopy + biomass), suitability (SRTM +
// CHIRPS + OpenLandMap SOC), growth_stage (latest-scene NDVI mapping).
// Requested analyses run in PARALLEL; 6h in-memory cache keyed by
// (rounded coords, sorted analyses).
//
// Request:  { polygon: ring | GeoJSON Polygon, analyses: string[] }
// Response: { land_use?, vegetation?, suitability?, growth_stage?, cached? }
// Failure:   { land_use: null, ..., fallback: true, message } with HTTP 200
//            (client retries via invokeWithRetry).

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  corsOptions, jsonResponse, validatePolygon, extractRing,
  getGeeAccessToken, getProjectId, computeValue,
  makeGeometry, reduceRegion, clip,
  type GeeExpression, type LngLat,
} from "../_shared/gee.ts";

const ANALYTICS_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const analyticsCache = new Map<string, { data: Record<string, unknown>; expiresAt: number }>();

function buildCacheKey(coords: LngLat[], analyses: string[]): string {
  const normalized = coords.map(([lon, lat]) => [Number(lon.toFixed(5)), Number(lat.toFixed(5))]);
  return JSON.stringify({ coords: normalized, analyses: [...analyses].sort() });
}

function getCached(key: string, allowStale = false): Record<string, unknown> | null {
  const c = analyticsCache.get(key);
  if (!c) return null;
  if (!allowStale && c.expiresAt < Date.now()) return null;
  return c.data;
}

function setCached(key: string, data: Record<string, unknown>): void {
  analyticsCache.set(key, { data, expiresAt: Date.now() + ANALYTICS_CACHE_TTL_MS });
}

/* ── Land use: ESA WorldCover v200 frequency histogram → % per class ── */

const WORLDCOVER_CLASSES: Record<string, string> = {
  "10": "Tree cover", "20": "Shrubland", "30": "Grassland", "40": "Cropland",
  "50": "Built-up", "60": "Bare/sparse", "70": "Snow/ice", "80": "Water",
  "90": "Wetland", "95": "Mangroves", "100": "Moss/lichen",
};

async function computeLandUse(token: string, projectId: string, coords: LngLat[]) {
  const geometry = makeGeometry(coords);
  const collection: GeeExpression = {
    functionInvocationValue: {
      functionName: "ImageCollection.load",
      arguments: { id: { constantValue: "ESA/WorldCover/v200" } },
    },
  };
  const image: GeeExpression = {
    functionInvocationValue: { functionName: "ImageCollection.mosaic", arguments: { collection } },
  };
  const clipped = clip(image, geometry);
  const histResult = await computeValue(token, projectId, reduceRegion(clipped, geometry, "Reducer.frequencyHistogram", 10));

  const hist = (histResult as { result?: { Map?: Record<string, number>; map?: Record<string, number> } })
    .result?.Map ?? (histResult as { result?: { map?: Record<string, number> } }).result?.map ?? {};
  let total = 0;
  const counts: Record<string, number> = {};
  for (const [classCode, count] of Object.entries(hist)) {
    const n = Number(count);
    total += n;
    const name = WORLDCOVER_CLASSES[classCode] ?? `Class ${classCode}`;
    counts[name] = (counts[name] ?? 0) + n;
  }
  if (total === 0) return null;
  const landUse: Record<string, number> = {};
  for (const [name, count] of Object.entries(counts)) {
    landUse[name] = Math.round((count / total) * 1000) / 10;
  }
  return landUse;
}

/* ── Vegetation: 60-day median composite → NDVI/EVI/canopy/biomass ── */

async function computeVegetationIndices(token: string, projectId: string, coords: LngLat[]) {
  const geometry = makeGeometry(coords);
  const now = new Date();
  const endDate = now.toISOString().split("T")[0];
  const startDate = new Date(now.getTime() - 60 * 24 * 3600 * 1000).toISOString().split("T")[0];

  // date + bounds + cloud filters (inline — _shared's s2Filtered is reused by
  // other functions; here we build explicitly to stay self-explanatory)
  const collection: GeeExpression = {
    functionInvocationValue: { functionName: "ImageCollection.load", arguments: { id: { constantValue: "COPERNICUS/S2_SR" } } },
  };
  const dateFiltered: GeeExpression = {
    functionInvocationValue: {
      functionName: "Collection.filter",
      arguments: {
        collection,
        filter: {
          functionInvocationValue: {
            functionName: "Filter.dateRangeContains",
            arguments: {
              leftValue: { functionInvocationValue: { functionName: "DateRange", arguments: { start: { constantValue: startDate }, end: { constantValue: endDate } } } },
              rightField: { constantValue: "system:time_start" },
            },
          },
        },
      },
    },
  };
  const boundsFiltered: GeeExpression = {
    functionInvocationValue: {
      functionName: "Collection.filter",
      arguments: {
        collection: dateFiltered,
        filter: { functionInvocationValue: { functionName: "Filter.intersects", arguments: { leftField: { constantValue: ".geo" }, rightValue: geometry } } },
      },
    },
  };
  const cloudFiltered: GeeExpression = {
    functionInvocationValue: {
      functionName: "Collection.filter",
      arguments: {
        collection: boundsFiltered,
        filter: { functionInvocationValue: { functionName: "Filter.lessThan", arguments: { leftField: { constantValue: "CLOUDY_PIXEL_PERCENTAGE" }, rightValue: { constantValue: 20 } } } },
      },
    },
  };
  const image: GeeExpression = {
    functionInvocationValue: {
      functionName: "ImageCollection.reduce",
      arguments: { collection: cloudFiltered, reducer: { functionInvocationValue: { functionName: "Reducer.median", arguments: {} } } },
    },
  };

  // NDVI from median-composite band names (B8_median / B4_median)
  const ndvi: GeeExpression = {
    functionInvocationValue: {
      functionName: "Image.normalizedDifference",
      arguments: { input: image, bandNames: { constantValue: ["B8_median", "B4_median"] } },
    },
  };
  const ndviClipped = clip(ndvi, geometry);

  // Canopy cover: fraction of pixels with NDVI > 0.5 (mean of a gt-mask)
  const ndviGt: GeeExpression = {
    functionInvocationValue: {
      functionName: "Image.gt",
      arguments: {
        image1: ndviClipped,
        image2: { functionInvocationValue: { functionName: "Image.constant", arguments: { value: { constantValue: 0.5 } } } },
      },
    },
  };

  const [ndviMean, canopyMean] = await Promise.all([
    computeValue(token, projectId, reduceRegion(ndviClipped, geometry, "Reducer.mean")),
    computeValue(token, projectId, reduceRegion(ndviGt, geometry, "Reducer.mean")),
  ]);

  const meanNdvi = (ndviMean as { result?: { nd?: number } }).result?.nd ?? null;
  const canopyCover = (canopyMean as { result?: { nd?: number } }).result?.nd ?? null;
  if (meanNdvi === null) return null;

  return {
    mean_ndvi: Math.round(meanNdvi * 1000) / 1000,
    canopy_cover_pct: canopyCover !== null ? Math.round(canopyCover * 100) : null,
    // Empirical biomass proxy (kg/ha): NDVI-scaled — document as a rough
    // indicator, not a biophysical product, in the report.
    biomass_estimate_kg_ha: Math.round(Math.max(0, meanNdvi * 12000 - 1000)),
    date_range: `${startDate} to ${endDate}`,
  };
}

/* ── Suitability: SRTM elevation/slope + CHIRPS 365-day rainfall + SOC ── */

async function computeLandSuitability(token: string, projectId: string, coords: LngLat[]) {
  const geometry = makeGeometry(coords);
  const now = new Date();
  const endDate = now.toISOString().split("T")[0];
  const startDate = new Date(now.getTime() - 365 * 24 * 3600 * 1000).toISOString().split("T")[0];

  const srtm: GeeExpression = {
    functionInvocationValue: { functionName: "Image.load", arguments: { id: { constantValue: "USGS/SRTMGL1_003" } } },
  };
  const srtmClipped = clip(srtm, geometry);
  const slope: GeeExpression = {
    functionInvocationValue: { functionName: "Terrain.slope", arguments: { input: srtmClipped } },
  };

  const chirps: GeeExpression = {
    functionInvocationValue: { functionName: "ImageCollection.load", arguments: { id: { constantValue: "UCSB-CHG/CHIRPS/DAILY" } } },
  };
  const chirpsDateFiltered: GeeExpression = {
    functionInvocationValue: {
      functionName: "Collection.filter",
      arguments: {
        collection: chirps,
        filter: {
          functionInvocationValue: {
            functionName: "Filter.dateRangeContains",
            arguments: {
              leftValue: { functionInvocationValue: { functionName: "DateRange", arguments: { start: { constantValue: startDate }, end: { constantValue: endDate } } } },
              rightField: { constantValue: "system:time_start" },
            },
          },
        },
      },
    },
  };
  const totalRainfall: GeeExpression = {
    functionInvocationValue: {
      functionName: "ImageCollection.reduce",
      arguments: { collection: chirpsDateFiltered, reducer: { functionInvocationValue: { functionName: "Reducer.sum", arguments: {} } } },
    },
  };
  const rainfallClipped = clip(totalRainfall, geometry);

  const soilOC: GeeExpression = {
    functionInvocationValue: {
      functionName: "Image.load",
      arguments: { id: { constantValue: "OpenLandMap/SOL/SOL_ORGANIC-CARBON_USDA-6A1C_M/v02" } },
    },
  };
  const soilOCSurface: GeeExpression = {
    functionInvocationValue: {
      functionName: "Image.select",
      arguments: { input: clip(soilOC, geometry), bandSelectors: { constantValue: ["b0"] } },
    },
  };

  const [elevResult, slopeResult, rainfallResult, soilResult] = await Promise.all([
    computeValue(token, projectId, reduceRegion(srtmClipped, geometry, "Reducer.mean", 30)),
    computeValue(token, projectId, reduceRegion(slope, geometry, "Reducer.mean", 30)),
    computeValue(token, projectId, reduceRegion(rainfallClipped, geometry, "Reducer.mean", 5000)),
    computeValue(token, projectId, reduceRegion(soilOCSurface, geometry, "Reducer.mean", 250)),
  ]);

  const elevation = (elevResult as { result?: { elevation?: number } }).result?.elevation ?? null;
  const slopeVal = (slopeResult as { result?: { slope?: number } }).result?.slope ?? null;
  const rainfall = (rainfallResult as { result?: { precipitation_sum?: number } }).result?.precipitation_sum ?? null;
  const soilOCVal = (soilResult as { result?: { b0?: number } }).result?.b0 ?? null;

  // Score formulas — pin these exactly (validation module checks against them)
  const topography = slopeVal !== null ? Math.max(0, Math.round(100 - slopeVal * 5)) : null;

  let water_access: number | null = null;
  if (rainfall !== null) {
    if (rainfall >= 600 && rainfall <= 1500) water_access = Math.round(80 + 20 * (1 - Math.abs(rainfall - 1000) / 500));
    else if (rainfall < 600) water_access = Math.round((rainfall / 600) * 70);
    else water_access = Math.round(Math.max(30, 100 - (rainfall - 500) / 20));
    water_access = Math.min(100, Math.max(0, water_access));
  }

  const climate = water_access !== null ? Math.min(100, Math.max(0, Math.round(water_access * 0.9 + 10))) : null;
  const soil_quality = soilOCVal !== null ? Math.min(100, Math.max(0, Math.round((soilOCVal / 50) * 100))) : null;
  const drainage = topography !== null ? Math.min(100, Math.max(0, Math.round(topography * 0.7 + (soil_quality ?? 50) * 0.3))) : null;
  const nutrient_level = soil_quality !== null ? Math.min(100, Math.max(0, Math.round(soil_quality * 1.1))) : null;

  return {
    soil_quality, water_access, climate, topography, drainage, nutrient_level,
    raw: {
      elevation_m: elevation !== null ? Math.round(elevation) : null,
      slope_deg: slopeVal !== null ? Math.round(slopeVal * 10) / 10 : null,
      annual_rainfall_mm: rainfall !== null ? Math.round(rainfall) : null,
      soil_organic_carbon: soilOCVal !== null ? Math.round(soilOCVal * 10) / 10 : null,
    },
  };
}

/* ── Growth stage: latest S2 scene NDVI → stage mapping ── */

async function computeGrowthStage(token: string, projectId: string, coords: LngLat[]) {
  const geometry = makeGeometry(coords);
  const now = new Date();
  const endDate = now.toISOString().split("T")[0];
  const startDate = new Date(now.getTime() - 60 * 24 * 3600 * 1000).toISOString().split("T")[0];

  const collection: GeeExpression = {
    functionInvocationValue: { functionName: "ImageCollection.load", arguments: { id: { constantValue: "COPERNICUS/S2_SR" } } },
  };
  const dateFiltered: GeeExpression = {
    functionInvocationValue: {
      functionName: "Collection.filter",
      arguments: {
        collection,
        filter: {
          functionInvocationValue: {
            functionName: "Filter.dateRangeContains",
            arguments: {
              leftValue: { functionInvocationValue: { functionName: "DateRange", arguments: { start: { constantValue: startDate }, end: { constantValue: endDate } } } },
              rightField: { constantValue: "system:time_start" },
            },
          },
        },
      },
    },
  };
  const boundsFiltered: GeeExpression = {
    functionInvocationValue: {
      functionName: "Collection.filter",
      arguments: {
        collection: dateFiltered,
        filter: { functionInvocationValue: { functionName: "Filter.intersects", arguments: { leftField: { constantValue: ".geo" }, rightValue: geometry } } },
      },
    },
  };
  const cloudFiltered: GeeExpression = {
    functionInvocationValue: {
      functionName: "Collection.filter",
      arguments: {
        collection: boundsFiltered,
        filter: { functionInvocationValue: { functionName: "Filter.lessThan", arguments: { leftField: { constantValue: "CLOUDY_PIXEL_PERCENTAGE" }, rightValue: { constantValue: 20 } } } },
      },
    },
  };
  const latest: GeeExpression = {
    functionInvocationValue: {
      functionName: "Collection.limit",
      arguments: { collection: cloudFiltered, limit: { constantValue: 1 }, key: { constantValue: "system:time_start" }, ascending: { constantValue: false } },
    },
  };
  const latestImage: GeeExpression = {
    functionInvocationValue: { functionName: "ImageCollection.mosaic", arguments: { collection: latest } },
  };
  const ndvi: GeeExpression = {
    functionInvocationValue: {
      functionName: "Image.normalizedDifference",
      arguments: { input: latestImage, bandNames: { constantValue: ["B8", "B4"] } },
    },
  };
  const clippedNdvi = clip(ndvi, geometry);

  const result = await computeValue(token, projectId, reduceRegion(clippedNdvi, geometry, "Reducer.mean"));
  const meanNdvi = (result as { result?: { nd?: number } }).result?.nd ?? null;
  if (meanNdvi === null) return null;

  let stage: string; let progress: number;
  if (meanNdvi < 0.2) { stage = "Germination"; progress = 15; }
  else if (meanNdvi < 0.4) { stage = "Tillering"; progress = 30; }
  else if (meanNdvi < 0.6) { stage = "Stem Extension"; progress = 50; }
  else if (meanNdvi < 0.75) { stage = "Heading"; progress = 70; }
  else { stage = "Grain Fill"; progress = 90; }

  return { stage, progress, current_ndvi: Math.round(meanNdvi * 1000) / 1000, date_range: `${startDate} to ${endDate}` };
}

/* ── Main ── */

serve(async (req) => {
  if (req.method === "OPTIONS") return corsOptions();
  try {
    const body = await req.json();
    const ring = extractRing(body.polygon);
    if (!ring) return jsonResponse({ error: "polygon is required" }, 400);
    const polyError = validatePolygon(ring);
    if (polyError) return jsonResponse({ error: polyError }, 400);

    const requested: string[] = Array.isArray(body.analyses)
      ? body.analyses
      : ["land_use", "vegetation", "suitability", "growth_stage"];

    const cacheKey = buildCacheKey(ring, requested);
    const cached = getCached(cacheKey);
    if (cached) {
      return jsonResponse({ ...cached, cached: true }, 200, { "Cache-Control": "public, max-age=300" });
    }

    const token = await getGeeAccessToken();
    const projectId = getProjectId();

    const results: Record<string, unknown> = {};
    const tasks: Promise<void>[] = [];
    const run = (name: string, fn: () => Promise<unknown>) =>
      tasks.push(
        fn().then((v) => { results[name] = v; })
          .catch((e) => { console.error(`${name} error:`, e); results[name] = null; }),
      );

    if (requested.includes("land_use")) run("land_use", () => computeLandUse(token, projectId, ring));
    if (requested.includes("vegetation")) run("vegetation", () => computeVegetationIndices(token, projectId, ring));
    if (requested.includes("suitability")) run("suitability", () => computeLandSuitability(token, projectId, ring));
    if (requested.includes("growth_stage")) run("growth_stage", () => computeGrowthStage(token, projectId, ring));
    await Promise.all(tasks);

    const hasUsefulData = Object.values(results).some((v) => v !== null);
    if (hasUsefulData) setCached(cacheKey, results);

    return jsonResponse(results, 200, { "Cache-Control": "public, max-age=300" });
  } catch (e) {
    console.error("gee-analytics error:", e);
    const message = e instanceof Error ? e.message : String(e);
    return jsonResponse(
      {
        land_use: null, vegetation: null, suitability: null, growth_stage: null,
        error: message.includes("GEE_RATE_LIMITED") ? "RATE_LIMITED" : "SERVICE_UNAVAILABLE",
        fallback: true,
        message: "Satellite analytics are temporarily busy. Showing cached and non-satellite data where available.",
      },
      200,
      { "Cache-Control": "no-store" },
    );
  }
});
