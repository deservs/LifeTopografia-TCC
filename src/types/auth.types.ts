export type AccountRole =
  | "PESSOA_FISICA"
  | "EMPRESA"
  | "ADMIN"
  | "AUXILIAR"
  | "PESSOA_JURIDICA";

export type ProfileStatus = "ATIVO" | "EXCLUIDO" | "AFASTADO";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: AccountRole;
  status: ProfileStatus;
  cnpj?: string;
  avatarUrl?: string;
}

export interface CompanyMember {
  id: string;
  name: string;
  email: string;
  status: ProfileStatus;
  avatarUrl?: string;
}

function normalizeToken(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

export function normalizeAccountRole(
  rawRole: unknown,
  cnpj?: string | null,
): AccountRole {
  const token = normalizeToken(rawRole);

  if (token === "ADMIN" || token === "ADMINISTRADOR") {
    return "ADMIN";
  }
  if (token === "AUXILIAR") {
    return "AUXILIAR";
  }
  if (token === "PESSOA_JURIDICA" || token === "PJ") {
    return "PESSOA_JURIDICA";
  }
  if (token === "EMPRESA") {
    return "EMPRESA";
  }
  if (cnpj && cnpj.trim().length > 0) {
    return "EMPRESA";
  }
  return "PESSOA_FISICA";
}

export function normalizeProfileStatus(rawStatus: unknown): ProfileStatus {
  const token = normalizeToken(rawStatus);
  if (token === "EXCLUIDO") return "EXCLUIDO";
  if (token === "AFASTADO") return "AFASTADO";
  return "ATIVO";
}

export function isCompanyRole(role?: AccountRole | string | null): boolean {
  if (!role) return false;
  const normalized = normalizeAccountRole(role);
  return normalized === "EMPRESA" || normalized === "PESSOA_JURIDICA";
}

export function formatRoleLabel(role: AccountRole | string): string {
  switch (normalizeAccountRole(role)) {
    case "ADMIN":
      return "Administrador";
    case "EMPRESA":
    case "PESSOA_JURIDICA":
      return "Empresa";
    case "AUXILIAR":
      return "Auxiliar";
    default:
      return "Pessoa Física";
  }
}
