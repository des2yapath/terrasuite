import { Layers, Plus, Minus, Map, Compass, LocateFixed, PenTool, Check, Satellite } from "lucide-react";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export type BasemapStyle = "satellite" | "dark";

interface MapToolbarProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onStyleChange: (style: BasemapStyle) => void;
  onToggleParcels: () => void;
  onResetNorth: () => void;
  onLocateUser: () => void;
  /** Drawing + NDVI toggles are added by Module 04/05 props extension. */
  showParcels: boolean;
  defaultStyle?: BasemapStyle;
  onToggleDraw?: () => void;
  isDrawing?: boolean;
  onEditBoundary?: () => void;
  isEditingBoundary?: boolean;
  onToggleNdvi?: () => void;
  showNdvi?: boolean;
}

/**
 * Left-side vertical map toolbar (zoom, basemap, parcel visibility,
 * compass reset, geolocation). Drawing/NDVI buttons are appended in
 * Modules 04/05 by extending this component's props — keep it dumb.
 */
const MapToolbar = ({
  onZoomIn,
  onZoomOut,
  onStyleChange,
  onToggleParcels,
  onResetNorth,
  onLocateUser,
  showParcels,
  defaultStyle = "satellite",
  onToggleDraw,
  isDrawing = false,
  onEditBoundary,
  isEditingBoundary = false,
  onToggleNdvi,
  showNdvi = false,
}: MapToolbarProps) => {
  const [currentStyle, setCurrentStyle] = useState<BasemapStyle>(defaultStyle);

  const handleStyleToggle = () => {
    const next: BasemapStyle = currentStyle === "dark" ? "satellite" : "dark";
    setCurrentStyle(next);
    onStyleChange(next);
  };

  const items = [
    {
      icon: Layers,
      onClick: onToggleParcels,
      label: showParcels ? "Hide parcels" : "Show parcels",
      active: showParcels,
    },
    { icon: Plus, onClick: onZoomIn, label: "Zoom in" },
    { icon: Minus, onClick: onZoomOut, label: "Zoom out" },
    {
      icon: Map,
      onClick: handleStyleToggle,
      label: currentStyle === "dark" ? "Satellite view" : "Dark view",
      active: currentStyle === "satellite",
    },
    {
      icon: PenTool,
      onClick: onToggleDraw ?? (() => {}),
      label: isDrawing ? "Stop drawing" : "Draw parcel",
      active: isDrawing,
    },
    ...(isEditingBoundary
      ? [{ icon: Check, onClick: onEditBoundary ?? (() => {}), label: "Finish boundary edit", active: true }]
      : []),
    {
      icon: Satellite,
      onClick: onToggleNdvi ?? (() => {}),
      label: showNdvi ? "Hide NDVI" : "NDVI overlay",
      active: showNdvi,
    },
    { icon: Compass, onClick: onResetNorth, label: "Reset north" },
    { icon: LocateFixed, onClick: onLocateUser, label: "My location" },
  ];

  return (
    <TooltipProvider delayDuration={200}>
      <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-10 opacity-85">
        {items.map(({ icon: Icon, onClick, label, active }) => (
          <Tooltip key={label}>
            <TooltipTrigger asChild>
              <button
                onClick={onClick}
                aria-label={label}
                className={`w-10 h-10 rounded-lg backdrop-blur-sm border border-border flex items-center justify-center transition-colors ${
                  active ? "text-primary bg-accent" : "text-foreground bg-card/80 hover:bg-accent/60"
                }`}
              >
                <Icon className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{label}</TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
};

export default MapToolbar;
