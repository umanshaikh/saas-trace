import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const rawAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const isBrokenPublishableKey = !rawAnonKey || rawAnonKey.startsWith('sb_publishable_');

const supabaseUrl = isBrokenPublishableKey
  ? 'https://chpxdjqvrpjbsfoffcur.supabase.co'
  : (rawUrl || 'https://chpxdjqvrpjbsfoffcur.supabase.co');

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNocHhkanF2cnBqYnNmb2ZmY3VyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjM4ODc3NCwiZXhwIjoyMTA3OTY0Nzc0fQ.RopBjy-LkfJLsjmRhsWTiQC1-Jv82wnNfn0pRu9xqKU';

// Server-side only client with elevated privileges for admin APIs, webhooks, and background jobs
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
