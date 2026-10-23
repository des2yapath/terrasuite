import { Leaf, Globe2 } from "lucide-react";

/** Shared visual shell for /login, /signup, /reset-password. */
const AuthLayout = ({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle: string }) => {
  return (
    <div className="min-h-screen bg-surface-outer flex flex-col items-center justify-center p-4">
      {/* Brand */}
      <div className="flex items-center gap-2.5 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
          <Leaf className="w-5 h-5" />
        </div>
        <div>
          <div className="text-lg font-semibold text-foreground leading-tight">TerraSuite</div>
          <div className="text-[10px] text-muted-foreground -mt-0.5 flex items-center gap-1">
            <Globe2 className="w-2.5 h-2.5" /> Land &amp; crop suitability analysis
          </div>
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl animate-fade-in">
        <h1 className="text-base font-semibold text-foreground mb-1">{title}</h1>
        <p className="text-xs text-muted-foreground mb-5">{subtitle}</p>
        {children}
      </div>

      <p className="mt-6 text-[10px] text-muted-foreground/60 text-center max-w-xs leading-relaxed">
        Free geospatial decision support for extension officers, researchers, and consultants.
        Data: Sentinel-2 · SoilGrids · Open-Meteo · ESA WorldCover.
      </p>
    </div>
  );
};

export default AuthLayout;
