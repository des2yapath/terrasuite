// ParcelDetailView — the per-parcel detail panel. This is the LAST major
// component the package references without having provided (modules 04,
// 07, 09, 10, 14 all mount or extend it). It composes the existing pieces:
// useParcelData streams, useAiReports (analysis + plan), CropPlanPanel
// (Module 10), the Module 13 edge-case gate, soil/weather cards, and the
// boundary-edit trigger. Desktop: rendered by Workspace replacing the
// SidePanel when detailParcel is set. Mobile: rendered by MobileWorkspace
// as its detail layer.
//
// Deliberately NOT an analytics-dashboard clone: the dashboard is the
// full-page exploration view; the detail panel is parcel-scoped and
// action-oriented (plan + analysis + edit).

import { useMemo } from "react";
import { ArrowLeft, Pencil, Droplets, Wind, Thermometer, Loader2, Satellite } from "lucide-react";
import { useParcels } from "@/state/ParcelsProvider";
import { useParcelData } from "@/hooks/useParcelData";
import { useAiReports } from "@/hooks/useAiReports";
import CropPlanPanel from "@/components/CropPlanPanel";
import { NarrativeAnalysis } from "@/components/NarrativeAnalysis";
import EdgeCaseBlock from "@/components/EdgeCaseBlock";
import { detectEdgeCase } from "@/lib/edge-cases";
import { isUrbanParcel, ndviColor, ndviLabel, getAqiLabel } from "@/lib/analytics";
import { haToAcres } from "@/data/parcel";
import type { Parcel } from "@/data/parcel";

interface ParcelDetailViewProps {
  parcel: Parcel;
  onBack: () => void;
}

const ParcelDetailView = ({ parcel, onBack }: ParcelDetailViewProps) => {
  const { setEditBoundaryParcelId } = useParcels();
  const data = useParcelData(parcel);
  const { plan, planLoading, planSource, planNotice, analysis, analysisLoading, analysisError, generateAnalysis } =
    useAiReports(parcel);

  const urban = isUrbanParcel(parcel.crop, data.gee?.land_use ?? null);
  const areaAcres = haToAcres(parcel.area);

  const edge = useMemo(
    () =>
      detectEdgeCase(
        parcel,
        data.gee?.suitability ?? null,
        data.gee?.vegetation ?? null,
        data.weather,
        data.gee?.land_use ?? null,
      ),
    [parcel, data.gee, data.weather],
  );

  const vegetation = data.gee?.vegetation ?? null;

  return (
    <div className="h-full flex flex-col bg-card/95" data-testid={`parcel-detail-${parcel.id}`}>
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b border-border">
        <button onClick={onBack} aria-label="Back to list"
          className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: parcel.color + "20" }}>
          <div className="w-4 h-4 rounded" style={{ backgroundColor: parcel.color + "66", border: `2px solid ${parcel.color}` }} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-foreground truncate">{parcel.name}</h2>
          <p className="text-xs text-muted-foreground truncate">
            {parcel.crop} · {areaAcres} acres
            {urban && <span className="ml-1.5 px-1.5 py-0.5 rounded bg-destructive/20 text-destructive text-[10px] font-medium">Urban</span>}
          </p>
        </div>
        <button
          onClick={() => { setEditBoundaryParcelId(parcel.id); onBack(); }}
          aria-label="Edit boundary"
          title="Edit boundary on the map"
          className="flex items-center gap-1 px-2 py-1 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
          <Pencil className="w-3 h-3" /> Boundary
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Live conditions strip */}
        <div className="grid grid-cols-3 gap-2 text-[11px]">
          {[
            { icon: Thermometer, label: "Temp", value: data.weather ? `${Math.round(data.weather.temperature)}°C` : "—" },
            { icon: Droplets, label: "Humidity", value: data.weather ? `${Math.round(data.weather.humidity)}%` : "—" },
            { icon: Wind, label: "Wind", value: data.weather ? `${Math.round(data.weather.windSpeed)} km/h` : "—" },
          ].map((c) => (
            <div key={c.label} className="p-2 rounded-lg border border-border bg-accent/15 space-y-0.5">
              <div className="flex items-center gap-1 text-muted-foreground"><c.icon className="w-3 h-3" />{c.label}</div>
              <div className="text-sm font-semibold text-foreground">{c.value}</div>
            </div>
          ))}
        </div>

        {/* Satellite summary + AQI */}
        {data.geeLoading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground p-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading satellite data…
          </div>
        ) : vegetation || data.aqi ? (
          <div className="p-3 rounded-xl border border-border bg-accent/15 space-y-2">
            <h3 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Satellite className="w-3 h-3" /> {urban ? "Green Cover" : "Vegetation"} & Air
            </h3>
            {vegetation && (
              <div className="flex items-center justify-between">
                <span className="text-2xl font-light text-foreground">
                  {vegetation.mean_ndvi.toFixed(2)}
                  <span className="text-xs text-muted-foreground ml-1.5">
                    ({ndviLabel(vegetation.mean_ndvi)})
                  </span>
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: ndviColor(vegetation.mean_ndvi) + "30", color: ndviColor(vegetation.mean_ndvi) }}>
                  Health {Math.min(100, Math.round(vegetation.mean_ndvi / 0.8 * 100))}/100
                </span>
              </div>
            )}
            {data.aqi && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">EU AQI</span>
                <span className="font-semibold" style={{ color: getAqiLabel(data.aqi.european_aqi).color }}>
                  {data.aqi.european_aqi} ({getAqiLabel(data.aqi.european_aqi).label})
                </span>
              </div>
            )}
          </div>
        ) : null}

        {/* Crop plan (Module 10) OR edge-case block (Module 13) */}
        {edge?.blocksPlanning ? (
          <EdgeCaseBlock edge={edge} />
        ) : plan ? (
          <CropPlanPanel parcel={parcel} plan={plan} planLoading={planLoading}
            planSource={planSource} planNotice={planNotice} />
        ) : null}

        {/* AI analysis (Module 09) — explicit generation, persisted */}
        {!edge?.blocksPlanning && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {urban ? "AI Sustainability Analysis" : "AI Region Analysis"}
              </h3>
              <button onClick={generateAnalysis} disabled={analysisLoading}
                className="text-xs px-3 py-1 rounded-md border border-border text-foreground hover:bg-accent transition-colors disabled:opacity-50">
                {analysisLoading ? "Analyzing…" : analysis ? "Refresh" : "Generate"}
              </button>
            </div>
            {analysisLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground p-3">
                <Loader2 className="w-4 h-4 animate-spin" /> Generating analysis…
              </div>
            ) : analysisError ? (
              <div className="p-3 rounded-lg border border-border bg-accent/10 text-xs text-muted-foreground">
                {analysisError}
              </div>
            ) : analysis ? (
              <NarrativeAnalysis text={analysis} />
            ) : (
              <div className="p-3 rounded-lg border border-border bg-accent/10 text-xs text-muted-foreground">
                Generate an AI narrative summary of this parcel's fused data (uses one Gemini request).
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ParcelDetailView;
