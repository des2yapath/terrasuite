// CARTO dark raster style for MapLibre — the "dark mode" basemap.
// Source: CARTO basemaps (free tier with attribution, keyless raster tiles).

export const cartoDarkStyle: import("maplibre-gl").StyleSpecification = {
  version: 8,
  sources: {
    carto_dark: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
      attribution:
        "© OpenStreetMap contributors © CARTO",
    },
  },
  layers: [
    {
      id: "carto_dark",
      type: "raster",
      source: "carto_dark",
      minzoom: 0,
      maxzoom: 20,
    },
  ],
};
