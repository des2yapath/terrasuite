// useAiReports — the client orchestrator for the AI layer (Module 09).
// Dual-approach design, pinned by the synopsis:
//   1. LOCAL plan from the crop engine renders IMMEDIATELY (Module 08).
//   2. `crop-plan-ai` is invoked in the background; on success its plan
//      replaces the local one (source:"ai"); on ANY failure the local plan
//      stays and a soft notice is shown. Never a blank plan.
//   3. `analyze-parcel-ai` narrative analysis is explicit (button) because it
//      costs a request; its result is PERSISTED to the reports table via
//      reports-service (the literal synopsis requirement: "generated reports
//      are tied to a registered user") and rehydrated on next open.
//
// Persistence keys (localStorage, 1h TTL — same discipline as Module 07):
//   terrasuite-ai-analysis-cache   { [parcelId]: { data: string, timestamp } }

import { useEffect, useState, useCallback, useRef } from "react";
import type { Parcel } from "@/data/parcel";
import { useParcelData } from "@/hooks/useParcelData";
import { toEngineInput } from "@/lib/engine-input";
import { invokeWithRetry } from "@/lib/gee";
import { invokeFn } from "@/lib/invoke";
import { buildLocalPlan, rankCropsForEnvironment, type CropPlan } from "@/lib/crop-engine";
import { detectRegion } from "@/data/agronomy";
import { saveReport, latestReport } from "@/services/reports-service";
import { getFreshLocalCacheValue, setLocalCache } from "@/lib/query-cache";

const ANALYSIS_CACHE_KEY = "terrasuite-ai-analysis-cache";
const CACHE_TTL_MS = 60 * 60 * 1000;
const AI_PLAN_TIMEOUT_MS = 20_000;

export interface AiReportsState {
  /** The plan currently rendered: local immediately, AI when it lands. */
  plan: CropPlan | null;
  planSource: "local" | "ai" | null;
  planLoading: boolean;       // AI plan request in flight
  planNotice: string | null;  // soft degradation notice ("AI unavailable — local plan shown")
  analysis: string | null;
  analysisLoading: boolean;
  analysisError: string | null;
  generateAnalysis: () => void;
}

export function useAiReports(parcel: Parcel | null): AiReportsState {
  const parcelData = useParcelData(parcel);
  const parcelId = parcel?.id;
  const [plan, setPlan] = useState<CropPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planNotice, setPlanNotice] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const generateAnalysis = useCallback(() => setRefreshNonce((n) => n + 1), []);

  const parcelIdRef = useRef<string | null>(null);

  // ── Local plan + AI plan race ────────────────────────────────────
  useEffect(() => {
    if (!parcel) { setPlan(null); setPlanNotice(null); return; }
    parcelIdRef.current = parcel.id;

    const input = toEngineInput(parcel, parcelData);
    const local = buildLocalPlan(input);
    setPlan(local);                     // 1. render local IMMEDIATELY
    setPlanNotice(null);

    // 2. background AI upgrade — do not fire while GEE streams are still
    //    loading (the prompt quality depends on them; local plan is visible meanwhile)
    const streamsReady = !parcelData.geeLoading && !parcelData.soilLoading;
    if (!streamsReady) return;

    let cancelled = false;
    const timer = setTimeout(() => { if (!cancelled) setPlanLoading(false); }, AI_PLAN_TIMEOUT_MS);
    setPlanLoading(true);

    (async () => {
      try {
        const region = detectRegion(parcel.location);
        const env = {
          tempC: input.weather?.temperature ?? 22,
          annualRainMm: input.suitability?.raw?.annual_rainfall_mm ?? null,
          ph: input.soil?.metrics?.ph ?? null,
          humidity: input.weather?.humidity ?? null,
          waterStress: input.suitability?.water_access != null ? 1 - input.suitability.water_access / 100 : null,
          regionCrop: true,
        };
        const ranked = rankCropsForEnvironment(env, parcel.crop)
          .slice(0, 8)
          .map((r) => ({ crop: r.crop, score: Math.round(r.score * 100) / 100 }));

        const aiPlan = await invokeWithRetry<Record<string, unknown>>("crop-plan-ai", {
          parcelName: parcel.name,
          crop: parcel.crop,
          areaHa: parcel.area,
          location: parcel.location,
          regionName: region?.name ?? "",
          regionCrops: region?.crops ?? [],
          rankedCrops: ranked,
          ndvi: input.ndvi,
          weather: input.weather,
          soil: input.soil,
          suitability: input.suitability,
          landUse: parcelData.gee?.land_use ?? null,
        }, { retries: 1, baseDelayMs: 1500, isEmpty: (d) => !d || typeof d !== "object" || !Array.isArray((d as { zones?: unknown[] }).zones) });

        if (cancelled || parcelIdRef.current !== parcel.id) return;
        if (aiPlan && Array.isArray(aiPlan.zones)) {
          // Merge discipline: if the AI dropped the current crop, graft the
          // local current-crop zone back in (user intent always wins).
          const aiCropPlan = { ...aiPlan, source: "ai" } as unknown as CropPlan;
          const hasCurrent = (aiPlan.zones as Array<{ crop: string }>).some((z) => z.crop === parcel.crop);
          if (!hasCurrent) {
            const localCurrent = local.zones.find((z) => z.crop === parcel.crop);
            if (localCurrent) aiCropPlan.zones = [...(aiPlan.zones as CropPlan["zones"]), localCurrent];
          }
          setPlan(aiCropPlan);
        } else {
          setPlanNotice("AI plan unavailable — showing the local agronomy model's plan.");
        }
      } catch {
        if (!cancelled) setPlanNotice("AI plan unavailable — showing the local agronomy model's plan.");
      } finally {
        if (!cancelled) setPlanLoading(false);
        clearTimeout(timer);
      }
    })();

    return () => { cancelled = true; clearTimeout(timer); };
    // parcelData streams excluded on purpose: geeLoading/soilLoading are the
    // readiness gates; re-running on every stream would re-fire the request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parcel, parcelData.geeLoading, parcelData.soilLoading]);

  // ── Narrative analysis: explicit generation, persisted, rehydrated ──
  useEffect(() => {
    if (!parcelId) { setAnalysis(null); setAnalysisError(null); return; }

    let cancelled = false;

    (async () => {
      // Rehydrate: server report first (cross-device), local cache second
      try {
        const report = await latestReport(parcelId, "ai_analysis");
        if (report && !cancelled) {
          const content = report.content as { analysis?: string };
          if (content?.analysis) {
            setAnalysis(content.analysis);
            setLocalCache(ANALYSIS_CACHE_KEY, parcelId, content.analysis);
            return;
          }
        }
      } catch { /* server unavailable → fall through to cache */ }

      const cached = getFreshLocalCacheValue<string>(ANALYSIS_CACHE_KEY, parcelId, CACHE_TTL_MS);
      if (!cancelled) setAnalysis(cached);
    })();

    return () => { cancelled = true; };
  }, [parcelId]);

  // Explicit generate (refreshNonce bumped by generateAnalysis)
  useEffect(() => {
    if (!parcel || refreshNonce === 0) return;
    let cancelled = false;
    (async () => {
      setAnalysisLoading(true);
      setAnalysisError(null);
      try {
        const input = toEngineInput(parcel, parcelData);
        const result = await invokeFn<{ analysis?: string; fallback?: boolean; error?: string }>("analyze-parcel-ai", {
          parcelName: parcel.name,
          crop: parcel.crop,
          areaHa: parcel.area,
          location: parcel.location,
          isUrban: parcel.crop === "Residential" || parcel.crop === "Commercial" || parcel.crop === "Industrial" || parcel.crop === "Mixed Use" || parcel.crop === "Park / Garden" || parcel.crop === "Rooftop / Terrace" || parcel.crop === "Community Garden",
          ndvi: input.ndvi,
          weather: input.weather,
          surfaceMoisturePct: parcelData.surfaceMoisture,
          soil: input.soil,
          suitability: input.suitability,
          landUse: parcelData.gee?.land_use ?? null,
          aqi: parcelData.aqi,
        });
        if (cancelled) return;
        if (result?.analysis) {
          setAnalysis(result.analysis);
          setLocalCache(ANALYSIS_CACHE_KEY, parcel.id, result.analysis);
          try {
            await saveReport(parcel.id, "ai_analysis", { analysis: result.analysis } as unknown as Record<string, unknown>);
          } catch { /* persistence best-effort — cache still holds it */ }
        } else {
          setAnalysisError(result?.error || "Analysis unavailable — please try again.");
        }
      } catch (e) {
        if (!cancelled) setAnalysisError(e instanceof Error ? e.message : "Analysis failed.");
      } finally {
        if (!cancelled) setAnalysisLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshNonce]);

  return {
    plan,
    planSource: plan?.source ?? null,
    planLoading,
    planNotice,
    analysis,
    analysisLoading,
    analysisError,
    generateAnalysis,
  };
}
