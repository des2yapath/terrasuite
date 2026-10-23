// Reverse geocoding via BigDataCloud free client API (keyless, CORS).
// Returns a human-readable location for a coordinate; never throws —
// falls back to "lat, lng" formatted coordinates.

export interface ReverseResult {
  label: string;
}

export async function reverseGeocode(lat: number, lng: number): Promise<ReverseResult> {
  const fallback: ReverseResult = {
    label: `${lat.toFixed(3)}°N, ${lng.toFixed(3)}°E`,
  };
  try {
    const url =
      `https://api.bigdatacloud.net/data/reverse-geocode-client` +
      `?latitude=${lat}&longitude=${lng}&localityLanguage=en`;
    const res = await fetch(url);
    if (!res.ok) return fallback;
    const data = (await res.json()) as {
      locality?: string;
      city?: string;
      principalSubdivision?: string;
      countryName?: string;
    };
    const parts = [
      data.locality || data.city,
      data.principalSubdivision,
      data.countryName,
    ].filter(Boolean);
    if (parts.length === 0) return fallback;
    return { label: parts.join(", ") };
  } catch {
    return fallback;
  }
}
