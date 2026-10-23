// Report persistence — the synopsis requirement that "generated reports are
// tied to a registered user". AI analyses and crop plans land here on
// generation; the parcel detail view rehydrates them on open.

import { supabase } from "@/integrations/supabase/client";

export type ReportType = "ai_analysis" | "crop_plan";

export interface ReportRow {
  id: string;
  parcel_client_id: string;
  report_type: ReportType;
  content: Record<string, unknown>;
  created_at: string;
}

export class ReportServiceError extends Error {
  constructor(message: string, public verb: string) {
    super(message);
    this.name = "ReportServiceError";
  }
}

function unwrap<T>(data: T | null, error: { message: string } | null, verb: string): T {
  if (error) throw new ReportServiceError(error.message, verb);
  return data as T;
}

/** Save a report (new row each time — history preserved). */
export async function saveReport(
  parcelClientId: string,
  reportType: ReportType,
  content: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase.from("reports").insert({
    parcel_client_id: parcelClientId,
    report_type: reportType,
    content: content as unknown,
  });
  if (error) throw new ReportServiceError(error.message, "save");
}

/** Most recent report of a type for a parcel (or null). */
export async function latestReport(
  parcelClientId: string,
  reportType: ReportType,
): Promise<ReportRow | null> {
  const { data, error } = await supabase
    .from("reports")
    .select("id, parcel_client_id, report_type, content, created_at")
    .eq("parcel_client_id", parcelClientId)
    .eq("report_type", reportType)
    .order("created_at", { ascending: false })
    .limit(1);
  const rows = unwrap<ReportRow[] | null>(data, error, "latest");
  return rows && rows.length > 0 ? rows[0] : null;
}

/** Full history for a parcel (both types, newest first). */
export async function listReports(parcelClientId: string): Promise<ReportRow[]> {
  const { data, error } = await supabase
    .from("reports")
    .select("id, parcel_client_id, report_type, content, created_at")
    .eq("parcel_client_id", parcelClientId)
    .order("created_at", { ascending: false });
  return unwrap<ReportRow[] | null>(data, error, "list") ?? [];
}
