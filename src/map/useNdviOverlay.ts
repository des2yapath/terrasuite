// NDVI raster overlay for the workspace map.
// Fetches a global NDVI tile URL (via gee-ndvi-tiles) once, then adds a
// MapLibre raster layer at 55% opacity BELOW parcel layers, so parcels
// always stay visible. Toggle hides via visibility (tiles stay cached).

import { useEffect, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import { invokeWithRetry } from "@/lib/gee";
import { parcelLayerIds } from "@/map/parcel-layers";
import { toast } from "sonner";

const NDVI_SOURCE = "gee-ndvi-source";
const NDVI_LAYER = "gee-ndvi-layer";

interface UseNdviOverlayOptions {
  mapRef: React.RefObject<maplibregl.Map | null>;
  mapLoaded: boolean;
  /** First parcel's fill layer id — NDVI inserts below it. */
  firstParcelId?: string;
}

export function useNdviOverlay({ mapRef, mapLoaded, firstParcelId }: UseNdviOverlayOptions) {
  const [showNdvi, setShowNdvi] = useState(false);
  const [tileUrl, setTileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchTileUrl = useCallback(async (): Promise<string | null> => {
    setLoading(true);
    try {
      const data = await invokeWithRetry<{ tileUrl?: string; error?: string }>("gee-ndvi-tiles", undefined, {
        retries: 3,
        isEmpty: (d) => !(d as { tileUrl?: string })?.tileUrl,
      });
      const url = data?.tileUrl ?? null;
      if (url) {
        setTileUrl(url);
        toast.success("NDVI layer loaded");
      } else {
        toast.error("Failed to load NDVI tiles");
        setShowNdvi(false);
      }
      return url;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (!showNdvi) {
      try { if (map.getLayer(NDVI_LAYER)) map.setLayoutProperty(NDVI_LAYER, "visibility", "none"); } catch { /* */ }
      return;
    }

    // Already present → just show
    if (map.getLayer(NDVI_LAYER)) {
      try { map.setLayoutProperty(NDVI_LAYER, "visibility", "visible"); } catch { /* */ }
      return;
    }

    if (!tileUrl) {
      fetchTileUrl();
      return;
    }

    // Add source if missing
    if (!map.getSource(NDVI_SOURCE)) {
      map.addSource(NDVI_SOURCE, { type: "raster", tiles: [tileUrl], tileSize: 256 });
    }

    // Insert below first parcel fill (or on top of basemap)
    const before =
      firstParcelId && map.getLayer(parcelLayerIds(firstParcelId).fillId)
        ? parcelLayerIds(firstParcelId).fillId
        : undefined;
    map.addLayer(
      {
        id: NDVI_LAYER,
        type: "raster",
        source: NDVI_SOURCE,
        paint: { "raster-opacity": 0.55 },
        layout: { visibility: "visible" },
      },
      before,
    );
  }, [showNdvi, mapLoaded, tileUrl, firstParcelId, fetchTileUrl, mapRef]);

  /** Basemap style changes wipe layers — call this from style.load. */
  const reapplyAfterStyleChange = useCallback(() => {
    const map = mapRef.current;
    if (!map || !showNdvi || !tileUrl) return;
    if (!map.getSource(NDVI_SOURCE)) {
      map.addSource(NDVI_SOURCE, { type: "raster", tiles: [tileUrl], tileSize: 256 });
    }
    if (!map.getLayer(NDVI_LAYER)) {
      const before =
        firstParcelId && map.getLayer(parcelLayerIds(firstParcelId).fillId)
          ? parcelLayerIds(firstParcelId).fillId
          : undefined;
      map.addLayer(
        { id: NDVI_LAYER, type: "raster", source: NDVI_SOURCE, paint: { "raster-opacity": 0.55 }, layout: { visibility: "visible" } },
        before,
      );
    }
  }, [showNdvi, tileUrl, firstParcelId, mapRef]);

  const toggle = useCallback(() => setShowNdvi((v) => !v), []);

  return { showNdvi, toggle, loading, reapplyAfterStyleChange };
}
