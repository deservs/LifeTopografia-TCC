/**
 * Contratos de tipagem estrita da tela administrativa AdminCheckUser.
 *
 * TODO [BACKEND]: O endpoint `GET /api/admin/users` deve ser implementado no
 * servidor Fastify (`server/src/app.ts`) com o middleware `getUserFromRequest`
 * (`server/src/Shared/middleware/getUser.ts`), validando na tabela
 * `public.perfis` via `supabaseAdmin` se `tipo_perfil === 'ADMIN'`.
 *
 * Formato JSON esperado para `GET /api/admin/users?page=1&limit=10`:
 * ```json
 * {
 *   "ok": true,
 *   "data": [
 *     {
 *       "id": "uuid",
 *       "name": "Razão Social ou Nome",
 *       "email": "contato@empresa.com",
 *       "accountType": "EMPRESA",
 *       "avatarUrl": "https://... ou users/<id>/image-123.webp",
 *       "cnpj": "12345678000190",
 *       "status": "ATIVO",
 *       "createdAt": "2026-11-12T12:00:00Z",
 *       "membersCount": 2,
 *       "members": [
 *         {
 *           "id": "uuid-funcionario",
 *           "vinculoId": "15",
 *           "name": "Nome do Funcionário",
 *           "email": "funcionario@empresa.com",
 *           "avatarUrl": "users/<id>/image-456.webp",
 *           "status": "ATIVO",
 *           "linkedAt": "2026-11-12T13:00:00Z"
 *         }
 *       ]
 *     }
 *   ],
 *   "pagination": {
 *     "page": 1,
 *     "limit": 10,
 *     "total": 42,
 *     "totalPages": 5
 *   }
 * }
 * ```
 */

export type AccountKind = "PESSOA_FISICA" | "EMPRESA";

export type MemberBondStatus = "ATIVO" | "PENDENTE" | "REMOVIDO";

export interface AdminCompanyMember {
  id: string;
  vinculoId?: string;
  name: string;
  email: string;
  avatarUrl?: string;
  bondStatus: MemberBondStatus;
  rawStatus: string;
  linkedAt?: string;
}

export interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  accountType: AccountKind;
  isAdminAccount: boolean;
  avatarUrl?: string;
  cnpj?: string;
  status?: string;
  createdAt?: string;
  /**
   * Quando o backend já embutir os membros na resposta de `GET /api/admin/users`,
   * este campo virá preenchido (incluindo array vazio `[]`). Quando `undefined`,
   * o frontend consultará `GET /api/admin/users/:companyId/members` ao abrir o modal.
   */
  members?: AdminCompanyMember[];
  membersCount?: number;
}

export interface AdminUsersPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface FetchAdminUsersParams {
  page: number;
  limit: number;
  search?: string;
  accountType?: "ALL" | AccountKind;
  signal?: AbortSignal;
}

export type AdminApiErrorKind =
  | "unauthenticated"
  | "forbidden"
  | "endpoint_unavailable"
  | "server_error"
  | "network_error";

export type FetchAdminUsersResult =
  | {
      ok: true;
      users: AdminUserItem[];
      pagination: AdminUsersPagination;
    }
  | {
      ok: false;
      errorKind: AdminApiErrorKind;
      status?: number;
      message: string;
    };

export type FetchCompanyMembersResult =
  | {
      ok: true;
      members: AdminCompanyMember[];
    }
  | {
      ok: false;
      errorKind: AdminApiErrorKind;
      status?: number;
      message: string;
    };
