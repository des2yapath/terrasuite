// crop-plan-ai — Gemini 2.5 Flash crop-plan generator (strict JSON mode).
// Receives the parcel profile + the local engine's ranked crops, returns a
// plan in the exact CropPlan shape the UI renders. The local plan (Module 08)
// is ALWAYS rendered first; when this function succeeds, its output replaces
// the local plan (source: "ai"). Native-plants discipline is enforced by the
// prompt AND by a post-validation step (zones clipped to the region crop
// list when the region is known).

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MAX_STR = 200;
const MODEL = "gemini-2.5-flash";
const REQUEST_TIMEOUT_MS = 25_000;
const MAX_ZONES = 4;

const clampStr = (v: unknown): string =>
  typeof v === "string" ? v.slice(0, MAX_STR) : "";
const clampNum = (v: unknown, min: number, max: number): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, n));
};

function sanitizeInput(body: Record<string, unknown>) {
  const ndvi = (body.ndvi ?? null) as Record<string, unknown> | null;
  const weather = (body.weather ?? null) as Record<string, unknown> | null;
  const suitability = (body.suitability as Record<string, unknown> | null) ?? null;
  const raw = (suitability.raw ?? {}) as Record<string, unknown>;
  const soil = (body.soil as Record<string, unknown> | null) ?? null;
  const soilMetrics = ((soil?.metrics ?? {}) as Record<string, unknown>);
  const soilTexture = ((soil?.texture ?? {}) as Record<string, unknown>);
  const soilClass = ((soil?.classification ?? {}) as Record<string, unknown>);
  const landUse = (body.landUse as Record<string, unknown> | null) ?? null;

  const ranked = Array.isArray(body.rankedCrops)
    ? (body.rankedCrops as unknown[])
        .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
        .slice(0, 8)
        .map((r) => ({
          crop: clampStr(r.crop),
          score: clampNum(r.score, 0, 1) ?? 0,
        }))
        .filter((r) => r.crop)
    : [];

  return {
    parcelName: clampStr(body.parcelName) || "Unnamed parcel",
    crop: clampStr(body.crop) || "Unspecified",
    areaHa: clampNum(body.areaHa, 0, 1e7) ?? 0,
    location: clampStr(body.location) || "Unknown location",
    regionName: clampStr(body.regionName),
    regionCrops: Array.isArray(body.regionCrops)
      ? (body.regionCrops as unknown[]).map(clampStr).filter(Boolean).slice(0, 40)
      : [],
    ranked,
    ndviMean: clampNum(ndvi?.mean_ndvi, -1, 1),
    ndviHealth: clampNum(ndvi?.vegetation_health_score, 0, 100),
    tempC: clampNum(weather?.temperature, -100, 100),
    humidity: clampNum(weather?.humidity, 0, 100),
    ph: clampNum(soilMetrics.ph, 0, 14),
    soilClass: clampStr(soilClass.soil_class),
    usdaClass: clampStr(soilTexture.usda_class),
    annualRainfallMm: clampNum(raw.annual_rainfall_mm, 0, 20000),
    elevationM: clampNum(raw.elevation_m, -500, 10000),
    waterAccess: clampNum(suitability.water_access, 0, 100),
    landUseSummary: landUse
      ? Object.entries(landUse)
          .filter(([, v]) => typeof v === "number" && (v as number) >= 5)
          .sort((a, b) => (b[1] as number) - (a[1] as number))
          .slice(0, 3)
          .map(([k, v]) => `${k} ${v}%`)
          .join(", ")
      : "unknown",
  };
}

function jsonError(message: string, status = 200, extra: Record<string, unknown> = {}) {
  return new Response(JSON.stringify({ error: message, fallback: true, ...extra }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function buildPrompt(i: ReturnType<typeof sanitizeInput>): string {
  const rankedList = i.ranked.map((r) => `${r.crop} (${Math.round(r.score * 100)}%)`).join(", ");
  const regionLine = i.regionName
    ? `The detected agricultural region is "${i.regionName}". Traditional crops there: ${i.regionCrops.join(", ")}.`
    : "The agricultural region could not be detected from the location string.";

  return `You are a precision-agriculture planning expert. Produce a crop plan for the parcel below. Return ONLY valid JSON — no markdown fences, no commentary.

**Parcel:** ${i.parcelName} · **Current crop:** ${i.crop} · **Area:** ${i.areaHa} ha · **Location:** ${i.location}
${regionLine}
**Environment:** temperature ${i.tempC ?? "N/A"}°C · humidity ${i.humidity ?? "N/A"}% · soil ${i.soilClass || "unknown"} (${i.usdaClass || "?"} texture) · pH ${i.ph ?? "N/A"} · annual rainfall ${i.annualRainfallMm ?? "N/A"} mm · elevation ${i.elevationM ?? "N/A"} m · water access ${i.waterAccess ?? "N/A"}/100 · NDVI ${i.ndviMean ?? "N/A"} (health ${i.ndviHealth ?? "N/A"}/100)
**Land cover:** ${i.landUseSummary}
**Ranked candidates from the local agronomy model (crop, environmental match):** ${rankedList || "none"}

JSON schema to fill — types and keys EXACTLY as shown:
{
  "zones": [ { "id": "zone-1", "name": "Zone A — <crop>", "crop": "<crop name>", "emoji": "<one emoji>", "color": "#16A34A", "areaPct": 45, "reason": "<one line why>", "spacingM": <number>, "waterNeeds": "low|medium|high", "season": "<sowing window>", "yieldEst": "<string>", "position": { "x": 0.25, "y": 0.5 } } ],
  "intercropping": [ { "primary": "<crop>", "secondary": "<crop>", "emoji": "<emoji>+<emoji>", "benefit": "<one line>", "spacing": "<one line>" } ],
  "rotation_plan": [ { "season": "<name>", "months": "<range>", "crops": ["<crop>", "<crop>"] } ],
  "summary": "<2 sentences>",
  "tips": ["<tip>", "<tip>", "<tip>"],
  "overall_score": 8.5,
  "water_saving_pct": 25,
  "expected_revenue_increase_pct": 15,
  "currentSeason": "<the season from rotation_plan that contains today's date>"
}

HARD RULES:
1. EXACTLY ${MAX_ZONES} or fewer zones; prefer 3–4. The current crop "${i.crop}" MUST be one of the zones.
2. AREA ALLOCATION IS PROPORTIONAL: best-suited crop gets 40–55%, second 20–30%, third 10–20%, a tree zone 5–12%. NEVER equal splits. areaPct values must be integers summing to exactly 100.
3. NATIVE PLANTS ONLY: every crop/tree you name must be genuinely cultivated in "${i.location}" — its climate zone, latitude, and agricultural tradition. NO Coconut in Europe, NO Rice in the Sahara, NO Mango in cold temperate zones. If a listed ranked candidate is climatically absurd for this location, skip it.
4. Include at least ONE native tree species as its own small zone (5–12%) when the climate supports trees at all.
5. Prefer crops from the ranked-candidate list; add others only when strongly justified by the location.
6. Intercropping: exactly 2 pairs, both crops of each pair native to "${i.location}".
7. Rotation: 3 seasons (2 if the climate only supports two), using the region's traditional season names (e.g. Kharif/Rabi/Zaid for India, Spring/Summer/Winter for temperate/Mediterranean, Wet/Dry for tropical). First crop of each season list is the priority crop.
8. zone position x,y ∈ [0,1] spread across the parcel; colors from #16A34A, #3B82F6, #EAB308, #7C3AED, one per zone, all distinct.
9. overall_score ∈ [0,10] one decimal; water_saving_pct ∈ [0,30]; expected_revenue_increase_pct ∈ [0,30].`;
}

/** Post-validation: clamp AI output into the schema the UI trusts. */
function normalizePlan(plan: Record<string, unknown>, currentCrop: string): Record<string, unknown> | null {
  const zonesRaw = Array.isArray(plan.zones) ? plan.zones : [];
  const zones = zonesRaw
    .filter((z): z is Record<string, unknown> => !!z && typeof z === "object")
    .slice(0, MAX_ZONES)
    .map((z, i) => {
      const areaPct = clampNum(z.areaPct, 0, 100) ?? 0;
      const pos = (z.position ?? {}) as Record<string, unknown>;
      return {
        id: `zone-${i + 1}`,
        name: clampStr(z.name) || `Zone ${String.fromCharCode(65 + i)}`,
        crop: clampStr(z.crop),
        emoji: clampStr(z.emoji) || "🌱",
        color: typeof z.color === "string" && /^#[0-9A-Fa-f]{6}$/.test(z.color) ? z.color : ["#16A34A", "#3B82F6", "#EAB308", "#7C3AED"][i % 4],
        areaPct,
        reason: clampStr(z.reason),
        spacingM: clampNum(z.spacingM, 0, 100) ?? 1,
        waterNeeds: ["low", "medium", "high"].includes(String(z.waterNeeds)) ? z.waterNeeds : "medium",
        season: clampStr(z.season),
        yieldEst: clampStr(z.yieldEst),
        position: {
          x: Math.min(1, Math.max(0, clampNum(pos.x, 0, 1) ?? 0.25)),
          y: Math.min(1, Math.max(0, clampNum(pos.y, 0, 1) ?? 0.5)),
        },
      };
    })
    .filter((z) => z.crop);

  if (zones.length === 0) return null;

  // Renormalize areas to exactly 100 (integer-safe)
  const total = zones.reduce((s, z) => s + (z.areaPct as number), 0);
  let running = 0;
  zones.forEach((z, i) => {
    const raw = (z.areaPct as number);
    const norm = i === zones.length - 1 ? 100 - running : Math.round((raw / (total || 1)) * 100);
    z.areaPct = Math.max(1, norm);
    running += z.areaPct as number;
  });
  // Guarantee current crop presence is flagged for the UI, not forced here —
  // the UI merges: if current crop missing, it appends the local engine's
  // current-crop zone (better than the AI silently re-weighting).

  const intercropping = (Array.isArray(plan.intercropping) ? plan.intercropping : [])
    .filter((p): p is Record<string, unknown> => !!p && typeof p === "object")
    .slice(0, 2)
    .map((p) => ({
      primary: clampStr(p.primary),
      secondary: clampStr(p.secondary),
      emoji: clampStr(p.emoji) || "🌱+🌱",
      benefit: clampStr(p.benefit),
      spacing: clampStr(p.spacing),
    }))
    .filter((p) => p.primary && p.secondary);

  const rotation = (Array.isArray(plan.rotation_plan) ? plan.rotation_plan : [])
    .filter((s): s is Record<string, unknown> => !!s && typeof s === "object")
    .slice(0, 3)
    .map((s) => ({
      season: clampStr(s.season),
      months: clampStr(s.months),
      crops: (Array.isArray(s.crops) ? s.crops : []).map(clampStr).filter(Boolean).slice(0, 4),
    }))
    .filter((s) => s.season && s.crops.length > 0);

  const tips = (Array.isArray(plan.tips) ? plan.tips : [])
    .map((t) => clampStr(t)).filter(Boolean).slice(0, 5);

  return {
    zones,
    intercropping,
    rotation_plan: rotation,
    summary: clampStr(plan.summary) || "AI-generated plan.",
    tips: tips.length > 0 ? tips : ["No tips returned."],
    overall_score: Math.min(10, Math.max(0, clampNum(plan.overall_score, 0, 10) ?? 5)),
    water_saving_pct: Math.min(30, Math.max(0, clampNum(plan.water_saving_pct, 0, 30) ?? 12)),
    expected_revenue_increase_pct: Math.min(30, Math.max(0, clampNum(plan.expected_revenue_increase_pct, 0, 30) ?? 10)),
    currentSeason: clampStr(plan.currentSeason),
    source: "ai",
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    return jsonError("GEMINI_API_KEY secret not configured.", 200, { reason: "config" });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const input = sanitizeInput(body);
  const prompt = buildPrompt(input);

  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 3072,
            responseMimeType: "application/json",
          },
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    );

    if (!resp.ok) {
      const detail = await resp.text();
      console.error("Gemini API error:", resp.status, detail.slice(0, 500));
      if (resp.status === 429) return jsonError("AI rate limit reached — try again shortly.", 200, { reason: "rate_limit" });
      return jsonError("AI planning temporarily unavailable.", 200, { reason: "upstream" });
    }

    const data = await resp.json();
    let text: string =
      data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";

    // Strip accidental markdown fences (model told not to, but belt+braces)
    text = text.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
    if (!text) return jsonError("AI returned an empty plan.", 200, { reason: "upstream" });

    let plan: Record<string, unknown>;
    try {
      plan = JSON.parse(text);
    } catch {
      console.error("AI returned invalid JSON:", text.slice(0, 400));
      return jsonError("AI returned a malformed plan.", 200, { reason: "upstream" });
    }

    const normalized = normalizePlan(plan, input.crop);
    if (!normalized) return jsonError("AI plan had no usable zones.", 200, { reason: "upstream" });

    return new Response(JSON.stringify(normalized), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("crop-plan-ai error:", msg);
    return jsonError("AI planning failed (timeout or network).", 200, { reason: "network" });
  }
});
