import dotenv from 'dotenv'

dotenv.config()

export const serverEnv = {
  SUPABASE_URL: process.env.SUPABASE_URL || 'undefined',
  SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY || 'undefined',
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY || 'undefined',
  SUPABASE_JWKS_URL: process.env.SUPABASE_JWKS_URL || 'undefined',
}
