import { useState, useEffect } from "react";
import { X, Search, Loader2, Trees, Building2 } from "lucide-react";
import { searchPlaces, type GeoPlace } from "@/lib/geocoding";
import { reverseGeocode } from "@/lib/reverse-geocode";
import { invokeFn } from "@/lib/invoke";
import {
  estimateAreaHa,
  haToAcres,
} from "@/data/parcel";
import { URBAN_LAND_USES, groupCropOptions } from "@/data/crops";

// Ordered defaults for the first 6 parcels, then first-unused, then random.
const DEFAULT_COLOR_ORDER = ["#E5C07B", "#61AFEF", "#BE5046", "#C678DD", "#7BC75B", "#EAB947"];
const PRESET_COLORS = [
  "#E5C07B", "#61AFEF", "#BE5046", "#C678DD", "#7BC75B",
  "#EAB947", "#D4A853", "#C75B7A", "#5BB8C7", "#8B9A5B",
  "#E06C75", "#98C379", "#D19A66", "#56B6C2", "#FF6B6B",
];

function getNextAutoColor(existingColors: string[]): string {
  const used = new Set(existingColors.map((c) => c.toUpperCase()));
  const count = existingColors.length;
  if (count < DEFAULT_COLOR_ORDER.length) {
    const color = DEFAULT_COLOR_ORDER[count];
    if (!used.has(color.toUpperCase())) return color;
  }
  for (const color of PRESET_COLORS) {
    if (!used.has(color.toUpperCase())) return color;
  }
  return PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
}

interface NewParcelDialogProps {
  /** Unclosed vertex ring (>= 3 vertices) from the map drawing session. */
  coordinates: [number, number][];
  existingColors: string[];
  onSave: (parcel: {
    id: string;
    name: string;
    crop: string;
    cropEmoji: string;
    area: number;
    color: string;
    location: string;
    group?: string;
    coordinates: [number, number][][];
  }) => void;
  onCancel: () => void;
}

const NewParcelDialog = ({ coordinates, existingColors, onSave, onCancel }: NewParcelDialogProps) => {
  const [name, setName] = useState("");
  const [regionType, setRegionType] = useState<"rural" | "urban">("rural");
  const [regionTypeManuallySet, setRegionTypeManuallySet] = useState(false);
  const [detecting, setDetecting] = useState(true);
  const [crop, setCrop] = useState("Wheat");
  const [urbanLandUse, setUrbanLandUse] = useState<string>("Residential");
  const [color, setColor] = useState(() => getNextAutoColor(existingColors));
  const [group, setGroup] = useState("");
  const [location, setLocation] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [locationResults, setLocationResults] = useState<GeoPlace[]>([]);
  const [cropSearch, setCropSearch] = useState("");
  const [showCropDropdown, setShowCropDropdown] = useState(false);

  const estimatedHa = estimateAreaHa(coordinates);
  const estimatedAcres = haToAcres(estimatedHa);

  /* Auto-detect region type + location from the polygon's center. */
  useEffect(() => {
    const center = coordinates.reduce(
      (acc, c) => [acc[0] + c[0] / coordinates.length, acc[1] + c[1] / coordinates.length],
      [0, 0] as [number, number],
    );
    let cancelled = false;
    (async () => {
      setDetecting(true);
      // Geocode and the cheapest possible GEE land-use probe run in parallel.
      // The probe is best-effort: failure must not block parcel creation.
      const [geocodeResult, geeResult] = await Promise.all([
        reverseGeocode(center[1], center[0]),
        invokeFn<{ land_use?: Record<string, number> | null }>("gee-analytics", {
          polygon: coordinates,
          analyses: ["land_use"],
        }).catch(() => null),
      ]);
      if (!cancelled) {
        setLocation(geocodeResult.label);
        const builtUp = geeResult?.land_use?.["Built-up"] ?? 0;
        if (!regionTypeManuallySet && builtUp >= 30) setRegionType("urban");
        setDetecting(false);
      }
    })();
    return () => { cancelled = true; };
  }, [coordinates, regionTypeManuallySet]);

  /* Location autocomplete (debounced). */
  useEffect(() => {
    if (locationQuery.trim().length < 2) { setLocationResults([]); return; }
    const t = setTimeout(async () => {
      const places = await searchPlaces(locationQuery, 4);
      setLocationResults(places);
    }, 300);
    return () => clearTimeout(t);
  }, [locationQuery]);

  const groupedCrops = groupCropOptions(cropSearch);

  const handleSave = () => {
    if (!name.trim()) return;
    const closed = [...coordinates, coordinates[0]] as [number, number][];
    const effectiveCrop = regionType === "urban" ? urbanLandUse : crop;
    onSave({
      id: `custom-${Date.now()}`,
      name: name.trim(),
      crop: effectiveCrop,
      cropEmoji: "",
      area: estimatedHa,
      color,
      location: location || `${coordinates[0][1].toFixed(3)}°N, ${coordinates[0][0].toFixed(3)}°E`,
      group: group || undefined,
      coordinates: [closed],
    });
  };

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-xl border border-border p-5 w-80 space-y-4 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">New Parcel</h3>
          <button onClick={onCancel} aria-label="Cancel" className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Name */}
        <div>
          <label className="text-xs text-muted-foreground block mb-1" htmlFor="np-name">Parcel name</label>
          <input id="np-name" type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="e.g. North Ridge"
            className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" autoFocus />
        </div>

        {/* Region type (manual override; auto-detect arrives in Module 13) */}
        <div>
          <label className="text-xs text-muted-foreground block mb-1.5 flex items-center gap-1.5">
            Region type
            {detecting && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => { setRegionTypeManuallySet(true); setRegionType("rural"); }}
              className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition-all ${regionType === "rural" ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:bg-accent/20"}`}>
              <Trees className="w-4 h-4" />
              <div className="text-left"><div>Rural / Land</div><div className="text-[10px] font-normal opacity-70">Farm, forest, field</div></div>
            </button>
            <button onClick={() => { setRegionTypeManuallySet(true); setRegionType("urban"); }}
              className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition-all ${regionType === "urban" ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:bg-accent/20"}`}>
              <Building2 className="w-4 h-4" />
              <div className="text-left"><div>Urban / City</div><div className="text-[10px] font-normal opacity-70">City, town, suburb</div></div>
            </button>
          </div>
        </div>

        {/* Crop or urban land use */}
        {regionType === "rural" ? (
          <div className="relative">
            <label className="text-xs text-muted-foreground block mb-1">Crop / land use</label>
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
          </div>
        ) : (
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Urban land use</label>
            <div className="grid grid-cols-2 gap-1.5">
              {URBAN_LAND_USES.map((use) => (
                <button key={use} onClick={() => setUrbanLandUse(use)}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs transition-all ${urbanLandUse === use ? "border-primary bg-primary/15 text-primary font-medium" : "border-border text-muted-foreground hover:bg-accent/20"}`}>
                  {use}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Area + group */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Area (acres)</label>
            <div className="bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-muted-foreground">~{estimatedAcres}</div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1" htmlFor="np-group">Group</label>
            <input id="np-group" type="text" value={group} onChange={(e) => setGroup(e.target.value)} placeholder="Optional"
              className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
        </div>

        {/* Location (editable + autocomplete) */}
        <div>
          <label className="text-xs text-muted-foreground block mb-1" htmlFor="np-loc">Location</label>
          <input id="np-loc" type="text" value={location} onChange={(e) => { setLocation(e.target.value); setLocationQuery(e.target.value); }}
            placeholder="Search location…"
            className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
          {locationResults.length > 0 && (
            <div className="mt-1 rounded-lg border border-border bg-card shadow-xl overflow-hidden">
              {locationResults.map((r) => (
                <button key={r.id} onClick={() => { setLocation(r.label); setLocationResults([]); }}
                  className="w-full text-left px-3 py-2 text-xs text-foreground hover:bg-accent flex items-center gap-2 border-b border-border last:border-0">
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Color */}
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

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-lg border border-border text-sm text-foreground hover:bg-accent transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={!name.trim()}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors bg-primary text-primary-foreground disabled:opacity-50">
            Save parcel
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewParcelDialog;
