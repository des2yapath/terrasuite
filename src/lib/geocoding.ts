// Map geocoding via Open-Meteo Geocoding API (free, keyless, CORS-enabled).
// Replaces the reference app's Mapbox geocoding edge function.

export interface GeoPlace {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
  /** Human-readable label built from components. */
  label: string;
}

interface OMRaw {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  country_code?: string;
  admin1?: string;
  admin2?: string;
}

function toPlace(raw: OMRaw): GeoPlace {
  const parts = [raw.name, raw.admin1, raw.country].filter(Boolean);
  return {
    id: raw.id,
    name: raw.name,
    latitude: raw.latitude,
    longitude: raw.longitude,
    country: raw.country,
    admin1: raw.admin1,
    label: parts.join(", "),
  };
}

/** Forward search. Empty array on failure — never throws. */
export async function searchPlaces(query: string, limit = 5): Promise<GeoPlace[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  try {
    const url =
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}` +
      `&count=${limit}&language=en&format=json`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = (await res.json()) as { results?: OMRaw[] };
    return (data.results ?? []).map(toPlace);
  } catch {
    return [];
  }
}
