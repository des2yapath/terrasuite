// Edge function: gee-tile-proxy
// Authenticated pass-through for GEE map tiles. The browser's raster tile
// requests cannot carry Authorization headers, so MapLibre fetches this
// function instead, which signs the upstream GEE request server-side.
//
// NOTE (security trade-off, documented): this function must remain
// verify_jwt = false — map libraries issue plain GETs. Mitigations:
//   1. `name` must match the GEE map-id format projects/{p}/maps/{id}
//      (unguessable capability token minted by gee-ndvi-tiles)
//   2. GEE map ids expire; the NDVI map is cheap to re-mint
//   3. Tiles are cached 1h — repeated abuse costs little
//
// Request:  GET ?name=projects/X/maps/Y&z={z}&x={x}&y={y}
// Response: PNG tile bytes (or upstream status)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, corsOptions, getGeeAccessToken } from "../_shared/gee.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return corsOptions();
  try {
    const url = new URL(req.url);
    const name = url.searchParams.get("name");
    const z = url.searchParams.get("z");
    const x = url.searchParams.get("x");
    const y = url.searchParams.get("y");

    if (!name || z === null || x === null || y === null) {
      return new Response(JSON.stringify({ error: "Missing required params: name, z, x, y" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Capability-token check: GEE map name format only
    if (!/^projects\/[A-Za-z0-9_-]+\/maps\/[A-Za-z0-9_-]+$/.test(name)) {
      return new Response(JSON.stringify({ error: "Invalid map name" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!/^\d+$/.test(z) || !/^\d+$/.test(x) || !/^\d+$/.test(y)) {
      return new Response(JSON.stringify({ error: "Invalid tile coords" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = await getGeeAccessToken();
    const tileResp = await fetch(
      `https://earthengine.googleapis.com/v1/${name}/tiles/${z}/${x}/${y}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!tileResp.ok) {
      return new Response(null, { status: tileResp.status, headers: corsHeaders });
    }
    const buf = await tileResp.arrayBuffer();
    return new Response(buf, {
      headers: {
        ...corsHeaders,
        "Content-Type": tileResp.headers.get("Content-Type") || "image/png",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (e) {
    console.error("gee-tile-proxy error:", e);
    return new Response(JSON.stringify({ error: "An internal error occurred" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
