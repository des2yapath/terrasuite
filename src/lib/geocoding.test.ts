import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchPlaces } from "@/lib/geocoding";
import { reverseGeocode } from "@/lib/reverse-geocode";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("searchPlaces", () => {
  it("returns [] for queries shorter than 2 chars (no network)", async () => {
    expect(await searchPlaces("")).toEqual([]);
    expect(await searchPlaces("d")).toEqual([]);
  });

  it("maps Open-Meteo results to GeoPlace", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        results: [
          {
            id: 3143294,
            name: "Murcia",
            latitude: 37.98704,
            longitude: -1.13004,
            country: "Spain",
            admin1: "Murcia",
          },
        ],
      }), { status: 200 }),
    );
    const results = await searchPlaces("murcia");
    expect(results).toHaveLength(1);
    expect(results[0].label).toBe("Murcia, Murcia, Spain");
    expect(results[0].latitude).toBeCloseTo(37.987, 3);
  });

  it("returns [] when the API errors", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response("{}", { status: 500 }));
    expect(await searchPlaces("madrid")).toEqual([]);
  });

  it("returns [] on network failure", async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError("offline"));
    expect(await searchPlaces("madrid")).toEqual([]);
  });
});

describe("reverseGeocode", () => {
  it("falls back to coordinates when API fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError("offline"));
    const r = await reverseGeocode(40.7128, -74.006);
    expect(r.label).toBe("40.713°N, -74.006°E");
  });

  it("builds label from locality, subdivision, country", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        locality: "Alcantarilla",
        principalSubdivision: "Murcia",
        countryName: "Spain",
      }), { status: 200 }),
    );
    const r = await reverseGeocode(37.96, -1.21);
    expect(r.label).toBe("Alcantarilla, Murcia, Spain");
  });
});
