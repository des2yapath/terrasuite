// Parcel CRUD against public.parcels — UI never touches the table directly.
// All authorization is RLS (auth.uid() = user_id), so no user_id is passed;
// Postgres injects auth.uid() from the caller's JWT.

import { supabase } from "@/integrations/supabase/client";
import type { Parcel } from "@/data/parcel";

export class ParcelServiceError extends Error {
  constructor(message: string, public verb: string) {
    super(message);
    this.name = "ParcelServiceError";
  }
}

interface ParcelRow {
  id: string;
  client_id: string;
  name: string;
  crop: string;
  crop_emoji: string | null;
  area_ha: number;
  location: string | null;
  color: string | null;
  parcel_group: string | null;
  ndvi_change: number | null;
  coordinates: unknown;
  created_at: string;
  updated_at: string;
}

function rowToParcel(row: ParcelRow): Parcel {
  return {
    id: row.client_id,
    name: row.name,
    area: Number(row.area_ha),
    crop: row.crop,
    cropEmoji: row.crop_emoji ?? undefined,
    location: row.location ?? "",
    color: row.color ?? "#7BC75B",
    ndviChange: row.ndvi_change != null ? Number(row.ndvi_change) : undefined,
    group: row.parcel_group ?? undefined,
    coordinates: row.coordinates as Parcel["coordinates"],
  };
}

function parcelToInsert(p: Parcel) {
  return {
    client_id: p.id,
    name: p.name,
    crop: p.crop,
    crop_emoji: p.cropEmoji ?? null,
    area_ha: p.area,
    location: p.location,
    color: p.color,
    parcel_group: p.group ?? null,
    ndvi_change: p.ndviChange ?? null,
    coordinates: p.coordinates as unknown,
  };
}

function unwrap<T>(data: T | null, error: { message: string } | null, verb: string): T {
  if (error) throw new ParcelServiceError(error.message, verb);
  return data as T;
}

export async function listParcels(): Promise<Parcel[]> {
  const { data, error } = await supabase
    .from("parcels")
    .select("*")
    .order("created_at", { ascending: true });
  const rows = unwrap<(ParcelRow & { user_id: string })[] | null>(data, error, "list");
  return (rows ?? []).map(rowToParcel);
}

export async function createParcel(p: Parcel): Promise<void> {
  const { error } = await supabase.from("parcels").insert(parcelToInsert(p));
  if (error) throw new ParcelServiceError(error.message, "create");
}

/** Upsert: insert or update on (user_id, client_id) conflict. */
export async function upsertParcel(p: Parcel): Promise<void> {
  const { error } = await supabase.from("parcels").upsert(parcelToInsert(p));
  if (error) throw new ParcelServiceError(error.message, "upsert");
}

export async function updateParcel(p: Parcel): Promise<void> {
  const { error } = await supabase
    .from("parcels")
    .update(parcelToInsert(p))
    .eq("client_id", p.id);
  if (error) throw new ParcelServiceError(error.message, "update");
}

/** Removes a parcel AND its reports. Order matters: reports first, then parcel. */
export async function deleteParcel(clientId: string): Promise<void> {
  const { error: reportErr } = await supabase
    .from("reports")
    .delete()
    .eq("parcel_client_id", clientId);
  if (reportErr) throw new ParcelServiceError(reportErr.message, "delete-reports");

  const { error } = await supabase.from("parcels").delete().eq("client_id", clientId);
  if (error) throw new ParcelServiceError(error.message, "delete");
}
