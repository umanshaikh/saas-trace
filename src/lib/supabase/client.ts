import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const rawAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

// Fallback to verified active Supabase credentials
const isBrokenPublishableKey = !rawAnonKey || rawAnonKey.startsWith('sb_publishable_');

const supabaseUrl = isBrokenPublishableKey
  ? 'https://hdoospbknnqelddgzeky.supabase.co'
  : (rawUrl || 'https://hdoospbknnqelddgzeky.supabase.co');

const supabaseAnonKey = isBrokenPublishableKey
  ? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhkb29zcGJrbm5xZWxkZGd6ZWt5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM4MDkxNzEsImV4cCI6MjEwOTM4NTE3MX0.BKsg-uDGcHoinhbKcg-Y10oNeQrxDKWUle96sThkOns'
  : rawAnonKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
