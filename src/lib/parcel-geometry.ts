/** Mini polygon SVG from the ring — normalizes to a 40×40 viewbox. */
export function polygonPoints(coordinates: [number, number][][]): string {
  const coords = coordinates[0];
  if (!coords || coords.length < 3) return "10,30 20,8 35,25 25,35";
  const lngs = coords.map((c) => c[0]);
  const lats = coords.map((c) => c[1]);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const rX = maxLng - minLng || 0.001;
  const rY = maxLat - minLat || 0.001;
  // Drop duplicated closing vertex for rendering
  const unique =
    coords.length > 3 && coords[0][0] === coords[coords.length - 1][0] && coords[0][1] === coords[coords.length - 1][1]
      ? coords.slice(0, -1)
      : coords;
  return unique
    .map((c) => {
      const x = 4 + ((c[0] - minLng) / rX) * 32;
      const y = 36 - ((c[1] - minLat) / rY) * 32;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}
