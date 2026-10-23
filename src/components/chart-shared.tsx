import type { ReactNode } from "react";

// Shared Recharts tooltip + chart color constants for all dashboards.

export const CHART_GOLD = "#C6B77E";
export const CHART_CREAM = "#F7F4E4";
export const CHART_GREEN = "#7BC75B";
export const CHART_BLUE = "#61AFEF";
export const CHART_PURPLE = "#C678DD";
export const CHART_RED = "#d73027";

export const tooltipStyle = {
  backgroundColor: "hsl(150, 18%, 14%)",
  border: "1px solid hsl(150, 12%, 22%)",
  borderRadius: "8px",
  color: "hsl(60, 20%, 85%)",
  fontSize: "12px",
};

export const axisStroke = "hsl(150, 10%, 55%)";
export const gridStroke = "hsl(150, 12%, 22%)";

type ChartPayloadItem = {
  stroke?: string;
  fill?: string;
  color?: string;
  name?: string;
  dataKey?: string | number;
  value?: unknown;
};

interface ChartTooltipProps {
  active?: boolean;
  payload?: ChartPayloadItem[];
  label?: ReactNode;
}

export const CustomChartTooltip = ({ active, payload, label }: ChartTooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg px-3 py-2 shadow-xl border border-border/50" style={{ background: "hsl(150, 18%, 12%)" }}>
      {label != null && <div className="text-[10px] text-muted-foreground mb-1.5">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.stroke || p.fill || p.color }} />
          <span className="text-muted-foreground">{p.name || p.dataKey}</span>
          <span className="font-semibold text-foreground ml-auto">
            {typeof p.value === "number" ? p.value.toFixed(1) : String(p.value ?? "")}
          </span>
        </div>
      ))}
    </div>
  );
};

interface LandUseTooltipProps {
  active?: boolean;
  payload?: Array<{ payload?: { name?: string; value?: number; color?: string } }>;
}

export const CustomLandUseTooltip = ({ active, payload }: LandUseTooltipProps) => {
  if (!active || !payload?.length) return null;
  const { name, value, color } = payload[0].payload ?? {};
  return (
    <div className="rounded-lg px-3 py-2 shadow-xl border border-border/50" style={{ background: "hsl(150, 18%, 12%)" }}>
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
        <span className="text-xs font-semibold" style={{ color }}>{name}</span>
      </div>
      <div className="text-sm font-bold text-foreground">{value}%</div>
    </div>
  );
};
