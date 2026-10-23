// Shared GEE infrastructure for ALL TerraSuite edge functions.
// Supabase edge functions are Deno — no npm; imports use URL scheme.
//
// Contents:
//   1. CORS headers
//   2. Polygon validation (identical rules everywhere)
//   3. Service-account JWT minting → OAuth token exchange (with cache)
//   4. Expression flattener: nested GEE function-invocation tree → REST DAG
//   5. computeValue: value:compute with retry/backoff + timeout
//   6. Geometry/reducer/image-collection expression builders

/* ══════════════════ 1. CORS ══════════════════ */

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export function corsOptions(): Response {
  return new Response(null, { headers: corsHeaders });
}

export function jsonResponse(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extra },
  });
}

/* ══════════════════ 2. Polygon validation ══════════════════ */

export type LngLat = [number, number];

export function validatePolygon(coords: unknown): string | null {
  if (!Array.isArray(coords) || coords.length < 3) return "Polygon must have at least 3 vertices";
  if (coords.length > 500) return "Polygon exceeds maximum 500 vertices";
  for (const c of coords) {
    if (!Array.isArray(c) || c.length < 2) return "Invalid coordinate pair";
    const [lon, lat] = c;
    if (typeof lon !== "number" || typeof lat !== "number" || !isFinite(lon) || !isFinite(lat))
      return "Coordinates must be finite numbers";
    if (lon < -180 || lon > 180 || lat < -90 || lat > 90) return "Coordinates out of geographic range";
  }
  return null;
}

/** Accepts either a raw ring array or a GeoJSON Polygon object. */
export function extractRing(polygon: unknown): LngLat[] | null {
  if (!polygon) return null;
  if (typeof polygon === "object" && !Array.isArray(polygon)) {
    const p = polygon as { type?: string; coordinates?: unknown };
    if (p.type === "Polygon" && Array.isArray(p.coordinates) && Array.isArray(p.coordinates[0])) {
      return p.coordinates[0] as LngLat[];
    }
    return null;
  }
  if (Array.isArray(polygon) && polygon.length >= 3) return polygon as LngLat[];
  return null;
}

/* ══════════════════ 3. GEE auth ══════════════════ */

const TOKEN_REFRESH_SKEW_MS = 60_000;
let cachedToken: { token: string; expiresAt: number } | null = null;

function base64url(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function createJwt(email: string, privateKeyPem: string, scopes: string[]): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: email,
    scope: scopes.join(" "),
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const enc = new TextEncoder();
  const headerB64 = base64url(enc.encode(JSON.stringify(header)));
  const payloadB64 = base64url(enc.encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;
  const pemBody = privateKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");
  const keyBytes = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8", keyBytes, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, enc.encode(unsignedToken)));
  return `${unsignedToken}.${base64url(sig)}`;
}

export async function getGeeAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + TOKEN_REFRESH_SKEW_MS) {
    return cachedToken.token;
  }
  const raw = Deno.env.get("GEE_SERVICE_ACCOUNT_JSON");
  if (!raw) throw new Error("GEE_SERVICE_ACCOUNT_JSON secret not configured");
  const sa = JSON.parse(raw) as { client_email: string; private_key: string };
  const jwt = await createJwt(sa.client_email, sa.private_key, ["https://www.googleapis.com/auth/earthengine"]);
  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  if (!resp.ok) throw new Error(`OAuth failed: ${await resp.text()}`);
  const json = await resp.json() as { access_token: string; expires_in?: number };
  cachedToken = { token: json.access_token, expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000 };
  return cachedToken.token;
}

export function getProjectId(): string {
  return Deno.env.get("GEE_PROJECT_ID") || "earthengine-legacy";
}

/* ══════════════════ 4. Expression flattener ══════════════════ */
/**
 * GEE REST value:compute expects a DAG: { values: { _0: expr, _1: expr },
 * result: "_N" } where nested invocations reference earlier nodes via
 * { valueReference: "_K" }. This converts the human-friendly nested form
 * used in the builders below.
 */
export interface GeeExpression { [k: string]: unknown }

export function flattenExpression(nested: unknown): { values: Record<string, unknown>; result: string } {
  const values: Record<string, unknown> = {};
  let counter = 0;
  function flatten(node: unknown): string {
    if (node === null || node === undefined) {
      const k = `_${counter++}`; values[k] = { constantValue: null }; return k;
    }
    if (typeof node === "object" && node !== null && "functionInvocationValue" in (node as Record<string, unknown>)) {
      const fiv = (node as { functionInvocationValue: { functionName: string; arguments: Record<string, unknown> } })
        .functionInvocationValue;
      const flatArgs: Record<string, unknown> = {};
      for (const [argName, argVal] of Object.entries(fiv.arguments || {})) {
        flatArgs[argName] = { valueReference: flatten(argVal) };
      }
      const k = `_${counter++}`;
      values[k] = { functionInvocationValue: { functionName: fiv.functionName, arguments: flatArgs } };
      return k;
    }
    if (typeof node === "object" && node !== null && "constantValue" in (node as Record<string, unknown>)) {
      const k = `_${counter++}`;
      values[k] = { constantValue: (node as { constantValue: unknown }).constantValue };
      return k;
    }
    const k = `_${counter++}`; values[k] = { constantValue: node }; return k;
  }
  return { values, result: flatten(nested) };
}

/* ══════════════════ 5. value:compute with retry ══════════════════ */

const GEE_RETRY_DELAYS_MS = [800, 1800, 4000];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function computeValue(token: string, projectId: string, expr: unknown, timeoutMs = 15_000): Promise<unknown> {
  const flat = flattenExpression(expr);
  let lastError = "";
  for (let attempt = 0; attempt <= GEE_RETRY_DELAYS_MS.length; attempt++) {
    try {
      const resp = await fetch(
        `https://earthengine.googleapis.com/v1/projects/${projectId}/value:compute`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ expression: flat }),
          signal: AbortSignal.timeout(timeoutMs),
        },
      );
      if (resp.ok) return await resp.json();
      lastError = await resp.text();
      const retryable = resp.status === 429 || resp.status >= 500 || lastError.includes("RESOURCE_EXHAUSTED");
      if (retryable && attempt < GEE_RETRY_DELAYS_MS.length) {
        await sleep(GEE_RETRY_DELAYS_MS[attempt] + Math.floor(Math.random() * 300));
        continue;
      }
      if (retryable) throw new Error(`GEE_RATE_LIMITED: ${lastError}`);
      console.error("GEE compute error:", resp.status, lastError);
      throw new Error(`GEE compute failed (${resp.status}): ${lastError}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const retryable =
        message.includes("GEE_RATE_LIMITED") || message.includes("AbortError") ||
        message.includes("TimeoutError") || message.includes("timed out") ||
        message.includes("fetch") || message.includes("network");
      if (retryable && attempt < GEE_RETRY_DELAYS_MS.length) {
        await sleep(GEE_RETRY_DELAYS_MS[attempt] + Math.floor(Math.random() * 300));
        continue;
      }
      if (message.includes("GEE_RATE_LIMITED") || message.includes("RESOURCE_EXHAUSTED")) {
        throw new Error(`GEE_RATE_LIMITED: ${lastError || message}`);
      }
      throw error instanceof Error ? error : new Error(message);
    }
  }
  throw new Error(`GEE_RATE_LIMITED: ${lastError || "compute failed after retries"}`);
}

/* ══════════════════ 6. Expression builders ══════════════════ */

/** GeometryConstructors.Polygon from a ring. */
export function makeGeometry(coords: LngLat[]): GeeExpression {
  return {
    functionInvocationValue: {
      functionName: "GeometryConstructors.Polygon",
      arguments: {
        coordinates: { constantValue: [coords] },
        geodesic: { constantValue: false },
        evenOdd: { constantValue: true },
      },
    },
  };
}

/** Image.reduceRegion expression. */
export function reduceRegion(
  image: GeeExpression, geometry: GeeExpression, reducerName: string, scale = 10,
): GeeExpression {
  return {
    functionInvocationValue: {
      functionName: "Image.reduceRegion",
      arguments: {
        image,
        reducer: { functionInvocationValue: { functionName: reducerName, arguments: {} } },
        geometry,
        scale: { constantValue: scale },
        maxPixels: { constantValue: 1_000_000_000 },
      },
    },
  };
}

/** Collection.filter with Filter.dateRangeContains. */
export function filterByDate(collection: GeeExpression, startDate: string, endDate: string): GeeExpression {
  return {
    functionInvocationValue: {
      functionName: "Collection.filter",
      arguments: {
        collection,
        filter: {
          functionInvocationValue: {
            functionName: "Filter.dateRangeContains",
            arguments: {
              leftValue: {
                functionInvocationValue: {
                  functionName: "DateRange",
                  arguments: { start: { constantValue: startDate }, end: { constantValue: endDate } },
                },
              },
              rightField: { constantValue: "system:time_start" },
            },
          },
        },
      },
    },
  };
}

/** Collection.filter with Filter.intersects(.geo, geometry). */
export function filterByBounds(collection: GeeExpression, geometry: GeeExpression): GeeExpression {
  return {
    functionInvocationValue: {
      functionName: "Collection.filter",
      arguments: {
        collection,
        filter: {
          functionInvocationValue: {
            functionName: "Filter.intersects",
            arguments: { leftField: { constantValue: ".geo" }, rightValue: geometry },
          },
        },
      },
    },
  };
}

/** Collection.filter with Filter.lessThan(field, value). */
export function filterLessThan(collection: GeeExpression, field: string, value: number): GeeExpression {
  return {
    functionInvocationValue: {
      functionName: "Collection.filter",
      arguments: {
        collection,
        filter: {
          functionInvocationValue: {
            functionName: "Filter.lessThan",
            arguments: { leftField: { constantValue: field }, rightValue: { constantValue: value } },
          },
        },
      },
    },
  };
}

/** Sentinel-2 SR collection load. */
export function loadS2(): GeeExpression {
  return {
    functionInvocationValue: {
      functionName: "ImageCollection.load",
      arguments: { id: { constantValue: "COPERNICUS/S2_SR" } },
    },
  };
}

/** Standard pipeline: S2 → date → bounds → cloud<20. */
export function s2Filtered(geometry: GeeExpression, startDate: string, endDate: string): GeeExpression {
  const collection = loadS2();
  const dateFiltered = filterByDate(collection, startDate, endDate);
  const boundsFiltered = filterByBounds(dateFiltered, geometry);
  return filterLessThan(boundsFiltered, "CLOUDY_PIXEL_PERCENTAGE", 20);
}

/** NDVI of an image (normalizedDifference B8, B4 — band names apply to raw S2). */
export function ndviOf(image: GeeExpression, bandA = "B8", bandB = "B4"): GeeExpression {
  return {
    functionInvocationValue: {
      functionName: "Image.normalizedDifference",
      arguments: { input: image, bandNames: { constantValue: [bandA, bandB] } },
    },
  };
}

/** Image.clip. */
export function clip(image: GeeExpression, geometry: GeeExpression): GeeExpression {
  return {
    functionInvocationValue: {
      functionName: "Image.clip",
      arguments: { input: image, geometry },
    },
  };
}
