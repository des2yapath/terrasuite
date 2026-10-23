// Edge function: analyze-parcel (NDVI stats)
// Computes mean/min/max NDVI + vegetation health score for a parcel from
// Sentinel-2 SR. 30-day window with 90-day fallback (cloud cover gaps).
//
// Request:  { polygon: ring | GeoJSON Polygon }
// Response: { mean_ndvi, min_ndvi, max_ndvi, vegetation_health_score,
//             acquisition_date }
// No imagery:  { mean_ndvi: 0, ..., error: "No valid Sentinel-2 imagery found" }
// Failure:     { fallback: true, error: "RATE_LIMITED"|"SERVICE_UNAVAILABLE", message } HTTP 200

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  corsOptions, jsonResponse, validatePolygon, extractRing,
  getGeeAccessToken, getProjectId, computeValue,
  makeGeometry, reduceRegion, s2Filtered, ndviOf, clip,
  type GeeExpression,
} from "../_shared/gee.ts";

function buildNdviImage(coords: [number, number][], startDate: string, endDate: string) {
  const geometry = makeGeometry(coords);
  // Least-cloudy single scene in the window
  const limited: GeeExpression = {
    functionInvocationValue: {
      functionName: "Collection.limit",
      arguments: {
        collection: s2Filtered(geometry, startDate, endDate),
        limit: { constantValue: 1 },
        key: { constantValue: "CLOUDY_PIXEL_PERCENTAGE" },
        ascending: { constantValue: true },
      },
    },
  };
  const image: GeeExpression = {
    functionInvocationValue: { functionName: "ImageCollection.mosaic", arguments: { collection: limited } },
  };
  const ndvi = ndviOf(image); // raw S2 bands B8/B4
  const clipped = clip(ndvi, geometry);
  return { clipped, geometry };
}

async function tryComputeNdvi(
  token: string, projectId: string, coords: [number, number][], start: string, end: string,
) {
  const { clipped, geometry } = buildNdviImage(coords, start, end);
  const [meanResult, minResult, maxResult] = await Promise.all([
    computeValue(token, projectId, reduceRegion(clipped, geometry, "Reducer.mean")),
    computeValue(token, projectId, reduceRegion(clipped, geometry, "Reducer.min")),
    computeValue(token, projectId, reduceRegion(clipped, geometry, "Reducer.max")),
  ]);
  return {
    meanNdvi: (meanResult as { result?: { nd?: number } }).result?.nd ?? null,
    minNdvi: (minResult as { result?: { nd?: number } }).result?.nd ?? null,
    maxNdvi: (maxResult as { result?: { nd?: number } }).result?.nd ?? null,
    start, end,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return corsOptions();
  try {
    const body = await req.json();
    const ring = extractRing(body.polygon);
    if (!ring) return jsonResponse({ error: "polygon is required" }, 400);
    const polyError = validatePolygon(ring);
    if (polyError) return jsonResponse({ polyError }, 400);

    const token = await getGeeAccessToken();
    const projectId = getProjectId();

    const now = new Date();
    const endDate = now.toISOString().split("T")[0];
    const startDate = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString().split("T")[0];

    let result = await tryComputeNdvi(token, projectId, ring, startDate, endDate);
    if (result.meanNdvi === null && result.minNdvi === null && result.maxNdvi === null) {
      const fallbackStart = new Date(now.getTime() - 90 * 24 * 3600 * 1000).toISOString().split("T")[0];
      result = await tryComputeNdvi(token, projectId, ring, fallbackStart, endDate);
    }

    if (result.meanNdvi === null && result.minNdvi === null && result.maxNdvi === null) {
      return jsonResponse({
        mean_ndvi: 0, min_ndvi: 0, max_ndvi: 0, vegetation_health_score: 0,
        acquisition_date: `${startDate} to ${endDate}`,
        error: "No valid Sentinel-2 imagery found",
      });
    }

    const mean = result.meanNdvi ?? 0;
    const min = result.minNdvi ?? 0;
    const max = result.maxNdvi ?? 0;
    const healthScore = Math.min(100, Math.max(0, Math.round((mean / 0.8) * 100)));

    return jsonResponse({
      mean_ndvi: Math.round(mean * 1000) / 1000,
      min_ndvi: Math.round(min * 1000) / 1000,
      max_ndvi: Math.round(max * 1000) / 1000,
      vegetation_health_score: healthScore,
      acquisition_date: `${result.start} to ${result.end}`,
    });
  } catch (e) {
    console.error("analyze-parcel error:", e);
    const msg = e instanceof Error ? e.message : String(e);
    const rateLimited =
      msg.includes("GEE_RATE_LIMITED") || msg.includes("RESOURCE_EXHAUSTED") ||
      msg.includes("after retries");
    return jsonResponse(
      {
        error: rateLimited ? "RATE_LIMITED" : "SERVICE_UNAVAILABLE",
        fallback: true,
        message: "Satellite analysis service is temporarily busy. Please try again in a moment.",
      },
      200,
    );
  }
});
