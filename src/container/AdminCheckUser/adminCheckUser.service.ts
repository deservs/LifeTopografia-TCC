import { supabase } from "../../lib/supabase/supabaseClient";
import { getAvatarPublicUrl } from "../../utils/users/urlConversor";
import type {
  AccountKind,
  AdminApiErrorKind,
  AdminCompanyMember,
  AdminUserItem,
  AdminUsersPagination,
  FetchAdminUsersParams,
  FetchAdminUsersResult,
  FetchCompanyMembersResult,
  MemberBondStatus,
} from "./adminCheckUser.types";

/**
 * ============================================================================
 * GUIA DE INTEGRAÇÃO PARA O BACKEND (NÃO IMPLEMENTADO NESTE REPOSITÓRIO AINDA)
 * ============================================================================
 *
 * TODO [BACKEND] - 1. Registrar rota em `server/src/app.ts`:
 *   - Criar módulo dedicado em `server/src/modules/admin/listUsers.ts`.
 *   - Registrar `app.get("/api/admin/users", { preHandler: [getUserFromRequest] }, ...)`
 *     usando o middleware `getUserFromRequest` (`server/src/Shared/middleware/getUser.ts`).
 *
 * TODO [BACKEND] - 2. Autorização estrita no servidor:
 *   - Consultar `public.perfis` pelo `request.user.id` usando `supabaseAdmin`
 *     (`server/src/Shared/database/banco.ts`) e verificar `tipo_perfil === 'ADMIN'`.
 *   - Importante: a policy RLS atual em `public.perfis` restringe leitura a
 *     `id = auth.uid()`, portanto a consulta administrativa deve usar `supabaseAdmin`.
 *   - Retornar HTTP 403 (`{ ok: false, message: "..." }`) caso não seja ADMIN.
 *
 * TODO [BACKEND] - 3. Dados, paginação, Cloudflare R2 e membros (PJ):
 *   - Paginar via `page` e `limit` (ex.: `.range(from, to)` com `{ count: 'exact' }`),
 *     suportando filtros opcionais `search` (nome/email/cnpj) e `type` (`PESSOA_FISICA` | `EMPRESA`).
 *   - Se as imagens do Cloudflare R2 forem privadas ou precisarem de URL pública/assinada,
 *     resolver no backend ou retornar a chave `foto_url` (o frontend também usa `getAvatarPublicUrl`).
 *   - Para contas com CNPJ / `EMPRESA`: retornar `members` diretamente em cada item
 *     (ou implementar a sub-rota `GET /api/admin/users/:companyId/members`).
 *   - Diferente de `server/src/modules/auth/searchMembers.ts` (que filtra
 *     `.neq('perfis.status', 'EXCLUIDO')`), a auditoria admin DEVE incluir vínculos
 *     ativos (`ATIVO`) e removidos (`EXCLUIDO` / `REMOVIDO` / `INATIVO`).
 *
 * TODO [AMBIENTE DEV] - Proxy do Vite (`vite.config.ts`):
 *   - Em produção (`vercel.json`), `/api/(.*)` já aponta para o Fastify.
 *   - Em desenvolvimento local (`npm run dev`), configure `server.proxy['/api']`
 *     apontando para `http://localhost:3001` no `vite.config.ts`.
 */

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(
  record: UnknownRecord,
  keys: readonly string[],
): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length > 0) return trimmed;
    } else if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return undefined;
}

function readNumber(
  record: UnknownRecord,
  keys: readonly string[],
): number | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

export function formatCnpj(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const clean = trimmed.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (clean.length === 14) {
    return clean.replace(
      /^([A-Z0-9]{2})([A-Z0-9]{3})([A-Z0-9]{3})([A-Z0-9]{4})([A-Z0-9]{2})$/,
      "$1.$2.$3/$4-$5",
    );
  }
  return trimmed;
}

function normalizeToken(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function normalizeAccountType(
  rawRole: unknown,
  cnpj?: string | null,
): AccountKind {
  if (cnpj && cnpj.trim().length > 0) {
    return "EMPRESA";
  }

  const normalized = normalizeToken(rawRole);
  if (
    normalized === "empresa" ||
    normalized === "pj" ||
    normalized === "pessoa juridica" ||
    normalized === "pessoa_juridica" ||
    normalized === "pessoa-juridica"
  ) {
    return "EMPRESA";
  }

  return "PESSOA_FISICA";
}

export function normalizeMemberBondStatus(rawStatus: unknown): {
  bondStatus: MemberBondStatus;
  rawStatus: string;
} {
  const token = normalizeToken(rawStatus).toUpperCase();
  const isRemoved =
    token === "EXCLUIDO" ||
    token === "REMOVIDO" ||
    token === "INATIVO" ||
    token === "DESVINCULADO" ||
    token === "CANCELADO";

  return {
    bondStatus: isRemoved ? "REMOVIDO" : "ATIVO",
    rawStatus: token || "ATIVO",
  };
}

function normalizeMemberRecord(raw: unknown): AdminCompanyMember | null {
  if (!isRecord(raw)) return null;

  const id = readString(raw, ["id", "funcionario_id", "userId", "vinculoId"]);
  if (!id) return null;

  const name =
    readString(raw, ["name", "nome_ou_razao", "nome"]) ??
    "Membro sem identificação";
  const email = readString(raw, ["email"]) ?? "E-mail não informado";
  const avatarPath = readString(raw, ["avatarUrl", "foto_url", "avatar_url"]);
  const { bondStatus, rawStatus } = normalizeMemberBondStatus(
    raw.bondStatus ?? raw.vinculoStatus ?? raw.status,
  );

  return {
    id,
    vinculoId: readString(raw, ["vinculoId", "vinculo_id"]),
    name,
    email,
    avatarUrl: getAvatarPublicUrl(avatarPath),
    bondStatus,
    rawStatus,
    linkedAt: readString(raw, ["linkedAt", "created_at", "createdAt"]),
  };
}

function normalizeMembersList(rawMembers: unknown): AdminCompanyMember[] {
  if (!Array.isArray(rawMembers)) return [];
  return rawMembers
    .map(normalizeMemberRecord)
    .filter((item): item is AdminCompanyMember => item !== null);
}

function normalizeUserRecord(raw: unknown): AdminUserItem | null {
  if (!isRecord(raw)) return null;

  const id = readString(raw, ["id", "userId"]);
  if (!id) return null;

  const rawCnpj = readString(raw, ["cnpj"]);
  const formattedCnpj = formatCnpj(rawCnpj) ?? undefined;
  const rawRole = raw.accountType ?? raw.tipo_perfil ?? raw.role;
  const roleToken = normalizeToken(rawRole);
  const accountType = normalizeAccountType(rawRole, formattedCnpj);

  const rawMembersSource = raw.members ?? raw.membros;
  const hasEmbeddedMembers = Array.isArray(rawMembersSource);
  const members = hasEmbeddedMembers
    ? normalizeMembersList(rawMembersSource)
    : undefined;

  const membersCount =
    readNumber(raw, ["membersCount", "totalMembers", "total_membros"]) ??
    members?.length;

  const avatarPath = readString(raw, ["avatarUrl", "foto_url", "avatar_url"]);

  return {
    id,
    name:
      readString(raw, ["name", "nome_ou_razao", "nome"]) ??
      "Usuário sem nome",
    email: readString(raw, ["email"]) ?? "E-mail não informado",
    accountType,
    isAdminAccount: roleToken === "admin" || roleToken === "administrador",
    avatarUrl: getAvatarPublicUrl(avatarPath),
    cnpj: formattedCnpj,
    status: readString(raw, ["status"]),
    createdAt: readString(raw, ["createdAt", "created_at"]),
    members,
    membersCount,
  };
}

async function getAccessToken(): Promise<string | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    return null;
  }
  return data.session.access_token;
}

async function parseSafeJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function mapHttpError(
  status: number,
  payload: unknown,
  fallbackMessage: string,
): { errorKind: AdminApiErrorKind; status: number; message: string } {
  const serverMessage = isRecord(payload)
    ? readString(payload, ["message", "error"])
    : undefined;

  if (status === 401) {
    return {
      errorKind: "unauthenticated",
      status,
      message:
        serverMessage ??
        "Sua sessão expirou ou é inválida. Faça login novamente para acessar o painel.",
    };
  }

  if (status === 403) {
    return {
      errorKind: "forbidden",
      status,
      message:
        serverMessage ??
        "Acesso negado. Apenas contas com permissão de administrador podem visualizar os usuários.",
    };
  }

  if (status === 404) {
    return {
      errorKind: "endpoint_unavailable",
      status,
      message:
        "A rota administrativa do servidor ainda não foi implementada ou não está acessível.",
    };
  }

  return {
    errorKind: "server_error",
    status,
    message: serverMessage ?? fallbackMessage,
  };
}

export async function fetchAdminUsers(
  params: FetchAdminUsersParams,
): Promise<FetchAdminUsersResult> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return {
      ok: false,
      errorKind: "unauthenticated",
      status: 401,
      message:
        "Você precisa estar autenticado com uma conta administrativa para acessar esta tela.",
    };
  }

  const query = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
  });

  const trimmedSearch = params.search?.trim();
  if (trimmedSearch) {
    query.set("search", trimmedSearch);
  }
  if (params.accountType && params.accountType !== "ALL") {
    query.set("type", params.accountType);
  }

  try {
    // TODO [BACKEND]: Implementar GET /api/admin/users no servidor Fastify (`server/src/app.ts`).
    const response = await fetch(`/api/admin/users?${query.toString()}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      signal: params.signal,
    });

    const payload = await parseSafeJson(response);

    if (!response.ok) {
      return {
        ok: false,
        ...mapHttpError(
          response.status,
          payload,
          "Não foi possível carregar a lista de usuários.",
        ),
      };
    }

    if (!isRecord(payload)) {
      return {
        ok: false,
        errorKind: "endpoint_unavailable",
        status: response.status,
        message:
          "A resposta de GET /api/admin/users não retornou JSON válido. Verifique se o backend Fastify e o proxy /api estão ativos.",
      };
    }

    const rawItems = Array.isArray(payload.data)
      ? payload.data
      : Array.isArray(payload.users)
        ? payload.users
        : [];

    const users = rawItems
      .map(normalizeUserRecord)
      .filter((item): item is AdminUserItem => item !== null);

    const rawPagination = isRecord(payload.pagination)
      ? payload.pagination
      : {};
    const page = readNumber(rawPagination, ["page"]) ?? params.page;
    const limit = readNumber(rawPagination, ["limit"]) ?? params.limit;
    const total =
      readNumber(rawPagination, ["total", "count"]) ?? users.length;
    const totalPages =
      readNumber(rawPagination, ["totalPages", "total_pages"]) ??
      Math.max(1, Math.ceil(total / Math.max(1, limit)));

    const pagination: AdminUsersPagination = {
      page,
      limit,
      total,
      totalPages: Math.max(1, totalPages),
    };

    return { ok: true, users, pagination };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    return {
      ok: false,
      errorKind: "network_error",
      message:
        "Falha de conexão ao consultar os usuários. Verifique sua rede ou a disponibilidade do servidor.",
    };
  }
}

export async function fetchAdminCompanyMembers(
  companyId: string,
  signal?: AbortSignal,
): Promise<FetchCompanyMembersResult> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return {
      ok: false,
      errorKind: "unauthenticated",
      status: 401,
      message: "Sessão expirada. Faça login novamente para consultar membros.",
    };
  }

  try {
    // TODO [BACKEND]: Caso não embuta `members` diretamente em GET /api/admin/users,
    // implementar GET /api/admin/users/:companyId/members retornando ativos e removidos.
    const response = await fetch(
      `/api/admin/users/${encodeURIComponent(companyId)}/members`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        signal,
      },
    );

    const payload = await parseSafeJson(response);

    if (!response.ok) {
      return {
        ok: false,
        ...mapHttpError(
          response.status,
          payload,
          "Não foi possível carregar os membros vinculados à empresa.",
        ),
      };
    }

    if (!isRecord(payload)) {
      return {
        ok: false,
        errorKind: "endpoint_unavailable",
        status: response.status,
        message:
          "O endpoint de membros da empresa não retornou JSON válido. Verifique o backend.",
      };
    }

    const rawMembers = Array.isArray(payload.data)
      ? payload.data
      : Array.isArray(payload.members)
        ? payload.members
        : [];

    return {
      ok: true,
      members: normalizeMembersList(rawMembers),
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    return {
      ok: false,
      errorKind: "network_error",
      message:
        "Falha de conexão ao carregar os membros da empresa. Tente novamente.",
    };
  }
}
