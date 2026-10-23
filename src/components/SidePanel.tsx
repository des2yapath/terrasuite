import { useState } from "react";
import { Search, ArrowUpDown, SlidersHorizontal, MapPin, PenTool, GitCompareArrows } from "lucide-react";
import { useParcels } from "@/state/ParcelsProvider";
import type { Parcel } from "@/data/parcel";
import ParcelCard from "@/components/ParcelCard";
import EditParcelDialog from "@/components/EditParcelDialog";
import ParcelComparison from "@/components/ParcelComparison";

type SortKey = "name" | "area" | "ndvi";

interface SidePanelProps {
  /** Analytics view replaces this whole panel when a detail view opens. */
  onOpenDetail?: (parcel: Parcel) => void;
}

/**
 * Right-side parcel list: search, crop filter, cyclic sort, empty-state
 * onboarding, edit dialog hosting. Single click → active + fly-to;
 * double click → detail view (Module 07+ hook).
 */
const SidePanel = ({ onOpenDetail }: SidePanelProps) => {
  const { parcels, selectedIds, activeParcel, setActiveParcel, requestFlyTo, saveParcel, removeParcel } = useParcels();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [filterCrop, setFilterCrop] = useState<string | null>(null);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [editingParcel, setEditingParcel] = useState<Parcel | null>(null);
  const [comparing, setComparing] = useState(false);

  const crops = Array.from(new Set(parcels.map((p) => p.crop)));

  const filtered = parcels
    .filter((p) =>
      (p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.crop.toLowerCase().includes(search.toLowerCase())) &&
      (!filterCrop || p.crop === filterCrop),
    )
    .sort((a, b) => {
      if (sortBy === "area") return b.area - a.area;
      if (sortBy === "ndvi") return (b.ndviChange ?? 0) - (a.ndviChange ?? 0);
      return a.name.localeCompare(b.name);
    });

  const sortLabel = sortBy === "name" ? "Name" : sortBy === "area" ? "Area" : "NDVI";

  const handleClick = (parcel: Parcel) => {
    setActiveParcel(parcel);
    requestFlyTo(parcel);
  };

  return (
    <div className="w-[320px] h-full bg-card/95 backdrop-blur-md border-l border-border flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">{comparing ? "Compare regions" : "Parcels"}</h2>
        <div className="flex items-center gap-2">
          <div className="text-xs text-muted-foreground">{parcels.length} total</div>
          <button
            onClick={() => setComparing((value) => !value)}
            aria-label="Toggle region comparison"
            title={parcels.length < 2 ? "Draw a second parcel to compare" : "Compare regions"}
            disabled={parcels.length < 2}
            className={`p-1.5 rounded-md border transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              comparing ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <GitCompareArrows className="w-4 h-4" />
          </button>
        </div>
      </div>

      {comparing ? (
        <div className="flex-1 min-h-0">
          <ParcelComparison />
        </div>
      ) : <>
      {/* Search */}
      <div className="px-3 pt-3">
        <div className="relative">
          <input
            type="text"
            placeholder="Search parcels…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search parcels"
            className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        </div>
      </div>

      {/* Filter + sort */}
      <div className="flex gap-2 px-3 py-3 relative">
        <div className="relative">
          <button
            onClick={() => setShowFilterMenu(!showFilterMenu)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors ${
              filterCrop ? "border-primary/50 text-primary bg-primary/10" : "border-border text-foreground hover:bg-accent"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {filterCrop ?? "Filter"}
          </button>
          {showFilterMenu && (
            <div className="absolute top-full mt-1 left-0 w-40 rounded-lg border border-border bg-card shadow-xl z-20 overflow-hidden max-h-60 overflow-y-auto">
              <button
                onClick={() => { setFilterCrop(null); setShowFilterMenu(false); }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors ${!filterCrop ? "text-primary" : "text-foreground"}`}
              >
                All crops
              </button>
              {crops.map((crop) => (
                <button key={crop}
                  onClick={() => { setFilterCrop(crop); setShowFilterMenu(false); }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors border-t border-border ${filterCrop === crop ? "text-primary" : "text-foreground"}`}>
                  {crop}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => setSortBy(sortBy === "name" ? "area" : sortBy === "area" ? "ndvi" : "name")}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-accent transition-colors"
        >
          <ArrowUpDown className="w-3.5 h-3.5" /> {sortLabel}
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2 pt-1">
        {parcels.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-4">
            <div className="w-14 h-14 rounded-full border-2 border-dashed border-muted-foreground/40 flex items-center justify-center">
              <MapPin className="w-6 h-6 text-muted-foreground/60" />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">No parcels yet</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">Create your first parcel to get started:</p>
            </div>
            <div className="text-left space-y-2 w-full">
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-accent/15 border border-border/50">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-semibold">1</span>
                <span className="text-xs text-muted-foreground">
                  Click the <PenTool className="inline-block align-text-bottom mx-0.5 text-foreground w-3.5 h-3.5" /> on the map toolbar to start drawing
                </span>
              </div>
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-accent/15 border border-border/50">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-semibold">2</span>
                <span className="text-xs text-muted-foreground"><strong className="text-foreground">Click on the map</strong> to place boundary points around your parcel</span>
              </div>
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-accent/15 border border-border/50">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-semibold">3</span>
                <span className="text-xs text-muted-foreground">Press <strong className="text-foreground">Enter</strong> to save or <strong className="text-foreground">Esc</strong> to cancel</span>
              </div>
            </div>
          </div>
        )}

        {filtered.map((parcel, index) => (
          <div
            key={parcel.id}
            onClick={() => handleClick(parcel)}
            onDoubleClick={(e) => { e.preventDefault(); onOpenDetail?.(parcel); }}
            className={`cursor-pointer ${index === 0 ? "mt-1" : ""}`}
            data-testid={`parcel-card-${parcel.id}`}
          >
            <ParcelCard
              parcel={parcel}
              onEditRequest={setEditingParcel}
              isActive={activeParcel?.id === parcel.id}
            />
          </div>
        ))}

        {filtered.length === 0 && parcels.length > 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground">No parcels match</div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
          <MapPin className="w-3 h-3" /> {filtered.length} shown · {selectedIds.length} selected
        </div>
      </div>

      {/* Edit dialog */}
      {editingParcel && (
        <EditParcelDialog
          parcel={editingParcel}
          onSave={(updated) => { saveParcel(updated); setEditingParcel(null); }}
          onDelete={(id) => { removeParcel(id); setEditingParcel(null); }}
          onClose={() => setEditingParcel(null)}
        />
      )}
      </>}
    </div>
  );
};

export default SidePanel;
