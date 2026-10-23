// Crop-profile database — the "structured database of individually
// profiled crops" the synopsis promises. Each profile carries the ranges
// the scoring engine uses. 58 profiles spanning cereals, legumes, oilseeds,
// vegetables, fruits, plantation/industrial, and trees.
//
// Units pinned:
//   tempC — optimal growing temperature range [min, max] °C
//   rainMm — optimal annual rainfall range [min, max] mm
//   ph    — optimal soil pH range
//   humidity — optimal relative humidity range %
//   spacingM — typical planting spacing (visualization dot sizing)
//   dotSize — crop-plan marker size in px (visualization)
//   tree   — tree crops (sparse planting, 1/60 density, intercropping hosts)

export interface CropProfile {
  name: string;
  tempC: [number, number];
  rainMm: [number, number];
  ph: [number, number];
  humidity: [number, number];
  spacingM: number;
  dotSize: number;
  tree: boolean;
  waterNeeds: "low" | "medium" | "high";
  season: string;
  yieldEst: string;
}

export const CROP_PROFILES: CropProfile[] = [
  // Cereals
  { name: "Wheat", tempC: [12, 24], rainMm: [450, 900], ph: [6.0, 7.5], humidity: [40, 70], spacingM: 0.15, dotSize: 3, tree: false, waterNeeds: "medium", season: "Rabi (Oct–Mar)", yieldEst: "3.5 tonnes/ha" },
  { name: "Rice", tempC: [22, 35], rainMm: [1000, 2000], ph: [5.5, 7.0], humidity: [60, 90], spacingM: 0.25, dotSize: 3, tree: false, waterNeeds: "high", season: "Kharif (Jun–Oct)", yieldEst: "4.5 tonnes/ha" },
  { name: "Maize", tempC: [18, 30], rainMm: [500, 1000], ph: [5.8, 7.0], humidity: [50, 75], spacingM: 0.6, dotSize: 4, tree: false, waterNeeds: "medium", season: "Kharif (Jun–Oct)", yieldEst: "4.0 tonnes/ha" },
  { name: "Barley", tempC: [10, 22], rainMm: [350, 700], ph: [6.0, 7.5], humidity: [40, 65], spacingM: 0.2, dotSize: 3, tree: false, waterNeeds: "low", season: "Rabi (Oct–Mar)", yieldEst: "2.8 tonnes/ha" },
  { name: "Oats", tempC: [10, 22], rainMm: [400, 800], ph: [5.5, 7.0], humidity: [45, 70], spacingM: 0.2, dotSize: 3, tree: false, waterNeeds: "medium", season: "Rabi (Oct–Mar)", yieldEst: "2.5 tonnes/ha" },
  { name: "Sorghum", tempC: [24, 35], rainMm: [400, 750], ph: [5.5, 7.5], humidity: [35, 60], spacingM: 0.5, dotSize: 4, tree: false, waterNeeds: "low", season: "Kharif (Jun–Oct)", yieldEst: "2.0 tonnes/ha" },
  { name: "Millet", tempC: [24, 35], rainMm: [300, 600], ph: [5.5, 7.0], humidity: [30, 60], spacingM: 0.4, dotSize: 3, tree: false, waterNeeds: "low", season: "Kharif (Jun–Oct)", yieldEst: "1.5 tonnes/ha" },
  { name: "Ragi (Finger Millet)", tempC: [20, 32], rainMm: [500, 900], ph: [5.0, 7.0], humidity: [50, 80], spacingM: 0.3, dotSize: 3, tree: false, waterNeeds: "medium", season: "Kharif (Jun–Oct)", yieldEst: "1.8 tonnes/ha" },
  { name: "Pearl Millet (Bajra)", tempC: [25, 38], rainMm: [300, 600], ph: [5.5, 7.5], humidity: [25, 55], spacingM: 0.5, dotSize: 3, tree: false, waterNeeds: "low", season: "Kharif (Jun–Oct)", yieldEst: "1.2 tonnes/ha" },
  { name: "Quinoa", tempC: [15, 25], rainMm: [300, 600], ph: [6.0, 7.5], humidity: [40, 65], spacingM: 0.3, dotSize: 3, tree: false, waterNeeds: "low", season: "Spring (Mar–Jun)", yieldEst: "1.2 tonnes/ha" },
  { name: "Buckwheat", tempC: [13, 22], rainMm: [400, 700], ph: [5.0, 7.0], humidity: [45, 70], spacingM: 0.25, dotSize: 3, tree: false, waterNeeds: "medium", season: "Summer (Jun–Sep)", yieldEst: "1.0 tonnes/ha" },
  // Legumes
  { name: "Soybean", tempC: [20, 32], rainMm: [600, 1200], ph: [6.0, 7.5], humidity: [50, 80], spacingM: 0.45, dotSize: 4, tree: false, waterNeeds: "medium", season: "Kharif (Jun–Oct)", yieldEst: "2.0 tonnes/ha" },
  { name: "Chickpea", tempC: [15, 28], rainMm: [350, 700], ph: [6.0, 8.0], humidity: [35, 60], spacingM: 0.3, dotSize: 3, tree: false, waterNeeds: "low", season: "Rabi (Oct–Mar)", yieldEst: "1.2 tonnes/ha" },
  { name: "Lentil", tempC: [12, 25], rainMm: [350, 650], ph: [6.0, 7.5], humidity: [40, 65], spacingM: 0.25, dotSize: 3, tree: false, waterNeeds: "low", season: "Rabi (Oct–Mar)", yieldEst: "1.0 tonnes/ha" },
  { name: "Mung Bean", tempC: [25, 35], rainMm: [500, 900], ph: [6.0, 7.5], humidity: [50, 80], spacingM: 0.3, dotSize: 3, tree: false, waterNeeds: "medium", season: "Zaid (Mar–Jun)", yieldEst: "0.8 tonnes/ha" },
  { name: "Pigeon Pea (Tur Dal)", tempC: [20, 32], rainMm: [500, 1000], ph: [5.5, 7.0], humidity: [45, 75], spacingM: 0.9, dotSize: 4, tree: false, waterNeeds: "medium", season: "Kharif (Jun–Oct)", yieldEst: "1.2 tonnes/ha" },
  { name: "Peanut (Groundnut)", tempC: [22, 32], rainMm: [500, 1000], ph: [5.5, 7.0], humidity: [45, 70], spacingM: 0.3, dotSize: 3, tree: false, waterNeeds: "medium", season: "Kharif (Jun–Oct)", yieldEst: "1.8 tonnes/ha" },
  { name: "Faba Bean", tempC: [12, 24], rainMm: [450, 850], ph: [6.0, 7.5], humidity: [50, 75], spacingM: 0.4, dotSize: 4, tree: false, waterNeeds: "medium", season: "Rabi (Oct–Mar)", yieldEst: "1.5 tonnes/ha" },
  { name: "Cowpea", tempC: [22, 35], rainMm: [400, 800], ph: [5.5, 7.0], humidity: [50, 80], spacingM: 0.4, dotSize: 3, tree: false, waterNeeds: "low", season: "Kharif (Jun–Oct)", yieldEst: "1.0 tonnes/ha" },
  // Oilseeds
  { name: "Sunflower", tempC: [18, 30], rainMm: [450, 850], ph: [6.0, 7.5], humidity: [45, 70], spacingM: 0.5, dotSize: 5, tree: false, waterNeeds: "medium", season: "Spring (Mar–Jun)", yieldEst: "1.5 tonnes/ha" },
  { name: "Mustard", tempC: [10, 25], rainMm: [350, 700], ph: [6.0, 7.5], humidity: [40, 65], spacingM: 0.3, dotSize: 3, tree: false, waterNeeds: "low", season: "Rabi (Oct–Mar)", yieldEst: "1.2 tonnes/ha" },
  { name: "Sesame", tempC: [24, 35], rainMm: [400, 800], ph: [5.5, 7.5], humidity: [40, 70], spacingM: 0.4, dotSize: 3, tree: false, waterNeeds: "low", season: "Zaid (Mar–Jun)", yieldEst: "0.8 tonnes/ha" },
  { name: "Canola (Rapeseed)", tempC: [12, 25], rainMm: [400, 800], ph: [6.0, 7.5], humidity: [45, 70], spacingM: 0.3, dotSize: 3, tree: false, waterNeeds: "medium", season: "Rabi (Oct–Mar)", yieldEst: "1.8 tonnes/ha" },
  { name: "Flax (Linseed)", tempC: [12, 24], rainMm: [400, 750], ph: [5.5, 7.0], humidity: [45, 70], spacingM: 0.25, dotSize: 3, tree: false, waterNeeds: "medium", season: "Rabi (Oct–Mar)", yieldEst: "1.0 tonnes/ha" },
  // Vegetables
  { name: "Tomato", tempC: [18, 28], rainMm: [500, 900], ph: [6.0, 7.0], humidity: [55, 80], spacingM: 0.6, dotSize: 4, tree: false, waterNeeds: "medium", season: "Multiple seasons", yieldEst: "25 tonnes/ha" },
  { name: "Potato", tempC: [14, 22], rainMm: [500, 900], ph: [5.5, 7.0], humidity: [60, 85], spacingM: 0.3, dotSize: 4, tree: false, waterNeeds: "medium", season: "Rabi (Oct–Mar)", yieldEst: "20 tonnes/ha" },
  { name: "Onion", tempC: [13, 25], rainMm: [400, 800], ph: [6.0, 7.5], humidity: [50, 75], spacingM: 0.15, dotSize: 3, tree: false, waterNeeds: "medium", season: "Rabi (Oct–Mar)", yieldEst: "18 tonnes/ha" },
  { name: "Cabbage", tempC: [15, 22], rainMm: [500, 900], ph: [6.0, 7.5], humidity: [60, 85], spacingM: 0.5, dotSize: 4, tree: false, waterNeeds: "medium", season: "Rabi (Oct–Mar)", yieldEst: "35 tonnes/ha" },
  { name: "Carrot", tempC: [14, 24], rainMm: [400, 800], ph: [5.5, 7.0], humidity: [55, 80], spacingM: 0.1, dotSize: 3, tree: false, waterNeeds: "medium", season: "Rabi (Oct–Mar)", yieldEst: "28 tonnes/ha" },
  { name: "Cucumber", tempC: [20, 32], rainMm: [500, 900], ph: [5.8, 7.2], humidity: [55, 85], spacingM: 0.5, dotSize: 4, tree: false, waterNeeds: "high", season: "Zaid (Mar–Jun)", yieldEst: "22 tonnes/ha" },
  { name: "Eggplant (Brinjal)", tempC: [20, 32], rainMm: [600, 1100], ph: [5.5, 7.0], humidity: [55, 85], spacingM: 0.75, dotSize: 4, tree: false, waterNeeds: "medium", season: "Kharif (Jun–Oct)", yieldEst: "25 tonnes/ha" },
  { name: "Okra (Ladyfinger)", tempC: [22, 35], rainMm: [500, 1000], ph: [6.0, 7.5], humidity: [50, 80], spacingM: 0.45, dotSize: 3, tree: false, waterNeeds: "medium", season: "Zaid (Mar–Jun)", yieldEst: "10 tonnes/ha" },
  { name: "Chili Pepper", tempC: [20, 32], rainMm: [500, 1000], ph: [5.8, 7.0], humidity: [50, 80], spacingM: 0.5, dotSize: 3, tree: false, waterNeeds: "medium", season: "Kharif (Jun–Oct)", yieldEst: "8 tonnes/ha" },
  { name: "Sweet Potato", tempC: [22, 30], rainMm: [600, 1100], ph: [5.5, 6.8], humidity: [60, 85], spacingM: 0.35, dotSize: 3, tree: false, waterNeeds: "medium", season: "Kharif (Jun–Oct)", yieldEst: "15 tonnes/ha" },
  { name: "Cassava", tempC: [22, 32], rainMm: [800, 1500], ph: [5.0, 6.5], humidity: [60, 90], spacingM: 1.0, dotSize: 4, tree: false, waterNeeds: "low", season: "Year-round", yieldEst: "25 tonnes/ha" },
  { name: "Drumstick (Moringa)", tempC: [22, 35], rainMm: [400, 1000], ph: [6.0, 7.5], humidity: [40, 75], spacingM: 2.5, dotSize: 5, tree: true, waterNeeds: "low", season: "Year-round", yieldEst: "12 tonnes/ha" },
  // Fruits
  { name: "Mango", tempC: [22, 35], rainMm: [600, 1500], ph: [5.5, 7.5], humidity: [50, 80], spacingM: 10, dotSize: 7, tree: true, waterNeeds: "medium", season: "Summer (Mar–Jun)", yieldEst: "9 tonnes/ha" },
  { name: "Banana", tempC: [24, 32], rainMm: [1000, 2000], ph: [5.5, 7.0], humidity: [65, 90], spacingM: 2.5, dotSize: 5, tree: false, waterNeeds: "high", season: "Year-round", yieldEst: "40 tonnes/ha" },
  { name: "Citrus (Orange/Lemon)", tempC: [18, 32], rainMm: [600, 1200], ph: [5.5, 7.0], humidity: [50, 80], spacingM: 6, dotSize: 6, tree: true, waterNeeds: "medium", season: "Winter (Nov–Mar)", yieldEst: "15 tonnes/ha" },
  { name: "Grapes", tempC: [15, 30], rainMm: [500, 900], ph: [6.0, 7.5], humidity: [40, 70], spacingM: 3, dotSize: 5, tree: true, waterNeeds: "medium", season: "Spring (Mar–Jun)", yieldEst: "20 tonnes/ha" },
  { name: "Apple", tempC: [10, 22], rainMm: [600, 1100], ph: [5.5, 7.0], humidity: [55, 80], spacingM: 6, dotSize: 6, tree: true, waterNeeds: "medium", season: "Autumn (Sep–Nov)", yieldEst: "18 tonnes/ha" },
  { name: "Guava", tempC: [22, 32], rainMm: [600, 1200], ph: [5.5, 7.5], humidity: [50, 80], spacingM: 6, dotSize: 5, tree: true, waterNeeds: "medium", season: "Year-round", yieldEst: "14 tonnes/ha" },
  { name: "Papaya", tempC: [22, 34], rainMm: [800, 1600], ph: [6.0, 7.0], humidity: [60, 85], spacingM: 2.5, dotSize: 5, tree: false, waterNeeds: "medium", season: "Year-round", yieldEst: "35 tonnes/ha" },
  { name: "Pomegranate", tempC: [18, 34], rainMm: [400, 900], ph: [5.5, 7.5], humidity: [30, 65], spacingM: 4, dotSize: 5, tree: true, waterNeeds: "low", season: "Spring (Mar–Jun)", yieldEst: "10 tonnes/ha" },
  { name: "Watermelon", tempC: [22, 34], rainMm: [500, 1000], ph: [5.8, 7.2], humidity: [40, 70], spacingM: 1.5, dotSize: 5, tree: false, waterNeeds: "medium", season: "Zaid (Mar–Jun)", yieldEst: "30 tonnes/ha" },
  { name: "Coconut", tempC: [24, 34], rainMm: [1200, 2500], ph: [5.5, 7.0], humidity: [65, 95], spacingM: 8, dotSize: 7, tree: true, waterNeeds: "high", season: "Year-round", yieldEst: "70 nuts/tree/yr" },
  { name: "Date Palm", tempC: [25, 42], rainMm: [100, 400], ph: [6.5, 8.0], humidity: [20, 50], spacingM: 9, dotSize: 7, tree: true, waterNeeds: "medium", season: "Summer (Jun–Sep)", yieldEst: "80 kg/tree/yr" },
  { name: "Olive", tempC: [12, 26], rainMm: [350, 800], ph: [6.5, 8.0], humidity: [35, 65], spacingM: 7, dotSize: 6, tree: true, waterNeeds: "low", season: "Autumn (Oct–Dec)", yieldEst: "6 tonnes/ha" },
  { name: "Fig", tempC: [16, 30], rainMm: [400, 900], ph: [6.0, 7.5], humidity: [40, 70], spacingM: 6, dotSize: 6, tree: true, waterNeeds: "low", season: "Summer (Jun–Sep)", yieldEst: "8 tonnes/ha" },
  { name: "Avocado", tempC: [18, 28], rainMm: [800, 1800], ph: [5.5, 7.0], humidity: [60, 90], spacingM: 8, dotSize: 6, tree: true, waterNeeds: "high", season: "Year-round", yieldEst: "10 tonnes/ha" },
  { name: "Strawberry", tempC: [14, 24], rainMm: [500, 900], ph: [5.5, 6.8], humidity: [60, 85], spacingM: 0.35, dotSize: 3, tree: false, waterNeeds: "high", season: "Winter (Dec–Mar)", yieldEst: "18 tonnes/ha" },
  // Plantation / industrial
  { name: "Sugarcane", tempC: [22, 35], rainMm: [1200, 2000], ph: [6.0, 7.5], humidity: [60, 90], spacingM: 1.2, dotSize: 4, tree: false, waterNeeds: "high", season: "Year-round (10–14 mo)", yieldEst: "70 tonnes/ha" },
  { name: "Cotton", tempC: [22, 35], rainMm: [600, 1200], ph: [6.0, 8.0], humidity: [45, 75], spacingM: 0.9, dotSize: 4, tree: false, waterNeeds: "medium", season: "Kharif (Jun–Oct)", yieldEst: "2.0 tonnes/ha" },
  { name: "Tea", tempC: [16, 28], rainMm: [1400, 2500], ph: [4.5, 6.0], humidity: [70, 95], spacingM: 1.2, dotSize: 4, tree: true, waterNeeds: "high", season: "Year-round flushes", yieldEst: "1.5 tonnes/ha" },
  { name: "Coffee", tempC: [16, 28], rainMm: [1200, 2200], ph: [5.5, 6.8], humidity: [65, 90], spacingM: 2.5, dotSize: 5, tree: true, waterNeeds: "high", season: "Year-round", yieldEst: "1.0 tonnes/ha" },
  { name: "Cocoa", tempC: [20, 32], rainMm: [1300, 2500], ph: [5.5, 7.0], humidity: [70, 95], spacingM: 3, dotSize: 5, tree: true, waterNeeds: "high", season: "Year-round", yieldEst: "0.8 tonnes/ha" },
  { name: "Rubber", tempC: [22, 34], rainMm: [1800, 3000], ph: [4.5, 6.5], humidity: [75, 95], spacingM: 4, dotSize: 6, tree: true, waterNeeds: "high", season: "Year-round", yieldEst: "1.5 tonnes/ha" },
  // Trees (land restoration / agroforestry)
  { name: "Neem", tempC: [20, 38], rainMm: [300, 1000], ph: [6.0, 8.0], humidity: [30, 75], spacingM: 10, dotSize: 7, tree: true, waterNeeds: "low", season: "Year-round", yieldEst: "Timber + medicinal" },
  { name: "Almond", tempC: [12, 28], rainMm: [350, 800], ph: [6.5, 8.0], humidity: [35, 65], spacingM: 7, dotSize: 6, tree: true, waterNeeds: "low", season: "Autumn (Sep–Nov)", yieldEst: "2.5 tonnes/ha" },
  { name: "Walnut", tempC: [10, 25], rainMm: [600, 1200], ph: [6.0, 7.5], humidity: [50, 80], spacingM: 10, dotSize: 6, tree: true, waterNeeds: "medium", season: "Autumn (Sep–Nov)", yieldEst: "3.0 tonnes/ha" },
  { name: "Acacia", tempC: [20, 38], rainMm: [250, 800], ph: [5.5, 8.0], humidity: [25, 65], spacingM: 8, dotSize: 6, tree: true, waterNeeds: "low", season: "Year-round", yieldEst: "Gum + nitrogen fixation" },
];

export function findCropProfile(name: string): CropProfile | undefined {
  return CROP_PROFILES.find((c) => c.name === name);
}
