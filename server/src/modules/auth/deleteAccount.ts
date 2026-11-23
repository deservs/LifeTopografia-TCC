import { supabaseAdmin } from '../../Shared/database/banco.js'
import { env } from '../../config/env.js'
import { createClient } from '@supabase/supabase-js'

export async function DeleteAccount(
  userId: string,
): Promise<'invalid_password' | 'forbidden' | 'blocked' | 'deleted'> {
  const { data: userData, error: userError } = await supabaseAdmin
    .from('perfis')
    .update({ status: 'EXCLUIDO' })
    .eq('id', userId)
    .select('id')
    .single()

  if (userError || !userData) {
    console.error('Erro ao atualizar status do usuário:', userError)
    return 'forbidden'
  }
  const { error: singoutError } = await supabaseAdmin.auth.admin.signOut(
    userId,
    'global',
  )
  if (singoutError) {
    console.error('Erro ao desconectar usuário:', singoutError)
    return 'forbidden'
  }
  const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    ban_duration: '876000h',
  })
  if (banError) {
    console.error('Erro ao banir usuário:', banError)
    return 'forbidden'
  }
  return 'deleted'
}

export async function CheckPassword(
  email: string,
  password: string,
): Promise<'invalid_password' | 'valid'> {
  const authCheckClient = createClient(
    env.VITE_SUPABASE_URL!,
    env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  )
  const { error } = await authCheckClient.auth.signInWithPassword({
    email,
    password,
  })

  return error ? 'invalid_password' : 'valid'
}
