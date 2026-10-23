// analyze-parcel-ai — Gemini 2.5 Flash narrative analysis of a parcel.
// Takes the fused numeric profile (NDVI, soil, weather, suitability, land use)
// and returns a markdown analysis in a fixed section format. Ported from the
// reference implementation's prompt design (proven templates), retargeted to
// the Google AI Studio generative-language REST API (free tier, key in the
// GEMINI_API_KEY function secret).
//
// Hard rules honored here:
//   - $0 budget: generativelanguage.googleapis.com free tier, no card.
//   - Input clamping: every user-supplied number is range-clamped and every
//     string length-capped before it reaches the prompt.
//   - Never throws to the client: structured error JSON with HTTP 200 +
//     { fallback: true } so invokeWithRetry can degrade gracefully.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MAX_STR = 200;
const MODEL = "gemini-2.5-flash";
const REQUEST_TIMEOUT_MS = 25_000;

const clampStr = (v: unknown): string =>
  typeof v === "string" ? v.slice(0, MAX_STR) : "";
const clampNum = (v: unknown, min: number, max: number): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, n));
};

function sanitizeSoil(s: Record<string, unknown> | null | undefined) {
  if (!s || typeof s !== "object") return null;
  const wr = (s.water_retention ?? {}) as Record<string, unknown>;
  const m = (s.metrics ?? {}) as Record<string, unknown>;
  const t = (s.texture ?? {}) as Record<string, unknown>;
  const c = (s.classification ?? {}) as Record<string, unknown>;
  return {
    soilClass: clampStr(c.soil_class),
    usdaClass: clampStr(t.usda_class),
    ph: clampNum(m.ph, 0, 14),
    soc: clampNum(m.soc_g_per_kg, 0, 1000),
    nitrogen: clampNum(m.nitrogen_g_per_kg, 0, 1000),
    cec: clampNum(m.cec, 0, 10000),
    fieldCapacityPct: clampNum(wr.field_capacity_pct, 0, 100),
    wiltingPointPct: clampNum(wr.wilting_point_pct, 0, 100),
    availableWaterPct: clampNum(wr.available_water_pct, 0, 100),
  };
}

function sanitizeSuitability(s: Record<string, unknown> | null | undefined) {
  if (!s || typeof s !== "object") return null;
  const raw = (s.raw ?? {}) as Record<string, unknown>;
  return {
    soilQuality: clampNum(s.soil_quality, 0, 100),
    waterAccess: clampNum(s.water_access, 0, 100),
    climate: clampNum(s.climate, 0, 100),
    topography: clampNum(s.topography, 0, 100),
    drainage: clampNum(s.drainage, 0, 100),
    nutrients: clampNum(s.nutrient_level, 0, 100),
    elevationM: clampNum(raw.elevation_m, -500, 10000),
    slopeDeg: clampNum(raw.slope_deg, 0, 90),
    annualRainfallMm: clampNum(raw.annual_rainfall_mm, 0, 20000),
  };
}

function jsonError(message: string, status = 200, extra: Record<string, unknown> = {}) {
  return new Response(JSON.stringify({ error: message, fallback: true, ...extra }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function buildRuralPrompt(input: {
  name: string; crop: string; areaHa: number; location: string;
  ndviMean: number | null; ndviHealth: number | null;
  tempC: number | null; humidity: number | null; windKmh: number | null;
  moisturePct: number | null;
  soil: ReturnType<typeof sanitizeSoil>;
  suitability: ReturnType<typeof sanitizeSuitability>;
  landUseSummary: string;
  aqi: { pm25: number | null; pm10: number | null; euAqi: number | null } | null;
}): string {
  const s = input.soil;
  const su = input.suitability;
  return `You are a concise precision-agriculture analyst writing for an agricultural extension officer. Analyse the land parcel below. Use plain language, be data-driven, and keep EVERY section to 1–2 sentences unless a table is requested.

**Parcel:** ${input.name} · **Current land use/crop:** ${input.crop} · **Area:** ${input.areaHa} ha · **Location:** ${input.location}
**NDVI (vegetation health):** mean ${input.ndviMean ?? "N/A"} · health score ${input.ndviHealth ?? "N/A"}/100
**Weather now:** ${input.tempC ?? "N/A"}°C · ${input.humidity ?? "N/A"}% humidity · ${input.windKmh ?? "N/A"} km/h wind · surface soil moisture ${input.moisturePct ?? "N/A"}%
**Land cover (ESA WorldCover):** ${input.landUseSummary}
${s ? `**Soil (ISRIC SoilGrids):** ${s.soilClass || "Unknown"} · ${s.usdaClass || "unknown texture"} · pH ${s.ph ?? "N/A"} · organic carbon ${s.soc ?? "N/A"} g/kg · nitrogen ${s.nitrogen ?? "N/A"} g/kg · CEC ${s.cec ?? "N/A"} · field capacity ${s.fieldCapacityPct ?? "N/A"}% · wilting point ${s.wiltingPointPct ?? "N/A"}% · available water ${s.availableWaterPct ?? "N/A"}%
` : "**Soil:** no soil data available — say so and proceed without it.\n"}${su ? `**Land suitability scores (0–100):** soil ${su.soilQuality ?? "N/A"} · water access ${su.waterAccess ?? "N/A"} · climate ${su.climate ?? "N/A"} · topography ${su.topography ?? "N/A"} · drainage ${su.drainage ?? "N/A"} · nutrients ${su.nutrients ?? "N/A"} · elevation ${su.elevationM ?? "N/A"} m · slope ${su.slopeDeg ?? "N/A"}° · annual rainfall ${su.annualRainfallMm ?? "N/A"} mm
` : "**Suitability:** no satellite terrain data — proceed without it.\n"}${input.aqi ? `**Air quality:** PM2.5 ${input.aqi.pm25 ?? "N/A"} µg/m³ · PM10 ${input.aqi.pm10 ?? "N/A"} µg/m³ · EU AQI ${input.aqi.euAqi ?? "N/A"}\n` : ""}Respond in this EXACT markdown structure:

## Vegetation Health
[Assess NDVI ${input.ndviMean ?? "N/A"} for ${input.crop}: healthy, moderate, or stressed — and why]

## Water Status
[Compare surface moisture and rainfall against the crop's needs: under/over/adequate irrigation]

## Soil Assessment
[pH, organic carbon, nitrogen, CEC — what is limiting, what amendments would help]

## Land Suitability
**Score: X/10** — [one-line justification from soil, water, climate, terrain]

## Recommendations
- [Action 1 — highest priority, tied to the weakest metric]
- [Action 2 — soil or water management]
- [Action 3 — sustainability practice: cover crops, reduced tillage, drip irrigation, or similar]

## Key Risks
- [Risk 1 with severity (Low/Medium/High) and the action that mitigates it]
- [Risk 2 with severity and action]

## Summary Table
| Metric | Value | Status |
|---|---|---|
| NDVI | ${input.ndviMean ?? "N/A"} | [Good/Fair/Poor] |
| Soil pH | ${s?.ph ?? "N/A"} | [Optimal/Needs amendment] |
| Organic Carbon | ${s?.soc ?? "N/A"} g/kg | [High/Medium/Low] |
| Water Access | ${su?.waterAccess ?? "N/A"}/100 | [status] |
| Rainfall | ${su?.annualRainfallMm ?? "N/A"} mm/yr | [status] |
| Yield Potential | [estimate] | [status] |`;
}

function buildUrbanPrompt(input: {
  name: string; landUse: string; areaHa: number; location: string;
  ndviMean: number | null;
  tempC: number | null; humidity: number | null;
  moisturePct: number | null;
  soil: ReturnType<typeof sanitizeSoil>;
  aqi: { pm25: number | null; pm10: number | null; euAqi: number | null } | null;
  landUseSummary: string;
}): string {
  const s = input.soil;
  return `You are a concise urban sustainability analyst writing for a municipal planner. Analyse this urban region. Keep every section to 1–2 sentences.

**Region:** ${input.name} · **Land use:** ${input.landUse} · **Area:** ${input.areaHa} ha · **Location:** ${input.location}
**Green cover (NDVI):** ${input.ndviMean ?? "N/A"}
**Weather:** ${input.tempC ?? "N/A"}°C · ${input.humidity ?? "N/A"}% humidity · soil moisture ${input.moisturePct ?? "N/A"}%
**Land cover:** ${input.landUseSummary}
${s ? `**Soil:** ${s.soilClass || "Unknown"} · pH ${s.ph ?? "N/A"} · organic carbon ${s.soc ?? "N/A"} g/kg
` : ""}${input.aqi ? `**Air quality:** PM2.5 ${input.aqi.pm25 ?? "N/A"} · PM10 ${input.aqi.pm10 ?? "N/A"} · EU AQI ${input.aqi.euAqi ?? "N/A"}
` : ""}Respond in this EXACT markdown structure:

## Green Infrastructure
[Is NDVI ${input.ndviMean ?? "N/A"} adequate green cover for a ${input.landUse} area? What is missing?]

## Heat & Air
[Heat-island risk (Low/Medium/High) from green cover + temperature; air quality assessment from AQI/PM data]

## Water & Drainage
[Stormwater risk from soil type and moisture; one green-infrastructure recommendation]

## Sustainability Score
**Score: X/10** — [one-line justification]

## Recommendations
- [Green infrastructure action]
- [Water/drainage action]
- [Air quality or cooling action]

## Summary Table
| Metric | Value | Status |
|---|---|---|
| Green Cover | ${input.ndviMean ?? "N/A"} | [Good/Fair/Poor] |
| Air Quality | EU AQI ${input.aqi?.euAqi ?? "N/A"} | [status] |
| Heat Risk | [Low/Med/High] | [status] |
| Water Stress | [from moisture] | [status] |`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    return jsonError("GEMINI_API_KEY secret not configured. Set it with: supabase secrets set GEMINI_API_KEY=...", 200, { reason: "config" });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const name = clampStr(body.parcelName) || "Unnamed parcel";
  const crop = clampStr(body.crop) || "Unspecified";
  const location = clampStr(body.location) || "Unknown location";
  const areaHa = clampNum(body.areaHa, 0, 1e7) ?? 0;
  const isUrban = body.isUrban === true;

  const ndvi = (body.ndvi ?? null) as Record<string, unknown> | null;
  const weather = (body.weather ?? null) as Record<string, unknown> | null;
  const moisture = clampNum(body.surfaceMoisturePct, 0, 100);
  const soil = sanitizeSoil(body.soil as Record<string, unknown> | null);
  const suitability = sanitizeSuitability(body.suitability as Record<string, unknown> | null);
  const aqiRaw = (body.aqi ?? null) as Record<string, unknown> | null;
  const aqi = aqiRaw
    ? { pm25: clampNum(aqiRaw.pm2_5, 0, 100000), pm10: clampNum(aqiRaw.pm10, 0, 100000), euAqi: clampNum(aqiRaw.european_aqi, 0, 100000) }
    : null;

  const landUse = (body.landUse ?? null) as Record<string, unknown> | null;
  const landUseSummary = landUse
    ? Object.entries(landUse)
        .filter(([, v]) => typeof v === "number" && v >= 5)
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, 4)
        .map(([k, v]) => `${k} ${v}%`)
        .join(", ") || "no dominant class"
    : "unknown";

  const shared = {
    name, areaHa, location,
    ndviMean: clampNum(ndvi?.mean_ndvi, -1, 1),
    ndviHealth: clampNum(ndvi?.vegetation_health_score, 0, 100),
    tempC: clampNum(weather?.temperature, -100, 100),
    humidity: clampNum(weather?.humidity, 0, 100),
    windKmh: clampNum(weather?.windSpeed, 0, 1000),
    moisturePct: moisture,
    soil, suitability, landUseSummary, aqi,
  };

  const prompt = isUrban
    ? buildUrbanPrompt({ ...shared, landUse: crop })
    : buildRuralPrompt({ ...shared, crop });

  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 2048,
          },
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    );

    if (!resp.ok) {
      const detail = await resp.text();
      console.error("Gemini API error:", resp.status, detail.slice(0, 500));
      if (resp.status === 429) return jsonError("AI rate limit reached — try again shortly.", 200, { reason: "rate_limit" });
      if (resp.status === 400 && detail.includes("API key")) return jsonError("GEMINI_API_KEY rejected by Google AI Studio.", 200, { reason: "config" });
      return jsonError("AI analysis temporarily unavailable.", 200, { reason: "upstream" });
    }

    const data = await resp.json();
    const text: string =
      data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
    if (!text.trim()) {
      return jsonError("AI returned an empty analysis.", 200, { reason: "upstream" });
    }

    return new Response(JSON.stringify({ analysis: text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("analyze-parcel-ai error:", msg);
    return jsonError("AI analysis failed (timeout or network).", 200, { reason: "network" });
  }
});
