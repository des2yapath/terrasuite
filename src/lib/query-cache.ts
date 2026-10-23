/**
 * localStorage-backed TTL cache shared by all data views.
 * Keys store: { [id: string]: { data: T, timestamp: number } }
 * Consumers: NDVI stats, soil, GEE analytics, NDVI timeseries, crop plans,
 * AI analysis text (Module 05–09).
 */

export interface CachedEntry<T> {
  data: T;
  timestamp: number;
}

export type LocalCache<T> = Record<string, CachedEntry<T>>;

export function getLocalCache<T>(key: string): LocalCache<T> {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as LocalCache<T>) : {};
  } catch {
    return {};
  }
}

export function setLocalCache<T>(key: string, id: string, data: T): void {
  const cache = getLocalCache<T>(key);
  cache[id] = { data, timestamp: Date.now() };
  try {
    localStorage.setItem(key, JSON.stringify(cache));
  } catch {
    // Quota exceeded — drop the cache entirely rather than fail the caller.
    try { localStorage.removeItem(key); } catch { /* noop */ }
  }
}

export function getFreshLocalCacheValue<T>(key: string, id: string, ttlMs: number): T | null {
  const cache = getLocalCache<T>(key);
  const entry = cache[id];
  if (!entry) return null;
  return Date.now() - entry.timestamp < ttlMs ? entry.data : null;
}

/* ------------------------------------------------------------------ */
/* Payload predicates — distinguish "real data" from "graceful        */
/* fallback" responses that edge functions return with HTTP 200.       */
/* ------------------------------------------------------------------ */

export interface FallbackPayload {
  fallback: true;
  error?: string;
  message?: string;
}

export function isFallbackPayload(value: unknown): value is FallbackPayload {
  return (
    !!value &&
    typeof value === "object" &&
    (value as { fallback?: boolean }).fallback === true
  );
}

export function hasGeeAnalyticsPayload(value: unknown): boolean {
  if (!value || typeof value !== "object" || isFallbackPayload(value)) return false;
  const payload = value as Record<string, unknown>;
  return !!(payload.land_use || payload.vegetation || payload.suitability || payload.growth_stage);
}

export function hasSoilPayload(value: unknown): boolean {
  if (!value || typeof value !== "object" || isFallbackPayload(value)) return false;
  const payload = value as Record<string, unknown>;
  return !!(payload.classification && payload.metrics && payload.texture && payload.water_retention);
}

export function hasNdviPayload(value: unknown): boolean {
  if (!value || typeof value !== "object" || isFallbackPayload(value)) return false;
  const payload = value as Record<string, unknown>;
  return typeof payload.mean_ndvi === "number" || Array.isArray(payload.timeseries);
}
