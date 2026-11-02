/** Database types mirrored from supabase/migrations/0001_core_tables.sql. */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.1" };
  public: {
    Tables: {
      profiles: Table<
        {
          id: string;
          user_id: string;
          username: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          user_id: string;
          username?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          user_id?: string;
          username?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      parcels: Table<
        {
          id: string;
          user_id: string;
          client_id: string;
          name: string;
          crop: string;
          crop_emoji: string | null;
          area_ha: number;
          location: string | null;
          color: string | null;
          parcel_group: string | null;
          ndvi_change: number | null;
          coordinates: Json;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          user_id?: string;
          client_id: string;
          name: string;
          crop?: string;
          crop_emoji?: string | null;
          area_ha?: number;
          location?: string | null;
          color?: string | null;
          parcel_group?: string | null;
          ndvi_change?: number | null;
          coordinates: Json;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          user_id?: string;
          client_id?: string;
          name?: string;
          crop?: string;
          crop_emoji?: string | null;
          area_ha?: number;
          location?: string | null;
          color?: string | null;
          parcel_group?: string | null;
          ndvi_change?: number | null;
          coordinates?: Json;
          created_at?: string;
          updated_at?: string;
        }
      >;
      reports: Table<
        {
          id: string;
          user_id: string;
          parcel_client_id: string;
          report_type: "ai_analysis" | "crop_plan";
          content: Json;
          created_at: string;
        },
        {
          id?: string;
          user_id?: string;
          parcel_client_id: string;
          report_type: "ai_analysis" | "crop_plan";
          content: Json;
          created_at?: string;
        },
        {
          id?: string;
          user_id?: string;
          parcel_client_id?: string;
          report_type?: "ai_analysis" | "crop_plan";
          content?: Json;
          created_at?: string;
        }
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
