import { createClient } from '@supabase/supabase-js'
import { serverEnv } from '../config/env'

// Cliente padrão do Supabase usando o SDK oficial para Node
export const supabaseAdmin = createClient(
  serverEnv.SUPABASE_URL,
  serverEnv.SUPABASE_SECRET_KEY,
)

// Helper para criar um cliente com a sessão/JWT do usuário que fez a requisição HTTP
export function createAuthenticatedSupabaseClient(token: string) {
  return createClient(serverEnv.SUPABASE_URL, serverEnv.SUPABASE_PUBLISHABLE_KEY, {
    global: {
      headers: {
        Authorization: token, // Repassa o 'Bearer <token>' enviado pelo cliente
      },
    },
    auth: {
      persistSession: false, // Não persiste a sessão no servidor
    },
  })
}
