import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";
import { getAvatarPublicUrl } from "../../utils/users/urlConversor";
import type {
  ProfileData,
  CompanyMember,
} from "../../container/Profile/profile";
import { env } from "../env";

const API_URL = env.VITE_API_URL;

export interface UserProfile {
  id: string;
  name: string;
  role: string;
  avatarUrl?: string;
}

export type LoginFieldErrors = {
  valor?: string[];
  type?: string[];
  password?: string[];
  captchaToken?: string[];
};

export type SingInResponse =
  | { ok: true; session: Session; user: User }
  | { ok: false; message: string; fieldErrors?: LoginFieldErrors };

export type UpdateUserResponse = {
  ok: boolean;
  message?: string;
};

/* função que irá registrar um novo usuário */
export async function SignUp(
  email: string,
  password: string,
  nome: string,
  cnpj: string | null = null,
  captchaToken: string,
) {
  const resposta = await fetch("/api/signup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
      nome,
      cnpj,
      captchaToken,
    }),
  });
  const data = await resposta.json();
  if (!resposta.ok) {
    throw new Error(
      data.message ?? "Erro ao registrar usuário. Verifique suas credenciais.",
    );
  }
  return data;
}

/* função que irá fazer login de um usuário existente */
export async function SignIn(
  valor: string,
  password: string,
  captchaToken: string,
  loginType: "email" | "cnpj",
): Promise<SingInResponse> {
  const resposta = await fetch("http://localhost:3001/api/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      valor,
      type: loginType,
      captchaToken,
      password,
    }),
  });
  const login = await resposta.json();
  if (!resposta.ok) {
    return {
      ok: false,
      message: login.message ?? "Erro ao fazer login.",
      fieldErrors: login.errors,
    };
  }
  const { data, error } = await supabase.auth.setSession({
    access_token: login.data.access_token,
    refresh_token: login.data.refresh_token,
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

/* função que irá fazer logout de um usuário autenticado */
export async function SignOut(escopo: "global" | "local") {
  const { error } = await supabase.auth.signOut({ scope: escopo });
  if (error) {
    throw new Error(error.message);
  }
  localStorage.removeItem("userProfile");
}

/* função que irá atualizar os dados do usuário */
export async function UpdateUser(
  name?: string,
  email?: string,
  file?: File,
): Promise<UpdateUserResponse> {
  let avatarUrl: string | undefined;

  const { data: user, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message);
  }
  if (!user.session || !user.session.user) {
    throw new Error("Usuário não autenticado.");
  }
  if (file) {
    const preResAvatar = await fetch(`${API_URL}/api/updateAvatar`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${user.session?.access_token}`,
      },
      body: JSON.stringify({
        avatarType: file.type,
        avatarSize: file.size,
      }),
    });
    const preDataAvatar = await preResAvatar.json();
    if (!preResAvatar.ok || !preDataAvatar?.data?.uploadUrl) {
      throw new Error(
        preDataAvatar.message ?? "Erro ao gerar URL para upload da imagem.",
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
  const resposta = await fetch(`${API_URL}/api/update-profile`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      authorization: `Bearer ${user.session?.access_token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await resposta.json();
  if (!resposta.ok) {
    throw new Error(data.message ?? "Erro ao atualizar os dados do usuário.");
  }
  localStorage.removeItem("userProfile");
  return {
    ok: true,
    message: "Dados do usuário atualizados com sucesso.",
  };
}

/* função que irá enviar um código para o email do usuário */
export async function SendResetPassword(
  email: string,
  captchaToken: string,
): Promise<boolean> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    captchaToken: captchaToken,
  });
  if (error) {
    throw new Error(error.message);
  }
  return true;
}

/* função que irá confirmar o código inserido pelo usuário */
export async function ConfirmOTP(accessToken: string, email: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    token: accessToken,
    email: email,
    type: "recovery",
  });
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

/* função que irá alterar a senha do usuário */
export async function ConfirmResetPassword(newPassword: string) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

/*Busca os dados do usuário autenticado.*/
export async function SerchDataUser(): Promise<ProfileData | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);

  if (!data.session) {
    localStorage.removeItem("userProfile");
    return null;
  }

  const sessionUser = data.session.user;
  let cachedRaw = localStorage.getItem("userProfile");
  let user = cachedRaw ? safeJsonParse(cachedRaw) : null;

  if (!user || user.id !== sessionUser.id) {
    localStorage.removeItem("userProfile");
    await SaveUserData(sessionUser.id);
    cachedRaw = localStorage.getItem("userProfile");
    user = cachedRaw ? safeJsonParse(cachedRaw) : null;
  }

  if (!user) return null;

  return {
    id: sessionUser.id,
    name: user.nome_ou_razao ?? "",
    role:
      user.tipo_perfil ??
      (sessionUser.user_metadata?.cnpj ? "empresa" : "pessoa"),
    avatarUrl: getAvatarPublicUrl(user.foto_url),
    email: sessionUser.email ?? "",
  };
}

function safeJsonParse(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function SaveUserData(user: string) {
  if (localStorage.getItem("userProfile")) {
    return; // Se os dados do usuário já estiverem no localStorage, não faz nada
  } else {
    try {
      const { data, error } = await supabase
        .from("perfis")
        .select("id, nome_ou_razao, tipo_perfil, foto_url")
        .eq("id", user)
        .single();
      if (error) {
        throw new Error(error.message);
      }
      if (!data) {
        throw new Error("Usuário não encontrado.");
      }
      return localStorage.setItem("userProfile", JSON.stringify(data));
    } catch (error) {
      console.error("Erro ao salvar dados do usuário:", error);
      throw error;
    }
  }
}

export async function SaveNewMemberData(
  name: string,
  email: string,
): Promise<CompanyMember> {
  const id = await SerchDataUser();
  if (!id) {
    throw new Error("Usuário não autenticado.");
  }
  const resultado = await fetch(`${API_URL}/api/save-member`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      email,
      company_id: id.id,
    }),
  });
  const data = await resultado.json();
  if (!resultado.ok) {
    throw new Error(data.message ?? "Erro ao salvar dados do membro.");
  }
  return {
    id: data.id,
    name: data.name,
    email: data.email,
    status: data.status,
    avatarUrl: data.avatarUrl,
  };
}

export async function SearchMemberData() {
  const { data: user, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message);
  }
  if (!user.session || !user.session.user) {
    throw new Error("Usuário não autenticado.");
  }
  const id = user.session.access_token;
  const members = await fetch(`${API_URL}/api/get-members`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${id}`,
    },
  });

  const json = await members.json();

  if (!members.ok || !json.members?.ok) {
    throw new Error(
      json.members?.message ??
        json.message ??
        "Erro ao buscar dados dos membros.",
    );
  }

  return (json.members?.data ?? []).map((item: any) => ({
    id: item.id,
    name: item.name ?? item.nome_ou_razao ?? "",
    email: item.email ?? "",
    status: item.status,
    avatarUrl: getAvatarPublicUrl(item.foto_url),
  })) as CompanyMember[];
}

export async function DeleteAccount(
  memberId: string,
  password: string,
): Promise<"invalid_password" | "forbidden" | "blocked" | "deleted"> {
  const { data: user, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message);
  }
  if (!user.session || !user.session.user) {
    throw new Error("Usuário não autenticado.");
  }

  const response = await fetch(`${API_URL}/api/delete-account`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${user.session.access_token}`,
    },
    body: JSON.stringify({
      memberId,
      password,
    }),
  });

  const result = await response.json();

  if (!response.ok && !result?.status) {
    throw new Error(result.message ?? "Erro ao excluir a conta.");
  }
  return result?.status;
}
