import { useEffect, useRef, useState, useCallback } from "react";
import { maplibregl, BASEMAP_STYLES, loadMapPosition, saveMapPosition } from "@/map/map-setup";
import { renderParcelLayers, removeParcelLayers, parcelLayerIds, updateParcelGeometry } from "@/map/parcel-layers";
import {
  addVertex, undoVertex, closeRing, clearDrawPreview, renderDrawPreview, makeDrawKeyHandler, DRAW_COLOR,
} from "@/map/draw";
import SearchBar from "@/components/SearchBar";
import MapToolbar, { type BasemapStyle } from "@/components/MapToolbar";
import NewParcelDialog from "@/components/NewParcelDialog";
import MobileDrawPrompt from "@/components/MobileDrawPrompt";
import NdviLegend from "@/components/NdviLegend";
import { useNdviOverlay } from "@/map/useNdviOverlay";
import { useIsMobile } from "@/hooks/use-mobile";
import { useParcels } from "@/state/ParcelsProvider";
import type { Parcel } from "@/data/parcel";

interface MapViewProps {
  onParcelClickOnMap?: (parcel: Parcel) => void;
}

const MapView = ({ onParcelClickOnMap }: MapViewProps) => {
  const {
    parcels, selectedIds, activeParcel, flyToParcel, requestFlyTo,
    addParcel, saveParcel, editBoundaryParcelId, setEditBoundaryParcelId,
  } = useParcels();
  const isMobile = useIsMobile();

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showParcels, setShowParcels] = useState(true);
  const [basemap, setBasemap] = useState<BasemapStyle>("satellite");

  // Drawing state
  const [drawMode, setDrawMode] = useState(false);
  const [drawVertices, setDrawVertices] = useState<[number, number][]>([]);
  const [showNewParcelDialog, setShowNewParcelDialog] = useState(false);
  const ndvi = useNdviOverlay({ mapRef, mapLoaded, firstParcelId: parcels[0]?.id });

  // Refs for stable handlers
  const parcelsRef = useRef(parcels);
  const selectedIdsRef = useRef(selectedIds);
  const clickHandlerRef = useRef(onParcelClickOnMap);
  const drawModeRef = useRef(false);
  const editBoundaryRef = useRef<string | null>(null);
  useEffect(() => { parcelsRef.current = parcels; }, [parcels]);
  useEffect(() => { selectedIdsRef.current = selectedIds; }, [selectedIds]);
  useEffect(() => { clickHandlerRef.current = onParcelClickOnMap; }, [onParcelClickOnMap]);
  useEffect(() => { drawModeRef.current = drawMode; }, [drawMode]);
  useEffect(() => { editBoundaryRef.current = editBoundaryParcelId; }, [editBoundaryParcelId]);

  /* ── Map lifecycle (created once) ─────────────────────────────── */
  useEffect(() => {
    if (!containerRef.current) return;
    const pos = loadMapPosition();
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASEMAP_STYLES.satellite,
      center: [pos.lng, pos.lat],
      zoom: pos.zoom,
      bearing: pos.bearing,
      pitch: pos.pitch,
      attributionControl: { compact: true },
      doubleClickZoom: false,
    });
    mapRef.current = map;

    map.on("load", () => setMapLoaded(true));
    map.on("moveend", () => saveMapPosition(map));

    map.on("mousemove", (e) => {
      if (drawModeRef.current) { map.getCanvas().style.cursor = "crosshair"; return; }
      const layers = parcelsRef.current
        .map((p) => parcelLayerIds(p.id).fillId)
        .filter((id) => { try { return !!map.getLayer(id); } catch { return false; } });
      map.getCanvas().style.cursor =
        layers.length > 0 && map.queryRenderedFeatures(e.point, { layers }).length > 0 ? "pointer" : "";
    });

    map.on("click", (e) => {
      // Drawing mode consumes clicks as vertices
      if (drawModeRef.current) {
        setDrawVertices((prev) => addVertex(prev, [e.lngLat.lng, e.lngLat.lat]));
        return;
      }
      // Boundary editing ignores parcel selection
      if (editBoundaryRef.current) return;
      const layers = parcelsRef.current
        .map((p) => parcelLayerIds(p.id).fillId)
        .filter((id) => { try { return !!map.getLayer(id); } catch { return false; } });
      if (layers.length === 0) return;
      const features = map.queryRenderedFeatures(e.point, { layers });
      if (features.length > 0) {
        const id = features[0].properties?.parcelId as string | undefined;
        const parcel = parcelsRef.current.find((p) => p.id === id);
        if (parcel) clickHandlerRef.current?.(parcel);
      }
    });

    return () => { map.remove(); mapRef.current = null; setMapLoaded(false); };
  }, []);

  /* ── Parcel layer rendering ───────────────────────────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !map.isStyleLoaded()) return;
    const liveIds = new Set(parcels.map((p) => p.id));
    parcelsRef.current.forEach((p) => { if (!liveIds.has(p.id)) removeParcelLayers(map, p.id); });
    parcels.forEach((p) => renderParcelLayers(map, p, selectedIds.includes(p.id)));
  }, [parcels, selectedIds, mapLoaded]);

  /* ── Visibility toggle ────────────────────────────────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    parcels.forEach((p) => {
      const { fillId, lineId } = parcelLayerIds(p.id);
      const vis = showParcels ? "visible" : "none";
      try { if (map.getLayer(fillId)) map.setLayoutProperty(fillId, "visibility", vis); } catch { /* */ }
      try { if (map.getLayer(lineId)) map.setLayoutProperty(lineId, "visibility", vis); } catch { /* */ }
    });
  }, [showParcels, mapLoaded, parcels]);

  /* ── Fly-to ───────────────────────────────────────────────────── */
  useEffect(() => {
    if (!flyToParcel || !mapRef.current) return;
    const coords = flyToParcel.coordinates[0];
    const lat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
    const lng = coords.reduce((s, c) => s + c[0], 0) / coords.length;
    mapRef.current.flyTo({ center: [lng, lat], zoom: 16, duration: 1500 });
    requestFlyTo(null);
  }, [flyToParcel, requestFlyTo]);

  /* ── Drawing: preview + keyboard ───────────────────────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    if (!drawMode) {
      map.getCanvas().style.cursor = "";
      clearDrawPreview(map);
      return;
    }
    map.getCanvas().style.cursor = "crosshair";
    renderDrawPreview(map, drawVertices);

    const onKey = makeDrawKeyHandler({
      onUndo: () => setDrawVertices((prev) => undoVertex(prev)),
      onCancel: () => { setDrawMode(false); setDrawVertices([]); },
      onEnter: () => setDrawVertices((prev) => {
        if (prev.length >= 3) { setDrawMode(false); setShowNewParcelDialog(true); }
        return prev;
      }),
    });
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawMode, drawVertices, mapLoaded]);

  /* ── Boundary editing: draggable vertex markers ────────────────── */
  const boundaryMarkersRef = useRef<maplibregl.Marker[]>([]);
  useEffect(() => {
    const markers = boundaryMarkersRef.current;
    markers.forEach((m) => m.remove());
    markers.length = 0;
    const map = mapRef.current;
    if (!editBoundaryParcelId || !map || !mapLoaded) return;
    const parcel = parcels.find((p) => p.id === editBoundaryParcelId);
    if (!parcel) return;

    const coords = parcel.coordinates[0];
    const currentCoords = [...coords] as [number, number][];

    const updateLivePolygon = () => {
      updateParcelGeometry(map, parcel.id, [currentCoords]);
    };

    // Skip the duplicated closing vertex (index 0 == last)
    coords.slice(0, -1).forEach((coord, i) => {
      const el = document.createElement("div");
      Object.assign(el.style, {
        width: "14px",
        height: "14px",
        borderRadius: "50%",
        border: "2px solid white",
        backgroundColor: parcel.color,
        cursor: "grab",
        boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
      });
      const marker = new maplibregl.Marker({ element: el, draggable: true })
        .setLngLat(coord)
        .addTo(map);
      marker.on("drag", () => {
        const ll = marker.getLngLat();
        currentCoords[i] = [ll.lng, ll.lat];
        if (i === 0) currentCoords[currentCoords.length - 1] = [ll.lng, ll.lat];
        updateLivePolygon();
      });
      marker.on("dragend", () => {
        const ll = marker.getLngLat();
        const nc = [...currentCoords] as [number, number][];
        nc[i] = [ll.lng, ll.lat];
        if (i === 0) nc[nc.length - 1] = [ll.lng, ll.lat];
        saveParcel({ ...parcel, coordinates: [nc] });
      });
      markers.push(marker);
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === "Escape") setEditBoundaryParcelId(null);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      markers.forEach((m) => m.remove());
      markers.length = 0;
      document.removeEventListener("keydown", onKey);
    };
  }, [editBoundaryParcelId, mapLoaded, parcels, saveParcel, setEditBoundaryParcelId]);

  /* ── Handlers ──────────────────────────────────────────────────── */
  const handleStyleChange = (style: BasemapStyle) => {
    const map = mapRef.current;
    if (!map) return;
    setBasemap(style);
    setMapLoaded(false);
    map.setStyle(BASEMAP_STYLES[style]);
    map.once("style.load", () => {
      setMapLoaded(true);
      parcelsRef.current.forEach((p) =>
        renderParcelLayers(map, p, selectedIdsRef.current.includes(p.id)),
      );
      if (drawModeRef.current) renderDrawPreview(map, drawVertices);
      ndvi.reapplyAfterStyleChange();
    });
  };

  const handleToggleDraw = () => {
    if (drawMode) { setDrawMode(false); setDrawVertices([]); }
    else { setDrawMode(true); setDrawVertices([]); setEditBoundaryParcelId(null); }
  };

  const handleSaveNewParcel = (parcel: Parcel) => {
    addParcel(parcel);
    setShowNewParcelDialog(false);
    setDrawVertices([]);
    const map = mapRef.current;
    if (map) clearDrawPreview(map);
  };

  const handleLocationSelect = (lng: number, lat: number) => {
    mapRef.current?.flyTo({ center: [lng, lat], zoom: 13, duration: 2000 });
  };

  const handleLocateUser = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => mapRef.current?.flyTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 15, duration: 2000 }),
      (err) => console.warn("Geolocation error:", err.message),
    );
  };

  /* ── Render ────────────────────────────────────────────────────── */
  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" aria-label="Map" />
      <SearchBar onLocationSelect={handleLocationSelect} />
      {ndvi.showNdvi && <NdviLegend />}

      <MapToolbar
        onZoomIn={() => mapRef.current?.zoomIn()}
        onZoomOut={() => mapRef.current?.zoomOut()}
        onStyleChange={handleStyleChange}
        onToggleParcels={() => setShowParcels((v) => !v)}
        onResetNorth={() => mapRef.current?.easeTo({ bearing: 0, pitch: 0, duration: 500 })}
        onLocateUser={handleLocateUser}
        showParcels={showParcels}
        defaultStyle={basemap}
        /* Module 04 extensions */
        onToggleDraw={handleToggleDraw}
        isDrawing={drawMode}
        onEditBoundary={() => setEditBoundaryParcelId(null)}
        isEditingBoundary={!!editBoundaryParcelId}
        onToggleNdvi={ndvi.toggle}
        showNdvi={ndvi.showNdvi}
      />

      {/* Desktop drawing hint */}
      {drawMode && !isMobile && (
        <div className="absolute bottom-6 left-4 z-10 bg-card/90 backdrop-blur-sm rounded-lg border border-border px-4 py-2.5 text-xs text-foreground space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: DRAW_COLOR }} />
            <span className="font-medium">Drawing Mode</span>
          </div>
          <div className="text-muted-foreground">Click to add boundary points · <kbd className="px-1 py-0.5 rounded bg-muted text-[10px]">Backspace</kbd> to undo</div>
          <div className="text-muted-foreground"><kbd className="px-1 py-0.5 rounded bg-muted text-[10px]">Enter</kbd> to save · <kbd className="px-1 py-0.5 rounded bg-muted text-[10px]">Esc</kbd> to exit</div>
        </div>
      )}

      {/* Mobile drawing controls */}
      {drawMode && isMobile && (
        <MobileDrawPrompt
          vertexCount={drawVertices.length}
          onSave={() => { if (drawVertices.length >= 3) { setDrawMode(false); setShowNewParcelDialog(true); } }}
          onCancel={() => { setDrawMode(false); setDrawVertices([]); }}
          onUndo={() => setDrawVertices((prev) => undoVertex(prev))}
        />
      )}

      {/* Boundary editing hint */}
      {editBoundaryParcelId && (
        <div className={`absolute ${isMobile ? "bottom-24" : "bottom-6"} left-4 z-10 bg-card/90 backdrop-blur-sm rounded-lg border border-border px-4 py-2.5 text-xs text-foreground space-y-1`}>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: DRAW_COLOR }} />
            <span className="font-medium">Editing Boundary</span>
          </div>
          <div className="text-muted-foreground">Drag vertices to reshape</div>
          <button onClick={() => setEditBoundaryParcelId(null)}
            className="mt-1 px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs">Done</button>
        </div>
      )}

      {/* New parcel dialog */}
      {showNewParcelDialog && drawVertices.length >= 3 && (
        <NewParcelDialog
          coordinates={drawVertices}
          existingColors={parcels.map((p) => p.color)}
          onSave={handleSaveNewParcel}
          onCancel={() => { setShowNewParcelDialog(false); setDrawVertices([]); const m = mapRef.current; if (m) clearDrawPreview(m); }}
        />
      )}
    </div>
  );
};

export default MapView;
