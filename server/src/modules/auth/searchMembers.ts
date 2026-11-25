import { supabaseAdmin } from '../../Shared/database/banco.js'

export type MemberItem = {
  id: string
  created_at: string
  vinculo_id: string
  nome_ou_razao: string
  email: string
  status: string
  foto_url: string | null
}

type MemberSearchResponse =
  | {
      ok: true
      data: MemberItem[]
    }
  | {
      ok: false
      code: string
      message: string
    }

export async function SearchMemberData(
  empresaId: string,
): Promise<MemberSearchResponse> {
  const { data, error } = await supabaseAdmin
    .from('membros_empresa')
    .select(
      'id, created_at, perfis!membros_empresa_usuario_id_fkey!inner (id, nome_ou_razao, email, status, foto_url)',
    )
    .eq('empresa_id', empresaId)
    .neq('perfis.status', 'EXCLUIDO')

  if (error) {
    console.error('Erro ao buscar dados do membro:', error)
    return {
      ok: false,
      code: 'MEMBERS_FETCH_FAILED',
      message: error.message,
    }
  }

  if (!data || data.length === 0) {
    return { ok: true, data: [] }
  }

  const members: MemberItem[] = []
  const seenMemberIds = new Set<string>()
  for (const row of data) {
    const perfil = Array.isArray(row.perfis) ? row.perfis[0] : row.perfis
    if (!perfil || seenMemberIds.has(perfil.id)) continue
    seenMemberIds.add(perfil.id)
    members.push({
      id: perfil.id,
      created_at: row.created_at,
      vinculo_id: String(row.id),
      nome_ou_razao: perfil.nome_ou_razao ?? '',
      email: perfil.email ?? '',
      status: perfil.status ?? 'ATIVO',
      foto_url: perfil.foto_url ?? null,
    })
  }

  return { ok: true, data: members }
}
