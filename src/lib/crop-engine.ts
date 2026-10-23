// The weighted multi-criteria crop-suitability engine — the novel
// contribution named in the synopsis. Pure functions over the crop-profile
// database + parcel environmental data. 100% unit-testable (see
// crop-engine.test.ts) and the same math backs the validation module.

import { CROP_PROFILES, findCropProfile, type CropProfile } from "@/data/crop-profiles";
import { detectRegion, findIntercrops, buildRotationPlan, currentSeasonLabel, type SeasonPlan } from "@/data/agronomy";
import type { GeeAnalytics } from "@/lib/gee";
import type { SoilData as SoilShape } from "@/hooks/useParcelData";

/* ── Inputs ── */

export interface EngineInput {
  parcelName: string;
  crop: string;
  areaHa: number;
  location: string;
  coordinates: [number, number][];
  ndvi?: { mean_ndvi: number; min_ndvi: number; max_ndvi: number; vegetation_health_score: number } | null;
  soil?: SoilShape | null;
  weather?: { temperature: number; humidity: number; windSpeed: number } | null;
  suitability?: GeeAnalytics["suitability"];
}

/* ── Weights (pinned — document these in the report) ── */

export const SCORING_WEIGHTS = {
  temperature: 0.20,
  rainfall: 0.18,
  region: 0.19,
  ph: 0.12,
  humidity: 0.10,
  waterStress: 0.08,
  currentCropBonus: 0.13,
} as const;

/* ── Score a single profile against a single environment ── */

export interface CropScore {
  crop: string;
  profile: CropProfile;
  score: number;         // 0..1, weighted composite
  subScores: {
    temperature: number; // 0..1 — within optimal temp band?
    rainfall: number;    // 0..1 — annual rainfall vs optimal band
    ph: number;         // 0..1 — soil pH vs optimal band
    humidity: number;   // 0..1 — current humidity vs optimal band
    waterStress: number;
    region: number;      // 0/1 — traditionally grown in the detected region
  };
}

function bandScore(value: number, [lo, hi]: [number, number], gracePct = 0.35): number {
  // 1 inside the band; linear falloff to 0 at (1+gracePct)× the band width
  if (value >= lo && value <= hi) return 1;
  const width = hi - lo;
  const grace = width * gracePct;
  if (value < lo) return Math.max(0, 1 - (lo - value) / (width + grace));
  return Math.max(0, 1 - (value - hi) / (width + grace));
}

export function scoreCropProfile(
  profile: CropProfile,
  env: {
    tempC: number;
    annualRainMm: number | null;
    ph: number | null;
    humidity: number | null;
    waterStress: number | null; // 0..1, higher = more stress
    regionCrop: boolean;
  },
): CropScore {
  const temperature = bandScore(env.tempC, profile.tempC);
  const rainfall = env.annualRainMm != null ? bandScore(env.annualRainMm, profile.rainMm) : 0.5;
  const ph = env.ph != null ? bandScore(env.ph, profile.ph) : 0.5;
  const humidity = env.humidity != null ? bandScore(env.humidity, profile.humidity) : 0.5;
  const waterStress = env.waterStress != null ? 1 - env.waterStress : 0.5;
  const region = env.regionCrop ? 1 : 0;

  const score =
    temperature * SCORING_WEIGHTS.temperature +
    rainfall * SCORING_WEIGHTS.rainfall +
    region * SCORING_WEIGHTS.region +
    ph * SCORING_WEIGHTS.ph +
    humidity * SCORING_WEIGHTS.humidity +
    waterStress * SCORING_WEIGHTS.waterStress;

  return {
    crop: profile.name,
    profile,
    score: Math.min(1, Math.max(0, score / 0.87)), // normalize to 0..1 (max possible without the crop bonus)
    subScores: { temperature, rainfall, ph, humidity, waterStress, region },
  };
}

/* ── Rank all profiles for the environment ── */

export interface RankedCrop extends CropScore {
  rank: number;
}

export function rankCropsForEnvironment(env: Parameters<typeof scoreCropProfile>[1], currentCrop: string): RankedCrop[] {
  const scored = CROP_PROFILES.map((p) => scoreCropProfile(p, env));
  // Current crop gets its bonus after normalization
  const current = scored.find((s) => s.crop === currentCrop);
  if (current) {
    current.score = Math.min(1, current.score + SCORING_WEIGHTS.currentCropBonus * 0.87);
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s, i) => ({ ...s, rank: i + 1 }));
}

/** Rank crops using the same regional penalty path as buildLocalPlan. */
export function rankCropsForLocalEnvironment(
  env: Parameters<typeof scoreCropProfile>[1],
  currentCrop: string,
  regionCrops: string[],
  hasDetectedRegion = true,
): RankedCrop[] {
  const scored = CROP_PROFILES.map((p) => {
    const regionCrop = regionCrops.includes(p.name);
    const score = scoreCropProfile(p, { ...env, regionCrop });
    if (!regionCrop && hasDetectedRegion) score.score = Math.max(0, score.score - 0.25);
    return score;
  });
  const current = scored.find((s) => s.crop === currentCrop);
  if (current) current.score = Math.min(1, current.score + SCORING_WEIGHTS.currentCropBonus * 0.87);
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s, i) => ({ ...s, rank: i + 1 }));
}

/* ── Zones: 3–4 ranked, area-allocated crop zones ── */

export interface PlanZone {
  id: string;
  name: string;
  crop: string;
  emoji: string;
  color: string;
  areaPct: number;
  reason: string;
  spacingM: number;
  waterNeeds: string;
  season: string;
  yieldEst: string;
  position: { x: number; y: number };
}

export const ZONE_EMOJI: Record<string, string> = {
  Wheat: "🌾", Rice: "🌾", Maize: "🌽", Barley: "🌾", Oats: "🌾", Sorghum: "🌾",
  Millet: "🌾", "Ragi (Finger Millet)": "🌾", "Pearl Millet (Bajra)": "🌾", Quinoa: "🌾",
  Buckwheat: "🌾", Soybean: "🫘", Chickpea: "🫘", Lentil: "🫘", "Mung Bean": "🫘",
  "Pigeon Pea (Tur Dal)": "🫘", "Peanut (Groundnut)": "🥜", "Faba Bean": "🫘", Cowpea: "🫘",
  Sunflower: "🌻", Mustard: "🌼", Sesame: "🌼", "Canola (Rapeseed)": "🌼", "Flax (Linseed)": "🌼",
  Tomato: "🍅", Potato: "🥔", Onion: "🧅", Cabbage: "🥬", Carrot: "🥕", Cucumber: "🥒",
  "Eggplant (Brinjal)": "🍆", "Okra (Ladyfinger)": "🌿", "Chili Pepper": "🌶️", "Sweet Potato": "🍠",
  Cassava: "🍠", "Drumstick (Moringa)": "🌿", Mango: "🥭", Banana: "🍌",
  "Citrus (Orange/Lemon)": "🍊", Grapes: "🍇", Apple: "🍎", Guava: "🍈", Papaya: "🥭",
  Pomegranate: "🍎", Watermelon: "🍉", Coconut: "🥥", "Date Palm": "🌴", Olive: "🫒",
  Fig: "🍈", Avocado: "🥑", Strawberry: "🍓", Sugarcane: "🎋", Cotton: "☁️",
  Tea: "🍵", Coffee: "☕", Cocoa: "🍫", Rubber: "🛞", Neem: "🌳", Almond: "🌰",
  Walnut: "🌰", Acacia: "🌳",
};
function emojiFor(crop: string): string {
  return ZONE_EMOJI[crop] ?? "🌱";
}

export const ZONE_COLORS = ["#16A34A", "#3B82F6", "#EAB308", "#7C3AED"];

/** Proportional (NOT equal) area allocation: best 40–55%, then 20–30, 10–20, tree 5–12. */
export function allocateAreas(rankedList: RankedCrop[]): number[] {
  const n = Math.min(4, rankedList.length);
  const areas: number[] = [];
  const hasTree = rankedList.slice(0, n).some((r) => r.profile.tree);
  if (n === 4 && hasTree) {
    areas.push(45, 25, 15, 15); // tree gets the 15 (adjusted below if tree isn't last)
  } else if (n === 4) {
    areas.push(45, 25, 18, 12);
  } else if (n === 3) {
    areas.push(50, 30, 20);
  } else {
    areas.push(100);
  }
  // Guarantee ≥5% per zone, renormalize to 100
  const min5 = areas.map((a) => Math.max(5, a));
  const total = min5.reduce((s, v) => s + v, 0);
  return min5.map((a) => Math.round((a / total) * 100));
}

export function buildZones(rankedList: RankedCrop[], currentCrop: string): PlanZone[] {
  const top = rankedList.slice(0, 4);
  const areas = allocateAreas(top);
  // Ensure the current crop is included (swap into last slot if missing)
  const currentIncluded = top.some((t) => t.crop === currentCrop);
  if (!currentIncluded && findCropProfile(currentCrop)) {
    top[top.length - 1] = rankedList.find((r) => r.crop === currentCrop)!;
  }
  // Ensure at least one tree zone if any tree made the top 6
  if (!top.some((t) => t.profile.tree)) {
    const bestTree = rankedList.find((r) => r.profile.tree && r.score > 0.35);
    if (bestTree) top[top.length - 1] = bestTree;
  }
  const positions = [
    { x: 0.25, y: 0.5 }, { x: 0.75, y: 0.5 }, { x: 0.5, y: 0.25 }, { x: 0.5, y: 0.75 },
  ];
  return top.map((r, i) => ({
    id: `zone-${i + 1}`,
    name: `Zone ${String.fromCharCode(65 + i)} — ${r.crop}`,
    crop: r.crop,
    emoji: emojiFor(r.crop),
    color: ZONE_COLORS[i % ZONE_COLORS.length],
    areaPct: areas[i],
    reason: r.subScores.region === 1
      ? `Traditionally grown here; ${Math.round(r.score * 100)}% environmental match`
      : `${Math.round(r.score * 100)}% environmental match (temp/rain/pH fit)`,
    spacingM: r.profile.spacingM,
    waterNeeds: r.profile.waterNeeds,
    season: r.profile.season,
    yieldEst: r.profile.yieldEst,
    position: positions[i],
  }));
}

/* ── Full local plan (the offline/AI-fallback path) ── */

export interface CropPlan {
  zones: PlanZone[];
  intercropping: Array<{ primary: string; secondary: string; emoji: string; benefit: string; spacing: string }>;
  rotation_plan: SeasonPlan[];
  summary: string;
  tips: string[];
  overall_score: number;          // 0..10
  water_saving_pct: number;
  expected_revenue_increase_pct: number;
  source: "local" | "ai";
  currentSeason: string;
}

export function buildLocalPlan(input: EngineInput): CropPlan {
  const region = detectRegion(input.location);
  const regionCrops = region?.crops ?? [];

  const env = {
    tempC: input.weather?.temperature ?? 22,
    annualRainMm: input.suitability?.raw?.annual_rainfall_mm ?? null,
    ph: input.soil?.metrics?.ph ?? null,
    humidity: input.weather?.humidity ?? null,
    waterStress:
      input.suitability?.water_access != null ? 1 - input.suitability.water_access / 100 : null,
    regionCrop: false, // per-profile, below
  };

  const ranked = rankCropsForLocalEnvironment(
    env,
    input.crop,
    regionCrops,
    Boolean(region),
  );

  const zones = buildZones(ranked, input.crop);
  const intercropPairs = findIntercrops(regionCrops).slice(0, 2);
  const rotation = buildRotationPlan(region?.seasons ?? "temperate", regionCrops, input.crop);

  const topScore = ranked[0]?.score ?? 0.5;
  const waterAccess = input.suitability?.water_access ?? 60;
  const waterSaving = waterAccess > 70 ? 25 : waterAccess > 50 ? 18 : 12;

  return {
    zones,
    intercropping: intercropPairs.map((p) => ({
      primary: p.primary, secondary: p.secondary,
      emoji: `${emojiFor(p.primary)}+${emojiFor(p.secondary)}`,
      benefit: p.benefit, spacing: p.spacing,
    })),
    rotation_plan: rotation,
    summary: `Optimized plan for ${input.parcelName} (${region?.name ?? "your region"}): ${zones[0]?.crop ?? input.crop} as the primary crop (${zones[0]?.areaPct ?? 45}% area), with supporting zones and a ${rotation.length}-season rotation.`,
    tips: [
      `Plant ${zones[0]?.crop ?? input.crop} in the largest zone — it scores ${Math.round(topScore * 100)}% on this parcel's environment.`,
      input.soil?.metrics?.ph != null && (input.soil.metrics.ph < 6 || input.soil.metrics.ph > 7.5)
        ? `Soil pH ${input.soil.metrics.ph} is outside the ideal 6.0–7.5 band — consider lime (acidic) or gypsum (alkaline) amendments.`
        : "Soil pH is in a good range for most crops — maintain organic matter with cover crops.",
      waterAccess < 50
        ? "Water access is limited — prioritize drip irrigation and mulching to reduce evaporation losses."
        : "Consider rainwater harvesting to capture runoff during wet months for dry-season irrigation.",
    ],
    overall_score: Math.round(topScore * 100) / 10,
    water_saving_pct: waterSaving,
    expected_revenue_increase_pct: Math.round(topScore * 20),
    source: "local",
    currentSeason: currentSeasonLabel(region?.seasons ?? "temperate"),
  };
}
