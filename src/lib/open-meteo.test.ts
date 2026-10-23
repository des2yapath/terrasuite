import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchLiveWeather,
  fetchAqi,
  fetchSurfaceSoilMoisture,
  fetchClimateHistory,
  fetchMeanElevation,
  weatherCodeText,
} from "@/lib/open-meteo";

const okJson = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("fetchLiveWeather", () => {
  it("maps the current block to LiveWeather", async () => {
    global.fetch = vi.fn().mockResolvedValue(okJson({
      current: {
        temperature_2m: 21.4, relative_humidity_2m: 55, wind_speed_10m: 9.3,
        apparent_temperature: 20.1, weather_code: 1,
      },
    }));
    const w = await fetchLiveWeather(39.5, -1.1);
    expect(w).toEqual({ temperature: 21, humidity: 55, windSpeed: 9, weatherCode: 1, feelsLike: 20 });
  });

  it("returns null on API error / missing data", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response("{}", { status: 500 }));
    expect(await fetchLiveWeather(0, 0)).toBeNull();
    global.fetch = vi.fn().mockResolvedValue(okJson({ current: {} }));
    expect(await fetchLiveWeather(0, 0)).toBeNull();
  });

  it("returns null on network failure (never throws)", async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError("offline"));
    expect(await fetchLiveWeather(0, 0)).toBeNull();
  });
});

describe("fetchAqi", () => {
  it("maps the current block to AqiData", async () => {
    global.fetch = vi.fn().mockResolvedValue(okJson({
      current: { pm2_5: 12.3, pm10: 20.1, european_aqi: 41, us_aqi: 57 },
    }));
    const a = await fetchAqi(0, 0);
    expect(a?.european_aqi).toBe(41);
    expect(a?.pm2_5).toBeCloseTo(12.3, 5);
  });

  it("returns null without european_aqi", async () => {
    global.fetch = vi.fn().mockResolvedValue(okJson({ current: { pm2_5: 1 } }));
    expect(await fetchAqi(0, 0)).toBeNull();
  });
});

describe("fetchSurfaceSoilMoisture", () => {
  it("takes the last non-null hourly value as %", async () => {
    global.fetch = vi.fn().mockResolvedValue(okJson({
      hourly: { soil_moisture_0_to_7cm: [0.25, 0.27, 0.28, null] },
    }));
    const m = await fetchSurfaceSoilMoisture(0, 0);
    expect(m).toBe(28); // 0.28 → 28.0%
  });

  it("returns null when all values missing", async () => {
    global.fetch = vi.fn().mockResolvedValue(okJson({ hourly: { soil_moisture_0_to_7cm: [null, null] } }));
    expect(await fetchSurfaceSoilMoisture(0, 0)).toBeNull();
  });
});

describe("fetchClimateHistory", () => {
  it("aggregates daily data into months with running totals", async () => {
    global.fetch = vi.fn().mockImplementation((url: string | URL | Request) => {
      const u = String(url);
      if (u.includes("soil_moisture")) {
        return Promise.resolve(okJson({
          daily: {
            time: ["2026-01-01", "2026-01-02", "2026-02-01"],
            soil_moisture_0_to_7cm_mean: [0.2, 0.3, 0.25],
            soil_moisture_7_to_28cm_mean: [0.3, 0.35, 0.3],
          },
        }));
      }
      return Promise.resolve(okJson({
        daily: {
          time: ["2026-01-01", "2026-01-02", "2026-02-01"],
          precipitation_sum: [10, 5, 2],
          temperature_2m_max: [12, 14, 15],
          temperature_2m_min: [2, 3, 4],
          et0_fao_evapotranspiration: [1.2, 1.1, 1.4],
        },
      }));
    });
    const result = await fetchClimateHistory(0, 0, "2026-01-01", "2026-02-28");
    expect(result?.monthly).toHaveLength(2);
    const jan = result?.monthly[0];
    expect(jan?.month).toBe("Jan");
    expect(jan?.precipitation).toBe(15);
    expect(jan?.accumulated).toBe(15);
    expect(jan?.tempMax).toBe(14);
    expect(jan?.tempMin).toBe(2);
    const feb = result?.monthly[1];
    expect(feb?.accumulated).toBe(17);
    expect(result?.monthlySoil[0].shallow).toBe(25); // mean(20,30)
  });

  it("returns null if the weather endpoint fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError("offline"));
    expect(await fetchClimateHistory(0, 0, "2026-01-01", "2026-02-01")).toBeNull();
  });
});

describe("fetchMeanElevation", () => {
  it("averages sampled elevation points", async () => {
    global.fetch = vi.fn().mockResolvedValue(okJson({ elevation: [100, 102, 98, 104, 96] }));
    expect(await fetchMeanElevation(0, 0)).toBe(100);
  });

  it("returns null on failure", async () => {
    global.fetch = vi.fn().mockResolvedValue(okJson({}));
    expect(await fetchMeanElevation(0, 0)).toBeNull();
  });
});

describe("weatherCodeText", () => {
  it("maps known codes and defaults", () => {
    expect(weatherCodeText(0)).toBe("Clear sky");
    expect(weatherCodeText(95)).toBe("Thunderstorm");
    expect(weatherCodeText(999)).toBe("Unknown");
  });
});
