import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hdoospbknnqelddgzeky.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_gKFOegFDsLtuYoxOYlULcQ_KZ38U4ZH';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
