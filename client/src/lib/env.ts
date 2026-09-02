import {z} from 'zod';

export const envSchema = z.object({
  VITE_SUPABASE_URL: z.string({ message: 'URL do Supabase é obrigatória' }).url('URL do Supabase inválida'),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string({ message: 'Chave publicável do Supabase é obrigatória' }),
});

const _env = envSchema.safeParse(import.meta.env);

if (!_env.success) {
  console.error('Variáveis de ambiente inválidas:', _env.error.format());
  throw new Error('Variáveis de ambiente inválidas. Verifique o console para mais detalhes.');
}

export const env = _env.data;