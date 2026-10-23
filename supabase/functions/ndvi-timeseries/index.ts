// Edge function: ndvi-timeseries
// 90-day NDVI series for a parcel (up to 12 scenes, sequential per-scene
// computes), plus derived indicators: growth rate, canopy cover, biomass,
// growth stage, latest/mean NDVI.
//
// Request:  { polygon: ring | GeoJSON Polygon }
// Response: { timeseries: [{date, ndvi}...], growth_rate, canopy_cover,
//             biomass_estimate, growth_stage, growth_progress,
//             latest_ndvi, mean_ndvi, date_range, cached? }
// No data:    { timeseries: [], ..., error, fallback: true }
// Failure:    { timeseries: [], ..., error: "RATE_LIMITED"|..., fallback: true } HTTP 200

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  corsOptions, jsonResponse, validatePolygon, extractRing,
  getGeeAccessToken, getProjectId, computeValue,
  makeGeometry, reduceRegion, s2Filtered, ndviOf, clip,
  type GeeExpression,
} from "../_shared/gee.ts";

const TIMESERIES_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_SCENES = 12;
const timeseriesCache = new Map<string, { data: unknown; expiresAt: number }>();

function buildCacheKey(coords: [number, number][]): string {
  return JSON.stringify(coords.map(([lon, lat]) => [Number(lon.toFixed(5)), Number(lat.toFixed(5))]));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return corsOptions();
  try {
    const body = await req.json();
    const ring = extractRing(body.polygon);
    if (!ring) return jsonResponse({ error: "polygon is required" }, 400);
    const polyError = validatePolygon(ring);
    if (polyError) return jsonResponse({ error: polyError }, 400);

    const cacheKey = buildCacheKey(ring);
    const cached = timeseriesCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return jsonResponse({ ...(cached.data as object), cached: true }, 200, { "Cache-Control": "public, max-age=300" });
    }

    const token = await getGeeAccessToken();
    const projectId = getProjectId();

    const now = new Date();
    const endDate = now.toISOString().split("T")[0];
    const startDate = new Date(now.getTime() - 90 * 24 * 3600 * 1000).toISOString().split("T")[0];

    const geometry = makeGeometry(ring);
    // Oldest-first for a chronological series
    const sorted: GeeExpression = {
      functionInvocationValue: {
        functionName: "Collection.limit",
        arguments: {
          collection: s2Filtered(geometry, startDate, endDate),
          limit: { constantValue: MAX_SCENES },
          key: { constantValue: "system:time_start" },
          ascending: { constantValue: true },
        },
      },
    };
    const listExpr: GeeExpression = {
      functionInvocationValue: {
        functionName: "Collection.toList",
        arguments: { collection: sorted, count: { constantValue: MAX_SCENES } },
      },
    };

    // Scene count first
    const sizeResult = await computeValue(token, projectId, {
      functionInvocationValue: { functionName: "Collection.size", arguments: { collection: sorted } },
    });
    const count = (sizeResult as { result?: number }).result ?? 0;
    if (count === 0) {
      return jsonResponse({
        timeseries: [], growth_rate: null, canopy_cover: null, biomass_estimate: null,
        growth_stage: null, latest_ndvi: null, mean_ndvi: null,
        date_range: `${startDate} to ${endDate}`,
        error: "No valid Sentinel-2 imagery found for this area in the last 90 days",
      });
    }

    // Per-scene: timestamp + NDVI mean (2 computes/scene, sequential)
    const imageCount = Math.min(count, MAX_SCENES);
    const raw: { date: string; ndvi: number | null }[] = [];
    for (let i = 0; i < imageCount; i++) {
      const image: GeeExpression = {
        functionInvocationValue: { functionName: "List.get", arguments: { list: listExpr, index: { constantValue: i } } },
      };
      const timestamp: GeeExpression = {
        functionInvocationValue: {
          functionName: "Element.get",
          arguments: { object: image, property: { constantValue: "system:time_start" } },
        },
      };
      const ndviClipped = clip(ndviOf(image), geometry);
      const stats: GeeExpression = reduceRegion(ndviClipped, geometry, "Reducer.mean");
      const ndviVal: GeeExpression = {
        functionInvocationValue: {
          functionName: "Dictionary.get",
          arguments: { dictionary: stats, key: { constantValue: "nd" } },
        },
      };
      try {
        const [tsResult, ndviResult] = await Promise.all([
          computeValue(token, projectId, timestamp),
          computeValue(token, projectId, ndviVal),
        ]);
        const ts = (tsResult as { result?: number }).result;
        const ndvi = (ndviResult as { result?: number }).result;
        raw.push({
          date: ts ? new Date(ts).toISOString().split("T")[0] : "unknown",
          ndvi: ndvi != null ? Math.round(ndvi * 1000) / 1000 : null,
        });
      } catch {
        raw.push({ date: "unknown", ndvi: null });
      }
    }
    const timeseries = raw
      .filter((p) => p.date !== "unknown" && p.ndvi !== null)
      .sort((a, b) => a.date.localeCompare(b.date));

    if (timeseries.length === 0) {
      const stale = cached && cached.expiresAt < Date.now() ? cached.data : null;
      return jsonResponse(
        stale
          ? { ...(stale as object), stale: true, error: "NDVI computation returned no valid results", fallback: true }
          : {
              timeseries: [], growth_rate: null, canopy_cover: null, biomass_estimate: null,
              growth_stage: null, latest_ndvi: null, mean_ndvi: null,
              date_range: `${startDate} to ${endDate}`,
              error: "NDVI computation returned no valid results", fallback: true,
            },
        200,
        { "Cache-Control": "no-store" },
      );
    }

    /* Derived indicators — formulas pinned for the validation module */
    const latestNdvi = timeseries[timeseries.length - 1].ndvi!;
    const earliestNdvi = timeseries[0].ndvi!;

    let growth_rate: number | null = null;
    if (timeseries.length >= 2) {
      const daysDiff =
        (new Date(timeseries[timeseries.length - 1].date).getTime() - new Date(timeseries[0].date).getTime()) / 86_400_000;
      if (daysDiff > 0) growth_rate = Math.round(((latestNdvi - earliestNdvi) / daysDiff) * 10000) / 10000;
    }
    const canopy_cover = Math.round((timeseries.filter((p) => p.ndvi! > 0.5).length / timeseries.length) * 100);
    const meanNdvi = timeseries.reduce((s, p) => s + p.ndvi!, 0) / timeseries.length;
    const biomass_estimate = Math.round(meanNdvi * 8 * 1000) / 1000;

    let growth_stage: string; let growth_progress: number;
    if (latestNdvi < 0.2) { growth_stage = "Germination"; growth_progress = 15; }
    else if (latestNdvi < 0.4) { growth_stage = "Tillering"; growth_progress = 30; }
    else if (latestNdvi < 0.6) { growth_stage = "Stem Extension"; growth_progress = 50; }
    else if (latestNdvi < 0.75) { growth_stage = "Heading"; growth_progress = 70; }
    else { growth_stage = "Grain Fill"; growth_progress = 90; }

    const payload = {
      timeseries, growth_rate, canopy_cover, biomass_estimate,
      growth_stage, growth_progress,
      latest_ndvi: latestNdvi,
      mean_ndvi: Math.round(meanNdvi * 1000) / 1000,
      date_range: `${startDate} to ${endDate}`,
    };
    timeseriesCache.set(cacheKey, { data: payload, expiresAt: Date.now() + TIMESERIES_CACHE_TTL_MS });
    return jsonResponse(payload, 200, { "Cache-Control": "public, max-age=300" });
  } catch (e) {
    console.error("ndvi-timeseries error:", e);
    const message = e instanceof Error ? e.message : String(e);
    return jsonResponse(
      {
        timeseries: [], growth_rate: null, canopy_cover: null, biomass_estimate: null,
        growth_stage: null, latest_ndvi: null, mean_ndvi: null,
        error: message.includes("GEE_RATE_LIMITED") ? "RATE_LIMITED" : "SERVICE_UNAVAILABLE",
        fallback: true, message: "Satellite time-series are temporarily busy. Please retry shortly.",
      },
      200,
      { "Cache-Control": "no-store" },
    );
  }
});
