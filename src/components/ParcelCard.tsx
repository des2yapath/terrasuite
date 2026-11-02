import { MoreHorizontal, MapPin } from "lucide-react";
import { useState } from "react";
import type { Parcel } from "@/data/parcel";
import { haToAcres } from "@/data/parcel";

import { polygonPoints } from "@/lib/parcel-geometry";
interface ParcelCardProps {
  parcel: Parcel;
  onEditRequest: (parcel: Parcel) => void;
  isActive?: boolean;
}

const ParcelCard = ({ parcel, onEditRequest, isActive = false }: ParcelCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const svgPoints = polygonPoints(parcel.coordinates);
  const areaAcres = haToAcres(parcel.area);

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg border transition-all duration-300 ease-out cursor-pointer group"
      style={{
        backgroundColor: isActive ? "hsl(150, 15%, 20%)" : isHovered ? "hsl(150, 15%, 18%)" : "hsl(150, 15%, 14%)",
        transform: isHovered ? "translateX(-2px) scale(1.01)" : "translateX(0) scale(1)",
        boxShadow: isActive
          ? `0 0 0 1px ${parcel.color}88, 0 4px 20px -4px ${parcel.color}33`
          : isHovered
            ? `0 4px 20px -4px ${parcel.color}33, inset 0 0 0 1px ${parcel.color}44`
            : "none",
        borderColor: isActive ? parcel.color + "88" : isHovered ? parcel.color + "66" : "hsl(150, 12%, 22%)",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Mini polygon */}
      <div
        className="w-12 h-12 rounded-md flex items-center justify-center flex-shrink-0 overflow-hidden transition-transform duration-300"
        style={{ backgroundColor: parcel.color + "15", transform: isHovered ? "rotate(-5deg) scale(1.1)" : "rotate(0) scale(1)" }}
      >
        <svg viewBox="0 0 40 40" className="w-8 h-8" aria-hidden="true">
          <polygon points={svgPoints} fill={parcel.color + "44"} stroke={parcel.color} strokeWidth="2" />
        </svg>
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate">{parcel.name}, {areaAcres} acres</span>
          {parcel.ndviChange !== undefined && (
            <span className="text-xs font-semibold" style={{ color: parcel.ndviChange >= 0 ? "hsl(120, 50%, 50%)" : "hsl(0, 62%, 50%)" }}>
              {parcel.ndviChange >= 0 ? "+" : ""}{parcel.ndviChange.toFixed(2)}
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground truncate">{parcel.crop}</div>
        {parcel.group && <div className="text-xs text-muted-foreground truncate">{parcel.group}</div>}
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          <span className="truncate">{parcel.location}</span>
        </div>
      </div>

      {/* Edit trigger */}
      <button
        onClick={(e) => { e.stopPropagation(); onEditRequest(parcel); }}
        aria-label={`Edit ${parcel.name}`}
        className="text-muted-foreground hover:text-foreground transition-all duration-200 flex-shrink-0 opacity-60 group-hover:opacity-100"
        style={{ transform: isHovered ? "scale(1.15)" : "scale(1)" }}
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
    </div>
  );
};

export default ParcelCard;
