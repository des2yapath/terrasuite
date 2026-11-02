// MobileWorkspace — the <768px tree that REPLACES the desktop Workspace
// frame. Full-screen map always mounted behind (WebGL context is never
// lost switching tabs); slide-up sheets for parcels; the analytics view
// scrolls above the bottom nav; parcel detail opens as its own layer.
//
// Adapted from the reference app's mobile tree but reading TerraSuite's
// ParcelsProvider directly: no prop drilling — every child pulls the
// state it needs (that's why the provider exists).

import { useState, useCallback, type ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useParcels } from "@/state/ParcelsProvider";
import { useSwipe } from "@/hooks/use-swipe";
import MapView from "@/components/MapView";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";
import MobileBottomNav, { type MobileTab } from "@/components/MobileBottomNav";
import MobileParcelSheet from "@/components/MobileParcelSheet";
import ParcelDetailView from "@/components/ParcelDetailView"; // Module 07 companion
import type { Parcel } from "@/data/parcel";

const TAB_ORDER: MobileTab[] = ["map", "parcels", "analytics"];

const MobileWorkspace = () => {
  const { setActiveParcel } = useParcels();
  const [tab, setTab] = useState<MobileTab>("map");
  const [detailParcel, setDetailParcel] = useState<Parcel | null>(null);

  const handleMapParcelClick = useCallback((p: Parcel) => {
    setActiveParcel(p);
    setDetailParcel(p); // tapping a polygon on mobile goes straight to detail
  }, [setActiveParcel]);

  const swipeHandlers = useSwipe({
    onSwipeLeft: () => {
      if (detailParcel) return; // detail layer is above the tab order
      const idx = TAB_ORDER.indexOf(tab);
      if (idx < TAB_ORDER.length - 1) setTab(TAB_ORDER[idx + 1]);
    },
    onSwipeRight: () => {
      if (detailParcel) return;
      const idx = TAB_ORDER.indexOf(tab);
      if (idx > 0) setTab(TAB_ORDER[idx - 1]);
    },
  });

  return (
    <div className="h-screen w-screen bg-background relative overflow-hidden" {...swipeHandlers}>
      {/* Full-screen map — always mounted, visibility by tab */}
      <div className="absolute inset-0" style={{ visibility: tab === "map" && !detailParcel ? "visible" : "hidden" }}>
        <MapView onParcelClickOnMap={handleMapParcelClick} />
      </div>

      {/* Analytics layer */}
      {tab === "analytics" && !detailParcel && (
        <div className="absolute inset-0 z-20 bg-background overflow-y-auto"
          style={{ paddingBottom: "6rem" }}>
          <AnalyticsDashboard />
        </div>
      )}

      {/* Parcels sheet (slides over the map) */}
      {tab === "parcels" && !detailParcel && (
        <MobileParcelSheet
          onClose={() => setTab("map")}
          onOpenDetail={(p) => { setActiveParcel(p); setDetailParcel(p); }}
        />
      )}

      {/* Detail layer — above tabs, back button returns to map */}
      {detailParcel && (
        <div className="absolute inset-0 z-30 bg-card overflow-y-auto" style={{ paddingBottom: "6rem" }}>
          <ParcelDetailView
            parcel={detailParcel}
            onBack={() => setDetailParcel(null)}
          />
        </div>
      )}

      {/* Bottom nav (detail layer hides it via z-order; keep it mounted) */}
      <MobileBottomNav activeTab={tab} onTabChange={setTab} />
    </div>
  );
};

/** Exported guard: renders children only on mobile-sized viewports. */
export const MobileOnly = ({ children }: { children: ReactNode }) => {
  const isMobile = useIsMobile();
  return isMobile ? <>{children}</> : null;
};

export default MobileWorkspace;
