// MobileBottomNav — floating three-tab navigation (Map / Parcels / Analytics).
// Safe-area aware (iOS notch padding via env()), backdrop-blur card.

import { Map, Layers, BarChart3 } from "lucide-react";

export type MobileTab = "map" | "parcels" | "analytics";

interface MobileBottomNavProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
}

const TABS: Array<{ id: MobileTab; icon: typeof Map; label: string }> = [
  { id: "map", icon: Map, label: "Map" },
  { id: "parcels", icon: Layers, label: "Parcels" },
  { id: "analytics", icon: BarChart3, label: "Analytics" },
];

const MobileBottomNav = ({ activeTab, onTabChange }: MobileBottomNavProps) => {
  return (
    <nav className="fixed bottom-3 left-4 right-4 z-50 flex items-center justify-around h-14 rounded-2xl bg-card/80 backdrop-blur-xl border border-border/60 shadow-lg shadow-black/20"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      {TABS.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          onClick={() => onTabChange(id)}
          aria-label={label}
          aria-current={activeTab === id ? "page" : undefined}
          className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-all duration-200 ${
            activeTab === id ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <div className={`p-1 rounded-xl transition-all duration-200 ${activeTab === id ? "bg-primary/15" : ""}`}>
            <Icon className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-medium">{label}</span>
        </button>
      ))}
    </nav>
  );
};

export default MobileBottomNav;
