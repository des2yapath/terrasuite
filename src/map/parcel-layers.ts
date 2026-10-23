// GeoJSON helpers for parcel rendering on MapLibre.

import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { Parcel, PolygonCoordinates } from "@/data/parcel";

export interface ParcelLayerIds {
  sourceId: string;
  fillId: string;
  lineId: string;
}

export function parcelLayerIds(parcelId: string): ParcelLayerIds {
  return {
    sourceId: `parcel-${parcelId}`,
    fillId: `parcel-fill-${parcelId}`,
    lineId: `parcel-line-${parcelId}`,
  };
}

export function parcelToFeature(parcel: Parcel): Feature<Geometry, { parcelId: string }> {
  return {
    type: "Feature",
    properties: { parcelId: parcel.id },
    geometry: {
      type: "Polygon",
      coordinates: parcel.coordinates as [number, number][][] ,
    },
  };
}

export function ringToFeature(
  parcelId: string,
  ring: [number, number][],
): Feature<Geometry, { parcelId: string }> {
  return {
    type: "Feature",
    properties: { parcelId },
    geometry: { type: "Polygon", coordinates: [ring] },
  };
}

export function pointsToFeatureCollection(
  points: [number, number][],
): FeatureCollection<Geometry> {
  return {
    type: "FeatureCollection",
    features: points.map((p) => ({
      type: "Feature",
      properties: {},
      geometry: { type: "Point", coordinates: p },
    })),
  };
}

/**
 * Add (or replace) a parcel's fill + line layers.
 * Fill opacity/line width vary by selection so the selected parcel pops.
 */
export function renderParcelLayers(
  map: import("maplibre-gl").Map,
  parcel: Parcel,
  selected: boolean,
  beforeLayerId?: string,
): void {
  const { sourceId, fillId, lineId } = parcelLayerIds(parcel.id);

  // Idempotent: remove existing layers/source first
  removeParcelLayers(map, parcel.id);

  map.addSource(sourceId, {
    type: "geojson",
    data: parcelToFeature(parcel),
  });

  const common = { source: sourceId } as const;
  map.addLayer(
    {
      ...common,
      id: fillId,
      type: "fill",
      paint: {
        "fill-color": parcel.color,
        "fill-opacity": selected ? 0.3 : 0.08,
      },
    } as Parameters<typeof map.addLayer>[0],
    beforeLayerId,
  );
  map.addLayer(
    {
      ...common,
      id: lineId,
      type: "line",
      paint: {
        "line-color": parcel.color,
        "line-width": selected ? 2.5 : 1,
        "line-opacity": selected ? 1 : 0.4,
      },
    } as Parameters<typeof map.addLayer>[0],
    beforeLayerId,
  );
}

export function removeParcelLayers(
  map: import("maplibre-gl").Map,
  parcelId: string,
): void {
  const { sourceId, fillId, lineId } = parcelLayerIds(parcelId);
  try { if (map.getLayer(fillId)) map.removeLayer(fillId); } catch { /* gone */ }
  try { if (map.getLayer(lineId)) map.removeLayer(lineId); } catch { /* gone */ }
  try { if (map.getSource(sourceId)) map.removeSource(sourceId); } catch { /* gone */ }
}

/** Update an existing parcel source's geometry (boundary drag editing). */
export function updateParcelGeometry(
  map: import("maplibre-gl").Map,
  parcelId: string,
  coordinates: PolygonCoordinates,
): void {
  const { sourceId } = parcelLayerIds(parcelId);
  const src = map.getSource(sourceId) as import("maplibre-gl").GeoJSONSource | undefined;
  if (!src) return;
  src.setData({
    type: "Feature",
    properties: { parcelId },
    geometry: { type: "Polygon", coordinates: coordinates as [number, number][][] },
  });
}
