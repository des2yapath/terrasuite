// Validation suite — asserts the engine reproduces the literature-backed
// expectations for all 5 fixtures, and that the mirrored pinned formulas
// match the 05 spec tables exactly. This file is also the evidence base
// for the report's evaluation chapter (Module 16 re-runs it for coverage).

import { describe, it, expect } from "vitest";
import { VALIDATION_FIXTURES, scoreToClass } from "@/data/validation-fixtures";
import {
  runFixture, runAllFixtures, summarize,
  waterAccessFromRainfall, climateFromWaterAccess, soilQualityFromSoc,
  topographyFromSlope, healthScoreFromNdvi, buildValidationCsv,
} from "@/lib/validation";

/* ── Parity: mirrored formulas vs the Module 05 spec tables ── */

describe("GEE suitability formula mirrors (pinned in 05 spec)", () => {
  it("water_access: 600–1500 mm band formula", () => {
    // rainfall 1000 → 80 + 20×(1−0) = 100
    expect(waterAccessFromRainfall(1000)).toBe(100);
    // rainfall 750 → 80 + 20×(1−0.5) = 90
    expect(waterAccessFromRainfall(750)).toBe(90);
    // rainfall 1500 → 80 + 20×(1−1) = 80
    expect(waterAccessFromRainfall(1500)).toBe(80);
    // rainfall 600 → 80 + 20×(1−0.8) = 84
    expect(waterAccessFromRainfall(600)).toBe(84);
  });
  it("water_access: <600 and >1500 branches", () => {
    expect(waterAccessFromRainfall(300)).toBe(35);   // 300/600×70
    expect(waterAccessFromRainfall(450)).toBe(53);   // 450/600×70 = 52.5 → 53
    expect(waterAccessFromRainfall(3000)).toBe(30);  // max(30, 100−75)
    expect(waterAccessFromRainfall(1600)).toBe(45);  // 100−5
    expect(waterAccessFromRainfall(2000)).toBe(30);  // 100−25 → clamped
  });
  it("climate = water_access×0.9 + 10", () => {
    expect(climateFromWaterAccess(100)).toBe(100);
    expect(climateFromWaterAccess(80)).toBe(82);
    expect(climateFromWaterAccess(52)).toBe(57);
  });
  it("soil_quality = SOC/50×100 (clamped)", () => {
    expect(soilQualityFromSoc(8.5)).toBe(17);
    expect(soilQualityFromSoc(28)).toBe(56);
    expect(soilQualityFromSoc(50)).toBe(100);
    expect(soilQualityFromSoc(80)).toBe(100); // clamped
  });
  it("topography = 100 − slope×5", () => {
    expect(topographyFromSlope(0.6)).toBe(97);
    expect(topographyFromSlope(3.6)).toBe(82);
    expect(topographyFromSlope(20)).toBe(0);
    expect(topographyFromSlope(30)).toBe(0); // floored
  });
  it("health score = min(100, round(mean/0.8×100))", () => {
    expect(healthScoreFromNdvi(0.52)).toBe(65);
    expect(healthScoreFromNdvi(0.8)).toBe(100);
    expect(healthScoreFromNdvi(0.9)).toBe(100); // capped
    expect(healthScoreFromNdvi(0.0)).toBe(0);
  });
});

/* ── Class mapping ── */

describe("FAO-style class mapping", () => {
  it("maps score bands to VS/S/MS/N", () => {
    expect(scoreToClass(80)).toBe("VS");
    expect(scoreToClass(75)).toBe("VS");
    expect(scoreToClass(74)).toBe("S");
    expect(scoreToClass(50)).toBe("S");
    expect(scoreToClass(49)).toBe("MS");
    expect(scoreToClass(25)).toBe("MS");
    expect(scoreToClass(24)).toBe("N");
  });
});

/* ── Fixture-level validation ── */

describe("validation fixtures", () => {
  it("has 5 fixtures across distinct agro-regions", () => {
    expect(VALIDATION_FIXTURES.length).toBe(5);
    const regions = new Set(VALIDATION_FIXTURES.map((f) => f.region));
    expect(regions.size).toBe(5);
  });

  it("every fixture builds a complete local plan in <10 ms", () => {
    const results = runAllFixtures();
    for (const r of results) expect(r.buildMs).toBeLessThan(10);
  });

  for (const fixture of VALIDATION_FIXTURES) {
    describe(fixture.name, () => {
      const r = runFixture(fixture);

      it("engine top zone crop == reference crop", () => {
        expect(r.topCrop).toBe(fixture.reference.expectedTopCrop);
      });

      it("reference crop inside the engine's top-3 ranked list", () => {
        expect(r.expectedInTop3).toBe(true);
      });

      it("water-access formula lands inside the expected band", () => {
        expect(r.waterAccessBandOk).toBe(true);
      });

      it("health-score formula lands inside the expected band", () => {
        expect(r.healthScoreBandOk).toBe(true);
      });

      it("engine score ±0.25 of the reference class midpoint", () => {
        expect(Math.abs(r.engineTopScore - r.referenceScore)).toBeLessThanOrEqual(0.25);
      });
    });
  }
});

/* ── Aggregate summary (report metrics) ── */

describe("validation summary", () => {
  const summary = summarize(runAllFixtures());

  it("top-crop agreement >= 80%", () => {
    expect(summary.topCropAgreementPct).toBeGreaterThanOrEqual(80);
  });
  it("expected crop in top-3 >= 80%", () => {
    expect(summary.expectedInTop3Pct).toBeGreaterThanOrEqual(80);
  });
  it("class agreement >= 60% (honest bar for a heuristic engine)", () => {
    expect(summary.classAgreementPct).toBeGreaterThanOrEqual(60);
  });
  it("MAE <= 0.15 and RMSE <= 0.20 on the 0..1 score scale", () => {
    expect(summary.scoreMae).toBeLessThanOrEqual(0.15);
    expect(summary.scoreRmse).toBeLessThanOrEqual(0.20);
  });
  it("water-access and health bands 100% inside expected", () => {
    expect(summary.waterAccessBandOkPct).toBe(100);
    expect(summary.healthScoreBandOkPct).toBe(100);
  });

  it("reports the plan coverage metric and performance gate", () => {
    expect(summary.expectedInPlanPct).toBeGreaterThanOrEqual(80);
    expect(summary.maxBuildMs).toBeGreaterThanOrEqual(0);
    expect(summary.allWithinPerfGate).toBe(true);
  });

  it("handles an empty result set without invalid metrics", () => {
    const empty = summarize([]);
    expect(empty.fixtureCount).toBe(0);
    expect(empty.topCropAgreementPct).toBe(0);
    expect(empty.scoreMae).toBe(0);
    expect(empty.scoreRmse).toBe(0);
    expect(empty.maxBuildMs).toBe(0);
    expect(empty.allWithinPerfGate).toBe(false);
  });

  it("exports every fixture row and aggregate metric to CSV", () => {
    const results = runAllFixtures();
    const csv = buildValidationCsv(results, summarize(results));

    expect(csv.split("\n")[0]).toContain("fixture,region,engine_top_crop");
    for (const fixture of VALIDATION_FIXTURES) expect(csv).toContain(fixture.id);
    expect(csv).toContain("summary,expected_in_plan_pct");
    expect(csv).toContain("summary,water_access_band_ok_pct");
    expect(csv).toContain("summary,health_score_band_ok_pct");
    expect(csv).toContain("summary,all_within_perf_gate,true");
  });
});
