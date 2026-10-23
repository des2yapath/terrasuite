// Edge function: gee-ndvi-tiles
// Creates a GLOBAL (unclipped) 3-month median NDVI visualization via GEE,
// registers it as a GEE "map", and returns a tile URL template routed
// through gee-tile-proxy (tiles require plain-GET fetching → the proxy
// attaches the GEE bearer token server-side).
//
// Request:  {} (no body needed)
// Response: { tileUrl: "<supabase>/functions/v1/gee-tile-proxy?name=...&z={z}&x={x}&y={y}" }
// Failure:  { error } HTTP 500

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsOptions, jsonResponse,
  getGeeAccessToken, getProjectId, flattenExpression,
  loadS2, filterByDate, filterLessThan,
  type GeeExpression,
} from "../_shared/gee.ts";

const NDVI_PALETTE = [
  "#d73027", "#f46d43", "#fdae61", "#fee08b",
  "#d9ef8b", "#a6d96a", "#66bd63", "#1a9850", "#006837",
];

serve(async (req) => {
  if (req.method === "OPTIONS") return corsOptions();
  try {
    const token = await getGeeAccessToken();
    const projectId = getProjectId();

    const now = new Date();
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const startDate = threeMonthsAgo.toISOString().split("T")[0];
    const endDate = now.toISOString().split("T")[0];

    // Global median composite: S2 → date → cloud<20 → median → NDVI
    const dateFiltered = filterByDate(loadS2(), startDate, endDate);
    const cloudFiltered = filterLessThan(dateFiltered, "CLOUDY_PIXEL_PERCENTAGE", 20);
    const median: GeeExpression = {
      functionInvocationValue: {
        functionName: "ImageCollection.reduce",
        arguments: { collection: cloudFiltered, reducer: { functionInvocationValue: { functionName: "Reducer.median", arguments: {} } } },
      },
    };
    const ndvi: GeeExpression = {
      functionInvocationValue: {
        functionName: "Image.normalizedDifference",
        arguments: { input: median, bandNames: { constantValue: ["B8_median", "B4_median"] } },
      },
    };
    const visualized: GeeExpression = {
      functionInvocationValue: {
        functionName: "Image.visualize",
        arguments: {
          image: ndvi,
          bands: { constantValue: ["nd"] },
          min: { constantValue: -0.1 },
          max: { constantValue: 0.8 },
          palette: { constantValue: NDVI_PALETTE },
        },
      },
    };

    const expression = flattenExpression(visualized);

    const mapResp = await fetch(
      `https://earthengine.googleapis.com/v1/projects/${projectId}/maps`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ expression, fileFormat: "PNG" }),
      },
    );
    if (!mapResp.ok) {
      console.error("GEE maps error:", mapResp.status, await mapResp.text());
      throw new Error("GEE_TILE_FAILED");
    }
    const mapData = await mapResp.json() as { name: string };
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const tileUrl =
      `${supabaseUrl}/functions/v1/gee-tile-proxy` +
      `?name=${encodeURIComponent(mapData.name)}&z={z}&x={x}&y={y}`;

    return jsonResponse({ tileUrl });
  } catch (e) {
    console.error("gee-ndvi-tiles error:", e);
    return jsonResponse({ error: "An internal error occurred while generating NDVI tiles" }, 500);
  }
});
