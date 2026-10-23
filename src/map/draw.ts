// MapLibre drawing-mode state machine + preview rendering.
// Handles: vertex collection, live polygon preview (fill + dashed line +
// vertex points), keyboard controls (Enter=finish, Backspace=undo,
// Escape=cancel), and cleanup. UI prompts (desktop hint / mobile bar) are
// rendered by MapView, which consumes these helpers.

import type { maplibregl } from "@/map/map-setup";
import { pointsToFeatureCollection } from "@/map/parcel-layers";
import type { LngLat } from "@/data/parcel";

export const DRAW_COLOR = "#56B6C2";

export interface DrawPreview {
  vertices: [number, number][];
  /** True when >= 3 vertices — Enter will finish. */
  canFinish: boolean;
}

export function addVertex(vertices: [number, number][], lngLat: [number, number]): [number, number][] {
  return [...vertices, lngLat];
}

export function undoVertex(vertices: [number, number][]): [number, number][] {
  return vertices.length > 0 ? vertices.slice(0, -1) : vertices;
}

/** Closes the ring (first point appended) — required for GeoJSON Polygon. */
export function closeRing(vertices: [number, number][]): [number, number][] | null {
  if (vertices.length < 3) return null;
  return [...vertices, vertices[0]];
}

/* ── Map preview layers (ids fixed) ─────────────────────────────── */
const PREVIEW_SOURCE = "draw-preview";
const PREVIEW_POINTS_SOURCE = "draw-points";
const PREVIEW_FILL = "draw-fill";
const PREVIEW_LINE = "draw-line";
const PREVIEW_POINTS = "draw-points";

export function clearDrawPreview(map: maplibregl.Map): void {
  for (const layer of [PREVIEW_FILL, PREVIEW_LINE, PREVIEW_POINTS]) {
    try { if (map.getLayer(layer)) map.removeLayer(layer); } catch { /* */ }
  }
  for (const source of [PREVIEW_SOURCE, PREVIEW_POINTS_SOURCE]) {
    try { if (map.getSource(source)) map.removeSource(source); } catch { /* */ }
  }
}

/**
 * Render the current vertex set. < 2 vertices: points only.
 * >= 2 vertices: polygon preview (unclosed for 2, closed at >= 3) + points.
 * Idempotent: creates sources/layers on first call, setData afterwards.
 */
export function renderDrawPreview(map: maplibregl.Map, vertices: [number, number][]): void {
  clearDrawPreview(map);
  if (vertices.length === 0) return;

  const pointsData = pointsToFeatureCollection(vertices);

  if (vertices.length >= 2) {
    const closed = vertices.length >= 3 ? [...vertices, vertices[0]] : [...vertices, ...vertices];
    const polyData = {
      type: "Feature" as const,
      properties: {},
      geometry: { type: "Polygon" as const, coordinates: [closed] },
    };
    map.addSource(PREVIEW_SOURCE, { type: "geojson", data: polyData });
    map.addLayer({
      id: PREVIEW_FILL,
      type: "fill",
      source: PREVIEW_SOURCE,
      paint: { "fill-color": DRAW_COLOR, "fill-opacity": 0.2 },
    });
    map.addLayer({
      id: PREVIEW_LINE,
      type: "line",
      source: PREVIEW_SOURCE,
      paint: { "line-color": DRAW_COLOR, "line-width": 2, "line-dasharray": [2, 2] },
    });
  }

  map.addSource(PREVIEW_POINTS_SOURCE, { type: "geojson", data: pointsData });
  map.addLayer({
    id: PREVIEW_POINTS,
    type: "circle",
    source: PREVIEW_POINTS_SOURCE,
    paint: {
      "circle-radius": 5,
      "circle-color": DRAW_COLOR,
      "circle-stroke-width": 2,
      "circle-stroke-color": "#fff",
    },
  });
}

/** Keyboard handler factory: Enter/Backspace/Escape during draw mode. */
export function makeDrawKeyHandler(opts: {
  onUndo: () => void;
  onCancel: () => void;
  /** Enter pressed — MapView resolves current vertices from its own state. */
  onEnter: () => void;
}): (e: KeyboardEvent) => void {
  return (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      opts.onCancel();
    } else if (e.key === "Backspace") {
      e.preventDefault(); // keep the browser on the page
      opts.onUndo();
    } else if (e.key === "Enter") {
      e.preventDefault();
      opts.onEnter();
    }
  };
}
