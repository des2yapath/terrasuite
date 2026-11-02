// Edge-case detection — pure predicate over the fused parcel streams.
// When a parcel is water/desert/polar/altitude/urban-extreme, agricultural
// crop planning is meaningless: the planning UI renders a themed block
// screen instead of a plan (Module 13).
//
// Thresholds are pinned (documented in the spec + report):
//   water    — ESA WorldCover "Water" >= 80%
//   desert   — CHIRPS annual rainfall < 50 mm, OR named-desert keyword
//   polar    — |mean latitude| > 66°, OR polar keyword
//   altitude — SRTM mean elevation > 5000 m (above the treeline)
//   urban    — "Built-up" >= 30% (this one is NOT a block: it switches
//              Module 07/09 into urban mode; detect() reports it so the
//              NewParcelDialog can preselect the urban type)
//
// Detection precedence (first match wins — most certain first):
//   polar > altitude > water > desert > urban

import type { Parcel } from "@/data/parcel";
import type { GeeAnalytics } from "@/lib/gee";
import type { LiveWeather } from "@/lib/open-meteo";

export type EdgeCaseType = "water" | "desert" | "polar" | "altitude" | "urban";

export interface EdgeCase {
  type: EdgeCaseType;
  confidence: number;
  title: string;
  message: string;
  /** true when planning UI should be REPLACED (water/desert/polar/altitude). */
  blocksPlanning: boolean;
}

const DESERT_KEYWORDS = [
  "sahara", "empty quarter", "rub al khali", "gobi desert", "atacama",
  "death valley", "namib desert", "thar desert", "kalahari",
];
const POLAR_KEYWORDS = ["antarctica", "antarctic", "south pole", "north pole", "svalbard", "greenland ice"];

export const EDGE_THRESHOLDS = {
  WATER_PCT: 80,
  DESERT_RAINFALL_MM: 50,
  POLAR_ABS_LAT: 66,
  ALTITUDE_M: 5000,
  URBAN_BUILT_UP_PCT: 30,
} as const;

const COPY: Record<EdgeCaseType, { title: string; message: (ctx: string) => string; blocks: boolean; confidence: number }> = {
  polar: {
    title: "Polar Zone",
    message: (ctx) => `This parcel lies in a polar/extreme-latitude zone (${ctx}). Permafrost and months without insolation make conventional agriculture infeasible; no meaningful crop plan can be produced.`,
    blocks: true,
    confidence: 95,
  },
  altitude: {
    title: "Extreme Altitude",
    message: (ctx) => `Mean elevation is ${ctx} m — above the natural treeline. Alpine conditions (thin air, UV intensity, short growing window) rule out standard cropping; consider specialized highland systems only with local expertise.`,
    blocks: true,
    confidence: 90,
  },
  water: {
    title: "Water Body",
    message: (ctx) => `Satellite land-use classification reads ${ctx}% open water (ocean, lake, or river). Crop planning does not apply; aquaculture or conservation uses would need entirely different models.`,
    blocks: true,
    confidence: 92,
  },
  desert: {
    title: "Extreme Desert",
    message: (ctx) => `Annual rainfall is around ${ctx} mm — below the ~50 mm threshold where rain-fed agriculture is possible. Any cultivation here implies engineered irrigation (desalination, deep aquifers) rather than a suitability-ranked crop plan.`,
    blocks: true,
    confidence: 90,
  },
  urban: {
    title: "Urban / Built-up Area",
    message: (ctx) => `${ctx}% of the parcel is classified Built-up. Agricultural planning is replaced by urban-mode analytics (green cover, heat/air quality, drainage) across the dashboard.`,
    blocks: false, // urban mode REPLACES the planning content, not a dead-end block
    confidence: 85,
  },
};

export function detectEdgeCase(
  parcel: Parcel,
  suitability: GeeAnalytics["suitability"],
  _ndvi: { mean_ndvi: number } | null,
  _weather: LiveWeather | null,
  landUse: Record<string, number> | null,
): EdgeCase | null {
  const loc = (parcel.location ?? "").toLowerCase();

  // 1. Polar — mean latitude of the ring. Accept both the canonical
  // GeoJSON shape ([[lng, lat], ...]) and legacy flat rings used by older
  // persisted fixtures so edge detection never crashes or silently returns NaN.
  const rawCoordinates = parcel.coordinates as unknown;
  const coords = Array.isArray(rawCoordinates) && Array.isArray(rawCoordinates[0]) &&
    Array.isArray((rawCoordinates[0] as unknown[])[0])
    ? rawCoordinates[0] as [number, number][]
    : rawCoordinates as [number, number][];
  const avgLat = coords.length > 0
    ? coords.reduce((s, c) => s + c[1], 0) / coords.length
    : null;
  if (avgLat != null && Math.abs(avgLat) > EDGE_THRESHOLDS.POLAR_ABS_LAT) {
    return { type: "polar", ...COPY.polar, message: COPY.polar.message(`±${Math.abs(avgLat).toFixed(1)}° latitude`), blocksPlanning: COPY.polar.blocks };
  }
  if (POLAR_KEYWORDS.some((k) => loc.includes(k))) {
    return { type: "polar", ...COPY.polar, message: COPY.polar.message(loc), blocksPlanning: COPY.polar.blocks };
  }

  // 2. Altitude
  const elev = suitability?.raw?.elevation_m ?? null;
  if (elev != null && elev > EDGE_THRESHOLDS.ALTITUDE_M) {
    return { type: "altitude", ...COPY.altitude, message: COPY.altitude.message(String(elev)), blocksPlanning: COPY.altitude.blocks };
  }

  // 3. Water body
  const waterPct = landUse?.["Water"] ?? 0;
  if (waterPct >= EDGE_THRESHOLDS.WATER_PCT) {
    return { type: "water", ...COPY.water, message: COPY.water.message(String(Math.round(waterPct))), blocksPlanning: COPY.water.blocks };
  }

  // 4. Desert
  const rain = suitability?.raw?.annual_rainfall_mm ?? null;
  if (rain != null && rain < EDGE_THRESHOLDS.DESERT_RAINFALL_MM) {
    return { type: "desert", ...COPY.desert, message: COPY.desert.message(String(Math.round(rain)), ), blocksPlanning: COPY.desert.blocks };
  }
  if (DESERT_KEYWORDS.some((k) => loc.includes(k))) {
    return { type: "desert", ...COPY.desert, message: COPY.desert.message("under 50"), blocksPlanning: COPY.desert.blocks };
  }

  // 5. Urban — reported, non-blocking
  const builtUp = landUse?.["Built-up"] ?? 0;
  if (builtUp >= EDGE_THRESHOLDS.URBAN_BUILT_UP_PCT) {
    return { type: "urban", ...COPY.urban, message: COPY.urban.message(String(Math.round(builtUp))), blocksPlanning: COPY.urban.blocks };
  }

  return null;
}
