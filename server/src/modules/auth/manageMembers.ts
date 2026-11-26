import { supabaseAdmin } from '../../Shared/database/banco.js'

type ManageMemberResult<T> =
  | { ok: true; data: T }
  | { ok: false; httpStatus: number; code: string; message: string }

async function verifyCompanyMembership(
  companyId: string,
  memberId: string,
): Promise<{ ok: true } | { ok: false; httpStatus: number; code: string; message: string }> {
  const { data, error } = await supabaseAdmin
    .from('membros_empresa')
    .select('id')
    .eq('empresa_id', companyId)
    .eq('funcionario_id', memberId)
    .limit(1)
    .maybeSingle()

  if (error) {
    return {
      ok: false,
      httpStatus: 500,
      code: 'MEMBERSHIP_CHECK_FAILED',
      message: 'Erro ao verificar vínculo do membro.',
    }
  }

  if (!data) {
    return {
      ok: false,
      httpStatus: 403,
      code: 'FORBIDDEN',
      message: 'Membro não pertence à sua empresa.',
    }
  }

  return { ok: true }
}

export async function updateMemberStatus(
  companyId: string,
  memberId: string,
  status: 'ATIVO' | 'AFASTADO',
): Promise<ManageMemberResult<{ id: string; status: 'ATIVO' | 'AFASTADO' }>> {
  const check = await verifyCompanyMembership(companyId, memberId)
  if (!check.ok) {
    return check
  }

  const { data: currentProfile, error: fetchError } = await supabaseAdmin
    .from('perfis')
    .select('id, status')
    .eq('id', memberId)
    .neq('status', 'EXCLUIDO')
    .maybeSingle()

  if (fetchError) {
    return {
      ok: false,
      httpStatus: 500,
      code: 'MEMBER_STATUS_UPDATE_FAILED',
      message: 'Não foi possível consultar o status atual do membro.',
    }
  }

  if (!currentProfile) {
    return {
      ok: false,
      httpStatus: 404,
      code: 'NOT_FOUND',
      message: 'Membro não encontrado.',
    }
  }

  if (currentProfile.status === 'PENDENTE') {
    return {
      ok: false,
      httpStatus: 400,
      code: 'MEMBER_PENDING',
      message: 'Este membro ainda está pendente de confirmação do convite.',
    }
  }

  const { data, error } = await supabaseAdmin
    .from('perfis')
    .update({ status })
    .eq('id', memberId)
    .neq('status', 'EXCLUIDO')
    .select('id, status')
    .maybeSingle()

  if (error || !data) {
    return {
      ok: false,
      httpStatus: 500,
      code: 'MEMBER_STATUS_UPDATE_FAILED',
      message: 'Não foi possível atualizar o status do membro.',
    }
  }

  return {
    ok: true,
    data: {
      id: data.id,
      status: data.status as 'ATIVO' | 'AFASTADO',
    },
  }
}

export async function removeCompanyMember(
  companyId: string,
  memberId: string,
): Promise<ManageMemberResult<{ id: string; removed: boolean }>> {
  const check = await verifyCompanyMembership(companyId, memberId)
  if (!check.ok) {
    return check
  }

  const { error } = await supabaseAdmin
    .from('MEMBRO_EMPRESA')
    .delete()
    .eq('empresa_id', companyId)
    .eq('funcionario_id', memberId)

  if (error) {
    return {
      ok: false,
      httpStatus: 500,
      code: 'MEMBER_REMOVE_FAILED',
      message: 'Não foi possível remover o membro da empresa.',
    }
  }

  return {
    ok: true,
    data: {
      id: memberId,
      removed: true,
    },
  }
}
