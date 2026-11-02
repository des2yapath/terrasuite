import type { ComponentType } from "react";

export type VivaIcon = ComponentType<{ className?: string }>;

export interface VivaSeriesPoint {
  month: string;
  value: number;
}

export interface VivaClimatePoint {
  month: string;
  rainfall: number;
  temperature: number;
}

export interface VivaZone {
  name: string;
  crop: string;
  emoji: string;
  share: number;
  color: string;
  note: string;
}

export interface VivaCropPlan {
  recommendedCrop: string;
  confidence: number;
  zones: VivaZone[];
  rotation: string[];
  recommendations: string[];
}

export interface VivaParcel {
  id: string;
  name: string;
  location: string;
  region: string;
  crop: string;
  cropEmoji: string;
  area: string;
  suitability: number;
  ndvi: number;
  rainfall: number;
  soilQuality: number;
  waterAccess: number;
  recommendation: string;
  recommendationReason: string;
  status: string;
  statusTone: "lime" | "amber" | "cyan" | "blue";
  mapPosition: { x: number; y: number };
  mapPolygon: string;
  color: string;
  badges: string[];
  ndviTrend: VivaSeriesPoint[];
  climate: VivaClimatePoint[];
  suitabilityProfile: Array<{ subject: string; value: number }>;
  landUse: Array<{ name: string; value: number; color: string }>;
  cropPlan: VivaCropPlan;
}

export interface VivaKpi {
  label: string;
  value: string;
  context: string;
  accent: "lime" | "amber" | "cyan" | "blue" | "violet" | "coral";
}

export interface VivaComparisonMetric {
  label: string;
  punjab: string;
  jaen: string;
  context: string;
}

export interface VivaValidationRegion {
  name: string;
  crop: string;
  agreement: number;
  className: string;
}

export const VIVA_DATE = "02 NOV 2026";

export const VIVA_KPIS: VivaKpi[] = [
  { label: "Managed parcels", value: "6", context: "Across 5 agro-regions", accent: "lime" },
  { label: "Data layers fused", value: "5", context: "Satellite · soil · climate", accent: "cyan" },
  { label: "Best suitability", value: "8.4 / 10", context: "Ludhiana North Field", accent: "amber" },
  { label: "Mean NDVI", value: "0.52", context: "Selected parcel · +0.08", accent: "lime" },
  { label: "Water access", value: "88 / 100", context: "Irrigation available", accent: "blue" },
  { label: "Validation agreement", value: "100%", context: "5 fixture regions", accent: "violet" },
];

const wheatPlan: VivaCropPlan = {
  recommendedCrop: "Wheat",
  confidence: 84,
  zones: [
    { name: "Zone A", crop: "Wheat", emoji: "🌾", share: 50, color: "#b8dc65", note: "Primary rabi block" },
    { name: "Zone B", crop: "Mustard", emoji: "🌼", share: 30, color: "#e5b85c", note: "Oilseed rotation" },
    { name: "Zone C", crop: "Chickpea", emoji: "🫘", share: 20, color: "#68c1bd", note: "Nitrogen support" },
  ],
  rotation: ["Wheat", "Mustard", "Chickpea"],
  recommendations: [
    "Split nitrogen application across tillering and booting.",
    "Monitor terminal heat during the final three weeks.",
    "Maintain the irrigation schedule through grain filling.",
    "Scout lower leaves early for yellow-rust risk.",
  ],
};

const olivePlan: VivaCropPlan = {
  recommendedCrop: "Olive",
  confidence: 78,
  zones: [
    { name: "Zone A", crop: "Olive", emoji: "🫒", share: 60, color: "#a7ca69", note: "Existing grove" },
    { name: "Zone B", crop: "Chickpea", emoji: "🫘", share: 25, color: "#d7ad5d", note: "Cover and rotation" },
    { name: "Zone C", crop: "Lavender", emoji: "🌿", share: 15, color: "#9d91cc", note: "Edge planting" },
  ],
  rotation: ["Olive", "Chickpea", "Cover crop"],
  recommendations: ["Use deficit irrigation in fruit set.", "Protect soil on the hillside with cover crops.", "Monitor summer heat and olive fruit fly."],
};

const maizePlan: VivaCropPlan = {
  recommendedCrop: "Maize",
  confidence: 87,
  zones: [
    { name: "Zone A", crop: "Maize", emoji: "🌽", share: 55, color: "#b8dc65", note: "High-potential core" },
    { name: "Zone B", crop: "Soybean", emoji: "🫘", share: 30, color: "#68c1bd", note: "Rotation block" },
    { name: "Zone C", crop: "Cover crop", emoji: "🌱", share: 15, color: "#7e9de1", note: "Runoff buffer" },
  ],
  rotation: ["Maize", "Soybean", "Cover crop"],
  recommendations: ["Use variable-rate nitrogen in the low-OM zone.", "Schedule scouting after high-rain events.", "Keep the buffer strip intact along drainage lines."],
};

const coconutPlan: VivaCropPlan = {
  recommendedCrop: "Coconut",
  confidence: 81,
  zones: [
    { name: "Zone A", crop: "Coconut", emoji: "🥥", share: 55, color: "#b8dc65", note: "Canopy core" },
    { name: "Zone B", crop: "Cardamom", emoji: "🌿", share: 25, color: "#68c1bd", note: "Understory" },
    { name: "Zone C", crop: "Banana", emoji: "🍌", share: 20, color: "#e5b85c", note: "Moisture pocket" },
  ],
  rotation: ["Coconut", "Banana", "Cardamom"],
  recommendations: ["Clear drainage before peak monsoon.", "Retain mulch around the palm basin.", "Inspect palms for rhinoceros beetle damage."],
};

const sorghumPlan: VivaCropPlan = {
  recommendedCrop: "Sorghum",
  confidence: 59,
  zones: [
    { name: "Zone A", crop: "Sorghum", emoji: "🌾", share: 50, color: "#d7ad5d", note: "Drought-tolerant core" },
    { name: "Zone B", crop: "Cowpea", emoji: "🫘", share: 30, color: "#68c1bd", note: "Intercrop support" },
    { name: "Zone C", crop: "Millet", emoji: "🌾", share: 20, color: "#b8dc65", note: "Risk hedge" },
  ],
  rotation: ["Sorghum", "Cowpea", "Millet"],
  recommendations: ["Prioritize early sowing after the first reliable rain.", "Use residue cover to slow soil moisture loss.", "Keep a millet block as a rainfall-risk hedge."],
};

export const VIVA_PARCELS: VivaParcel[] = [
  {
    id: "punjab-wheat",
    name: "Ludhiana North Field",
    location: "Ludhiana, Punjab · India",
    region: "Indo-Gangetic Plain",
    crop: "Wheat",
    cropEmoji: "🌾",
    area: "4.0 ha",
    suitability: 8.4,
    ndvi: 0.52,
    rainfall: 730,
    soilQuality: 86,
    waterAccess: 88,
    recommendation: "Prioritize Wheat",
    recommendationReason: "Strong soil and irrigation access support a high-confidence rabi crop. The model also flags a manageable terminal-heat window, so timing matters.",
    status: "Highly suitable",
    statusTone: "lime",
    mapPosition: { x: 31, y: 33 },
    mapPolygon: "22,35 30,23 42,27 47,39 35,46 24,43",
    color: "#b8dc65",
    badges: ["Highly Suitable", "Moderate Vegetation Health", "Irrigation Available", "Rabi Season"],
    ndviTrend: [
      { month: "May", value: 0.42 }, { month: "Jun", value: 0.45 }, { month: "Jul", value: 0.48 },
      { month: "Aug", value: 0.46 }, { month: "Sep", value: 0.50 }, { month: "Oct", value: 0.52 },
    ],
    climate: [
      { month: "May", rainfall: 42, temperature: 31 }, { month: "Jun", rainfall: 118, temperature: 34 },
      { month: "Jul", rainfall: 164, temperature: 32 }, { month: "Aug", rainfall: 142, temperature: 31 },
      { month: "Sep", rainfall: 83, temperature: 29 }, { month: "Oct", rainfall: 28, temperature: 26 },
    ],
    suitabilityProfile: [
      { subject: "Soil", value: 86 }, { subject: "Water", value: 88 }, { subject: "Climate", value: 89 },
      { subject: "Terrain", value: 96 }, { subject: "Drainage", value: 88 }, { subject: "Nutrients", value: 79 },
    ],
    landUse: [
      { name: "Cropland", value: 68, color: "#7bc75b" }, { name: "Tree cover", value: 12, color: "#4a9e5c" },
      { name: "Grassland", value: 8, color: "#a8cf70" }, { name: "Built-up", value: 7, color: "#d59a67" },
      { name: "Water", value: 5, color: "#61afef" },
    ],
    cropPlan: wheatPlan,
  },
  {
    id: "jaen-olive",
    name: "Jaén Hillside Olives",
    location: "Jaén, Andalusia · Spain",
    region: "Mediterranean Basin",
    crop: "Olive",
    cropEmoji: "🫒",
    area: "12.0 ha",
    suitability: 7.8,
    ndvi: 0.48,
    rainfall: 550,
    soilQuality: 82,
    waterAccess: 64,
    recommendation: "Retain Olive",
    recommendationReason: "The existing grove is well matched to the dry Mediterranean climate. Focus on slope protection and measured deficit irrigation.",
    status: "Stable fit",
    statusTone: "amber",
    mapPosition: { x: 57, y: 27 },
    mapPolygon: "51,22 62,16 72,22 70,35 58,39 49,32",
    color: "#d8ac5e",
    badges: ["Stable Fit", "Moderate Vegetation Health", "Slope Watch", "Dry Season"],
    ndviTrend: [
      { month: "May", value: 0.44 }, { month: "Jun", value: 0.46 }, { month: "Jul", value: 0.49 },
      { month: "Aug", value: 0.50 }, { month: "Sep", value: 0.48 }, { month: "Oct", value: 0.48 },
    ],
    climate: [
      { month: "May", rainfall: 54, temperature: 22 }, { month: "Jun", rainfall: 23, temperature: 27 },
      { month: "Jul", rainfall: 5, temperature: 31 }, { month: "Aug", rainfall: 7, temperature: 31 },
      { month: "Sep", rainfall: 31, temperature: 27 }, { month: "Oct", rainfall: 63, temperature: 21 },
    ],
    suitabilityProfile: [
      { subject: "Soil", value: 82 }, { subject: "Water", value: 64 }, { subject: "Climate", value: 76 },
      { subject: "Terrain", value: 72 }, { subject: "Drainage", value: 79 }, { subject: "Nutrients", value: 74 },
    ],
    landUse: [
      { name: "Tree cover", value: 61, color: "#4a9e5c" }, { name: "Cropland", value: 22, color: "#7bc75b" },
      { name: "Grassland", value: 10, color: "#a8cf70" }, { name: "Bare/sparse", value: 5, color: "#d8ac5e" },
      { name: "Built-up", value: 2, color: "#d59a67" },
    ],
    cropPlan: olivePlan,
  },
  {
    id: "kochi-coconut",
    name: "Kochi Coconut Grove",
    location: "Kochi, Kerala · India",
    region: "Tropical Malabar Coast",
    crop: "Coconut",
    cropEmoji: "🥥",
    area: "3.0 ha",
    suitability: 8.1,
    ndvi: 0.66,
    rainfall: 3000,
    soilQuality: 77,
    waterAccess: 91,
    recommendation: "Layer Coconut + Cardamom",
    recommendationReason: "High moisture availability and a strong canopy signal make this a good candidate for a layered plantation plan.",
    status: "High moisture",
    statusTone: "cyan",
    mapPosition: { x: 77, y: 55 },
    mapPolygon: "71,49 82,42 91,48 87,61 76,67 68,58",
    color: "#67c5ba",
    badges: ["Highly Suitable", "Healthy Vegetation", "High Rainfall", "Layered Plan"],
    ndviTrend: [
      { month: "May", value: 0.61 }, { month: "Jun", value: 0.64 }, { month: "Jul", value: 0.67 },
      { month: "Aug", value: 0.68 }, { month: "Sep", value: 0.67 }, { month: "Oct", value: 0.66 },
    ],
    climate: [
      { month: "May", rainfall: 310, temperature: 29 }, { month: "Jun", rainfall: 650, temperature: 28 },
      { month: "Jul", rainfall: 720, temperature: 27 }, { month: "Aug", rainfall: 490, temperature: 27 },
      { month: "Sep", rainfall: 320, temperature: 28 }, { month: "Oct", rainfall: 290, temperature: 29 },
    ],
    suitabilityProfile: [
      { subject: "Soil", value: 77 }, { subject: "Water", value: 91 }, { subject: "Climate", value: 94 },
      { subject: "Terrain", value: 69 }, { subject: "Drainage", value: 72 }, { subject: "Nutrients", value: 83 },
    ],
    landUse: [
      { name: "Tree cover", value: 72, color: "#4a9e5c" }, { name: "Cropland", value: 14, color: "#7bc75b" },
      { name: "Grassland", value: 7, color: "#a8cf70" }, { name: "Water", value: 5, color: "#61afef" },
      { name: "Built-up", value: 2, color: "#d59a67" },
    ],
    cropPlan: coconutPlan,
  },
  {
    id: "ames-maize",
    name: "Ames Corn Plot",
    location: "Ames, Iowa · USA",
    region: "Temperate Corn Belt",
    crop: "Maize",
    cropEmoji: "🌽",
    area: "40.0 ha",
    suitability: 8.7,
    ndvi: 0.72,
    rainfall: 910,
    soilQuality: 94,
    waterAccess: 95,
    recommendation: "Prioritize Maize",
    recommendationReason: "Deep high-organic-matter soil, flat terrain, and reliable rainfall create the strongest modeled opportunity in the portfolio.",
    status: "Top potential",
    statusTone: "blue",
    mapPosition: { x: 18, y: 68 },
    mapPolygon: "9,62 19,53 31,59 30,72 20,79 9,74",
    color: "#78a9e8",
    badges: ["Top Potential", "Healthy Vegetation", "High Soil Quality", "Summer Crop"],
    ndviTrend: [
      { month: "May", value: 0.49 }, { month: "Jun", value: 0.61 }, { month: "Jul", value: 0.76 },
      { month: "Aug", value: 0.81 }, { month: "Sep", value: 0.78 }, { month: "Oct", value: 0.72 },
    ],
    climate: [
      { month: "May", rainfall: 82, temperature: 19 }, { month: "Jun", rainfall: 114, temperature: 24 },
      { month: "Jul", rainfall: 128, temperature: 26 }, { month: "Aug", rainfall: 98, temperature: 25 },
      { month: "Sep", rainfall: 76, temperature: 21 }, { month: "Oct", rainfall: 67, temperature: 14 },
    ],
    suitabilityProfile: [
      { subject: "Soil", value: 94 }, { subject: "Water", value: 95 }, { subject: "Climate", value: 96 },
      { subject: "Terrain", value: 97 }, { subject: "Drainage", value: 87 }, { subject: "Nutrients", value: 92 },
    ],
    landUse: [
      { name: "Cropland", value: 79, color: "#7bc75b" }, { name: "Grassland", value: 9, color: "#a8cf70" },
      { name: "Tree cover", value: 7, color: "#4a9e5c" }, { name: "Water", value: 3, color: "#61afef" },
      { name: "Built-up", value: 2, color: "#d59a67" },
    ],
    cropPlan: maizePlan,
  },
  {
    id: "campus-courtyard",
    name: "Campus Courtyard",
    location: "TerraSuite campus · demo",
    region: "Urban green infrastructure",
    crop: "Park / Garden",
    cropEmoji: "🌿",
    area: "0.8 ha",
    suitability: 6.6,
    ndvi: 0.61,
    rainfall: 680,
    soilQuality: 68,
    waterAccess: 73,
    recommendation: "Maintain green cover",
    recommendationReason: "This urban parcel is evaluated for green-cover health, water resilience, and canopy continuity rather than crop yield.",
    status: "Urban green",
    statusTone: "lime",
    mapPosition: { x: 51, y: 70 },
    mapPolygon: "44,65 54,59 64,66 61,77 50,81 42,74",
    color: "#98c66b",
    badges: ["Urban Green", "Healthy Canopy", "Water Resilient", "Maintenance Plan"],
    ndviTrend: [
      { month: "May", value: 0.56 }, { month: "Jun", value: 0.59 }, { month: "Jul", value: 0.63 },
      { month: "Aug", value: 0.64 }, { month: "Sep", value: 0.62 }, { month: "Oct", value: 0.61 },
    ],
    climate: [
      { month: "May", rainfall: 71, temperature: 27 }, { month: "Jun", rainfall: 90, temperature: 29 },
      { month: "Jul", rainfall: 112, temperature: 30 }, { month: "Aug", rainfall: 97, temperature: 29 },
      { month: "Sep", rainfall: 74, temperature: 27 }, { month: "Oct", rainfall: 54, temperature: 24 },
    ],
    suitabilityProfile: [
      { subject: "Soil", value: 68 }, { subject: "Water", value: 73 }, { subject: "Climate", value: 81 },
      { subject: "Terrain", value: 84 }, { subject: "Drainage", value: 77 }, { subject: "Canopy", value: 88 },
    ],
    landUse: [
      { name: "Tree cover", value: 38, color: "#4a9e5c" }, { name: "Grassland", value: 31, color: "#a8cf70" },
      { name: "Built-up", value: 18, color: "#d59a67" }, { name: "Cropland", value: 8, color: "#7bc75b" },
      { name: "Water", value: 5, color: "#61afef" },
    ],
    cropPlan: wheatPlan,
  },
  {
    id: "niamey-sorghum",
    name: "Niamey Sahel Plot",
    location: "Niamey · Niger",
    region: "Sahelian semi-arid zone",
    crop: "Sorghum",
    cropEmoji: "🌾",
    area: "6.0 ha",
    suitability: 5.9,
    ndvi: 0.22,
    rainfall: 450,
    soilQuality: 48,
    waterAccess: 52,
    recommendation: "Sorghum + risk hedge",
    recommendationReason: "Sorghum is the strongest local fit, but rainfall variability means a drought-tolerant rotation and water-saving practice are essential.",
    status: "Watch water stress",
    statusTone: "amber",
    mapPosition: { x: 82, y: 78 },
    mapPolygon: "75,73 84,67 94,73 91,84 81,88 73,82",
    color: "#d89c62",
    badges: ["Moderate Suitability", "Vegetation Stress", "Water Watch", "Risk Hedge"],
    ndviTrend: [
      { month: "May", value: 0.18 }, { month: "Jun", value: 0.20 }, { month: "Jul", value: 0.28 },
      { month: "Aug", value: 0.31 }, { month: "Sep", value: 0.26 }, { month: "Oct", value: 0.22 },
    ],
    climate: [
      { month: "May", rainfall: 18, temperature: 34 }, { month: "Jun", rainfall: 48, temperature: 33 },
      { month: "Jul", rainfall: 112, temperature: 31 }, { month: "Aug", rainfall: 164, temperature: 30 },
      { month: "Sep", rainfall: 83, temperature: 31 }, { month: "Oct", rainfall: 15, temperature: 33 },
    ],
    suitabilityProfile: [
      { subject: "Soil", value: 48 }, { subject: "Water", value: 52 }, { subject: "Climate", value: 57 },
      { subject: "Terrain", value: 94 }, { subject: "Drainage", value: 67 }, { subject: "Nutrients", value: 45 },
    ],
    landUse: [
      { name: "Grassland", value: 43, color: "#a8cf70" }, { name: "Cropland", value: 28, color: "#7bc75b" },
      { name: "Bare/sparse", value: 21, color: "#d8ac5e" }, { name: "Tree cover", value: 5, color: "#4a9e5c" },
      { name: "Water", value: 3, color: "#61afef" },
    ],
    cropPlan: sorghumPlan,
  },
];

export const VIVA_COMPARISON: VivaComparisonMetric[] = [
  { label: "Suitability", punjab: "8.4 / 10", jaen: "7.8 / 10", context: "Different environments, different strengths" },
  { label: "NDVI health", punjab: "0.52", jaen: "0.48", context: "Seasonal signals, not a universal ranking" },
  { label: "Annual rainfall", punjab: "730 mm", jaen: "550 mm", context: "Monsoon-weighted vs Mediterranean" },
  { label: "Water access", punjab: "88 / 100", jaen: "64 / 100", context: "Irrigation capacity is context-specific" },
  { label: "Soil quality", punjab: "86 / 100", jaen: "82 / 100", context: "Both support their current crop" },
];

export const VIVA_VALIDATION_REGIONS: VivaValidationRegion[] = [
  { name: "Punjab", crop: "Wheat", agreement: 100, className: "S1 ↔ VS" },
  { name: "Andalusia", crop: "Olive", agreement: 100, className: "S1 ↔ VS" },
  { name: "Kerala", crop: "Coconut", agreement: 100, className: "S1 ↔ VS" },
  { name: "Iowa", crop: "Maize", agreement: 100, className: "S1 ↔ VS" },
  { name: "Sahel", crop: "Sorghum", agreement: 100, className: "S2 ↔ S" },
];

export const VIVA_VALIDATION = {
  fixtures: 5,
  cropAgreement: "100%",
  classAgreement: "100%",
  mae: "0.000",
  rmse: "0.000",
  buildTime: "< 10 ms",
};
