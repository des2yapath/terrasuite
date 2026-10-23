// Client-side types for GEE edge-function responses + the typed fetch
// helpers with retry (invokeWithRetry) used by every data view.

import { invokeFn } from "@/lib/invoke";
import { isFallbackPayload } from "@/lib/query-cache";

/* ── Response types (mirror the edge functions exactly) ── */

export interface NdviStats {
  mean_ndvi: number;
  min_ndvi: number;
  max_ndvi: number;
  vegetation_health_score: number;
  acquisition_date: string;
  error?: string;
}

export interface LandUsePercentages {
  [className: string]: number; // "Cropland": 62.3, "Built-up": 4.1, ...
}

export interface VegetationStats {
  mean_ndvi: number;
  canopy_cover_pct: number | null;
  biomass_estimate_kg_ha: number;
  date_range: string;
}

export interface SuitabilityScores {
  soil_quality: number | null;
  water_access: number | null;
  climate: number | null;
  topography: number | null;
  drainage: number | null;
  nutrient_level: number | null;
  raw: {
    elevation_m: number | null;
    slope_deg: number | null;
    annual_rainfall_mm: number | null;
    soil_organic_carbon: number | null;
  };
}

export interface GrowthStageInfo {
  stage: string;
  progress: number;
  current_ndvi: number;
  date_range: string;
}

export interface GeeAnalytics {
  land_use: LandUsePercentages | null;
  vegetation: VegetationStats | null;
  suitability: SuitabilityScores | null;
  growth_stage: GrowthStageInfo | null;
  cached?: boolean;
}

export interface NdviTimeseriesPoint {
  date: string;
  ndvi: number;
}

export interface NdviTimeseries {
  timeseries: NdviTimeseriesPoint[];
  growth_rate: number | null;
  canopy_cover: number | null;
  biomass_estimate: number | null;
  growth_stage: string | null;
  growth_progress: number | null;
  latest_ndvi: number | null;
  mean_ndvi: number | null;
  date_range: string;
}

/* ── Retry wrapper ── */

export interface RetryOptions {
  retries?: number;
  /** Base delay ms; exponential backoff base * 2^attempt + jitter. */
  baseDelayMs?: number;
  /** Returns true when the payload should be treated as "no data" and retried. */
  isEmpty?: (data: unknown) => boolean;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Calls a Supabase edge function with retries. Retries on:
 *   - invoke error (network / non-2xx)
 *   - response payload flagged { fallback: true }
 *   - response failing the isEmpty predicate
 * Returns the final data (may still be a fallback after retries exhausted).
 */
export async function invokeWithRetry<T = unknown>(
  fnName: string,
  body: Record<string, unknown> | undefined,
  { retries = 3, baseDelayMs = 800, isEmpty }: RetryOptions = {},
): Promise<T | null> {
  let lastData: T | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      lastData = await invokeFn<T>(fnName, body);
      const empty = isFallbackPayload(lastData) || (isEmpty ? isEmpty(lastData) : false);
      if (!empty) return lastData;
      // else fall through to retry
    } catch (e) {
      console.warn(`[invokeWithRetry] ${fnName} attempt ${attempt + 1} failed`, e);
    }
    if (attempt < retries) {
      await sleep(baseDelayMs * Math.pow(2, attempt) + Math.floor(Math.random() * 400));
    }
  }
  return lastData;
}
