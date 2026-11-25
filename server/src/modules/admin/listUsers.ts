import { supabaseAdmin } from '../../Shared/database/banco.js'

export type AdminUsersListParams = {
  page: number
  limit: number
  search?: string
  type?: 'PESSOA_FISICA' | 'EMPRESA'
}

export type AdminUserRecord = {
  id: string
  name: string
  email: string
  accountType: 'PESSOA_FISICA' | 'EMPRESA'
  tipo_perfil: string | null
  avatarUrl: string | null
  cnpj: string | null
  status: string | null
  createdAt: string
  membersCount?: number
}

export type AdminCompanyMemberRecord = {
  id: string
  vinculoId: string
  name: string
  email: string
  avatarUrl: string | null
  status: string
  linkedAt: string
}

type AdminUsersResponse =
  | {
      ok: true
      data: AdminUserRecord[]
      pagination: {
        page: number
        limit: number
        total: number
        totalPages: number
      }
    }
  | {
      ok: false
      code: string
      message: string
    }

type AdminCompanyMembersResponse =
  | {
      ok: true
      data: AdminCompanyMemberRecord[]
    }
  | {
      ok: false
      code: string
      message: string
    }

function sanitizePostgrestSearch(raw: string): string {
  return raw.replace(/[,()\\]/g, ' ').trim()
}

export async function isAdminUser(userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('perfis')
    .select('tipo_perfil')
    .eq('id', userId)
    .maybeSingle()

  if (error || !data) {
    return false
  }

  return data.tipo_perfil === 'ADMIN'
}

export async function listAdminUsers(
  params: AdminUsersListParams,
): Promise<AdminUsersResponse> {
  const page = Math.max(1, params.page)
  const limit = Math.min(50, Math.max(1, params.limit))
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabaseAdmin
    .from('perfis')
    .select(
      'id, nome_ou_razao, email, tipo_perfil, cnpj, foto_url, status, created_at',
      { count: 'exact' },
    )

  if (params.type === 'EMPRESA') {
    query = query.in('tipo_perfil', ['EMPRESA', 'PESSOA_JURIDICA'])
  } else if (params.type === 'PESSOA_FISICA') {
    query = query.in('tipo_perfil', ['PESSOA_FISICA', 'ADMIN', 'AUXILIAR'])
  }

  if (params.search) {
    const clean = sanitizePostgrestSearch(params.search)
    if (clean.length > 0) {
      query = query.or(
        `nome_ou_razao.ilike.%${clean}%,email.ilike.%${clean}%,cnpj.ilike.%${clean}%`,
      )
    }
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    console.error('Erro ao listar usuários admin:', error)
    return {
      ok: false,
      code: 'ADMIN_LIST_USERS_FAILED',
      message: 'Não foi possível consultar os usuários cadastrados.',
    }
  }

  const rows = data ?? []
  const companyIds = rows
    .filter(
      (row) =>
        row.tipo_perfil === 'EMPRESA' ||
        row.tipo_perfil === 'PESSOA_JURIDICA' ||
        Boolean(row.cnpj),
    )
    .map((row) => row.id)

  const memberIdsByCompany = new Map<string, Set<string>>()

  if (companyIds.length > 0) {
    const { data: links, error: linksError } = await supabaseAdmin
      .from('membros_empresa')
      .select('id, empresa_id, funcionario_id')
      .in('empresa_id', companyIds)

    if (!linksError && links) {
      for (const link of links) {
        if (!link.empresa_id) continue
        const set = memberIdsByCompany.get(link.empresa_id) ?? new Set<string>()
        set.add(link.funcionario_id ?? String(link.id))
        memberIdsByCompany.set(link.empresa_id, set)
      }
    }
  }

  const users: AdminUserRecord[] = rows.map((row) => {
    const isCompany =
      row.tipo_perfil === 'EMPRESA' ||
      row.tipo_perfil === 'PESSOA_JURIDICA' ||
      Boolean(row.cnpj)

    return {
      id: row.id,
      name: row.nome_ou_razao ?? 'Usuário sem nome',
      email: row.email ?? 'E-mail não informado',
      accountType: isCompany ? 'EMPRESA' : 'PESSOA_FISICA',
      tipo_perfil: row.tipo_perfil,
      avatarUrl: row.foto_url ?? null,
      cnpj: row.cnpj ?? null,
      status: row.status ?? null,
      createdAt: row.created_at,
      membersCount: isCompany ? (memberIdsByCompany.get(row.id)?.size ?? 0) : undefined,
    }
  })

  const total = count ?? users.length
  const totalPages = Math.max(1, Math.ceil(total / limit))

  return {
    ok: true,
    data: users,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  }
}

export async function listAdminCompanyMembers(
  companyId: string,
): Promise<AdminCompanyMembersResponse> {
  const { data, error } = await supabaseAdmin
    .from('membros_empresa')
    .select(
      'id, created_at, funcionario_id, perfis!membros_empresa_usuario_id_fkey (id, nome_ou_razao, email, status, foto_url)',
    )
    .eq('empresa_id', companyId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Erro ao listar membros da empresa (admin):', error)
    return {
      ok: false,
      code: 'ADMIN_LIST_MEMBERS_FAILED',
      message: 'Não foi possível consultar os membros desta empresa.',
    }
  }

  const members: AdminCompanyMemberRecord[] = []
  const seenMemberIds = new Set<string>()

  for (const row of data ?? []) {
    const perfil = Array.isArray(row.perfis) ? row.perfis[0] : row.perfis
    const memberId = perfil?.id ?? row.funcionario_id
    if (!memberId || seenMemberIds.has(memberId)) continue
    seenMemberIds.add(memberId)

    members.push({
      id: memberId,
      vinculoId: String(row.id),
      name: perfil?.nome_ou_razao ?? 'Membro sem identificação',
      email: perfil?.email ?? 'E-mail não informado',
      avatarUrl: perfil?.foto_url ?? null,
      status: perfil?.status ?? 'ATIVO',
      linkedAt: row.created_at,
    })
  }

  return { ok: true, data: members }
}
