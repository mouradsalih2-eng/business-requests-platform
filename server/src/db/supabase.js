import { createClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';

if (!config.supabase.url || !config.supabase.serviceKey) {
  console.error('FATAL: SUPABASE_URL and SUPABASE_SERVICE_KEY are required.');
  console.error('Set these environment variables before starting the server.');
  process.exit(1);
}

// Service role client — bypasses RLS, used for all DB operations and auth admin
export const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceKey,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  }
);

// Anon client — for user-level auth operations (e.g., password verification via signIn)
export const supabaseAnon = config.supabase.anonKey
  ? createClient(config.supabase.url, config.supabase.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;
