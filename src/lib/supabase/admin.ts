import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const rawKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseUrl = rawUrl || 'https://hdoospbknnqelddgzeky.supabase.co';
const supabaseKey = rawKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhkb29zcGJrbm5xZWxkZGd6ZWt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM4MDkxNzEsImV4cCI6MjEwOTM4NTE3MX0.BKsg-uDGcHoinhbKcg-Y10oNeQrxDKWUle96sThkOns';

// Server-side client with privileges for admin APIs, webhooks, and background jobs
export const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
