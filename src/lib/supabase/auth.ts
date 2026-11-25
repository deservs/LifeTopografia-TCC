import type { Session, User } from "@supabase/supabase-js";
import { apiRequest, type ApiFieldErrors } from "../apiClient";
import {
  normalizeProfileStatus,
  type CompanyMember,
  type ProfileStatus,
} from "../../types/auth.types";
import { getAvatarPublicUrl } from "../../utils/users/urlConversor";
import { supabase } from "./supabaseClient";

export type LoginFieldErrors = ApiFieldErrors;

export type SingInResponse =
  | { ok: true; session: Session; user: User }
  | { ok: false; message: string; fieldErrors?: LoginFieldErrors };

export type UpdateUserResponse = {
  ok: boolean;
  message?: string;
};

interface MemberRowDto {
  id: string;
  nome_ou_razao?: string;
  name?: string;
  email?: string;
  status?: string;
  foto_url?: string | null;
}

/* Registra um novo usuário */
export async function SignUp(
  email: string,
  password: string,
  nome: string,
  captchaToken: string,
  cnpj?: string,
) {
  const response = await apiRequest<{ message: string }>("/api/signup", {
    method: "POST",
    auth: false,
    body: {
      email,
      password,
      nome,
      cnpj,
      captchaToken,
    },
  });

  if (!response.ok) {
    throw new Error(
      response.message ??
        "Erro ao registrar usuário. Verifique suas credenciais.",
    );
  }

  return response.data;
}

/* Faz login de um usuário existente */
export async function SignIn(
  valor: string,
  password: string,
  captchaToken: string,
  loginType: "email" | "cnpj",
): Promise<SingInResponse> {
  const response = await apiRequest<{ session: Session; user: User }>(
    "/api/login",
    {
      method: "POST",
      auth: false,
      body: {
        valor,
        type: loginType,
        captchaToken,
        password,
      },
    },
  );

  if (!response.ok) {
    return {
      ok: false,
      message: response.message ?? "Erro ao fazer login.",
      fieldErrors: response.fieldErrors,
    };
  }

  const { data, error } = await supabase.auth.setSession({
    access_token: response.data.session.access_token,
    refresh_token: response.data.session.refresh_token,
  });

  if (error || !data.session || !data.user) {
    return {
      ok: false,
      message: "Falha ao obter a sessão do usuário após o login.",
    };
  }

  return {
    ok: true,
    session: data.session,
    user: data.user,
  };
}

/* Faz logout do usuário autenticado */
export async function SignOut(escopo: "global" | "local") {
  const { error } = await supabase.auth.signOut({ scope: escopo });
  if (error) {
    throw new Error(error.message);
  }
}

/* Atualiza os dados do usuário */
export async function UpdateUser(
  name?: string,
  email?: string,
  file?: File,
): Promise<UpdateUserResponse> {
  let avatarUrl: string | undefined;

  if (file) {
    const preDataAvatar = await apiRequest<{ uploadUrl: string; key: string }>(
      "/api/updateAvatar",
      {
        method: "PUT",
        body: {
          avatarType: file.type,
          avatarSize: file.size,
        },
      },
    );

    if (!preDataAvatar.ok || !preDataAvatar.data.uploadUrl) {
      throw new Error(
        preDataAvatar.ok
          ? "Erro ao gerar URL para upload da imagem."
          : preDataAvatar.message,
      );
    }

    const uploadImagem = await fetch(preDataAvatar.data.uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
      },
      body: file,
    });

    if (!uploadImagem.ok) {
      throw new Error("Erro ao fazer upload da imagem.");
    }

    avatarUrl = preDataAvatar.data.key;
  }

  const payload: { name?: string; email?: string; avatarUrl?: string } = {};
  if (name) payload.name = name;
  if (email) payload.email = email;
  if (avatarUrl) payload.avatarUrl = avatarUrl;

  const response = await apiRequest<{ message: string }>(
    "/api/update-profile",
    {
      method: "PATCH",
      body: payload,
    },
  );

  if (!response.ok) {
    throw new Error(
      response.message ?? "Erro ao atualizar os dados do usuário.",
    );
  }

  return {
    ok: true,
    message:
      response.data.message ?? "Dados do usuário atualizados com sucesso.",
  };
}

/* Envia código de recuperação de senha para o email */
export async function SendResetPassword(
  email: string,
  captchaToken: string,
): Promise<boolean> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    captchaToken,
  });
  if (error) {
    throw new Error(error.message);
  }
  return true;
}

/* Confirma o código OTP inserido pelo usuário */
export async function ConfirmOTP(accessToken: string, email: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    token: accessToken,
    email,
    type: "recovery",
  });
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

/* Altera a senha do usuário autenticado */
export async function ConfirmResetPassword(newPassword: string) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function SaveNewMemberData(
  name: string,
  email: string,
): Promise<CompanyMember> {
  const response = await apiRequest<{
    id: string;
    name: string;
    email: string;
    status: ProfileStatus;
    avatarUrl?: string;
  }>("/api/save-member", {
    method: "POST",
    body: { name, email },
  });

  if (!response.ok) {
    throw new Error(response.message ?? "Erro ao salvar dados do membro.");
  }

  return {
    id: response.data.id,
    name: response.data.name,
    email: response.data.email,
    status: normalizeProfileStatus(response.data.status),
    avatarUrl: getAvatarPublicUrl(response.data.avatarUrl),
  };
}

export async function SearchMemberData(): Promise<CompanyMember[]> {
  const response = await apiRequest<MemberRowDto[]>("/api/get-members", {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(response.message ?? "Erro ao buscar dados dos membros.");
  }

  return (response.data ?? []).map((item) => ({
    id: item.id,
    name: item.name ?? item.nome_ou_razao ?? "",
    email: item.email ?? "",
    status: normalizeProfileStatus(item.status),
    avatarUrl: getAvatarPublicUrl(item.foto_url),
  }));
}

export async function UpdateMemberStatus(
  memberId: string,
  status: Extract<ProfileStatus, "ATIVO" | "AFASTADO">,
  password: string,
): Promise<"updated" | "invalid_password" | "forbidden"> {
  const response = await apiRequest<{ id: string; status: ProfileStatus }>(
    `/api/members/${encodeURIComponent(memberId)}/status`,
    {
      method: "PATCH",
      body: { status, password },
    },
  );

  if (!response.ok) {
    if (response.code === "INVALID_PASSWORD" || response.status === 401) {
      return "invalid_password";
    }
    if (response.code === "FORBIDDEN" || response.status === 403) {
      return "forbidden";
    }
    throw new Error(response.message);
  }

  return "updated";
}

export async function RemoveCompanyMember(
  memberId: string,
  password: string,
): Promise<"removed" | "invalid_password" | "forbidden"> {
  const response = await apiRequest<{ id: string; removed: boolean }>(
    `/api/members/${encodeURIComponent(memberId)}`,
    {
      method: "DELETE",
      body: { password },
    },
  );

  if (!response.ok) {
    if (response.code === "INVALID_PASSWORD" || response.status === 401) {
      return "invalid_password";
    }
    if (response.code === "FORBIDDEN" || response.status === 403) {
      return "forbidden";
    }
    throw new Error(response.message);
  }

  return "removed";
}

export async function DeleteAccount(
  memberId: string,
  password: string,
): Promise<"invalid_password" | "forbidden" | "blocked" | "deleted"> {
  const response = await apiRequest<{ status: "deleted" }>(
    "/api/delete-account",
    {
      method: "DELETE",
      body: {
        memberId,
        password,
      },
    },
  );

  if (!response.ok) {
    if (response.code === "INVALID_PASSWORD" || response.status === 401) {
      return "invalid_password";
    }
    if (response.code === "BLOCKED") {
      return "blocked";
    }
    if (response.code === "FORBIDDEN" || response.status === 403) {
      return "forbidden";
    }
    throw new Error(response.message ?? "Erro ao excluir a conta.");
  }

  return response.data.status;
}
