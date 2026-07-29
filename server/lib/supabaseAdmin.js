import { createClient } from '@supabase/supabase-js'
import { assertBackendEnv, env } from '../config/env.js'

assertBackendEnv()

const authOptions = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
}

export const supabaseAdmin = createClient(
  env.supabaseUrl,
  env.supabaseServiceRoleKey,
  authOptions,
)

export const supabaseAuth = createClient(
  env.supabaseUrl,
  env.supabaseAnonKey,
  authOptions,
)
