import { Search, MapPin, Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { searchPlaces, type GeoPlace } from "@/lib/geocoding";
import { useIsMobile } from "@/hooks/use-mobile";

interface SearchBarProps {
  onLocationSelect?: (lng: number, lat: number, name: string) => void;
}

/**
 * Map search — Open-Meteo geocoding, debounced 300ms, click-outside closes.
 * Selecting a result flies the map (parent handles via onLocationSelect).
 */
const SearchBar = ({ onLocationSelect }: SearchBarProps) => {
  const isMobile = useIsMobile();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoPlace[]>([]);
  const [busy, setBusy] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setBusy(true);
      const places = await searchPlaces(value, 4);
      setResults(places);
      setShowResults(places.length > 0);
      setBusy(false);
    }, 300);
  };

  const handleSelect = (place: GeoPlace) => {
    setQuery(place.label);
    setShowResults(false);
    onLocationSelect?.(place.longitude, place.latitude, place.label);
  };

  return (
    <div
      className={`absolute ${isMobile ? "top-16" : "top-4"} left-4 z-10`}
      ref={containerRef}
    >
      <div className="relative opacity-90">
        <input
          type="text"
          placeholder="Search location…"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          className="w-72 backdrop-blur-sm border border-border rounded-lg px-4 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring bg-background/80"
          aria-label="Search location"
        />
        {busy ? (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
        ) : (
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        )}
      </div>

      {showResults && results.length > 0 && (
        <div className="absolute top-full mt-1 w-72 rounded-lg border border-border overflow-hidden shadow-xl bg-card/95 backdrop-blur-sm">
          {results.map((r) => (
            <button
              key={r.id}
              onClick={() => handleSelect(r)}
              className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors border-b border-border last:border-0 flex items-center gap-2.5"
            >
              <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{r.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
