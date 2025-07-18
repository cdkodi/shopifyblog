import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Database } from './types/database'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
}

if (!supabaseAnonKey) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

export const supabase = createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Server-side client for API routes - bypasses RLS when needed
export function createServerClient() {
  return createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    },
    global: {
      headers: {
        'x-server-side': 'true'
      }
    }
  });
}

// Export createClient function for server-side usage (backward compatibility)
export function createClient() {
  return supabase;
}

// Type helpers for better TypeScript support
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]

// Specific table types for our application
export type Topic = Tables<'topics'>
export type Article = Tables<'articles'>
export type ContentTemplate = Tables<'content_templates'>
export type WorkflowLog = Tables<'workflow_logs'>
export type AppConfig = Tables<'app_config'> 