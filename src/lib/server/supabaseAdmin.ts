import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let client: SupabaseClient | null = null;

export function hasServerSupabase(): boolean {
  return Boolean(url && serviceKey);
}

export function getSupabaseAdmin(): SupabaseClient {
  if (!url || !serviceKey) {
    throw new Error('Server Supabase credentials are not configured.');
  }
  if (!client) {
    client = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
