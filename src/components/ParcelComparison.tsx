// ParcelComparison — side-by-side fused environmental profile of two parcels.
// One independent useParcelData per parcel (the hook was designed for this —
// Module 07 note), synchronized date range, delta highlighting, suffixed
// SVG gradient IDs so two copies of the same chart family never collide.

import { useEffect, useMemo, useState } from "react";
import { useParcels } from "@/state/ParcelsProvider";
import { useParcelData } from "@/hooks/useParcelData";
import { LAND_USE_COLORS, ndviLabel } from "@/lib/analytics";
import type { LandUsePercentages, SuitabilityScores } from "@/lib/gee";
import { haToAcres, parcelCenter } from "@/data/parcel";
import { fetchClimateHistory, type MonthlyClimate } from "@/lib/open-meteo";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, Tooltip, Legend,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";
import { GitCompareArrows, X, Loader2, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { CHART_GOLD, CHART_GREEN, CHART_BLUE } from "@/components/chart-shared";

/** Suffix gradient/clip IDs so two chart sets coexist in one DOM. */
function landUseDonut(landUse: LandUsePercentages | null | undefined, suffix: string) {
  if (!landUse) return null;
  return Object.entries(landUse)
    .map(([name, value]) => ({ name, value, color: LAND_USE_COLORS[name] ?? "#888888", key: `${suffix}-${name}` }))
    .sort((a, b) => b.value - a.value);
}

function suitabilityRadar(s: SuitabilityScores | null | undefined) {
  if (!s) return null;
  const rows = [
    { subject: "Soil", value: s.soil_quality },
    { subject: "Water", value: s.water_access },
    { subject: "Climate", value: s.climate },
    { subject: "Terrain", value: s.topography },
    { subject: "Drainage", value: s.drainage },
    { subject: "Nutrients", value: s.nutrient_level },
  ].filter((r) => typeof r.value === "number");
  return rows.length >= 3 ? rows : null;
}

function DeltaChip({ a, b, unit = "", goodDirection = "up" }: { a: number | null; b: number | null; unit?: string; goodDirection?: "up" | "down" }) {
  if (a == null || b == null) return <Minus className="w-3 h-3 text-muted-foreground/50" />;
  const d = b - a;
  if (Math.abs(d) < 0.01) return <Minus className="w-3 h-3 text-muted-foreground/50" />;
  const good = goodDirection === "up" ? d > 0 : d < 0;
  const Icon = d > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-medium"
      style={{ color: good ? CHART_GREEN : "hsl(var(--destructive))" }}>
      <Icon className="w-3 h-3" />
      {Math.abs(d).toFixed(1)}{unit}
    </span>
  );
}

export default function ParcelComparison() {
  const { parcels, activeParcel } = useParcels();
  const [compareId, setCompareId] = useState<string | null>(null);

  const left = activeParcel ?? parcels[0] ?? null;
  const right = useMemo(() => parcels.find((p) => p.id === compareId) ?? null, [parcels, compareId]);
  useEffect(() => {
    if (left && compareId === left.id) setCompareId(null);
  }, [left, compareId]);

  // Synchronized date range (defaults: 1 year back → today)
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [startDate, setStartDate] = useState<Date>(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d;
  });

  const leftData = useParcelData(left);
  const rightData = useParcelData(right);

  // Climate history per parcel (parallel; independent of GEE streams).
  // fetchClimateHistory takes ISO date strings and returns {monthly, monthlySoil}.
  const iso = (d: Date) => d.toISOString().split("T")[0];
  const [leftClimate, setLeftClimate] = useState<MonthlyClimate[] | null>(null);
  const [rightClimate, setRightClimate] = useState<MonthlyClimate[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!left) { setLeftClimate(null); return; }
      const { lat, lng } = parcelCenter(left);
      const data = await fetchClimateHistory(lat, lng, iso(startDate), iso(endDate));
      if (!cancelled) setLeftClimate(data?.monthly ?? null);
    };
    load();
    return () => { cancelled = true; };
  }, [left, startDate, endDate]);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!right) { setRightClimate(null); return; }
      const { lat, lng } = parcelCenter(right);
      const data = await fetchClimateHistory(lat, lng, iso(startDate), iso(endDate));
      if (!cancelled) setRightClimate(data?.monthly ?? null);
    };
    load();
    return () => { cancelled = true; };
  }, [right, startDate, endDate]);

  const ndviSeries = (ts: { timeseries?: Array<{ date: string; ndvi: number }> } | null) =>
    (ts?.timeseries ?? []).map((p) => ({
      date: new Date(p.date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      ndvi: p.ndvi,
    }));

  if (!left) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
        Draw a parcel first, then compare it against another.
      </div>
    );
  }

  const leftLandUse = landUseDonut(leftData.gee?.land_use, "L");
  const rightLandUse = landUseDonut(rightData.gee?.land_use, "R");
  const leftSuitability = suitabilityRadar(leftData.gee?.suitability);
  const rightSuitability = suitabilityRadar(rightData.gee?.suitability);

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4" data-testid="parcel-comparison">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <GitCompareArrows className="w-4 h-4" /> Region Comparison
        </h2>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <input type="date" value={startDate.toISOString().split("T")[0]}
            onChange={(e) => setStartDate(new Date(e.target.value))} className="bg-secondary/50 border border-border rounded px-2 py-1" />
          <span>→</span>
          <input type="date" value={endDate.toISOString().split("T")[0]}
            onChange={(e) => setEndDate(new Date(e.target.value))} className="bg-secondary/50 border border-border rounded px-2 py-1" />
        </div>
      </div>

      {/* Comparison target selector */}
      <div className="flex flex-wrap gap-1.5">
        {parcels.filter((p) => p.id !== left.id).map((p) => (
          <button key={p.id} onClick={() => setCompareId(p.id === compareId ? null : p.id)}
            className={`px-2.5 py-1 rounded-full text-[11px] border ${compareId === p.id ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:text-foreground"}`}>
            {p.name}
          </button>
        ))}
        {parcels.length < 2 && <span className="text-[11px] text-muted-foreground">Draw a second parcel to compare.</span>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* ── LEFT column (active parcel) ── */}
        <div className="space-y-3">
          <header className="text-xs font-semibold text-foreground">{left.name} <span className="text-muted-foreground font-normal">· {haToAcres(left.area)} acres</span></header>
          {leftData.geeLoading ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : (
            <>
              {leftLandUse && (
                <div className="h-36"><ResponsiveContainer width="100%" height="100%">
                  <PieChart><Pie data={leftLandUse} dataKey="value" nameKey="name" innerRadius={30} outerRadius={58} stroke="none">
                    {leftLandUse.map((d) => <Cell key={d.key} fill={d.color} />)}
                  </Pie><Tooltip /></PieChart>
                </ResponsiveContainer></div>
              )}
              {leftSuitability && (
                <div className="h-44"><ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={leftSuitability}>
                    <PolarGrid stroke="#3a4a42" /><PolarAngleAxis dataKey="subject" tick={{ fill: "#9aa79f", fontSize: 9 }} />
                    <Radar dataKey="value" stroke={CHART_GREEN} fill={CHART_GREEN} fillOpacity={0.25} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer></div>
              )}
              <div className="flex gap-2 text-[11px] text-muted-foreground">
                <span>NDVI {leftData.timeseries?.latest_ndvi?.toFixed(2) ?? "—"} {leftData.timeseries?.latest_ndvi != null && `(${ndviLabel(leftData.timeseries.latest_ndvi)})`}</span>
                <span>AQI {leftData.aqi?.european_aqi ?? "—"}</span>
              </div>
            </>
          )}
        </div>

        {/* ── RIGHT column (comparison target) ── */}
        <div className="space-y-3">
          {!right ? (
            <div className="h-full flex items-center justify-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
              Select a parcel above to compare
            </div>
          ) : rightData.geeLoading ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : (
            <>
              <header className="text-xs font-semibold text-foreground flex items-center justify-between">
                {right.name} <span className="text-muted-foreground font-normal">{haToAcres(right.area)} acres</span>
                <button onClick={() => setCompareId(null)} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
              </header>
              {rightLandUse && (
                <div className="h-36"><ResponsiveContainer width="100%" height="100%">
                  <PieChart><Pie data={rightLandUse} dataKey="value" nameKey="name" innerRadius={30} outerRadius={58} stroke="none">
                    {rightLandUse.map((d) => <Cell key={d.key} fill={d.color} />)}
                  </Pie><Tooltip /></PieChart>
                </ResponsiveContainer></div>
              )}
              {rightSuitability && (
                <div className="h-44"><ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={rightSuitability}>
                    <PolarGrid stroke="#3a4a42" /><PolarAngleAxis dataKey="subject" tick={{ fill: "#9aa79f", fontSize: 9 }} />
                    <Radar dataKey="value" stroke={CHART_BLUE} fill={CHART_BLUE} fillOpacity={0.25} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer></div>
              )}
              <div className="flex gap-2 text-[11px] text-muted-foreground">
                <span>NDVI {rightData.timeseries?.latest_ndvi?.toFixed(2) ?? "—"} {rightData.timeseries?.latest_ndvi != null && `(${ndviLabel(rightData.timeseries.latest_ndvi)})`}</span>
                <span>AQI {rightData.aqi?.european_aqi ?? "—"}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Delta strip — the point of the comparison */}
      {right && (
        <div className="grid grid-cols-3 gap-2 text-[11px]">
          {[
            { label: "NDVI", a: leftData.timeseries?.latest_ndvi ?? null, b: rightData.timeseries?.latest_ndvi ?? null },
            { label: "Water access", a: leftData.gee?.suitability?.water_access ?? null, b: rightData.gee?.suitability?.water_access ?? null, unit: "" },
            { label: "Rainfall", a: leftData.gee?.suitability?.raw?.annual_rainfall_mm ?? null, b: rightData.gee?.suitability?.raw?.annual_rainfall_mm ?? null, unit: " mm" },
            { label: "Soil quality", a: leftData.gee?.suitability?.soil_quality ?? null, b: rightData.gee?.suitability?.soil_quality ?? null },
            { label: "EU AQI", a: leftData.aqi?.european_aqi ?? null, b: rightData.aqi?.european_aqi ?? null, goodDirection: "down" as const },
            { label: "Temp °C", a: leftData.weather?.temperature ?? null, b: rightData.weather?.temperature ?? null },
          ].map((m) => (
            <div key={m.label} className="rounded-lg border border-border/60 p-2 flex items-center justify-between">
              <span className="text-muted-foreground">{m.label}</span>
              <DeltaChip a={m.a} b={m.b} unit={m.unit} goodDirection={m.goodDirection ?? "up"} />
            </div>
          ))}
        </div>
      )}

      {/* Synchronized NDVI trends */}
      {(ndviSeries(leftData.timeseries).length > 0 || ndviSeries(rightData.timeseries).length > 0) && (
        <div className="h-40"><ResponsiveContainer width="100%" height="100%">
          <AreaChart>
            <CartesianGrid stroke="#24312b" strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fill: "#9aa79f", fontSize: 9 }} />
            <YAxis domain={[-0.2, 1]} tick={{ fill: "#9aa79f", fontSize: 9 }} />
            <Tooltip />
            <Legend />
            {ndviSeries(leftData.timeseries).length > 0 && (
              <Area data={ndviSeries(leftData.timeseries)} dataKey="ndvi" name={left.name} stroke={CHART_GREEN} fill={CHART_GREEN} fillOpacity={0.15} />
            )}
            {right && ndviSeries(rightData.timeseries).length > 0 && (
              <Area data={ndviSeries(rightData.timeseries)} dataKey="ndvi" name={right.name} stroke={CHART_BLUE} fill={CHART_BLUE} fillOpacity={0.15} />
            )}
          </AreaChart>
        </ResponsiveContainer></div>
      )}

      {/* Synchronized accumulated precipitation */}
      {(leftClimate?.length || rightClimate?.length) ? (
        <div className="h-40"><ResponsiveContainer width="100%" height="100%">
          <AreaChart>
            <CartesianGrid stroke="#24312b" strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fill: "#9aa79f", fontSize: 9 }} />
            <YAxis tick={{ fill: "#9aa79f", fontSize: 9 }} />
            <Tooltip />
            <Legend />
            {leftClimate && <Area data={leftClimate} dataKey="accumulated" name={`${left.name} precip`} stroke={CHART_GOLD} fill={CHART_GOLD} fillOpacity={0.15} />}
            {right && rightClimate && <Area data={rightClimate} dataKey="accumulated" name={`${right.name} precip`} stroke={CHART_BLUE} fill={CHART_BLUE} fillOpacity={0.15} />}
          </AreaChart>
        </ResponsiveContainer></div>
      ) : null}
    </div>
  );
}
