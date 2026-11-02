import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Check,
  ChevronRight,
  CircleHelp,
  CloudRain,
  Compass,
  Droplets,
  Gauge,
  GitCompareArrows,
  Layers3,
  Leaf,
  Lightbulb,
  MapPinned,
  Menu,
  Mountain,
  MoveUpRight,
  Radio,
  Satellite,
  ShieldCheck,
  Sparkles,
  Sprout,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  VIVA_COMPARISON,
  VIVA_DATE,
  VIVA_KPIS,
  VIVA_PARCELS,
  VIVA_VALIDATION,
  VIVA_VALIDATION_REGIONS,
  type VivaParcel,
} from "@/data/viva-demo";
import { CustomChartTooltip, axisStroke, gridStroke, tooltipStyle } from "@/components/chart-shared";

type VivaTab = "overview" | "parcel" | "crop" | "comparison" | "validation";

const tabs: Array<{ id: VivaTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "parcel", label: "Parcel Intelligence" },
  { id: "crop", label: "Crop Planning" },
  { id: "comparison", label: "Comparison" },
  { id: "validation", label: "Validation" },
];

const accentText: Record<string, string> = {
  lime: "text-[#b8dc65]",
  amber: "text-[#e5b85c]",
  cyan: "text-[#67c5ba]",
  blue: "text-[#78a9e8]",
  violet: "text-[#b9a1e5]",
  coral: "text-[#e09068]",
};

const accentBg: Record<string, string> = {
  lime: "bg-[#b8dc65]/10 border-[#b8dc65]/20",
  amber: "bg-[#e5b85c]/10 border-[#e5b85c]/20",
  cyan: "bg-[#67c5ba]/10 border-[#67c5ba]/20",
  blue: "bg-[#78a9e8]/10 border-[#78a9e8]/20",
  violet: "bg-[#b9a1e5]/10 border-[#b9a1e5]/20",
  coral: "bg-[#e09068]/10 border-[#e09068]/20",
};

const toneText: Record<string, string> = {
  lime: "text-[#b8dc65] bg-[#b8dc65]/10 border-[#b8dc65]/20",
  amber: "text-[#e5b85c] bg-[#e5b85c]/10 border-[#e5b85c]/20",
  cyan: "text-[#67c5ba] bg-[#67c5ba]/10 border-[#67c5ba]/20",
  blue: "text-[#78a9e8] bg-[#78a9e8]/10 border-[#78a9e8]/20",
};

const chartText = { fill: axisStroke, fontSize: 10 };

function scrollToSection(id: string) {
  window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 20);
}

function SectionHeading({ eyebrow, title, detail, action }: { eyebrow: string; title: string; detail: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#7e9a89]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#b8dc65]" /> {eyebrow}
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-[#edf4e8] sm:text-3xl">{title}</h2>
        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[#8fa496]">{detail}</p>
      </div>
      {action}
    </div>
  );
}

function Panel({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <div id={id} className={`rounded-2xl border border-[#20392b] bg-[#0c1b14]/90 shadow-[0_18px_60px_rgba(0,0,0,0.18)] ${className}`}>
      {children}
    </div>
  );
}

function Header({ activeTab, setActiveTab }: { activeTab: VivaTab; setActiveTab: (tab: VivaTab) => void }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const selectTab = (tab: VivaTab) => {
    setActiveTab(tab);
    setMobileOpen(false);
    scrollToSection(tab === "overview" ? "top" : tab);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[#1d3528] bg-[#07140f]/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1600px] items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#b8dc65]/30 bg-[#b8dc65]/10">
            <Sprout className="h-5 w-5 text-[#b8dc65]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold tracking-[0.08em] text-[#f1f6eb]">TERRASUITE</span>
              <span className="hidden rounded-full border border-[#b8dc65]/30 bg-[#b8dc65]/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#b8dc65] sm:inline-flex">Viva mode</span>
            </div>
            <p className="hidden truncate text-[10px] uppercase tracking-[0.16em] text-[#799184] sm:block">Geospatial Decision Support System</p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-3 text-xs">
          <div className="hidden items-center gap-2 text-[#8fa496] md:flex">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#b8dc65]" /> Local demo data · {VIVA_DATE}
          </div>
          <button className="rounded-lg border border-[#294738] p-2 text-[#9aafa0] hover:border-[#b8dc65]/50 hover:text-[#edf4e8] md:hidden" aria-label="Toggle presentation navigation" onClick={() => setMobileOpen((open) => !open)}>
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <nav className={`${mobileOpen ? "block" : "hidden"} border-t border-[#1d3528] px-4 py-2 md:block md:border-0 md:px-6 lg:px-8`} aria-label="Viva dashboard sections">
        <div className="mx-auto flex max-w-[1600px] items-center gap-1 overflow-x-auto pb-1 md:pb-2">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => selectTab(tab.id)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-colors ${activeTab === tab.id ? "bg-[#b8dc65] text-[#0b1a12]" : "text-[#91a799] hover:bg-[#14281d] hover:text-[#edf4e8]"}`} aria-current={activeTab === tab.id ? "page" : undefined}>
              {tab.label}
            </button>
          ))}
          <div className="ml-auto hidden items-center gap-2 pl-4 text-[10px] uppercase tracking-[0.16em] text-[#60796b] lg:flex"><Radio className="h-3.5 w-3.5 text-[#67c5ba]" /> Presentation workspace</div>
        </div>
      </nav>
    </header>
  );
}

function Hero({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  const viewParcel = () => {
    scrollToSection("parcel");
  };

  return (
    <section className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]" aria-labelledby="viva-title">
      <div className="relative overflow-hidden rounded-3xl border border-[#2b4e39] bg-[#10251a] p-6 sm:p-9 lg:p-11">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full border border-[#b8dc65]/10" />
        <div className="pointer-events-none absolute -right-8 -top-12 h-48 w-48 rounded-full border border-[#67c5ba]/10" />
        <div className="relative max-w-3xl">
          <div className="mb-6 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.23em] text-[#b8dc65]"><Sparkles className="h-3.5 w-3.5" /> Field intelligence / live demo</div>
          <h1 id="viva-title" className="max-w-3xl text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-[#f0f5e9] sm:text-6xl">Land intelligence for <span className="text-[#b8dc65]">better crop decisions.</span></h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-[#a7b9aa] sm:text-lg">Fuses satellite imagery, soil, weather, terrain, and crop intelligence into one decision-support workflow.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button onClick={viewParcel} className="inline-flex items-center gap-2 rounded-xl bg-[#b8dc65] px-4 py-3 text-sm font-semibold text-[#0a180f] shadow-[0_8px_24px_rgba(184,220,101,0.14)] transition-transform hover:-translate-y-0.5 hover:bg-[#c8e47a]">Explore demo parcel <ArrowRight className="h-4 w-4" /></button>
            <button onClick={() => navigate("/validation")} className="inline-flex items-center gap-2 rounded-xl border border-[#46634c] bg-[#12291d] px-4 py-3 text-sm font-medium text-[#dbe8d9] transition-colors hover:border-[#b8dc65]/60 hover:bg-[#183421]">View validation results <MoveUpRight className="h-4 w-4" /></button>
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-[#799184]">
            {[
              { icon: MapPinned, label: "Map" }, { icon: Satellite, label: "Satellite analytics" }, { icon: Gauge, label: "Suitability" }, { icon: Sprout, label: "Crop plan" },
            ].map((step, index, all) => (
              <div key={step.label} className="flex items-center gap-2"><span className="flex items-center gap-1.5 rounded-full border border-[#2d4937] bg-[#0c1b14]/70 px-2.5 py-1.5"><step.icon className="h-3.5 w-3.5 text-[#67c5ba]" /> {step.label}</span>{index < all.length - 1 && <ChevronRight className="h-3 w-3 text-[#55705e]" />}</div>
            ))}
          </div>
        </div>
      </div>
      <div className="relative overflow-hidden rounded-3xl border border-[#20392b] bg-[#0c1b14] p-6 sm:p-8">
        <div className="flex items-start justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#799184]">Model snapshot</p><p className="mt-2 text-lg font-medium text-[#edf4e8]">One parcel, four layers</p></div><div className="rounded-xl border border-[#67c5ba]/20 bg-[#67c5ba]/10 p-2.5"><Layers3 className="h-5 w-5 text-[#67c5ba]" /></div></div>
        <div className="mt-8 space-y-4">
          {[
            { label: "Satellite signal", value: "NDVI 0.52", color: "#67c5ba", width: "88%" },
            { label: "Soil profile", value: "Loam · pH 7.0", color: "#e5b85c", width: "76%" },
            { label: "Climate window", value: "730 mm / year", color: "#78a9e8", width: "69%" },
            { label: "Crop ranking", value: "Wheat · 8.4 / 10", color: "#b8dc65", width: "92%" },
          ].map((layer) => <div key={layer.label}><div className="mb-2 flex items-center justify-between text-xs"><span className="text-[#9aafa0]">{layer.label}</span><span className="font-medium text-[#edf4e8]">{layer.value}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-[#1b3325]"><div className="h-full rounded-full" style={{ width: layer.width, backgroundColor: layer.color }} /></div></div>)}
        </div>
        <div className="mt-8 flex items-center gap-3 border-t border-[#20392b] pt-5"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#b8dc65]/10"><Check className="h-4 w-4 text-[#b8dc65]" /></div><div><p className="text-xs font-medium text-[#edf4e8]">Local model ready</p><p className="text-[11px] text-[#799184]">No API key · deterministic fixture</p></div></div>
      </div>
    </section>
  );
}

function KpiStrip() {
  const icons = [MapPinned, Layers3, Sparkles, Leaf, Droplets, ShieldCheck];
  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6" aria-label="Portfolio summary">
      {VIVA_KPIS.map((kpi, index) => { const Icon = icons[index]; return <div key={kpi.label} className={`group rounded-2xl border p-4 transition-transform hover:-translate-y-0.5 ${accentBg[kpi.accent]}`}><div className="flex items-start justify-between gap-2"><span className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#809889]">{kpi.label}</span><Icon className={`h-4 w-4 ${accentText[kpi.accent]}`} /></div><div className={`mt-3 text-2xl font-semibold tracking-tight ${accentText[kpi.accent]}`}>{kpi.value}</div><p className="mt-1 text-[11px] leading-4 text-[#809889]">{kpi.context}</p></div>; })}
    </section>
  );
}

interface LayerState { satellite: boolean; suitability: boolean; ndvi: boolean }

function DemoMap({ selected, onSelect, layers, setLayers }: { selected: VivaParcel; onSelect: (parcel: VivaParcel) => void; layers: LayerState; setLayers: (layers: LayerState) => void }) {
  return (
    <Panel className="overflow-hidden" id="parcel">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#20392b] px-5 py-4 sm:px-6">
        <div><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#799184]"><Compass className="h-3.5 w-3.5 text-[#67c5ba]" /> Parcel intelligence</div><h3 className="mt-1 text-lg font-semibold text-[#edf4e8]">Portfolio field map</h3></div>
        <div className="flex gap-1.5" role="group" aria-label="Map layers">
          {(["satellite", "suitability", "ndvi"] as const).map((layer) => <button key={layer} onClick={() => setLayers({ ...layers, [layer]: !layers[layer] })} aria-pressed={layers[layer]} className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-medium capitalize transition-colors ${layers[layer] ? "border-[#b8dc65]/40 bg-[#b8dc65]/10 text-[#b8dc65]" : "border-[#294738] text-[#718878] hover:text-[#dbe8d9]"}`}>{layer === "ndvi" ? "NDVI" : layer}</button>)}
        </div>
      </div>
      <div className="p-4 sm:p-5">
        <div className="relative min-h-[360px] overflow-hidden rounded-xl border border-[#294738] bg-[#0a1912] sm:min-h-[430px]" style={{ backgroundImage: "linear-gradient(rgba(102, 153, 111, 0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(102, 153, 111, 0.07) 1px, transparent 1px)", backgroundSize: "42px 42px" }}>
          <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-lg border border-[#294738] bg-[#0b1c14]/90 px-3 py-2 text-[10px] text-[#9aafa0]"><span className="h-1.5 w-1.5 rounded-full bg-[#67c5ba]" /> Global demo portfolio <span className="text-[#55705e]">·</span> 6 active areas</div>
          <div className="absolute bottom-4 left-4 z-10 flex flex-wrap gap-2 rounded-lg border border-[#294738] bg-[#0b1c14]/90 px-3 py-2 text-[10px] text-[#9aafa0]"><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#b8dc65]" /> Selected</span><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#78a9e8]" /> Portfolio</span><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#e5b85c]" /> Watch zone</span></div>
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-label="Stylized portfolio map" role="img">
            <path d="M7 24 C25 15, 33 21, 46 16 S74 19, 94 9" fill="none" stroke="#234332" strokeWidth="0.7" strokeDasharray="2 2" />
            <path d="M3 54 C19 46, 28 61, 43 51 S68 44, 96 57" fill="none" stroke="#1d4c4a" strokeWidth="1.4" opacity="0.8" />
            <path d="M7 84 C27 68, 45 84, 57 73 S79 68, 96 82" fill="none" stroke="#234332" strokeWidth="0.7" strokeDasharray="2 2" />
            {VIVA_PARCELS.map((parcel) => <polygon key={parcel.id} points={parcel.mapPolygon} fill={layers.suitability ? `${parcel.color}55` : `${parcel.color}25`} stroke={selected.id === parcel.id ? "#f2f6e6" : parcel.color} strokeWidth={selected.id === parcel.id ? "0.9" : "0.45"} strokeLinejoin="round" opacity={layers.satellite ? 1 : 0.72} />)}
            {layers.ndvi && <path d="M13 31 C29 24, 42 42, 57 25 S80 30, 91 16" fill="none" stroke="#b8dc65" strokeWidth="0.7" opacity="0.65" />}
          </svg>
          {VIVA_PARCELS.map((parcel, index) => <button key={parcel.id} onClick={() => onSelect(parcel)} aria-label={`Select ${parcel.name}`} className={`absolute z-20 -translate-x-1/2 -translate-y-1/2 rounded-full border p-1.5 transition-all hover:scale-110 ${selected.id === parcel.id ? "border-[#f2f6e6] bg-[#b8dc65] shadow-[0_0_0_5px_rgba(184,220,101,0.16),0_0_18px_rgba(184,220,101,0.42)]" : "border-[#92b97c] bg-[#1c3d28]"}`} style={{ left: `${parcel.mapPosition.x}%`, top: `${parcel.mapPosition.y}%` }}><span className={`block h-2 w-2 rounded-full ${selected.id === parcel.id ? "bg-[#132219]" : "bg-[#b8dc65]"}`} /><span className="absolute left-1/2 top-full mt-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-[#294738] bg-[#0b1c14] px-2 py-1 text-[9px] text-[#cbdac8] shadow-xl sm:block">{index + 1} · {parcel.name}</span></button>)}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {VIVA_PARCELS.map((parcel, index) => <button key={parcel.id} onClick={() => onSelect(parcel)} className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors ${selected.id === parcel.id ? "border-[#b8dc65]/40 bg-[#b8dc65]/10" : "border-[#20392b] bg-[#0a1912] hover:border-[#3b6245]"}`}><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold" style={{ backgroundColor: `${parcel.color}22`, color: parcel.color }}>{index + 1}</span><span className="min-w-0 truncate text-[10px] text-[#a7b9aa]">{parcel.name}</span></button>)}
        </div>
      </div>
    </Panel>
  );
}

function SelectedParcel({ parcel }: { parcel: VivaParcel }) {
  return (
    <Panel className="h-full p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4"><div><div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#799184]"><MapPinned className="h-3.5 w-3.5 text-[#b8dc65]" /> Active parcel</div><h3 className="text-2xl font-semibold tracking-tight text-[#edf4e8]">{parcel.name}</h3><p className="mt-1 text-sm text-[#81988a]">{parcel.location}</p></div><span className="text-3xl">{parcel.cropEmoji}</span></div>
      <div className="mt-5 flex flex-wrap gap-1.5">{parcel.badges.map((badge) => <span key={badge} className={`rounded-full border px-2.5 py-1 text-[10px] font-medium ${toneText[parcel.statusTone]}`}>{badge}</span>)}</div>
       <div className="mt-6 grid grid-cols-2 gap-2.5"><div className="rounded-xl border border-[#2c4b37] bg-[#11251a] p-3"><p className="text-[10px] uppercase tracking-wider text-[#718878]">Suitability</p><p className="mt-1 text-2xl font-semibold text-[#b8dc65]">{parcel.suitability}<span className="text-sm font-normal text-[#718878]"> / 10</span></p></div><div className="rounded-xl border border-[#2c4b37] bg-[#11251a] p-3"><p className="text-[10px] uppercase tracking-wider text-[#718878]">NDVI health</p><p className="mt-1 text-2xl font-semibold text-[#67c5ba]">{parcel.ndvi.toFixed(2)}</p></div></div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center"><div className="rounded-lg bg-[#0a1912] p-2.5"><CloudRain className="mx-auto h-3.5 w-3.5 text-[#78a9e8]" /><p className="mt-1 text-sm font-medium text-[#dbe8d9]">{parcel.rainfall}<span className="text-[9px] text-[#718878]"> mm</span></p><p className="text-[9px] text-[#718878]">Rainfall</p></div><div className="rounded-lg bg-[#0a1912] p-2.5"><Mountain className="mx-auto h-3.5 w-3.5 text-[#e5b85c]" /><p className="mt-1 text-sm font-medium text-[#dbe8d9]">{parcel.soilQuality}<span className="text-[9px] text-[#718878]"> /100</span></p><p className="text-[9px] text-[#718878]">Soil quality</p></div><div className="rounded-lg bg-[#0a1912] p-2.5"><Droplets className="mx-auto h-3.5 w-3.5 text-[#67c5ba]" /><p className="mt-1 text-sm font-medium text-[#dbe8d9]">{parcel.waterAccess}<span className="text-[9px] text-[#718878]"> /100</span></p><p className="text-[9px] text-[#718878]">Water access</p></div></div>
      <div className="mt-5 border-t border-[#20392b] pt-5"><div className="flex items-center justify-between"><div><p className="text-[10px] uppercase tracking-[0.16em] text-[#718878]">Current recommendation</p><p className="mt-1 text-base font-semibold text-[#edf4e8]">{parcel.recommendation}</p></div><div className="rounded-full border border-[#b8dc65]/30 bg-[#b8dc65]/10 p-2"><Sprout className="h-4 w-4 text-[#b8dc65]" /></div></div><p className="mt-3 text-xs leading-5 text-[#8fa496]">{parcel.recommendationReason}</p></div>
      <div className="mt-5 rounded-xl border border-[#2c4b37] bg-[#11251a] p-3.5"><p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#b8dc65]"><Lightbulb className="h-3.5 w-3.5" /> Why this recommendation?</p><p className="mt-2 text-xs leading-5 text-[#a7b9aa]">TerraSuite weights soil, water, climate, terrain, drainage, and nutrient signals together instead of relying on a single satellite index.</p></div>
    </Panel>
  );
}

function AnalyticsSection({ parcel }: { parcel: VivaParcel }) {
  const landTotal = parcel.landUse.reduce((sum, item) => sum + item.value, 0);
  return (
    <section id="analytics" className="scroll-mt-28">
      <SectionHeading eyebrow="Signal stack" title="Analytics that explain the field" detail={`Six months of deterministic demo telemetry for ${parcel.name}. Every chart updates when you switch the active parcel.`} />
      <div className="grid gap-5 lg:grid-cols-[1.35fr_.9fr]">
        <Panel className="p-5 sm:p-6">
          <div className="flex items-start justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#799184]">Vegetation signal</p><h3 className="mt-1 text-base font-semibold text-[#edf4e8]">NDVI trend · last six months</h3></div><div className="rounded-lg bg-[#67c5ba]/10 p-2"><Activity className="h-4 w-4 text-[#67c5ba]" /></div></div>
          <div className="mt-5 h-64"><ResponsiveContainer width="100%" height="100%"><AreaChart data={parcel.ndviTrend} margin={{ top: 5, right: 4, left: -20, bottom: 0 }}><defs><linearGradient id="vivaNdviFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#67c5ba" stopOpacity={0.34} /><stop offset="100%" stopColor="#67c5ba" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid stroke={gridStroke} strokeDasharray="3 3" /><XAxis dataKey="month" tick={chartText} axisLine={false} tickLine={false} /><YAxis domain={[0, 0.8]} tick={chartText} axisLine={false} tickLine={false} /><Tooltip content={<CustomChartTooltip />} /><Area type="monotone" dataKey="value" name="NDVI" stroke="#67c5ba" strokeWidth={2.5} fill="url(#vivaNdviFill)" dot={{ r: 3, fill: "#67c5ba", stroke: "#0c1b14", strokeWidth: 2 }} /></AreaChart></ResponsiveContainer></div>
          <div className="mt-3 flex items-center justify-between border-t border-[#20392b] pt-3 text-[11px]"><span className="text-[#799184]">Latest reading</span><span className="font-semibold text-[#67c5ba]">{parcel.ndvi.toFixed(2)} · {parcel.ndvi >= 0.6 ? "healthy" : parcel.ndvi >= 0.4 ? "moderate" : "stressed"}</span></div>
        </Panel>
        <Panel className="p-5 sm:p-6"><div className="flex items-start justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#799184]">Suitability model</p><h3 className="mt-1 text-base font-semibold text-[#edf4e8]">Six-factor profile</h3></div><div className="rounded-lg bg-[#b8dc65]/10 p-2"><Gauge className="h-4 w-4 text-[#b8dc65]" /></div></div><div className="mt-3 h-64"><ResponsiveContainer width="100%" height="100%"><RadarChart data={parcel.suitabilityProfile} cx="50%" cy="50%" outerRadius="68%"><PolarGrid stroke="#294738" /><PolarAngleAxis dataKey="subject" tick={{ fill: axisStroke, fontSize: 9 }} /><PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: axisStroke, fontSize: 8 }} axisLine={false} /><Radar name="Score" dataKey="value" stroke="#b8dc65" fill="#b8dc65" fillOpacity={0.22} strokeWidth={2} /><Tooltip content={<CustomChartTooltip />} /></RadarChart></ResponsiveContainer></div></Panel>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
        <Panel className="p-5 sm:p-6"><div className="flex items-start justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#799184]">Land-use composition</p><h3 className="mt-1 text-base font-semibold text-[#edf4e8]">Satellite classification</h3></div><Satellite className="h-4 w-4 text-[#78a9e8]" /></div><div className="relative mt-2 h-56"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={parcel.landUse} dataKey="value" nameKey="name" innerRadius={58} outerRadius={82} paddingAngle={3} stroke="none">{parcel.landUse.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie><Tooltip contentStyle={tooltipStyle} formatter={(value: number, name: string) => [`${value}%`, name]} /></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-2xl font-semibold text-[#edf4e8]">{landTotal}%</span><span className="text-[9px] uppercase tracking-wider text-[#718878]">mapped</span></div></div><div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-2">{parcel.landUse.map((entry) => <div key={entry.name} className="flex items-center gap-1.5 text-[10px]"><span className="h-2 w-2 rounded-sm" style={{ backgroundColor: entry.color }} /><span className="truncate text-[#8fa496]">{entry.name}</span><span className="ml-auto font-medium text-[#dbe8d9]">{entry.value}%</span></div>)}</div></Panel>
        <Panel className="p-5 sm:p-6"><div className="flex items-start justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#799184]">Climate context</p><h3 className="mt-1 text-base font-semibold text-[#edf4e8]">Monthly rainfall and temperature</h3></div><div className="flex items-center gap-2 text-[10px] text-[#718878]"><span className="h-2 w-2 rounded-full bg-[#78a9e8]" /> rainfall <span className="h-2 w-2 rounded-full bg-[#e5b85c]" /> temperature</div></div><div className="mt-5 h-64"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={parcel.climate} margin={{ top: 5, right: 0, left: -18, bottom: 0 }}><CartesianGrid stroke={gridStroke} strokeDasharray="3 3" /><XAxis dataKey="month" tick={chartText} axisLine={false} tickLine={false} /><YAxis yAxisId="rain" tick={chartText} axisLine={false} tickLine={false} /><YAxis yAxisId="temp" orientation="right" tick={chartText} axisLine={false} tickLine={false} /><Tooltip content={<CustomChartTooltip />} /><Bar yAxisId="rain" dataKey="rainfall" name="Rainfall (mm)" fill="#78a9e8" fillOpacity={0.7} radius={[3, 3, 0, 0]} /><Line yAxisId="temp" type="monotone" dataKey="temperature" name="Temperature (°C)" stroke="#e5b85c" strokeWidth={2.5} dot={{ r: 3, fill: "#e5b85c", stroke: "#0c1b14", strokeWidth: 2 }} /></ComposedChart></ResponsiveContainer></div></Panel>
      </div>
    </section>
  );
}

function CropPlanning({ parcel }: { parcel: VivaParcel }) {
  const plan = parcel.cropPlan;
  return (
    <section id="crop" className="scroll-mt-28">
      <SectionHeading eyebrow="Decision layer" title="From suitability to an actionable crop plan" detail="The local crop engine converts environmental signals into zones, a rotation sequence, and management guidance that can be explained in a viva." action={<span className="inline-flex items-center gap-2 rounded-full border border-[#b8dc65]/25 bg-[#b8dc65]/10 px-3 py-1.5 text-[10px] font-medium text-[#b8dc65]"><Sprout className="h-3.5 w-3.5" /> Local model · offline</span>} />
      <Panel className="overflow-hidden">
        <div className="grid lg:grid-cols-[.7fr_1.3fr]">
          <div className="border-b border-[#20392b] p-5 sm:p-7 lg:border-b-0 lg:border-r"><div className="flex items-start justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#799184]">Recommended crop</p><h3 className="mt-2 text-3xl font-semibold text-[#edf4e8]">{plan.recommendedCrop}</h3><p className="mt-1 text-sm text-[#8fa496]">{parcel.name}</p></div><span className="text-4xl">{parcel.cropEmoji}</span></div><div className="mt-8"><div className="flex items-end justify-between"><span className="text-xs text-[#799184]">Confidence / suitability</span><span className="text-2xl font-semibold text-[#b8dc65]">{plan.confidence}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#1b3325]"><div className="h-full rounded-full bg-[#b8dc65]" style={{ width: `${plan.confidence}%` }} /></div></div><div className="mt-7 rounded-xl border border-[#294738] bg-[#11251a] p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#b8dc65]">Rotation sequence</p><div className="mt-3 flex flex-wrap items-center gap-2">{plan.rotation.map((crop, index) => <div key={crop} className="flex items-center gap-2"><span className="rounded-lg border border-[#38553d] bg-[#0a1912] px-2.5 py-1.5 text-xs text-[#dbe8d9]">{crop}</span>{index < plan.rotation.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-[#718878]" />}</div>)}</div></div></div>
          <div className="p-5 sm:p-7"><div className="flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#799184]">Management zones</p><h3 className="mt-1 text-base font-semibold text-[#edf4e8]">Allocate the parcel with intent</h3></div><span className="rounded-full border border-[#67c5ba]/25 bg-[#67c5ba]/10 px-2.5 py-1 text-[10px] text-[#67c5ba]">AI-assisted view</span></div><div className="mt-5 grid gap-3 sm:grid-cols-3">{plan.zones.map((zone) => <div key={zone.name} className="rounded-xl border border-[#294738] bg-[#0a1912] p-4"><div className="flex items-center justify-between"><span className="text-2xl">{zone.emoji}</span><span className="text-xl font-semibold" style={{ color: zone.color }}>{zone.share}%</span></div><p className="mt-4 text-xs font-semibold text-[#edf4e8]">{zone.name} · {zone.crop}</p><p className="mt-1 text-[11px] leading-4 text-[#718878]">{zone.note}</p><div className="mt-4 h-1 overflow-hidden rounded-full bg-[#1b3325]"><div className="h-full rounded-full" style={{ width: `${zone.share * 2}%`, backgroundColor: zone.color }} /></div></div>)}</div><div className="mt-6 grid gap-2 sm:grid-cols-2">{plan.recommendations.map((tip) => <div key={tip} className="flex gap-2 rounded-lg bg-[#11251a] px-3 py-2.5 text-xs leading-5 text-[#a7b9aa]"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#b8dc65]" /> {tip}</div>)}</div></div>
        </div>
      </Panel>
    </section>
  );
}

function ComparisonSection() {
  return (
    <section id="comparison" className="scroll-mt-28">
      <SectionHeading eyebrow="Context layer" title="Compare environments, not just scores" detail="The comparison view keeps the agronomic context visible. A field can be stronger on water while another is better adapted to its climate." />
      <Panel className="overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#20392b] px-5 py-4 sm:px-6"><div className="flex items-center gap-3"><div className="rounded-xl bg-[#b8dc65]/10 p-2.5"><GitCompareArrows className="h-5 w-5 text-[#b8dc65]" /></div><div><h3 className="text-base font-semibold text-[#edf4e8]">Punjab Wheat vs Jaén Olive</h3><p className="text-xs text-[#799184]">Different environments, different strengths.</p></div></div><span className="rounded-full border border-[#294738] px-3 py-1.5 text-[10px] text-[#8fa496]">Neutral delta view</span></div><div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[680px] text-left"><thead><tr className="border-b border-[#20392b] text-[10px] uppercase tracking-[0.16em] text-[#718878]"><th className="px-6 py-4 font-medium">Metric</th><th className="px-6 py-4 font-medium text-[#b8dc65]">Punjab · Wheat</th><th className="px-6 py-4 font-medium text-[#e5b85c]">Jaén · Olive</th><th className="px-6 py-4 font-medium">Interpretation</th></tr></thead><tbody>{VIVA_COMPARISON.map((metric) => <tr key={metric.label} className="border-b border-[#182d21] last:border-0"><td className="px-6 py-4 text-sm font-medium text-[#dbe8d9]">{metric.label}</td><td className="px-6 py-4 text-sm font-semibold text-[#b8dc65]">{metric.punjab}</td><td className="px-6 py-4 text-sm font-semibold text-[#e5b85c]">{metric.jaen}</td><td className="px-6 py-4 text-xs text-[#799184]">{metric.context}</td></tr>)}</tbody></table></div><div className="space-y-2 p-4 md:hidden">{VIVA_COMPARISON.map((metric) => <div key={metric.label} className="rounded-xl border border-[#294738] bg-[#0a1912] p-3"><div className="flex items-center justify-between"><span className="text-xs font-medium text-[#dbe8d9]">{metric.label}</span><span className="text-[10px] text-[#718878]">contextual delta</span></div><div className="mt-2 flex items-center justify-between text-sm"><span className="text-[#b8dc65]">{metric.punjab}</span><span className="text-[#718878]">vs</span><span className="text-[#e5b85c]">{metric.jaen}</span></div><p className="mt-2 text-[10px] text-[#718878]">{metric.context}</p></div>)}</div></Panel>
    </section>
  );
}

function ValidationSection({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  return (
    <section id="validation" className="scroll-mt-28">
      <SectionHeading eyebrow="Evidence layer" title="Validation you can explain" detail="Five agro-region fixtures run through the same local crop-ranking and suitability formulas used by the TerraSuite workflow." action={<button onClick={() => navigate("/validation")} className="inline-flex items-center gap-2 rounded-lg border border-[#38553d] bg-[#11251a] px-3 py-2 text-xs font-medium text-[#dbe8d9] transition-colors hover:border-[#b8dc65]/50 hover:text-[#b8dc65]">Open validation runner <MoveUpRight className="h-3.5 w-3.5" /></button>} />
      <Panel className="p-5 sm:p-6"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">{[
        { label: "Fixtures", value: String(VIVA_VALIDATION.fixtures), icon: Layers3, color: "text-[#78a9e8]" },
        { label: "Crop agreement", value: VIVA_VALIDATION.cropAgreement, icon: Sprout, color: "text-[#b8dc65]" },
        { label: "Class agreement", value: VIVA_VALIDATION.classAgreement, icon: ShieldCheck, color: "text-[#67c5ba]" },
        { label: "MAE", value: VIVA_VALIDATION.mae, icon: Activity, color: "text-[#e5b85c]" },
        { label: "RMSE", value: VIVA_VALIDATION.rmse, icon: BarChart3, color: "text-[#b9a1e5]" },
        { label: "Build time", value: VIVA_VALIDATION.buildTime, icon: Gauge, color: "text-[#e09068]" },
      ].map((metric) => <div key={metric.label} className="rounded-xl border border-[#294738] bg-[#0a1912] p-3"><metric.icon className={`h-4 w-4 ${metric.color}`} /><p className="mt-3 text-[10px] uppercase tracking-[0.14em] text-[#718878]">{metric.label}</p><p className={`mt-1 text-xl font-semibold ${metric.color}`}>{metric.value}</p></div>)}</div><div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.15fr]"><div><div className="mb-3 flex items-center justify-between"><div><h3 className="text-sm font-semibold text-[#edf4e8]">Agro-region fixtures</h3><p className="mt-1 text-[11px] text-[#718878]">Reference crop and suitability class</p></div><span className="flex items-center gap-1 text-[10px] text-[#b8dc65]"><Check className="h-3 w-3" /> all aligned</span></div><div className="space-y-2">{VIVA_VALIDATION_REGIONS.map((region) => <div key={region.name} className="flex items-center gap-3 rounded-lg border border-[#20392b] bg-[#0a1912] px-3 py-2.5"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#b8dc65]/10"><Check className="h-3.5 w-3.5 text-[#b8dc65]" /></span><span className="flex-1 text-xs font-medium text-[#dbe8d9]">{region.name}<span className="ml-2 text-[#718878]">· {region.crop}</span></span><span className="text-[10px] text-[#67c5ba]">{region.className}</span><span className="text-xs font-semibold text-[#b8dc65]">{region.agreement}%</span></div>)}</div></div><div className="rounded-xl border border-[#294738] bg-[#0a1912] p-4"><div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-[#edf4e8]">Engine vs reference</h3><span className="text-[10px] uppercase tracking-[0.14em] text-[#718878]">Agreement score</span></div><div className="mt-5 h-48"><ResponsiveContainer width="100%" height="100%"><BarChart data={VIVA_VALIDATION_REGIONS} layout="vertical" margin={{ top: 0, right: 6, left: 0, bottom: 0 }}><CartesianGrid stroke={gridStroke} horizontal={false} /><XAxis type="number" domain={[0, 100]} tick={chartText} axisLine={false} tickLine={false} /><YAxis dataKey="name" type="category" width={65} tick={{ fill: axisStroke, fontSize: 9 }} axisLine={false} tickLine={false} /><Tooltip content={<CustomChartTooltip />} /><Bar dataKey="agreement" name="Agreement %" fill="#b8dc65" radius={[0, 4, 4, 0]} barSize={17} /></BarChart></ResponsiveContainer></div></div></div></Panel>
    </section>
  );
}

function ExplanationPanel() {
  const steps = [
    { number: "01", icon: MapPinned, title: "Draw or select a parcel", detail: "Start with a field boundary and its crop or land-use context." },
    { number: "02", icon: Layers3, title: "Fuse the evidence", detail: "Combine satellite, soil, weather, terrain, and land-use signals." },
    { number: "03", icon: Gauge, title: "Rank crop suitability", detail: "Apply weighted formulas to compare environmental fit across crops." },
    { number: "04", icon: Lightbulb, title: "Generate guidance", detail: "Turn the score into zones, risks, and rotation recommendations." },
  ];
  return <section className="rounded-3xl border border-[#2b4e39] bg-[#10251a] p-6 sm:p-8"><div className="grid gap-8 lg:grid-cols-[.75fr_1.25fr] lg:items-center"><div><div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#b8dc65]"><CircleHelp className="h-3.5 w-3.5" /> Viva explainer</div><h2 className="text-3xl font-semibold tracking-tight text-[#edf4e8]">How TerraSuite makes a decision</h2><p className="mt-3 max-w-md text-sm leading-6 text-[#9aafa0]">The product turns scattered geospatial evidence into a workflow a farmer, planner, or examiner can follow.</p></div><div className="grid gap-3 sm:grid-cols-2">{steps.map((step) => <div key={step.number} className="rounded-xl border border-[#33543d] bg-[#0c1b14]/70 p-4"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-[#b8dc65]">{step.number}</span><step.icon className="h-4 w-4 text-[#67c5ba]" /></div><h3 className="mt-5 text-sm font-semibold text-[#edf4e8]">{step.title}</h3><p className="mt-1.5 text-xs leading-5 text-[#809889]">{step.detail}</p></div>)}</div></div></section>;
}

export default function VivaDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<VivaTab>("overview");
  const [selectedId, setSelectedId] = useState(VIVA_PARCELS[0].id);
  const [layers, setLayers] = useState<LayerState>({ satellite: true, suitability: true, ndvi: false });
  const selected = useMemo(() => VIVA_PARCELS.find((parcel) => parcel.id === selectedId) ?? VIVA_PARCELS[0], [selectedId]);

  const chooseParcel = (parcel: VivaParcel) => {
    setSelectedId(parcel.id);
    setActiveTab("parcel");
    scrollToSection("parcel");
  };

  const show = (tab: VivaTab) => activeTab === "overview" || activeTab === tab;

  return (
    <div id="top" className="min-h-screen bg-[#07140f] text-[#edf4e8] selection:bg-[#b8dc65] selection:text-[#0a180f]" style={{ backgroundImage: "radial-gradient(circle at 80% 0%, rgba(45, 91, 57, 0.16), transparent 33%), radial-gradient(circle at 0% 40%, rgba(33, 77, 73, 0.08), transparent 30%)" }}>
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="mx-auto max-w-[1600px] space-y-10 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        {activeTab === "overview" && <Hero navigate={navigate} />}
        {activeTab === "overview" && <KpiStrip />}
        {show("parcel") && <div className="grid gap-5 lg:grid-cols-[1.65fr_.8fr]"><DemoMap selected={selected} onSelect={chooseParcel} layers={layers} setLayers={setLayers} /><SelectedParcel parcel={selected} /></div>}
        {show("parcel") && <AnalyticsSection parcel={selected} />}
        {show("crop") && <CropPlanning parcel={selected} />}
        {show("comparison") && <ComparisonSection />}
        {show("validation") && <ValidationSection navigate={navigate} />}
        {activeTab === "overview" && <ExplanationPanel />}
      </main>
      <footer className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 border-t border-[#1d3528] px-4 py-6 text-[10px] uppercase tracking-[0.15em] text-[#60796b] sm:px-6 lg:px-8"><span>TerraSuite · geospatial decision support</span><span>Viva presentation mode · local deterministic fixtures</span></footer>
    </div>
  );
}
