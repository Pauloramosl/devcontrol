import { config } from 'dotenv'

config({ path: '.env' })
config({ path: '.env.local', override: true })

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3001),
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  supabaseUrl: process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  whatsappProvider: process.env.WHATSAPP_PROVIDER ?? 'baileys',
  baileysAuthDir: process.env.BAILEYS_AUTH_DIR ?? './storage/baileys-auth',
  baileysLogLevel: process.env.BAILEYS_LOG_LEVEL ?? 'warn',
  logLevel: process.env.LOG_LEVEL ?? 'info',
}

export function assertBackendEnv() {
  const missing = []

  if (!env.supabaseUrl) missing.push('SUPABASE_URL or VITE_SUPABASE_URL')
  if (!env.supabaseAnonKey) missing.push('SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY')
  if (!env.supabaseServiceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY')

  if (missing.length) {
    throw new Error(`Missing backend env vars: ${missing.join(', ')}`)
  }
}
