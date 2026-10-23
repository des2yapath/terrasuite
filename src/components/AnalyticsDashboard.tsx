import { useState, useEffect } from "react";
import { CalendarArrowUp, CalendarArrowDown, Droplets, Thermometer, Leaf, TrendingUp, Loader2, Factory, Sprout, Building2, PenTool } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Area, AreaChart, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import { useParcels } from "@/state/ParcelsProvider";
import { useParcelData } from "@/hooks/useParcelData";
import { fetchClimateHistory, type MonthlyClimate, type MonthlySoilMoisture } from "@/lib/open-meteo";
import { isUrbanParcel, LAND_USE_COLORS, getAqiLabel } from "@/lib/analytics";
import { parcelCenter, haToAcres } from "@/data/parcel";
import {
  CHART_GOLD, CHART_CREAM, CHART_GREEN, CHART_BLUE,
  CustomChartTooltip, CustomLandUseTooltip, axisStroke, gridStroke,
} from "@/components/chart-shared";

/* ── Chart data derivations ── */

function landUseChartData(landUse: Record<string, number> | null) {
  if (!landUse) return null;
  return Object.entries(landUse)
    .map(([name, value]) => ({ name, value, color: LAND_USE_COLORS[name] ?? "#888888" }))
    .sort((a, b) => b.value - a.value);
}

function suitabilityChartData(s: Record<string, unknown> | null | undefined) {
  if (!s) return null;
  const rows = [
    { subject: "Soil Quality", value: s.soil_quality },
    { subject: "Water Access", value: s.water_access },
    { subject: "Climate", value: s.climate },
    { subject: "Topography", value: s.topography },
    { subject: "Drainage", value: s.drainage },
    { subject: "Nutrients", value: s.nutrient_level },
  ];
  const filtered = rows.filter((r) => typeof r.value === "number" && (r.value as number) > 0);
  return filtered.length > 0 ? filtered : null;
}

function ndviTsChartData(timeseries: { timeseries: Array<{ date: string; ndvi: number }> } | null) {
  return timeseries?.timeseries?.map((p) => ({
    date: format(new Date(p.date + "T00:00:00"), "MMM dd"),
    ndvi: p.ndvi,
  })) ?? [];
}

/* ── Component ── */

const AnalyticsDashboard = () => {
  const { parcels, activeParcel } = useParcels();
  const isMobile = useIsMobile();
  const effectiveParcel = activeParcel ?? parcels[0] ?? null;

  const [startDate, setStartDate] = useState<Date>(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d;
  });
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [climate, setClimate] = useState<{ monthly: MonthlyClimate[]; monthlySoil: MonthlySoilMoisture[] } | null>(null);
  const [climateLoading, setClimateLoading] = useState(false);

  const data = useParcelData(effectiveParcel);
  const urban = effectiveParcel ? isUrbanParcel(effectiveParcel.crop, data.gee?.land_use ?? null) : false;

  /* Climate history (date-range driven) */
  useEffect(() => {
    if (!effectiveParcel) { setClimate(null); return; }
    let cancelled = false;
    (async () => {
      setClimateLoading(true);
      const { lat, lng } = parcelCenter(effectiveParcel);
      const result = await fetchClimateHistory(lat, lng, format(startDate, "yyyy-MM-dd"), format(endDate, "yyyy-MM-dd"));
      if (!cancelled) setClimate(result);
      if (!cancelled) setClimateLoading(false);
    })();
    return () => { cancelled = true; };
  }, [effectiveParcel, startDate, endDate]);

  const monthly = climate?.monthly ?? [];
  const soilMonthly = climate?.monthlySoil ?? [];
  const landUse = landUseChartData(data.gee?.land_use ?? null);
  const suitability = suitabilityChartData(data.gee?.suitability as Record<string, unknown> | null | undefined);
  const ndviChart = ndviTsChartData(data.timeseries);
  const vegetation = data.gee?.vegetation;
  const su = (data.gee?.suitability ?? null) as { raw?: { elevation_m?: number | null; slope_deg?: number | null; annual_rainfall_mm?: number | null } } | null;

  /* ── Empty state ── */
  if (!effectiveParcel) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-6 max-w-md mx-auto">
        <div className="w-20 h-20 rounded-2xl bg-accent/20 border border-border flex items-center justify-center mb-5">
          <Sprout className="w-9 h-9 text-muted-foreground/60" />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-2">No parcels to analyze</h3>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          Create a parcel on the map to see climate analytics, vegetation trends, soil moisture, and AI-powered planning.
        </p>
        <div className="text-left space-y-2.5 w-full max-w-xs">
          {[
            "Switch to the Map view and click the pen icon on the left toolbar",
            "Click on the map to place boundary points around your parcel",
            "Press Enter to save, then come back here for analytics",
          ].map((t, i) => (
            <div key={i} className="flex items-start gap-2.5 p-3 rounded-lg bg-accent/15 border border-border/50">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-semibold">{i + 1}</span>
              <span className="text-xs text-muted-foreground leading-relaxed flex items-center gap-1">
                {i === 0 ? <>{t.split("pen icon")[0]}<PenTool className="inline-block align-text-bottom text-foreground w-3.5 h-3.5" />{t.split("pen icon")[1]}</> : t}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden">
      {/* Header: parcel + date range pickers */}
      <div className="flex items-center gap-3 px-4 md:px-6 py-2 md:py-3 border-b border-border flex-wrap">
        <h1 className="text-base md:text-lg font-semibold text-foreground">
          {urban ? "Urban Analytics" : "Parcel Analytics"}
        </h1>
        {!isMobile && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: effectiveParcel.color }} />
            {effectiveParcel.name} · {effectiveParcel.crop} · {haToAcres(effectiveParcel.area)} acres
            {urban && <span className="ml-1 px-1.5 py-0.5 rounded bg-destructive/20 text-destructive text-[10px] font-medium">Urban</span>}
          </div>
        )}
        <div className="flex-1" />
        <div className="flex items-center gap-1.5">
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 border border-border rounded-lg px-3 py-2 hover:bg-accent/30 transition-colors" title="Start date">
                <div className="text-left hidden sm:block"><div className="text-xs text-muted-foreground">Start</div><div className="text-sm text-foreground">{format(startDate, "MMM d, yyyy")}</div></div>
                <CalendarArrowUp className="w-4 h-4 text-muted-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar mode="single" selected={startDate} onSelect={(d) => d && setStartDate(d)} />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 border border-border rounded-lg px-3 py-2 hover:bg-accent/30 transition-colors" title="End date">
                <div className="text-left hidden sm:block"><div className="text-xs text-muted-foreground">End</div><div className="text-sm text-foreground">{format(endDate, "MMM d, yyyy")}</div></div>
                <CalendarArrowDown className="w-4 h-4 text-muted-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar mode="single" selected={endDate} onSelect={(d) => d && setEndDate(d)} />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Live conditions strip */}
      <div className="px-4 md:px-6 py-2 md:py-3 border-b border-border">
        {data.liveLoading ? (
          <div className="text-xs md:text-sm text-muted-foreground animate-pulse">Loading live conditions…</div>
        ) : data.weather ? (
          <div className="flex items-center gap-3 md:gap-6 flex-wrap">
            <div className="flex items-center gap-2 md:gap-3">
              <div className={`${isMobile ? "text-xl" : "text-3xl"} font-light text-foreground`}>{data.weather.temperature}°C</div>
              <div>
                <div className={`${isMobile ? "text-xs" : "text-sm"} text-foreground`}>{data.weather.feelsLike !== data.weather.temperature ? `Feels like ${data.weather.feelsLike}°C` : ""}</div>
                <div className="text-[10px] md:text-xs text-muted-foreground">Wind {data.weather.windSpeed} km/h · Humidity {data.weather.humidity}%</div>
              </div>
            </div>
            <div className="flex gap-3 md:gap-5 text-[10px] md:text-xs text-muted-foreground">
              {data.aqi && (
                <span className="flex items-center gap-1" style={{ color: getAqiLabel(data.aqi.european_aqi).color }}>
                  <Factory className="w-3 h-3" />AQI {data.aqi.european_aqi} ({getAqiLabel(data.aqi.european_aqi).label})
                </span>
              )}
              {data.surfaceMoisture != null && (
                <span className="flex items-center gap-1"><Droplets className="w-3 h-3" />Soil {data.surfaceMoisture}%</span>
              )}
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Weather unavailable</div>
        )}
      </div>

      {/* Charts */}
      <div className={`flex-1 overflow-y-auto ${isMobile ? "p-4 pb-24 space-y-6" : "p-6 space-y-8"}`}>
        {/* Key metrics */}
        <div className={`grid ${isMobile ? "grid-cols-4 gap-1.5" : "grid-cols-4 gap-3"}`}>
          {[
            { label: urban ? "Green Cover" : "Avg NDVI", value: data.timeseries?.mean_ndvi != null ? data.timeseries.mean_ndvi.toFixed(3) : vegetation?.mean_ndvi != null ? vegetation.mean_ndvi.toFixed(3) : "N/A", icon: Leaf, color: CHART_GREEN },
            { label: "Moisture", value: soilMonthly.length > 0 ? `${(soilMonthly.reduce((s, d) => s + d.shallow, 0) / soilMonthly.length).toFixed(1)}%` : "N/A", icon: Droplets, color: CHART_BLUE },
            { label: "Temp", value: monthly.length > 0 ? `${Math.min(...monthly.map((d) => d.tempMin))}-${Math.max(...monthly.map((d) => d.tempMax))}°C` : "N/A", icon: Thermometer, color: CHART_GOLD },
            { label: "Rain", value: monthly.length > 0 ? `${monthly[monthly.length - 1]?.accumulated ?? 0}mm` : "N/A", icon: TrendingUp, color: CHART_CREAM },
          ].map((m, i) => (
            <div key={i} className={`${isMobile ? "p-2" : "p-3"} rounded-xl border border-border bg-accent/15 space-y-0.5`}>
              <div className={`flex items-center gap-1 ${isMobile ? "text-[9px]" : "text-xs"} text-muted-foreground`}>
                <m.icon className={`${isMobile ? "w-2.5 h-2.5" : "w-3.5 h-3.5"}`} />{m.label}
              </div>
              <div className={`${isMobile ? "text-xs" : "text-lg"} font-semibold text-foreground`}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* Land use + suitability radar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in" style={{ animationDelay: "100ms" }}>
          <div className="flex flex-col">
            <h3 className="text-sm font-medium text-foreground mb-4">Land Use (ESA WorldCover)</h3>
            <div className="rounded-2xl border border-border/40 p-4 w-full h-[290px] flex flex-col items-center justify-center" style={{ background: "hsla(150, 18%, 14%, 0.6)" }}>
              {data.geeLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Fetching ESA WorldCover…</div>
              ) : landUse && landUse.length > 0 ? (
                <div className="flex flex-col items-center w-full h-full justify-center">
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={landUse} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={62} paddingAngle={2} strokeWidth={0} label={false}>
                        {landUse.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip content={<CustomLandUseTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center mt-2">
                    {landUse.map((entry, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-[10px]">
                        <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: entry.color }} />
                        <span className="text-muted-foreground">{entry.name}</span>
                        <span className="text-foreground font-semibold">{entry.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center text-sm text-muted-foreground">
                  <Leaf className="w-6 h-6 mx-auto mb-2 opacity-40" /> No satellite data available.
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col">
            <h3 className="text-sm font-medium text-foreground mb-4">{urban ? "Environment Score" : "Land Suitability"}</h3>
            <div className="rounded-2xl border border-border/40 p-4 w-full h-[290px] flex items-center justify-center" style={{ background: "hsla(150, 18%, 14%, 0.6)" }}>
              {data.geeLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Fetching suitability…</div>
              ) : suitability ? (
                <div className="w-full">
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={suitability} cx="50%" cy="50%" outerRadius="70%">
                      <PolarGrid stroke={gridStroke} />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: axisStroke, fontSize: 10 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: axisStroke, fontSize: 9 }} />
                      <Radar name="Score" dataKey="value" stroke={CHART_GREEN} fill={CHART_GREEN} fillOpacity={0.25} strokeWidth={2} />
                      <Tooltip content={<CustomChartTooltip />} />
                    </RadarChart>
                  </ResponsiveContainer>
                  {su?.raw && (
                    <div className="flex gap-3 justify-center text-[10px] text-muted-foreground mt-1">
                      {su.raw.elevation_m != null && <span>Elev: {su.raw.elevation_m}m</span>}
                      {su.raw.slope_deg != null && <span>Slope: {su.raw.slope_deg}°</span>}
                      {su.raw.annual_rainfall_mm != null && <span>Rain: {su.raw.annual_rainfall_mm}mm/yr</span>}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-sm text-muted-foreground">
                  <Leaf className="w-6 h-6 mx-auto mb-2 opacity-40" /> No satellite data available.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* NDVI trend */}
        {!urban && (
          <div className="animate-fade-in" style={{ animationDelay: "150ms" }}>
            <h3 className="text-sm font-medium text-foreground mb-4">NDVI Trend (90 days)</h3>
            {data.tsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading time-series…</div>
            ) : ndviChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={ndviChart}>
                  <defs>
                    <linearGradient id="ndviGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_GREEN} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={CHART_GREEN} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="date" stroke={axisStroke} fontSize={10} />
                  <YAxis stroke={axisStroke} fontSize={10} domain={[0, 1]} />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Area type="monotone" dataKey="ndvi" stroke={CHART_GREEN} strokeWidth={2} fill="url(#ndviGrad)" dot={{ r: 2, fill: CHART_GREEN }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="p-3 rounded-lg border border-border bg-accent/10 text-xs text-muted-foreground">No satellite time-series for this parcel.</div>
            )}
          </div>
        )}

        {/* Accumulated precipitation + evapotranspiration */}
        <div className="animate-fade-in" style={{ animationDelay: "200ms" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-foreground">Accumulated Precipitation, mm</h3>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ backgroundColor: CHART_GOLD }} />Precipitation</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ backgroundColor: CHART_CREAM }} />Evapotranspiration</span>
            </div>
          </div>
          {climateLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Fetching archive…</div>
          ) : monthly.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthly}>
                <defs>
                  <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_GOLD} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_GOLD} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="month" stroke={axisStroke} fontSize={11} />
                <YAxis stroke={axisStroke} fontSize={11} />
                <Tooltip content={<CustomChartTooltip />} />
                <Area type="monotone" dataKey="accumulated" stroke={CHART_GOLD} strokeWidth={2.5} fill="url(#goldGrad)" dot={{ r: 3, fill: CHART_GOLD }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="evapotranspiration" stroke={CHART_CREAM} strokeWidth={1.5} dot={false} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="p-3 rounded-lg border border-border bg-accent/10 text-xs text-muted-foreground">No archive data for this range.</div>
          )}
        </div>

        {/* Temperature range */}
        <div className="animate-fade-in" style={{ animationDelay: "250ms" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-foreground">Temperature Range, °C</h3>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ backgroundColor: CHART_GOLD }} />Max</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ backgroundColor: CHART_CREAM }} />Min</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="month" stroke={axisStroke} fontSize={11} />
              <YAxis stroke={axisStroke} fontSize={11} />
              <Tooltip content={<CustomChartTooltip />} />
              <Line type="monotone" dataKey="tempMax" stroke={CHART_GOLD} strokeWidth={2} dot={{ r: 3, fill: CHART_GOLD }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="tempMin" stroke={CHART_CREAM} strokeWidth={2} dot={{ r: 3, fill: CHART_CREAM }} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Soil moisture */}
        {soilMonthly.length > 0 && (
          <div className="animate-fade-in" style={{ animationDelay: "300ms" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-foreground">Soil Moisture, %</h3>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ backgroundColor: CHART_GOLD }} />Surface (0–7cm)</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ backgroundColor: CHART_CREAM }} />Deep (7–28cm)</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={soilMonthly}>
                <defs>
                  <linearGradient id="soilGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_GOLD} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={CHART_GOLD} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="month" stroke={axisStroke} fontSize={11} />
                <YAxis stroke={axisStroke} fontSize={11} />
                <Tooltip content={<CustomChartTooltip />} />
                <Area type="monotone" dataKey="shallow" stroke={CHART_GOLD} strokeWidth={2} fill="url(#soilGrad)" dot={{ r: 3, fill: CHART_GOLD }} />
                <Line type="monotone" dataKey="deep" stroke={CHART_CREAM} strokeWidth={1.5} dot={false} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Urban sustainability note */}
        {urban && (
          <div className="animate-fade-in p-4 rounded-xl border border-border bg-accent/15">
            <h3 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Sustainability Insights
            </h3>
            <div className="text-xs text-muted-foreground space-y-2 leading-relaxed">
              <p>This urban parcel has {data.gee?.land_use?.["Built-up"] ?? 0}% built-up area. Green cover and air quality are the key sustainability indicators here.</p>
              <p>Precipitation and soil data can inform urban drainage planning and green-roof feasibility assessments.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
