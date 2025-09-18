import { createClient } from '@supabase/supabase-js';

// Supabase configuration - these will be populated when you connect your Supabase project
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

// For development, we'll create a client even without real credentials
// The actual connection will be established when you configure your Supabase project

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});