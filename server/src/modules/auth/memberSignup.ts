import { supabaseAdmin } from '../../Shared/database/banco.js'

type MemberStats = 'PENDENTE' | 'ATIVO' | 'INATIVO' | 'EXCLUIDO'

type MemberSignUpResponse = {
  ok: boolean
  message: string
  memberId?: {
    id: string
    name: string
    email: string
    status: MemberStats
  }
}

export async function MemberSignUp(
  email: string,
  nome: string,
  company_id: string,
): Promise<MemberSignUpResponse> {
  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.FRONTEND_URL}/reset-password`,
    data: {
      nome_ou_razao: nome,
      company_id: company_id,
    },
  })

  if (error) {
    return { ok: false, message: error.message }
  }

  return {
    ok: true,
    message: 'Membro cadastrado com sucesso.',
    memberId: {
      id: data.user.id,
      name: nome,
      email: data.user.email ?? email,
      status: 'PENDENTE' as const,
    },
  }
}
