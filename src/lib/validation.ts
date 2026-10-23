// Validation runner — executes the SAME pinned formulas the production
// engine uses against the literature-referenced fixtures and computes
// agreement metrics (MAE / RMSE / class agreement) for the report's
// evaluation chapter. Pure functions only — no network, no Date.now().
//
// The three formula families re-exercised here (all pinned in their specs):
//   1. Crop-engine scoring & ranking   (Module 08 — crop-engine.ts)
//   2. GEE suitability scores          (Module 05 — gee-analytics function)
//   3. NDVI vegetation health score    (Module 05 — analyze-parcel: mean/0.8×100)
//
// The GEE formulas are re-implemented here client-side deliberately: the
// validation study must not depend on live satellite compute (fixtures pin
// the raw GEE values — elevation/slope/rainfall/SOC — from the cited
// sources), and the mirrored formulas are checked against the edge
// function's output by a parity test (see validation.test.ts, "parity
// shapes" — the mirror is verified against explicit expected values in the
// 05 spec tables).

import { VALIDATION_FIXTURES, scoreToClass, type ValidationFixture } from "@/data/validation-fixtures";
import { buildLocalPlan, rankCropsForLocalEnvironment } from "@/lib/crop-engine";
import { detectRegion } from "@/data/agronomy";

/* ── Pinned-formula mirrors (Module 05 gee-analytics) ── */

export function waterAccessFromRainfall(rainfall: number): number {
  let w: number;
  if (rainfall >= 600 && rainfall <= 1500) w = Math.round(80 + 20 * (1 - Math.abs(rainfall - 1000) / 500));
  else if (rainfall < 600) w = Math.round((rainfall / 600) * 70);
  else w = Math.round(Math.max(30, 100 - (rainfall - 500) / 20));
  return Math.min(100, Math.max(0, w));
}

export function climateFromWaterAccess(waterAccess: number): number {
  return Math.min(100, Math.max(0, Math.round(waterAccess * 0.9 + 10)));
}

export function soilQualityFromSoc(soc: number): number {
  return Math.min(100, Math.max(0, Math.round((soc / 50) * 100)));
}

export function topographyFromSlope(slopeDeg: number): number {
  return Math.max(0, Math.round(100 - slopeDeg * 5));
}

/* ── Pinned-formula mirror (Module 05 analyze-parcel) ── */

export function healthScoreFromNdvi(meanNdvi: number): number {
  return Math.min(100, Math.max(0, Math.round((meanNdvi / 0.8) * 100)));
}

/* ── Per-fixture result ── */

export interface FixtureResult {
  fixtureId: string;
  fixtureName: string;
  region: string;
  /** Engine's #1 zone crop. */
  topCrop: string;
  /** Reference expectation. */
  expectedTopCrop: string;
  topCropAgrees: boolean;
  /** Reference crop inside the engine's top-3 ranked list? */
  expectedInTop3: boolean;
  /** Whether the reference crop appears in the engine's plan zones. */
  expectedInPlan: boolean;
  /** Water-access: formula(raw rainfall) vs reference rainfall expectation. */
  waterAccess: number;
  waterAccessBandOk: boolean;
  /** Health score: mean NDVI → pinned formula vs expected band. */
  healthScore: number;
  healthScoreBandOk: boolean;
  /** FAO-style class agreement: engine top score → class vs reference class. */
  engineClass: "VS" | "S" | "MS" | "N";
  referenceClass: "S1" | "S2" | "S3" | "N";
  classAgrees: boolean;
  /** Engine top composite score (0..1) — for MAE/RMSE across fixtures. */
  engineTopScore: number;
  /** Reference numeric score (class midpoint: S1=87.5, S2=62.5, S3=37.5, N=12.5). */
  referenceScore: number;
  /** Wall-clock plan build ms (perf evidence; measured in the runner). */
  buildMs: number;
}

const CLASS_MIDPOINTS: Record<ValidationFixture["reference"]["suitabilityClass"], number> = {
  S1: 87.5, S2: 62.5, S3: 37.5, N: 12.5,
};

/* S1↔VS, S2↔S, S3↔MS are the agreed equivalents (documented mapping). */
function classesEquivalent(engineClass: FixtureResult["engineClass"], ref: ValidationFixture["reference"]["suitabilityClass"]): boolean {
  switch (ref) {
    case "S1": return engineClass === "VS";
    case "S2": return engineClass === "S";
    case "S3": return engineClass === "MS";
    case "N": return engineClass === "N";
  }
}

function inBand(value: number, [lo, hi]: [number, number]): boolean {
  return value >= lo && value <= hi;
}

/** Run ONE fixture through the engine + mirrors. Pure apart from Date.now()
 *  for the timing evidence (timing is not asserted on). */
export function runFixture(fixture: ValidationFixture): FixtureResult {
  const t0 = Date.now();
  const plan = buildLocalPlan(fixture.input);
  const buildMs = Date.now() - t0;

  const region = detectRegion(fixture.input.location);
  const regionCrops = region?.crops ?? [];
  const ranked = rankCropsForLocalEnvironment(
    {
      tempC: fixture.input.weather?.temperature ?? 22,
      annualRainMm: fixture.input.suitability?.raw?.annual_rainfall_mm ?? null,
      ph: fixture.input.soil?.metrics?.ph ?? null,
      humidity: fixture.input.weather?.humidity ?? null,
      waterStress: fixture.input.suitability?.water_access != null ? 1 - fixture.input.suitability.water_access / 100 : null,
      regionCrop: false,
    },
    fixture.input.crop,
    regionCrops,
    Boolean(region),
  );

  const topCrop = plan.zones[0]?.crop ?? "";
  const top3 = ranked.slice(0, 3).map((r) => r.crop);
  const planCrops = plan.zones.map((z) => z.crop);
  const expectedCrop = fixture.reference.expectedTopCrop;

  const waterAccess = waterAccessFromRainfall(fixture.reference.annualRainfallMm);
  const healthScore = healthScoreFromNdvi(fixture.input.ndvi?.mean_ndvi ?? 0);
  const engineTopScore = ranked[0]?.score ?? 0;
  const engineClass = scoreToClass(engineTopScore * 100);

  return {
    fixtureId: fixture.id,
    fixtureName: fixture.name,
    region: fixture.region,
    topCrop,
    expectedTopCrop: expectedCrop,
    topCropAgrees: topCrop === expectedCrop,
    expectedInTop3: top3.includes(expectedCrop),
    expectedInPlan: planCrops.includes(expectedCrop),
    waterAccess,
    waterAccessBandOk: inBand(waterAccess, fixture.expected.waterAccessBand),
    healthScore,
    healthScoreBandOk: inBand(healthScore, fixture.expected.healthScoreBand),
    engineClass,
    referenceClass: fixture.reference.suitabilityClass,
    classAgrees: classesEquivalent(engineClass, fixture.reference.suitabilityClass),
    engineTopScore,
    referenceScore: CLASS_MIDPOINTS[fixture.reference.suitabilityClass] / 100,
    buildMs,
  };
}

/* ── Aggregate metrics ── */

export interface ValidationSummary {
  fixtureCount: number;
  topCropAgreementPct: number;    // engine #1 zone == reference crop
  expectedInTop3Pct: number;      // reference crop in engine's top-3
  expectedInPlanPct: number;      // reference crop anywhere in plan zones
  classAgreementPct: number;      // VS/S/MS/N vs S1/S2/S3/N mapping
  scoreMae: number;               // mean |engine − reference| (0..1 scale)
  scoreRmse: number;              // sqrt(mean((engine − reference)²))
  waterAccessBandOkPct: number;
  healthScoreBandOkPct: number;
  maxBuildMs: number;             // slowest plan build (perf gate < 10 ms)
  allWithinPerfGate: boolean;
}

export function summarize(results: FixtureResult[]): ValidationSummary {
  const n = results.length || 1;
  const pct = (ok: (r: FixtureResult) => boolean) => (results.filter(ok).length / n) * 100;
  const errs = results.map((r) => r.engineTopScore - r.referenceScore);
  const mae = errs.reduce((s, e) => s + Math.abs(e), 0) / n;
  const rmse = Math.sqrt(errs.reduce((s, e) => s + e * e, 0) / n);
  return {
    fixtureCount: results.length,
    topCropAgreementPct: pct((r) => r.topCropAgrees),
    expectedInTop3Pct: pct((r) => r.expectedInTop3),
    expectedInPlanPct: pct((r) => r.expectedInPlan),
    classAgreementPct: pct((r) => r.classAgrees),
    scoreMae: Math.round(mae * 1000) / 1000,
    scoreRmse: Math.round(rmse * 1000) / 1000,
    waterAccessBandOkPct: pct((r) => r.waterAccessBandOk),
    healthScoreBandOkPct: pct((r) => r.healthScoreBandOk),
    maxBuildMs: Math.max(...results.map((r) => r.buildMs)),
    allWithinPerfGate: results.every((r) => r.buildMs < 10),
  };
}

/** Convenience: run all fixtures. */
export function runAllFixtures(): FixtureResult[] {
  return VALIDATION_FIXTURES.map(runFixture);
}
