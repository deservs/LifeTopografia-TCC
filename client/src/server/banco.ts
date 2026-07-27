import { createClient } from '@supabase/supabase-js'
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_SECRET_KEY

// Cliente padrão do Supabase usando o SDK oficial para Node
export const supabaseAdmin = createClient(
  supabaseUrl,
  import.meta.env.VITE_SUPABASE_SECRET_KEY || supabaseKey,
)

// Helper para criar um cliente com a sessão/JWT do usuário que fez a requisição HTTP
export function createAuthenticatedSupabaseClient(token: string) {
  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        Authorization: token, // Repassa o 'Bearer <token>' enviado pelo cliente
      },
    },
    auth: {
      persistSession: true, // Não persiste a sessão no servidor
    },
  })
}