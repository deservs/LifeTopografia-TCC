import { supabaseAdmin } from "../../Shared/database/banco.js";

type MemberItem = {
  id: string;
  created_at: string;
  vinculo_id: string;
  nome_ou_razao: string;
  email: string;
  status: string;
  foto_url: string;
};

type MemberSearchResponse = {
  ok: boolean;
  message?: string;
  data?: MemberItem[];
};

export async function SearchMemberData(
  empresaId: string,
): Promise<MemberSearchResponse> {
  const { data, error } = await supabaseAdmin
    .from("membros_empresa")
    .select(
      `id, created_at, perfis!membros_empresa_usuario_id_fkey (id, nome_ou_razao, email, status, foto_url)`,
    )
    .eq("empresa_id", empresaId)
    .neq("perfis.status", "EXCLUIDO");

  if (error) {
    console.error("Erro ao buscar dados do membro:", error);
    return { ok: false, message: error.message };
  }

  if (data.length === 0) {
    console.warn("Membro não encontrado.");
    return { ok: false, message: "Membro não encontrado." };
  }

  const members: MemberItem[] = (data ?? []).map((row) => {
    const perfil = Array.isArray(row.perfis) ? row.perfis[0] : row.perfis;
    return {
      id: perfil.id,
      created_at: row.created_at,
      vinculo_id: row.id,
      nome_ou_razao: perfil.nome_ou_razao,
      email: perfil.email,
      status: perfil.status,
      foto_url: perfil.foto_url,
    };
  });
  return { ok: true, data: members };
}
