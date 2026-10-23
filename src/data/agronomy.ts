// Region detection + intercropping knowledge base for the crop engine.

export interface RegionMatcher {
  name: string;
  /** Substrings matched against location string (lowercase). */
  keywords: string[];
  /** Crop names traditionally cultivated in this region. */
  crops: string[];
  /** Season-name style for the rotation plan. */
  seasons: "indian" | "temperate" | "mediterranean" | "tropical" | "arid";
}

export const REGION_MATCHERS: RegionMatcher[] = [
  {
    name: "Indian Subcontinent",
    keywords: ["india", "pakistan", "nepal", "bangladesh", "sri lanka", "punjab", "haryana", "gujarat", "maharashtra", "rajasthan", "kerala", "tamil nadu", "karnataka", "telangana", "andhra", "madhya pradesh", "uttar pradesh", "bihar", "west bengal", "odisha", "assam", "ganges", "deccan"],
    crops: ["Wheat", "Rice", "Cotton", "Sugarcane", "Chickpea", "Mung Bean", "Pigeon Pea (Tur Dal)", "Pearl Millet (Bajra)", "Sorghum", "Millet", "Ragi (Finger Millet)", "Mustard", "Sunflower", "Peanut (Groundnut)", "Mango", "Banana", "Guava", "Papaya", "Coconut", "Tea", "Coffee", "Neem", "Drumstick (Moringa)", "Okra (Ladyfinger)", "Chili Pepper"],
    seasons: "indian",
  },
  {
    name: "Mediterranean",
    keywords: ["spain", "italy", "greece", "portugal", "southern france", "mediterranean", "murcia", "andalusia", "valencia", "catalonia", "sicily", "crete", "peloponnese", "tuscany", "apulia", "sardinia", "corsica", "balearic", "croatia", "levant", "israel", "lebanon", "turkey", "morocco", "tunisia", "algeria", "california", "central chile", "cape town", "western cape", "adelaide", "perth"],
    crops: ["Olive", "Grapes", "Almond", "Citrus (Orange/Lemon)", "Fig", "Date Palm", "Wheat", "Barley", "Chickpea", "Sunflower", "Tomato", "Onion", "Avocado"],
    seasons: "mediterranean",
  },
  {
    name: "Temperate",
    keywords: ["united kingdom", "germany", "france", "netherlands", "belgium", "denmark", "sweden", "norway", "finland", "poland", "czech", "austria", "switzerland", "hungary", "romania", "ukraine", "canada", "russia", "new york", "washington", "oregon", "michigan", "wisconsin", "midwest", "corn belt", "great lakes", "england", "scotland", "ireland"],
    crops: ["Wheat", "Maize", "Soybean", "Barley", "Oats", "Potato", "Apple", "Strawberry", "Canola (Rapeseed)", "Faba Bean", "Carrot", "Cabbage", "Onion", "Walnut", "Buckwheat"],
    seasons: "temperate",
  },
  {
    name: "Tropical",
    keywords: ["brazil", "amazon", "congo", "indonesia", "malaysia", "thailand", "vietnam", "philippines", "nigeria", "ghana", "ivory coast", "kenya", "tanzania", "uganda", "colombia", "ecuador", "peru", "venezuela", "central america", "caribbean", "hawaii", "fiji", "papua", "myanmar", "laos", "cambodia", "sumatra", "borneo", "java", "kerala", "western ghats"],
    crops: ["Rice", "Cassava", "Banana", "Coconut", "Cocoa", "Rubber", "Sugarcane", "Coffee", "Tea", "Papaya", "Mango", "Avocado", "Sweet Potato", "Okra (Ladyfinger)", "Eggplant (Brinjal)"],
    seasons: "tropical",
  },
  {
    name: "Arid/Semi-Arid",
    keywords: ["sahara", "arabian", "rajasthan", "thar", "kalahari", "namib", " atacama", "sonora", "chihuahuan", "nevada", "arizona", "australia outback", "australian outback", "middle east", "egypt", "saudi", "iran", "iraq", "syria", "jordan", "yemen", "oman", "uae", "israel", "afghanistan", "karoo"],
    crops: ["Date Palm", "Sorghum", "Pearl Millet (Bajra)", "Millet", "Olive", "Fig", "Pomegranate", "Almond", "Neem", "Acacia", "Sesame", "Chickpea", "Lentil"],
    seasons: "arid",
  },
  {
    name: "Highland",
    keywords: ["nepal", "bhutan", "tibet", "himalaya", "andes", "ethiopian highlands", "kerala high range", "nilgiri", "pune", "bangalore", "munnar", "darwin", "kenya highlands", "rwanda", "burundi", "kilimanjaro", "caucasus", "alps", "pyrenees", "appalachian", "rocky mountains", "colorado", "utah", "wyoming", "montana"],
    crops: ["Wheat", "Barley", "Potato", "Apple", "Tea", "Coffee", "Walnut", "Buckwheat", "Ragi (Finger Millet)", "Quinoa", "Faba Bean", "Oats"],
    seasons: "temperate",
  },
  {
    name: "Coastal",
    keywords: ["coast", "coastal", "seaside", "delta", "estuary", "goa", "konkan", "coromandel", "malabar", "florida", "louisiana", "netherlands", "bangladesh", "mekong", "nile delta", "nile", "rhine", "mississippi delta", "ganges delta", "veneto", "andalusian coast", "algarve"],
    crops: ["Rice", "Coconut", "Banana", "Sugarcane", "Chili Pepper", "Tomato", "Okra (Ladyfinger)", "Peanut (Groundnut)", "Citrus (Orange/Lemon)", "Papaya"],
    seasons: "tropical",
  },
];

export function detectRegion(location: string): RegionMatcher | null {
  const loc = location.toLowerCase();
  let best: RegionMatcher | null = null;
  let bestCount = 0;
  for (const matcher of REGION_MATCHERS) {
    const hits = matcher.keywords.filter((k) => loc.includes(k)).length;
    if (hits > bestCount) { best = matcher; bestCount = hits; }
  }
  return best;
}

/* ── Intercropping knowledge base ── */

export interface IntercropPair {
  primary: string;
  secondary: string;
  benefit: string;
  spacing: string;
}

export const INTERCROPPING_PAIRS: IntercropPair[] = [
  { primary: "Mango", secondary: "Mung Bean", benefit: "Mung fixes nitrogen; mango canopy provides partial shade for young plants", spacing: "Mango rows 10m apart, mung in 0.3m rows between" },
  { primary: "Olive", secondary: "Chickpea", benefit: "Chickpea fixes nitrogen; shallow roots avoid olive competition", spacing: "Olive rows 7m apart, chickpea in inter-rows" },
  { primary: "Neem", secondary: "Sorghum", benefit: "Neem acts as biopesticide; sorghum benefits from reduced pests", spacing: "Neem on borders, 10m apart; sorghum rows 0.5m" },
  { primary: "Almond", secondary: "Sunflower", benefit: "Sunflower attracts pollinators boosting almond yields", spacing: "Almond rows 7m, sunflower on borders" },
  { primary: "Coffee", secondary: "Banana", benefit: "Banana provides shade for coffee; both thrive in same conditions", spacing: "Banana 3m apart within coffee rows 2.5m" },
  { primary: "Date Palm", secondary: "Chickpea", benefit: "Chickpea tolerates palm shade and fixes nitrogen", spacing: "Palm 9m grid, chickpea in inter-spaces" },
  { primary: "Apple", secondary: "Strawberry", benefit: "Strawberry ground cover retains soil moisture for apple roots", spacing: "Apple rows 6m, strawberry beds in inter-rows" },
  { primary: "Pomegranate", secondary: "Sesame", benefit: "Sesame deters fruit flies; low water competition", spacing: "Pomegranate 4m apart, sesame in inter-rows" },
  { primary: "Grapes", secondary: "Cabbage", benefit: "Cabbage grows in vine dormant season, no overlap", spacing: "Vine rows 3m, cabbage in winter inter-rows" },
  { primary: "Acacia", secondary: "Pearl Millet (Bajra)", benefit: "Acacia fixes nitrogen improving millet yields", spacing: "Acacia 8m grid, millet rows 0.5m" },
  { primary: "Citrus (Orange/Lemon)", secondary: "Faba Bean", benefit: "Faba bean fixes nitrogen; attracts pollinators", spacing: "Citrus rows 6m, faba bean inter-rows" },
];

export function findIntercrops(regionCrops: string[]): IntercropPair[] {
  return INTERCROPPING_PAIRS.filter(
    (pair) => regionCrops.includes(pair.primary) && regionCrops.includes(pair.secondary),
  );
}

/* ── Season templates ── */

export interface SeasonPlan {
  season: string;
  months: string;
  crops: string[];
}

export function buildRotationPlan(seasons: RegionMatcher["seasons"], regionCrops: string[], currentCrop: string): SeasonPlan[] {
  const pick = (n: number) => {
    const available = regionCrops.filter((c) => c !== currentCrop);
    if (available.length === 0) return [currentCrop];
    return [currentCrop, ...available.slice(0, n)];
  };
  const reverseTail = (crops: string[]) => [crops[0], ...crops.slice(1).reverse()];

  switch (seasons) {
    case "indian":
      return [
        { season: "Kharif", months: "Jun–Oct", crops: pick(2) },
        { season: "Rabi", months: "Nov–Mar", crops: reverseTail(pick(2)) },
        { season: "Zaid", months: "Mar–Jun", crops: pick(1) },
      ];
    case "mediterranean":
    case "temperate":
      return [
        { season: "Spring", months: "Mar–Jun", crops: pick(2) },
        { season: "Summer", months: "Jun–Sep", crops: pick(1) },
        { season: "Winter", months: "Oct–Feb", crops: reverseTail(pick(2)) },
      ];
    case "tropical":
      return [
        { season: "Wet Season", months: "May–Oct", crops: pick(2) },
        { season: "Dry Season", months: "Nov–Apr", crops: pick(1) },
      ];
    case "arid":
      return [
        { season: "Winter", months: "Oct–Mar", crops: pick(2) },
        { season: "Summer", months: "Apr–Sep", crops: pick(1) },
      ];
  }
}

/** Current season label for the rotation highlight (northern hemisphere). */
export function currentSeasonLabel(seasons: RegionMatcher["seasons"], now = new Date()): string {
  const m = now.getMonth();
  switch (seasons) {
    case "indian":
      if (m >= 5 && m <= 9) return "Kharif";       // Jun–Oct
      if (m >= 9 || m <= 2) return "Rabi";         // Oct–Mar
      return "Zaid";                                // Mar–Jun
    case "mediterranean":
    case "temperate":
      if (m >= 2 && m <= 5) return "Spring";
      if (m >= 5 && m <= 8) return "Summer";
      return "Winter";
    case "tropical":
      return m >= 4 && m <= 9 ? "Wet Season" : "Dry Season";
    case "arid":
      return m >= 9 || m <= 2 ? "Winter" : "Summer";
  }
}
