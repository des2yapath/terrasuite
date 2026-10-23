// EdgeCaseBlock — themed replacement for the crop-planning UI when a parcel
// is water/desert/polar/altitude. Urban never renders here (non-blocking:
// urban mode reshapes the dashboard/analysis instead — Modules 07/09).

import { Waves, Sun, Snowflake, Mountain } from "lucide-react";
import type { EdgeCase } from "@/lib/edge-cases";

const THEME: Record<string, { icon: typeof Waves; tint: string; ring: string }> = {
  water: { icon: Waves, tint: "hsl(210 60% 22%)", ring: "#2196F3" },
  desert: { icon: Sun, tint: "hsl(45 45% 18%)", ring: "#D6AA43" },
  polar: { icon: Snowflake, tint: "hsl(200 25% 16%)", ring: "#e0e1dd" },
  altitude: { icon: Mountain, tint: "hsl(260 20% 18%)", ring: "#A78BFA" },
};

export default function EdgeCaseBlock({ edge }: { edge: EdgeCase }) {
  const theme = THEME[edge.type] ?? THEME.desert;
  const Icon = theme.icon;
  return (
    <div className="rounded-2xl border p-6 text-center space-y-3"
      style={{ background: theme.tint, borderColor: `${theme.ring}55` }}>
      <div className="mx-auto w-14 h-14 rounded-full flex items-center justify-center"
        style={{ background: `${theme.ring}22` }}>
        <Icon className="w-7 h-7" style={{ color: theme.ring }} />
      </div>
      <div>
        <h4 className="text-sm font-semibold text-foreground">{edge.title}</h4>
        <p className="text-[10px] text-muted-foreground mt-0.5">Detection confidence: {edge.confidence}%</p>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed max-w-md mx-auto">{edge.message}</p>
      <p className="text-[10px] text-muted-foreground/70 italic pt-1 border-t border-border/50">
        Parcel analytics (NDVI, land use, soil, weather) remain available — only crop planning is disabled.
      </p>
    </div>
  );
}
