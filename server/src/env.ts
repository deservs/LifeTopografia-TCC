import 'dotenv/config' // Carrega as variáveis do arquivo .env automaticamente
import { z } from 'zod'

// 1. Define o formato esperado para as variáveis de ambiente
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3001), // Coerce converte string para number
  DATABASE_URL: z.string().url('A DATABASE_URL precisa ser uma URL válida'),
  JWT_SECRET: z.string().min(1, 'O JWT_SECRET é obrigatório'),
})

const envSchemaWithSupabase = envSchema.extend({
  SUPABASE_URL: z.string().url('A SUPABASE_URL precisa ser uma URL válida'),
  SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .min(1, 'A SUPABASE_PUBLISHABLE_KEY é obrigatória'),
  SUPABASE_SECRET_KEY: z.string().min(1, 'A SUPABASE_SECRET_KEY é obrigatória'),
  SUPABASE_JWKS_URL: z.string().url('A SUPABASE_JWKS_URL precisa ser uma URL válida'),
})

// 2. Executa a validação
const _env = envSchemaWithSupabase.safeParse(process.env)

// 3. Se a validação falhar, lança um erro claro no console e para a aplicação
if (_env.success === false) {
  console.error('❌ Variáveis de ambiente inválidas ou ausentes:')
  console.error(JSON.stringify(_env.error.format(), null, 2))

  throw new Error('Variáveis de ambiente inválidas.')
}

// 4. Exporta os dados já validados e tipados
export const env = _env.data
