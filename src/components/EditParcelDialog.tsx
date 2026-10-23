import { useState } from "react";
import { X, Trash2, Search, MapPin } from "lucide-react";
import type { Parcel } from "@/data/parcel";
import { haToAcres } from "@/data/parcel";
import { searchPlaces, type GeoPlace } from "@/lib/geocoding";
import { groupCropOptions, URBAN_LAND_USES } from "@/data/crops";

const PRESET_COLORS = [
  "#E5C07B", "#61AFEF", "#BE5046", "#C678DD", "#7BC75B",
  "#EAB947", "#D4A853", "#C75B7A", "#5BB8C7", "#8B9A5B",
  "#E06C75", "#98C379", "#D19A66", "#56B6C2", "#FF6B6B",
];

interface EditParcelDialogProps {
  parcel: Parcel;
  onSave: (updated: Parcel) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const EditParcelDialog = ({ parcel, onSave, onDelete, onClose }: EditParcelDialogProps) => {
  const [name, setName] = useState(parcel.name);
  const [crop, setCrop] = useState(parcel.crop);
  const [areaAcres, setAreaAcres] = useState(String(haToAcres(parcel.area)));
  const [location, setLocation] = useState(parcel.location);
  const [locationResults, setLocationResults] = useState<GeoPlace[]>([]);
  const [color, setColor] = useState(parcel.color);
  const [group, setGroup] = useState(parcel.group || "");
  const [cropSearch, setCropSearch] = useState("");
  const [showCropDropdown, setShowCropDropdown] = useState(false);

  const isUrban = (URBAN_LAND_USES as readonly string[]).includes(parcel.crop);
  const groupedCrops = groupCropOptions(cropSearch);

  const handleSave = () => {
    const acres = parseFloat(areaAcres) || haToAcres(parcel.area);
    const areaHa = Math.round((acres / 2.47105) * 10) / 10;
    onSave({
      ...parcel,
      name: name.trim() || parcel.name,
      crop,
      cropEmoji: "",
      area: areaHa,
      location,
      color,
      group: group || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card rounded-xl border border-border p-5 w-80 space-y-4 shadow-2xl animate-fade-in mx-[5px] max-h-[85vh] overflow-y-auto mb-16 sm:mb-0">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Edit Parcel</h3>
          <button onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <label className="text-xs text-muted-foreground block mb-1" htmlFor="ep-name">Parcel name</label>
          <input id="ep-name" type="text" value={name} onChange={(e) => setName(e.target.value)}
            className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>

        {/* Crop dropdown (or static urban land-use label) */}
        <div className="relative">
          <label className="text-xs text-muted-foreground block mb-1">{isUrban ? "Urban land use" : "Crop / land use"}</label>
          {isUrban ? (
            <div className="bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground">{crop}</div>
          ) : (
            <>
              <button type="button" onClick={() => setShowCropDropdown(!showCropDropdown)}
                className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground text-left flex items-center justify-between">
                <span>{crop}</span><span className="text-muted-foreground text-xs">▼</span>
              </button>
              {showCropDropdown && (
                <div className="absolute top-full mt-1 left-0 right-0 bg-card border border-border rounded-lg shadow-xl z-30 max-h-56 overflow-y-auto">
                  <div className="sticky top-0 bg-card p-2 border-b border-border">
                    <div className="relative">
                      <input type="text" value={cropSearch} onChange={(e) => setCropSearch(e.target.value)}
                        placeholder="Search crops…" autoFocus
                        className="w-full bg-secondary/50 border border-border rounded-md px-3 py-1.5 pr-8 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                      <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  </div>
                  {Object.entries(groupedCrops).map(([category, crops]) => (
                    <div key={category}>
                      <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-accent/20">{category}</div>
                      {crops.map((c) => (
                        <button key={c.name}
                          onClick={() => { setCrop(c.name); setShowCropDropdown(false); setCropSearch(""); }}
                          className={`w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors ${crop === c.name ? "text-primary bg-primary/10" : "text-foreground"}`}>
                          {c.name}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1" htmlFor="ep-area">Area (acres)</label>
            <input id="ep-area" type="number" step="0.1" value={areaAcres} onChange={(e) => setAreaAcres(e.target.value)}
              className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1" htmlFor="ep-group">Group</label>
            <input id="ep-group" type="text" value={group} onChange={(e) => setGroup(e.target.value)} placeholder="Optional"
              className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground block mb-1" htmlFor="ep-loc">Location</label>
          <input id="ep-loc" type="text" value={location}
            onChange={(e) => { setLocation(e.target.value); setLocationResults([]); }}
            placeholder="Search location…"
            className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
          {locationResults.length > 0 && (
            <div className="mt-1 rounded-lg border border-border bg-card shadow-xl overflow-hidden">
              {locationResults.map((r) => (
                <button key={r.id} onClick={() => { setLocation(r.label); setLocationResults([]); }}
                  className="w-full text-left px-3 py-2 text-xs text-foreground hover:bg-accent flex items-center gap-2 border-b border-border last:border-0">
                  <MapPin className="w-3 h-3 text-muted-foreground" />{r.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="text-xs text-muted-foreground block mb-1">Color</label>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((c) => (
              <button key={c} onClick={() => setColor(c)} aria-label={`Pick color ${c}`}
                className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                style={{ backgroundColor: c, borderColor: color === c ? "hsl(60, 20%, 85%)" : "transparent", transform: color === c ? "scale(1.2)" : undefined }} />
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={() => onDelete(parcel.id)} title="Delete parcel"
            className="p-2.5 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-border text-sm text-foreground hover:bg-accent transition-colors">Cancel</button>
          <button onClick={handleSave} className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors bg-primary text-primary-foreground">Save</button>
        </div>
      </div>
    </div>
  );
};

export default EditParcelDialog;
