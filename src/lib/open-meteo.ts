// Open-Meteo client — direct browser fetches (free, keyless, CORS-enabled).
// All endpoints and parameters pinned; every fetch has a typed response,
// never throws (null on failure), and is consumed via useQuery or direct
// state in the views.

/* ══════════════ Live weather (forecast API) ══════════════ */

export interface LiveWeather {
  temperature: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  feelsLike: number;
}

const WEATHER_CODES: Record<number, string> = {
  0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Fog", 48: "Rime fog", 51: "Light drizzle", 53: "Moderate drizzle",
  55: "Dense drizzle", 61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
  71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow",
  80: "Slight showers", 81: "Moderate showers", 82: "Violent showers", 95: "Thunderstorm",
};

export function weatherCodeText(code: number): string {
  return WEATHER_CODES[code] ?? "Unknown";
}

export async function fetchLiveWeather(lat: number, lng: number): Promise<LiveWeather | null> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,apparent_temperature,weather_code&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json() as {
      current?: {
        temperature_2m?: number;
        relative_humidity_2m?: number;
        wind_speed_10m?: number;
        apparent_temperature?: number;
        weather_code?: number;
      };
    };
    const c = data.current;
    if (c?.temperature_2m == null) return null;
    return {
      temperature: Math.round(c.temperature_2m),
      humidity: c.relative_humidity_2m ?? 0,
      windSpeed: Math.round(c.wind_speed_10m ?? 0),
      weatherCode: c.weather_code ?? 0,
      feelsLike: Math.round(c.apparent_temperature ?? c.temperature_2m),
    };
  } catch {
    return null;
  }
}

/* ══════════════ Air quality ══════════════ */

export interface AqiData {
  pm2_5: number;
  pm10: number;
  european_aqi: number;
  us_aqi: number;
}

export async function fetchAqi(lat: number, lng: number): Promise<AqiData | null> {
  try {
    const url =
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}` +
      `&current=pm2_5,pm10,european_aqi,us_aqi`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json() as {
      current?: { pm2_5?: number; pm10?: number; european_aqi?: number; us_aqi?: number };
    };
    const c = data.current;
    if (c?.european_aqi == null) return null;
    return {
      pm2_5: c.pm2_5 ?? 0,
      pm10: c.pm10 ?? 0,
      european_aqi: c.european_aqi,
      us_aqi: c.us_aqi ?? 0,
    };
  } catch {
    return null;
  }
}

/* ══════════════ Current soil moisture (surface) ══════════════ */

/** Latest hourly soil moisture 0–7cm, as volumetric % (rounded 0.1). */
export async function fetchSurfaceSoilMoisture(lat: number, lng: number): Promise<number | null> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&hourly=soil_moisture_0_to_7cm&forecast_days=1`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json() as {
      hourly?: { soil_moisture_0_to_7cm?: Array<number | null> };
    };
    const vals = data.hourly?.soil_moisture_0_to_7cm?.filter((v) => v != null) ?? [];
    if (vals.length === 0) return null;
    return Math.round(vals[vals.length - 1]! * 1000) / 10;
  } catch {
    return null;
  }
}

/* ══════════════ Historical archive (climate charts) ══════════════ */

export interface MonthlyClimate {
  month: string;           // "Jan"
  precipitation: number;  // monthly total mm
  accumulated: number;    // running total mm
  tempMax: number;        // monthly max °C
  tempMin: number;        // monthly min °C
  evapotranspiration: number; // monthly total mm
}

export interface MonthlySoilMoisture {
  month: string;
  shallow: number; // 0–7cm mean %
  deep: number;    // 7–28cm mean %
}

/** Aggregate daily archive data into per-month rows. */
export async function fetchClimateHistory(
  lat: number, lng: number, startDate: string, endDate: string,
): Promise<{ monthly: MonthlyClimate[]; monthlySoil: MonthlySoilMoisture[] } | null> {
  try {
    const common = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${startDate}&end_date=${endDate}`;
    const [weatherRes, soilRes] = await Promise.all([
      fetch(`${common}&daily=precipitation_sum,temperature_2m_max,temperature_2m_min,et0_fao_evapotranspiration`),
      fetch(`${common}&daily=soil_moisture_0_to_7cm_mean,soil_moisture_7_to_28cm_mean`),
    ]);
    if (!weatherRes.ok) return null;
    const data = await weatherRes.json() as {
      daily?: {
        time: string[];
        precipitation_sum?: Array<number | null>;
        temperature_2m_max?: Array<number | null>;
        temperature_2m_min?: Array<number | null>;
        et0_fao_evapotranspiration?: Array<number | null>;
      };
    };
    const d = data.daily;
    if (!d?.time?.length) return null;

    // Month buckets keyed "Jan 2026"
    const monthMap = new Map<string, { precip: number; tMax: number; tMin: number; evap: number }>();
    d.time.forEach((date, i) => {
      const key = new Date(date + "T00:00:00").toLocaleString("en", { month: "short" }) + " " + date.slice(0, 4);
      const m = monthMap.get(key) ?? { precip: 0, tMax: -999, tMin: 999, evap: 0 };
      m.precip += d.precipitation_sum?.[i] ?? 0;
      m.tMax = Math.max(m.tMax, d.temperature_2m_max?.[i] ?? -999);
      m.tMin = Math.min(m.tMin, d.temperature_2m_min?.[i] ?? 999);
      m.evap += d.et0_fao_evapotranspiration?.[i] ?? 0;
      monthMap.set(key, m);
    });

    let accumulated = 0;
    const monthly: MonthlyClimate[] = Array.from(monthMap.entries()).map(([key, v]) => {
      accumulated += v.precip;
      return {
        month: key.split(" ")[0],
        precipitation: Math.round(v.precip * 10) / 10,
        accumulated: Math.round(accumulated * 10) / 10,
        tempMax: v.tMax === -999 ? 0 : Math.round(v.tMax),
        tempMin: v.tMin === 999 ? 0 : Math.round(v.tMin),
        evapotranspiration: Math.round(v.evap * 10) / 10,
      };
    });

    // Soil moisture (optional — tolerate failure)
    let monthlySoil: MonthlySoilMoisture[] = [];
    if (soilRes.ok) {
      const soilData = await soilRes.json() as {
        daily?: {
          time: string[];
          soil_moisture_0_to_7cm_mean?: Array<number | null>;
          soil_moisture_7_to_28cm_mean?: Array<number | null>;
        };
      };
      const sd = soilData.daily;
      if (sd?.time?.length) {
        const soilMap = new Map<string, { shallow: number; deep: number; count: number }>();
        sd.time.forEach((date, i) => {
          const key = new Date(date + "T00:00:00").toLocaleString("en", { month: "short" }) + " " + date.slice(0, 4);
          const m = soilMap.get(key) ?? { shallow: 0, deep: 0, count: 0 };
          m.shallow += sd.soil_moisture_0_to_7cm_mean?.[i] ?? 0;
          m.deep += sd.soil_moisture_7_to_28cm_mean?.[i] ?? 0;
          m.count++;
          soilMap.set(key, m);
        });
        monthlySoil = Array.from(soilMap.entries()).map(([key, v]) => ({
          month: key.split(" ")[0],
          shallow: Math.round((v.shallow / v.count) * 1000) / 10,
          deep: Math.round((v.deep / v.count) * 1000) / 10,
        }));
      }
    }

    return { monthly, monthlySoil };
  } catch {
    return null;
  }
}

/* ══════════════ Elevation (terrain) ══════════════ */

/** Mean elevation (m) across sampled points; Copernicus DEM 90m. */
export async function fetchMeanElevation(lat: number, lng: number): Promise<number | null> {
  try {
    // Sample a small cross around the center for a local mean
    const d = 0.005; // ~500m
    const points = [
      [lng, lat],
      [lng - d, lat], [lng + d, lat],
      [lng, lat - d], [lng, lat + d],
    ];
    const coords = points.map((p) => `${p[1]},${p[0]}`).join("|");
    const url = `https://api.open-meteo.com/v1/elevation?coordinates=${encodeURIComponent(coords)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json() as { elevation?: number[] };
    const vals = data.elevation ?? [];
    if (vals.length === 0) return null;
    return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
  } catch {
    return null;
  }
}
