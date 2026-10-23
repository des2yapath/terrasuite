// MapLibre GL setup + lifecycle helpers shared by the workspace map
// (Module 03) and the crop-plan minimap (Module 10).

import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { esriSatelliteStyle } from "@/map-styles/esri-satellite";
import { cartoDarkStyle } from "@/map-styles/carto-dark";
import type { BasemapStyle } from "@/components/MapToolbar";

export { maplibregl };

export const BASEMAP_STYLES: Record<BasemapStyle, maplibregl.StyleSpecification> = {
  satellite: esriSatelliteStyle,
  dark: cartoDarkStyle,
};

/** Default map position: Ebro valley, Spain (reference app's home). */
export const DEFAULT_POSITION = { lng: -0.8, lat: 39.5, zoom: 9, bearing: 0, pitch: 0 };

const MAP_POS_KEY = "terrasuite-map-pos-v1";

export interface SavedMapPosition {
  lng: number;
  lat: number;
  zoom: number;
  bearing: number;
  pitch: number;
}

export function saveMapPosition(map: maplibregl.Map): void {
  const center = map.getCenter();
  const pos: SavedMapPosition = {
    lng: center.lng,
    lat: center.lat,
    zoom: map.getZoom(),
    bearing: map.getBearing(),
    pitch: map.getPitch(),
  };
  try {
    localStorage.setItem(MAP_POS_KEY, JSON.stringify(pos));
  } catch { /* best-effort */ }
}

export function loadMapPosition(): SavedMapPosition {
  try {
    const raw = localStorage.getItem(MAP_POS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SavedMapPosition;
      if (
        typeof parsed.lng === "number" && typeof parsed.lat === "number" &&
        typeof parsed.zoom === "number"
      ) {
        return { ...DEFAULT_POSITION, ...parsed };
      }
    }
  } catch { /* fall through */ }
  return DEFAULT_POSITION;
}

/**
 * Satellite imagery can be very busy visually; the CARTO raster style has no
 * labels to hide, but if a vector style is ever swapped in, this removes
 * POI/road-label clutter. Kept for future-proofing.
 */
export function hideLabelClutter(map: maplibregl.Map): void {
  const style = map.getStyle();
  if (!style?.layers) return;
  style.layers.forEach((layer) => {
    if (
      typeof layer.id === "string" &&
      (layer.id.includes("label") || layer.id.includes("poi") || layer.id.includes("place-"))
    ) {
      try {
        map.setLayoutProperty(layer.id, "visibility", "none");
      } catch { /* layer may not support it */ }
    }
  });
}

/** Standard map options for all TerraSuite map instances. */
export function makeMapOptions(
  container: HTMLElement,
  style: maplibregl.StyleSpecification,
  center: [number, number],
  zoom: number,
): maplibregl.MapOptions {
  return {
    container,
    style,
    center,
    zoom,
    attributionControl: { compact: true }, // VISIBLE — required by Esri/CARTO terms
  };
}

/** Placeholder for future MapView imperative handle (flyTo etc.). */
export type MapHandle = maplibregl.Map | null;
