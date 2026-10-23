// Urban-mode logic shared by the dashboard and detail views:
// a parcel is URBAN when its crop is one of the urban land-use values
// (set at creation) OR when GEE land use shows >= 30% Built-up.

import type { LandUsePercentages } from "@/lib/gee";
import { isUrbanCrop } from "@/data/crops";

export function isUrbanParcel(parcelCrop: string, landUse: LandUsePercentages | null): boolean {
  if (isUrbanCrop(parcelCrop)) return true;
  if (!landUse) return false;
  const builtUp = landUse["Built-up"] ?? 0;
  return builtUp >= 30;
}

/** 11-class ESA WorldCover color scheme (pinned for all charts). */
export const LAND_USE_COLORS: Record<string, string> = {
  "Cropland": "#2F6936",
  "Tree cover": "#4A9E5C",
  "Grassland": "#72B755",
  "Built-up": "#D34739",
  "Water": "#2196F3",
  "Bare/sparse": "#D6AA43",
  "Shrubland": "#A5D6A7",
  "Wetland": "#457b9d",
  "Snow/ice": "#e0e1dd",
  "Mangroves": "#1b4332",
  "Moss/lichen": "#b5e48c",
};

/** EU AQI banding — pinned for the AQI cards. */
export function getAqiLabel(aqi: number): { label: string; color: string } {
  if (aqi <= 20) return { label: "Good", color: "#7BC75B" };
  if (aqi <= 40) return { label: "Fair", color: "#CDDC39" };
  if (aqi <= 60) return { label: "Moderate", color: "#C6B77E" };
  if (aqi <= 80) return { label: "Poor", color: "#FF9800" };
  if (aqi <= 100) return { label: "Very Poor", color: "#d73027" };
  return { label: "Hazardous", color: "#7B1FA2" };
}

/** NDVI status thresholds — pinned (documented in the synopsis table). */
export function ndviColor(val: number): string {
  if (val > 0.6) return "#1a9850";
  if (val > 0.4) return "#66bd63";
  if (val > 0.2) return "#fee08b";
  return "#d73027";
}

export function ndviLabel(val: number): string {
  if (val > 0.6) return "Healthy";
  if (val > 0.4) return "Moderate";
  if (val > 0.2) return "Stressed";
  return "Critical";
}

/** Water stress from surface soil moisture % — pinned bands. */
export function waterStressLabel(
  soilMoisture: number | null,
): { label: string; color: string; detail: string } {
  if (soilMoisture == null) return { label: "Checking…", color: "hsl(150, 10%, 55%)", detail: "Waiting for soil moisture data" };
  if (soilMoisture < 15) return { label: "High Stress", color: "#d73027", detail: "Under-irrigated — soil moisture critically low" };
  if (soilMoisture < 25) return { label: "Moderate", color: "#C6B77E", detail: "Monitor closely — may need supplemental irrigation" };
  if (soilMoisture > 45) return { label: "Over-irrigated", color: "#61AFEF", detail: "Excess moisture — risk of waterlogging and root rot" };
  return { label: "Adequate", color: "#7BC75B", detail: "Soil moisture is within optimal range" };
}
