import 'dotenv/config' // Carrega as variáveis do arquivo .env automaticamente
import { z } from 'zod'

//Define o formato esperado para as variáveis de ambiente
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3001), // Coerce converte string para number
  DATABASE_URL: z.string().url('A DATABASE_URL precisa ser uma URL válida').optional(),
  JWT_SECRET: z.string().min(1, 'O JWT_SECRET é obrigatório').optional(),
  RESEND_API_KEY: z.string().min(1, 'O RESEND_API_KEY é obrigatório').optional(),
  MERCADO_PAGO_ACCESS_TOKEN: z
    .string()
    .min(1, 'O MERCADO_PAGO_ACCESS_TOKEN é obrigatório')
    .optional(),
  MERCADO_PAGO_PUBLIC_KEY: z
    .string()
    .min(1, 'O MERCADO_PAGO_PUBLIC_KEY é obrigatório')
    .optional(),
})

const envSchemaWithSupabase = envSchema.extend({
  VITE_SUPABASE_URL: z.string().url('A SUPABASE_URL precisa ser uma URL válida'),
  VITE_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .min(1, 'A SUPABASE_PUBLISHABLE_KEY é obrigatória'),
  SUPABASE_SECRET_KEY: z.string().min(1, 'A SUPABASE_SECRET_KEY é obrigatória'),
})

const envSchemaWithR2 = envSchemaWithSupabase.extend({
  AWS_S3_ENDPOINT: z.string().url('O AWS_S3_ENDPOINT precisa ser uma URL válida'),
  AWS_ACCESS_KEY_ID: z.string().min(1, 'O AWS_ACCESS_KEY_ID é obrigatório'),
  AWS_SECRET_ACCESS_KEY: z.string().min(1, 'O AWS_SECRET_ACCESS_KEY é obrigatório'),
  AWS_S3_BUCKET_NAME: z.string().min(1, 'O AWS_S3_BUCKET_NAME é obrigatório'),
  AWS_REGION: z.string().default('auto'),
})

//Executa a validação
const _env = envSchemaWithR2.safeParse(process.env)

//Se a validação falhar, lança um erro claro no console e para a aplicação
if (_env.success === false) {
  console.error('Variáveis de ambiente inválidas ou ausentes:')
  console.error(JSON.stringify(_env.error.format(), null, 2))

  throw new Error('Variáveis de ambiente inválidas.')
}

//Exporta os dados já validados e tipados
export const env = _env.data
