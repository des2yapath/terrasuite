// CropPlanPanel — the plan visualization + export UI (Module 10).
// Layout:
//   ┌──────────────────────────────────────────┐
//   │ Plan minimap (satellite, dot-grid fill) │  second MapLibre instance
//   │ Legend chips (click to filter crops)     │
//   │ Zone allocation pie + per-zone cards     │
//   │ Intercropping pairs                      │
//   │ Rotation calendar (current season glow)  │
//   │ Summary + tips + scores                  │
//   │ [Export PDF] [Save plan to reports]      │
//   └──────────────────────────────────────────┘

import { useEffect, useMemo, useRef, useState } from "react";
import { maplibregl, BASEMAP_STYLES } from "@/map/map-setup";
import { ringBounds, buildPlanMarkers } from "@/map/plan-markers";
import { saveReport } from "@/services/reports-service";
import { exportPlanPdf } from "@/lib/plan-pdf";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Download, Save, Loader2, Sprout } from "lucide-react";
import { toast } from "sonner";
import type { CropPlan } from "@/lib/crop-engine";
import type { Parcel } from "@/data/parcel";

interface CropPlanPanelProps {
  parcel: Parcel;
  plan: CropPlan;
  planLoading: boolean;
  planSource: "local" | "ai" | null;
  planNotice: string | null;
}

export default function CropPlanPanel({ parcel, plan, planLoading, planSource, planNotice }: CropPlanPanelProps) {
  const miniMapRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [hiddenCrops, setHiddenCrops] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);

  const parcelId = parcel.id;
  const parcelCoordinates = parcel.coordinates;
  const ring = parcelCoordinates[0];
  const markers = useMemo(() => buildPlanMarkers(ring, plan), [ring, plan]);
  const visibleMarkers = useMemo(
    () => markers.filter((m) => !hiddenCrops.has(m.crop)),
    [markers, hiddenCrops],
  );

  const pieData = useMemo(
    () => plan.zones.map((z) => ({ name: z.crop, value: z.areaPct, color: z.color })),
    [plan],
  );

  /* ── Minimap lifecycle ── */
  useEffect(() => {
    if (!miniMapRef.current) return;
    const b = ringBounds(ring);
    const map = new maplibregl.Map({
      container: miniMapRef.current,
      style: BASEMAP_STYLES.satellite,
      attributionControl: { compact: true },
      interactive: true,
      doubleClickZoom: true,
    });
    mapRef.current = map;
    map.on("load", () => {
      map.fitBounds([[b.minLng, b.minLat], [b.maxLng, b.maxLat]], { padding: 20, duration: 0 });
      // Parcel outline
      map.addSource("plan-parcel", {
        type: "geojson",
        data: { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: parcelCoordinates } },
      });
      map.addLayer({
        id: "plan-parcel-line",
        type: "line",
        source: "plan-parcel",
        paint: { "line-color": "#ffffff", "line-width": 2 },
      });
    });
    return () => { map.remove(); mapRef.current = null; };
  }, [parcelId, parcelCoordinates, ring]);

  /* ── Dot markers (rebuild on filter change) ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = visibleMarkers.map((m) => {
      const el = document.createElement("div");
      Object.assign(el.style, {
        width: `${m.sizePx}px`,
        height: `${m.sizePx}px`,
        borderRadius: "50%",
        backgroundColor: m.color,
        boxShadow: "0 0 0 1px rgba(0,0,0,0.6)",
      });
      el.title = m.crop;
      return new maplibregl.Marker({ element: el }).setLngLat([m.lng, m.lat]).addTo(map);
    });
  }, [visibleMarkers, parcelId]);

  const toggleCrop = (crop: string) => {
    setHiddenCrops((prev) => {
      const next = new Set(prev);
      if (next.has(crop)) next.delete(crop); else next.add(crop);
      return next;
    });
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      exportPlanPdf(parcel, plan);
      toast.success("Crop plan exported as PDF");
    } catch (e) {
      toast.error("PDF export failed");
      console.error(e);
    } finally { setExporting(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveReport(parcel.id, "crop_plan", plan as unknown as Record<string, unknown>);
      toast.success("Plan saved to your reports");
    } catch {
      toast.error("Could not save the plan");
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Sprout className="w-4 h-4" /> Crop Plan
        </h3>
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
            planSource === "ai" ? "bg-primary/15 text-primary" : "bg-accent text-muted-foreground"
          }`}>
            {planSource === "ai" ? "AI plan" : "Local model"}
            {planLoading && <Loader2 className="inline w-3 h-3 ml-1 animate-spin" />}
          </span>
        </div>
      </div>

      {planNotice && <p className="text-[11px] text-muted-foreground">{planNotice}</p>}

      {/* Minimap with dot fill */}
      <div className="rounded-xl overflow-hidden border border-border h-56">
        <div ref={miniMapRef} className="w-full h-full" aria-label="Crop plan minimap" />
      </div>

      {/* Legend / crop filter */}
      <div className="flex flex-wrap gap-1.5">
        {plan.zones.map((z) => (
          <button
            key={z.id}
            onClick={() => toggleCrop(z.crop)}
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-[11px] border transition-opacity ${
              hiddenCrops.has(z.crop) ? "opacity-40 border-border" : "border-border/60"
            }`}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: z.color }} />
            {z.emoji} {z.crop}
          </button>
        ))}
      </div>

      {/* Zone pie + per-zone detail */}
      <div className="grid grid-cols-[140px_1fr] gap-3 items-start">
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={28} outerRadius={52} stroke="none">
                {pieData.map((d) => <Cell key={d.name} fill={d.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-2">
          {plan.zones.map((z) => (
            <div key={z.id} className="rounded-lg border border-border/60 p-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">{z.emoji} {z.crop} — {z.areaPct}%</span>
                <span className="text-muted-foreground">{z.season}</span>
              </div>
              <p className="text-muted-foreground mt-0.5">{z.reason}</p>
              <p className="text-muted-foreground/70 mt-0.5">
                spacing {z.spacingM} m · water {z.waterNeeds} · yield {z.yieldEst}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Intercropping */}
      {plan.intercropping.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Intercropping</h4>
          <div className="space-y-1.5">
            {plan.intercropping.map((p, i) => (
              <div key={i} className="rounded-lg border border-border/60 p-2.5 text-xs">
                <span className="font-medium text-foreground">{p.emoji} {p.primary} + {p.secondary}</span>
                <p className="text-muted-foreground mt-0.5">{p.benefit}</p>
                <p className="text-muted-foreground/70 mt-0.5">{p.spacing}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rotation calendar */}
      <div>
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Rotation Plan</h4>
        <div className="grid grid-cols-3 gap-2">
          {plan.rotation_plan.map((s) => (
            <div
              key={s.season}
              className={`rounded-lg border p-2.5 text-xs ${
                s.season === plan.currentSeason
                  ? "border-primary/60 bg-primary/10"
                  : "border-border/60"
              }`}
            >
              <div className="font-medium text-foreground">{s.season}</div>
              <div className="text-muted-foreground/70">{s.months}</div>
              <div className="mt-1 space-y-0.5">
                {s.crops.map((c, i) => (
                  <div key={c} className={i === 0 ? "text-foreground" : "text-muted-foreground"}>{c}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary + scores */}
      <div className="rounded-lg border border-border/60 p-2.5 text-xs space-y-1">
        <p className="text-foreground">{plan.summary}</p>
        <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
          {plan.tips.map((t, i) => <li key={i}>{t}</li>)}
        </ul>
        <div className="flex gap-3 pt-1 text-muted-foreground/80">
          <span>Overall {plan.overall_score}/10</span>
          <span>Water saving ~{plan.water_saving_pct}%</span>
          <span>Revenue +{plan.expected_revenue_increase_pct}%</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-primary text-primary-foreground text-xs py-2 disabled:opacity-60"
        >
          {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          Export PDF
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-border text-foreground text-xs py-2 disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save to reports
        </button>
      </div>
    </div>
  );
}
