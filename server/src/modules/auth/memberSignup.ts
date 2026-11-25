import { env } from '../../config/env.js'
import { supabaseAdmin } from '../../Shared/database/banco.js'

type MemberSignUpResponse =
  | {
      ok: true
      data: {
        id: string
        name: string
        email: string
        status: 'ATIVO'
      }
    }
  | {
      ok: false
      code: string
      message: string
    }

export async function MemberSignUp(
  email: string,
  nome: string,
  company_id: string,
): Promise<MemberSignUpResponse> {
  const redirectUrl = `${env.FRONTEND_URL.replace(/\/$/, '')}/login`

  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo: redirectUrl,
    data: {
      nome_ou_razao: nome,
      company_id: company_id,
    },
  })

  if (error || !data.user) {
    return {
      ok: false,
      code: 'MEMBER_INVITE_FAILED',
      message: error?.message ?? 'Não foi possível convidar o membro.',
    }
  }

  const { error: linkError } = await supabaseAdmin
    .from('membros_empresa')
    .insert({
      empresa_id: company_id,
      funcionario_id: data.user.id,
    })

  if (linkError) {
    console.error('Erro ao vincular membro na tabela membros_empresa:', linkError)
    return {
      ok: false,
      code: 'MEMBER_LINK_FAILED',
      message: 'Usuário convidado, mas não foi possível vincular à empresa.',
    }
  }

  return {
    ok: true,
    data: {
      id: data.user.id,
      name: nome,
      email: data.user.email ?? email,
      status: 'ATIVO',
    },
  }
}
