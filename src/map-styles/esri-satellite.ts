// Esri World Imagery raster style for MapLibre — satellite basemap.
// Source: Esri ArcGIS Online World Imagery tile service (free, keyless).
// ATTRIBUTION IS MANDATORY and is configured in the style itself.

export const esriSatelliteStyle: import("maplibre-gl").StyleSpecification = {
  version: 8,
  // Open style spec requires sources/glyphs; raster-only styles need no glyphs
  sources: {
    esri_satellite: {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution:
        "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
    },
  },
  layers: [
    {
      id: "esri_satellite",
      type: "raster",
      source: "esri_satellite",
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};
