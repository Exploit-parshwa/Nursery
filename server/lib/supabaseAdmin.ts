import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_KEY || '';

let client: SupabaseClient | null = null;

if (supabaseUrl && serviceKey) {
  client = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
} else {
  console.warn('Supabase admin credentials not set. Set SUPABASE_URL and SUPABASE_SERVICE_KEY to enable server-side persistence.');
}

export const supabaseAdmin = client;
