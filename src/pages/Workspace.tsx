/**
 * Workspace shell (Module 00 baseline).
 * Later modules mount MapView (03/04) and the analytics view (07) into the
 * two content slots, and SidePanel (04) into the right column.
 * Desktop-first frame; Module 14 replaces this whole tree on mobile.
 */
import { useState } from "react";
import UserMenu from "@/components/UserMenu";
import MapView from "@/components/MapView";
import { useParcels } from "@/state/ParcelsProvider";
import SidePanel from "@/components/SidePanel";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";
import ParcelDetailView from "@/components/ParcelDetailView";

const Workspace = () => {
  const [view, setView] = useState<"map" | "analytics">("map");
  const { setActiveParcel, detailParcel, openDetail } = useParcels();

  return (
    <div className="h-screen w-screen bg-surface-outer flex items-center justify-center p-6">
      <div className="w-full h-full max-w-[1400px] max-h-[900px] rounded-2xl overflow-hidden bg-background shadow-2xl relative border-[#041009] border-2">
        <UserMenu />

        {/* View toggle — top center */}
        <div
          className="absolute top-4 z-20 flex gap-1 bg-card/80 backdrop-blur-sm rounded-lg border border-border p-1"
          style={{ left: "calc(50% - 15px)", transform: "translateX(-50%)" }}
        >
          {(["map", "analytics"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all duration-300 ${
                view === v
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {v === "map" ? "Map" : "Analytics"}
            </button>
          ))}
        </div>

        <div className="flex w-full h-full">
          <div className="flex-1 relative">
            <div
              className="absolute inset-0 transition-opacity duration-200"
              style={{ opacity: view === "map" ? 1 : 0, pointerEvents: view === "map" ? "auto" : "none" }}
            >
              <MapView onParcelClickOnMap={setActiveParcel} />
            </div>
            {/* Analytics slot (Module 07) stays mounted until that module lands. */}
            <div
              className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm transition-opacity duration-200"
              style={{ opacity: view === "analytics" ? 1 : 0, pointerEvents: view === "analytics" ? "auto" : "none" }}
            >
              <AnalyticsDashboard />
            </div>
          </div>
          {detailParcel ? (
            <div className="w-[320px] h-full border-l border-border">
              <ParcelDetailView parcel={detailParcel} onBack={() => openDetail(null)} />
            </div>
          ) : (
            <SidePanel onOpenDetail={openDetail} />
          )}
        </div>
      </div>
    </div>
  );
};

export default Workspace;
