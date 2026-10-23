// One-time local import: if the signed-in user's server library is empty
// but this browser holds parcels from an earlier (pre-auth / reference-app)
// session, offer to import them. This is the "data migration" story for
// the report — old local data is not lost when accounts arrive.

import type { Parcel } from "@/data/parcel";
import { createParcel, listParcels } from "@/services/parcels-service";

/** Reads the legacy/reference cache keys if present. */
function readLegacyParcels(): Parcel[] {
  const keys = ["terrasuite-parcels-v1", "virdis-regions-v7"];
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.coordinates) {
        return parsed as Parcel[];
      }
    } catch {
      /* skip corrupt entries */
    }
  }
  return [];
}

export interface ImportDecision {
  available: boolean;
  count: number;
}

/** Check whether an import offer should be shown (server empty + local data present). */
export async function checkLocalImport(): Promise<ImportDecision> {
  const local = readLegacyParcels();
  if (local.length === 0) return { available: false, count: 0 };
  try {
    const server = await listParcels();
    if (server.length > 0) return { available: false, count: 0 };
    return { available: true, count: local.length };
  } catch {
    return { available: false, count: 0 }; // server unreachable — don't block login flow
  }
}

/** Import all local parcels to the signed-in account. Returns imported count. */
export async function runLocalImport(): Promise<number> {
  const local = readLegacyParcels();
  let imported = 0;
  for (const p of local) {
    try {
      await createParcel(p);
      imported += 1;
    } catch {
      // duplicate client_id or per-row failure — skip, keep going
    }
  }
  return imported;
}
