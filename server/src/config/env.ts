import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config()

const envSchema = z.object({
  SUPABASE_URL: z.string().url('Supabase URL inválida'),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1, 'Chave publicável do Supabase inválida'),
  SUPABASE_SECRET_KEY: z.string().min(1, 'Chave secreta do Supabase inválida'),
  SUPABASE_JWKS_URL: z.string().url('URL do JWKS do Supabase inválida'),
})
export const serverEnv = envSchema.parse(process.env)
