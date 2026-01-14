import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

/**
 * True when Supabase is correctly configured via env vars.
 * Use this to disable features / show a helpful error message in the UI.
 */
export const hasSupabaseEnv = Boolean(supabaseUrl && supabaseAnonKey);

/**
 * We create a client even if env vars are missing so the app can still render.
 * But you should block calls that require Supabase when `hasSupabaseEnv === false`.
 */
export const supabase: SupabaseClient = createClient(
  supabaseUrl ?? "http://localhost",  // safe placeholder to prevent runtime crashes
  supabaseAnonKey ?? "missing-anon-key"
);

export type Document = {
  id: string;
  user_id: string | null;
  title: string;
  content: string;
  source_type: string;
  created_at: string;
  updated_at: string;
};

export type NarrativeSegment = {
  id: string;
  document_id: string;
  segment_index: number;
  text_content: string;
  emotion_tone: string;
  intensity: number;
  motion_type: string;
  created_at: string;
};

export type ReadingSession = {
  id: string;
  document_id: string;
  current_segment: number;
  started_at: string;
  last_active_at: string;
};
