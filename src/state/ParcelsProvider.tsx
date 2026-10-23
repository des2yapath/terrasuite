// ParcelsProvider — the single source of truth for the parcel library.
//
// Data flow:
//   server (Postgres, RLS-scoped) ──listParcels──▶ provider state ──▶ UI
//   UI mutations are OPTIMISTIC (state updates first, server call second,
//   rollback + toast on failure) and mirrored to a localStorage write-through
//   cache so the next refresh paints instantly before the server responds.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import type { Parcel } from "@/data/parcel";
import {
  listParcels,
  createParcel,
  updateParcel,
  deleteParcel as serviceDeleteParcel,
} from "@/services/parcels-service";
import { useAuth } from "@/auth/useAuth";

const PARCELS_CACHE_KEY = "terrasuite-parcels-v1";
const SELECTION_KEY = "terrasuite-sel-v1";

export interface ParcelsContextValue {
  parcels: Parcel[];
  loading: boolean;
  selectedIds: string[];
  activeParcel: Parcel | null;
  detailParcel: Parcel | null;
  flyToParcel: Parcel | null;
  editBoundaryParcelId: string | null;
  toggleSelected: (id: string) => void;
  setActiveParcel: (p: Parcel | null) => void;
  openDetail: (p: Parcel | null) => void;
  requestFlyTo: (p: Parcel | null) => void;
  setEditBoundaryParcelId: (id: string | null) => void;
  addParcel: (p: Parcel) => Promise<void>;
  saveParcel: (p: Parcel) => Promise<void>;
  removeParcel: (id: string) => Promise<void>;
}

const ParcelsContext = createContext<ParcelsContextValue | null>(null);

function readCache(): Parcel[] {
  try {
    const raw = localStorage.getItem(PARCELS_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as Parcel[]) : [];
  } catch {
    return [];
  }
}

function writeCache(parcels: Parcel[]) {
  try {
    localStorage.setItem(PARCELS_CACHE_KEY, JSON.stringify(parcels));
  } catch {
    /* quota — cache is best-effort */
  }
}

function readSelection(parcels: Parcel[]): string[] {
  try {
    const raw = localStorage.getItem(SELECTION_KEY);
    const ids = raw ? JSON.parse(raw) : null;
    if (Array.isArray(ids)) return ids.filter((id: string) => parcels.some((p) => p.id === id));
    return parcels.map((p) => p.id);
  } catch {
    return parcels.map((p) => p.id);
  }
}

export function ParcelsProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeParcel, setActiveParcelState] = useState<Parcel | null>(null);
  const [detailParcel, setDetailParcel] = useState<Parcel | null>(null);
  const [flyToParcel, setFlyToParcel] = useState<Parcel | null>(null);
  const [editBoundaryParcelId, setEditBoundaryParcelId] = useState<string | null>(null);
  const parcelsRef = useRef<Parcel[]>([]);

  useEffect(() => { parcelsRef.current = parcels; }, [parcels]);

  // Load: paint cache instantly, then reconcile with server on login.
  useEffect(() => {
    if (authLoading) return;
    if (!userId) {
      setParcels([]);
      setSelectedIds([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const cached = readCache();
    if (cached.length > 0) {
      setParcels(cached);
      setSelectedIds(readSelection(cached));
      setLoading(false); // optimistic paint done
    }
    (async () => {
      try {
        const serverList = await listParcels();
        if (cancelled) return;
        setParcels(serverList);
        writeCache(serverList);
        setSelectedIds(readSelection(serverList));
      } catch (e) {
        if (!cancelled && cached.length === 0) {
          toast.error("Could not load your parcels. Retrying on refresh.");
        }
        console.warn("parcel list load failed", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId, authLoading]);

  // Persist selection whenever it changes
  useEffect(() => {
    if (selectedIds.length > 0 || parcels.length > 0) {
      try { localStorage.setItem(SELECTION_KEY, JSON.stringify(selectedIds)); } catch { /* best-effort */ }
    }
  }, [selectedIds, parcels.length]);

  const setActiveParcel = useCallback((p: Parcel | null) => setActiveParcelState(p), []);
  const openDetail = useCallback((p: Parcel | null) => setDetailParcel(p), []);
  const requestFlyTo = useCallback((p: Parcel | null) => setFlyToParcel(p), []);
  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }, []);

  /** Create — optimistic add, rollback on failure. */
  const addParcel = useCallback(async (p: Parcel) => {
    setParcels((prev) => {
      const next = [...prev, p];
      writeCache(next);
      return next;
    });
    setSelectedIds((prev) => (prev.includes(p.id) ? prev : [...prev, p.id]));
    try {
      await createParcel(p);
    } catch (e) {
      setParcels((prev) => {
        const next = prev.filter((x) => x.id !== p.id);
        writeCache(next);
        return next;
      });
      toast.error("Parcel could not be saved. Please try again.");
      throw e;
    }
  }, []);

  /** Update (rename, crop change, boundary drag…) — optimistic, rollback on failure. */
  const saveParcel = useCallback(async (p: Parcel) => {
    const snapshot = parcelsRef.current;
    setParcels((prev) => {
      const next = prev.map((x) => (x.id === p.id ? p : x));
      writeCache(next);
      return next;
    });
    setDetailParcel((d) => (d && d.id === p.id ? p : d));
    setActiveParcelState((a) => (a && a.id === p.id ? p : a));
    try {
      await updateParcel(p);
    } catch (e) {
      setParcels(snapshot);
      writeCache(snapshot);
      toast.error("Parcel could not be updated.");
      throw e;
    }
  }, []);

  /** Delete — optimistic remove + dependent reports cleanup on server. */
  const removeParcel = useCallback(async (id: string) => {
    const snapshot = parcelsRef.current;
    setParcels((prev) => {
      const next = prev.filter((x) => x.id !== id);
      writeCache(next);
      return next;
    });
    setSelectedIds((prev) => prev.filter((i) => i !== id));
    setDetailParcel((d) => (d && d.id === id ? null : d));
    setActiveParcelState((a) => (a && a.id === id ? null : a));
    try {
      await serviceDeleteParcel(id);
    } catch (e) {
      setParcels(snapshot);
      writeCache(snapshot);
      toast.error("Parcel could not be deleted.");
      throw e;
    }
  }, []);

  const value = useMemo<ParcelsContextValue>(
    () => ({
      parcels,
      loading,
      selectedIds,
      activeParcel,
      detailParcel,
      flyToParcel,
      editBoundaryParcelId,
      toggleSelected,
      setActiveParcel,
      openDetail,
      requestFlyTo,
      setEditBoundaryParcelId,
      addParcel,
      saveParcel,
      removeParcel,
    }),
    [parcels, loading, selectedIds, activeParcel, detailParcel, flyToParcel,
     editBoundaryParcelId, toggleSelected, setActiveParcel, openDetail,
     requestFlyTo, addParcel, saveParcel, removeParcel],
  );

  return <ParcelsContext.Provider value={value}>{children}</ParcelsContext.Provider>;
}

export function useParcels(): ParcelsContextValue {
  const ctx = useContext(ParcelsContext);
  if (!ctx) throw new Error("useParcels must be used inside <ParcelsProvider>");
  return ctx;
}
