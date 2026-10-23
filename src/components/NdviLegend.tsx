// NDVI overlay legend — color scale matching the GEE palette exactly
// (gee-ndvi-tiles visualizes with min=-0.1 max=0.8 over this gradient).

import { useIsMobile } from "@/hooks/use-mobile";

const NdviLegend = () => {
  const isMobile = useIsMobile();
  return (
    <div
      className={`absolute ${isMobile ? "bottom-24" : "bottom-6"} right-4 z-10 bg-card/90 backdrop-blur-sm rounded-lg border border-border px-3 py-2`}
    >
      <div className="text-[10px] font-medium text-foreground mb-1.5 tracking-wide uppercase">
        NDVI (Sentinel-2)
      </div>
      <div
        className="h-2.5 w-44 rounded-full"
        style={{
          background:
            "linear-gradient(to right, #d73027, #f46d43, #fdae61, #fee08b, #d9ef8b, #a6d96a, #66bd63, #1a9850, #006837)",
        }}
      />
      <div className="flex justify-between mt-1">
        <span className="text-[9px] text-muted-foreground">Stressed / bare</span>
        <span className="text-[9px] text-muted-foreground">Healthy</span>
      </div>
    </div>
  );
};

export default NdviLegend;
