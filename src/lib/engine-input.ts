import type { Parcel } from "@/data/parcel";
import type { ParcelData } from "@/hooks/useParcelData";
import type { EngineInput } from "@/lib/crop-engine";

/** Adapt the live parcel-data hook to the pure local crop engine contract. */
export function toEngineInput(parcel: Parcel, data: ParcelData): EngineInput {
  const meanNdvi = data.timeseries?.mean_ndvi ?? data.gee?.vegetation?.mean_ndvi ?? null;
  const ndvi = meanNdvi == null
    ? null
    : {
        mean_ndvi: meanNdvi,
        // The current data hook exposes a mean series rather than parcel min/max.
        // Keep the adapter honest until a dedicated NDVI stats stream is mounted.
        min_ndvi: meanNdvi,
        max_ndvi: meanNdvi,
        vegetation_health_score: Math.min(100, Math.max(0, Math.round((meanNdvi / 0.8) * 100))),
      };

  return {
    parcelName: parcel.name,
    crop: parcel.crop,
    areaHa: parcel.area,
    location: parcel.location,
    coordinates: parcel.coordinates[0],
    ndvi,
    soil: data.soil,
    weather: data.weather
      ? {
          temperature: data.weather.temperature,
          humidity: data.weather.humidity,
          windSpeed: data.weather.windSpeed,
        }
      : null,
    suitability: data.gee?.suitability ?? null,
  };
}
