import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hdoospbknnqelddgzeky.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNocHhkanF2cnBqYnNmb2ZmY3VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzODg3NzQsImV4cCI6MjEwNzk2NDc3NH0.3cvqM7dX-a3Am946-U8qIg1BFeFymjugqI7K28eFH2E';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
