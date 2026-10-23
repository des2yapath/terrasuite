// Domain model for a land parcel. "Parcel" everywhere in TerraSuite
// (the reference codebase called this "Field" — renamed to avoid confusion
// with form fields and to match the synopsis wording "land parcel").

export type LngLat = [number, number];
/** GeoJSON Polygon: array of rings; we always use one outer ring. */
export type PolygonCoordinates = LngLat[][];

export interface Parcel {
  /** Client-generated stable id, e.g. `custom-1690000000` — the DB key (user_id, client_id). */
  id: string;
  name: string;
  /** Area in HECTARES (internal unit; all UI displays acres via haToAcres). */
  area: number;
  crop: string;
  cropEmoji?: string;
  location: string;
  color: string;
  ndviChange?: number;
  group?: string;
  /** GeoJSON polygon ring(s), first coordinate repeated at the end. */
  coordinates: PolygonCoordinates;
}

/** Hectares → acres, one decimal. */
export function haToAcres(ha: number): number {
  return Math.round(ha * 2.47105 * 10) / 10;
}

/** Acres → hectares, one decimal. */
export function acresToHa(acres: number): number {
  return Math.round((acres / 2.47105) * 10) / 10;
}

/** Centroid of the outer ring (mean of vertices — fine for small parcels). */
export function parcelCenter(p: Parcel): { lat: number; lng: number } {
  const ring = p.coordinates[0];
  const first = ring[0];
  const last = ring[ring.length - 1];
  const isClosed = ring.length > 3 && first[0] === last[0] && first[1] === last[1];
  const coords = isClosed ? ring.slice(0, -1) : ring;
  const lat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
  const lng = coords.reduce((s, c) => s + c[0], 0) / coords.length;
  return { lat, lng };
}

/** Bounding box of the outer ring. */
export function parcelBounds(p: Parcel): { minLng: number; maxLng: number; minLat: number; maxLat: number } {
  const coords = p.coordinates[0];
  const lngs = coords.map((c) => c[0]);
  const lats = coords.map((c) => c[1]);
  return {
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
  };
}

/**
 * Approximate area in hectares via the shoelace formula with a
 * degrees→meters conversion at the parcel's latitude.
 * (Used by the New Parcel dialog to pre-fill the area field; the user can
 * override it, so a few % error is acceptable — same approach as reference.)
 */
export function estimateAreaHa(coords: LngLat[]): number {
  if (coords.length < 3) return 0;
  const lat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
  const metersPerLat = 111_320;
  const metersPerLng = 111_320 * Math.cos((lat * Math.PI) / 180);
  let areaM2 = 0;
  for (let i = 0; i < coords.length; i++) {
    const [lng1, lat1] = coords[i];
    const [lng2, lat2] = coords[(i + 1) % coords.length];
    areaM2 += (lng1 * metersPerLng) * (lat2 * metersPerLat) - (lng2 * metersPerLng) * (lat1 * metersPerLat);
  }
  areaM2 = Math.abs(areaM2) / 2;
  return Math.round((areaM2 / 10_000) * 10) / 10;
}
