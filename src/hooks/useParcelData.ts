// Parcel data hook: given a parcel, fetch + cache + expose every data
// stream the dashboard and detail views need:
//   - GEE analytics (land use, vegetation, suitability)  [edge, retried]
//   - NDVI timeseries                                    [edge, retried]
//   - Soil                                                [edge, retried]
//   - Live weather, AQI, surface soil moisture           [direct fetch]
// All wrapped in localStorage TTL caches (1h) via query-cache.ts.
// Loading flags per stream; errors degrade to null (views render
// "unavailable" states, never blank/crash).

import { useEffect, useState, useCallback } from "react";
import type { Parcel } from "@/data/parcel";
import { parcelCenter } from "@/data/parcel";
import {
  invokeWithRetry,
  type GeeAnalytics,
  type NdviTimeseries,
} from "@/lib/gee";
import {
  getFreshLocalCacheValue,
  setLocalCache,
  hasGeeAnalyticsPayload,
  hasSoilPayload,
  hasNdviPayload,
} from "@/lib/query-cache";
import {
  fetchLiveWeather,
  fetchAqi,
  fetchSurfaceSoilMoisture,
  type LiveWeather,
  type AqiData,
} from "@/lib/open-meteo";

export interface SoilData {
  classification: { soil_class: string; wrb_name: string; icon: string; description: string; color: string };
  metrics: {
    ph: number | null; ph_rating: string;
    soc_g_per_kg: number | null; soc_rating: string;
    bulk_density: number | null;
    nitrogen_g_per_kg: number | null; nitrogen_rating: string;
    cec: number | null;
    coarse_fragments_pct: number | null;
  };
  texture: { sand_pct: number | null; silt_pct: number | null; clay_pct: number | null; usda_class: string | null };
  water_retention: { field_capacity_pct: number | null; wilting_point_pct: number | null; available_water_pct: number | null };
}

const QUERY_CACHE_TTL_MS = 60 * 60 * 1000; // 1h
const GEE_CACHE_KEY = "terrasuite-gee-cache";
const TS_CACHE_KEY = "terrasuite-ndvi-ts-cache";
const SOIL_CACHE_KEY = "terrasuite-soil-cache";

export interface ParcelData {
  gee: GeeAnalytics | null;
  geeLoading: boolean;
  timeseries: NdviTimeseries | null;
  tsLoading: boolean;
  soil: SoilData | null;
  soilLoading: boolean;
  weather: LiveWeather | null;
  aqi: AqiData | null;
  surfaceMoisture: number | null;
  liveLoading: boolean;
  /** Re-fetch everything (bypasses cache freshness by re-invoking). */
  refresh: () => void;
}

export function useParcelData(parcel: Parcel | null): ParcelData {
  const [gee, setGee] = useState<GeeAnalytics | null>(null);
  const [geeLoading, setGeeLoading] = useState(false);
  const [timeseries, setTimeseries] = useState<NdviTimeseries | null>(null);
  const [tsLoading, setTsLoading] = useState(false);
  const [soil, setSoil] = useState<SoilData | null>(null);
  const [soilLoading, setSoilLoading] = useState(false);
  const [weather, setWeather] = useState<LiveWeather | null>(null);
  const [aqi, setAqi] = useState<AqiData | null>(null);
  const [surfaceMoisture, setSurfaceMoisture] = useState<number | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const [nonce, setNonce] = useState(0);

  const ring = parcel?.coordinates[0];

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  /* GEE analytics */
  useEffect(() => {
    if (!parcel || !ring) { setGee(null); return; }
    let cancelled = false;
    const cached = getFreshLocalCacheValue<GeeAnalytics>(GEE_CACHE_KEY, parcel.id, QUERY_CACHE_TTL_MS);
    if (cached) { setGee(cached); }
    (async () => {
      setGeeLoading(true);
      try {
        const data = await invokeWithRetry<GeeAnalytics>(
          "gee-analytics",
          { polygon: ring, analyses: ["land_use", "vegetation", "suitability"] },
          { retries: 3, isEmpty: (d) => !hasGeeAnalyticsPayload(d) },
        );
        if (!cancelled && hasGeeAnalyticsPayload(data)) {
          setGee(data as GeeAnalytics);
          setLocalCache(GEE_CACHE_KEY, parcel.id, data as GeeAnalytics);
        }
      } catch (e) {
        console.warn("gee analytics error", e);
      } finally {
        if (!cancelled) setGeeLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [parcel, ring, nonce]);

  /* NDVI timeseries */
  useEffect(() => {
    if (!parcel || !ring) { setTimeseries(null); return; }
    let cancelled = false;
    const cacheKey = `ts-${parcel.id}`;
    const cached = getFreshLocalCacheValue<NdviTimeseries>(TS_CACHE_KEY, cacheKey, QUERY_CACHE_TTL_MS);
    if (cached) { setTimeseries(cached); }
    (async () => {
      setTsLoading(true);
      try {
        const data = await invokeWithRetry<NdviTimeseries>(
          "ndvi-timeseries",
          { polygon: ring },
          { retries: 3, isEmpty: (d) => !hasNdviPayload(d) },
        );
        if (!cancelled && hasNdviPayload(data)) {
          setTimeseries(data as NdviTimeseries);
          setLocalCache(TS_CACHE_KEY, cacheKey, data as NdviTimeseries);
        }
      } catch (e) {
        console.warn("ndvi ts error", e);
      } finally {
        if (!cancelled) setTsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [parcel, ring, nonce]);

  /* Soil */
  useEffect(() => {
    if (!parcel) { setSoil(null); return; }
    let cancelled = false;
    const cached = getFreshLocalCacheValue<SoilData>(SOIL_CACHE_KEY, parcel.id, QUERY_CACHE_TTL_MS);
    if (cached) { setSoil(cached); return; } // soil rarely changes — cache is enough
    (async () => {
      setSoilLoading(true);
      try {
        const { lat, lng } = parcelCenter(parcel);
        const data = await invokeWithRetry<SoilData>(
          "soil-data",
          { lat, lon: lng },
          { retries: 3, isEmpty: (d) => !hasSoilPayload(d) },
        );
        if (!cancelled && hasSoilPayload(data)) {
          setSoil(data as SoilData);
          setLocalCache(SOIL_CACHE_KEY, parcel.id, data as SoilData);
        }
      } catch (e) {
        console.warn("soil error", e);
      } finally {
        if (!cancelled) setSoilLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [parcel, ring, nonce]);

  /* Live weather + AQI + surface moisture (direct, no cache — freshness matters) */
  useEffect(() => {
    if (!parcel) { setWeather(null); setAqi(null); setSurfaceMoisture(null); return; }
    let cancelled = false;
    (async () => {
      setLiveLoading(true);
      const { lat, lng } = parcelCenter(parcel);
      const [w, a, m] = await Promise.all([
        fetchLiveWeather(lat, lng),
        fetchAqi(lat, lng),
        fetchSurfaceSoilMoisture(lat, lng),
      ]);
      if (cancelled) return;
      setWeather(w);
      setAqi(a);
      setSurfaceMoisture(m);
      setLiveLoading(false);
    })();
    return () => { cancelled = true; };
  }, [parcel, ring, nonce]);

  return {
    gee, geeLoading,
    timeseries, tsLoading,
    soil, soilLoading,
    weather, aqi, surfaceMoisture, liveLoading,
    refresh,
  };
}
