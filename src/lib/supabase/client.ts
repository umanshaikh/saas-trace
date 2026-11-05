import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const rawAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// If the key is the broken/unregistered publishable key or empty, fallback to the verified working Supabase credentials
const isBrokenPublishableKey = !rawAnonKey || rawAnonKey.startsWith('sb_publishable_');

const supabaseUrl = isBrokenPublishableKey
  ? 'https://chpxdjqvrpjbsfoffcur.supabase.co'
  : (rawUrl || 'https://chpxdjqvrpjbsfoffcur.supabase.co');

const supabaseAnonKey = isBrokenPublishableKey
  ? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNocHhkanF2cnBqYnNmb2ZmY3VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzODg3NzQsImV4cCI6MjEwNzk2NDc3NH0.3cvqM7dX-a3Am946-U8qIg1BFeFymjugqI7K28eFH2E'
  : rawAnonKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
