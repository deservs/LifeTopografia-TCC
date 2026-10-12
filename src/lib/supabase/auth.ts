import { supabase } from "./supabaseClient";
export interface UserProfile {
  name: string;
  role: string;
  avatarUrl?: string;
}
/* função que irá registrar um novo usuário */
export async function SignUp(
  email: string,
  password: string,
  nome: string,
  cnpj: string | null = null,
  captchaToken: string,
) {
  if (
    cnpj === "" ||
    cnpj === undefined ||
    cnpj === null ||
    cnpj == "null" ||
    cnpj == "undefined"
  ) {
    cnpj = null;
  }
  const { data, error } = await supabase.auth.signUp({
    email: email,
    password: password,
    options: {
      data: {
        nome_ou_razao: nome,
        cnpj: cnpj,
      },
      captchaToken: captchaToken,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/* função que irá fazer login de um usuário existente */
export async function SignIn(
  valor: string,
  password: string,
  captchaToken: string,
  loginType: "email" | "cnpj" | "nome",
) {
  const resposta = await fetch("http://localhost:3001/api/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ valor, type: loginType, captchaToken, password }),
  });
  const login = await resposta.json();
  if (!login.data.data?.session) {
    console.error("Falha no login. Verifique suas credenciais.");

    throw new Error(
      login.data.error?.message ?? login.message ?? "Erro ao fazer login",
    );
  }
  const { data, error } = await supabase.auth.setSession({
    access_token: login.data.data.session.access_token,
    refresh_token: login.data.data.session.refresh_token,
  });
  if (error) {
    throw new Error(error.message);
  }
  if (!data.session) {
    throw new Error("Falha ao obter a sessão do usuário após o login.");
  }
  return login.data;
}

/* função que irá fazer logout de um usuário autenticado */
export async function SignOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
  console.log("Usuário deslogado com sucesso.");
}

/* função que irá atualizar os dados do usuário */
export async function UpdateUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) {
    throw new Error(error.message);
  }
  if (!user) {
    throw new Error("Usuário não autenticado.");
  }
  const { error: updateError } = await supabase.auth.updateUser({
    data: {
      // Adicione aqui os campos que deseja atualizar
      nome_ou_razao: "Novo Nome",
      cnpj: "Novo CNPJ",
      email: "",
      foto_url: "",
    },
  });
  if (updateError) {
    throw new Error(updateError.message);
  }
}

/* função que irá enviar um código para o email do usuário */
export async function SendResetPassword(email: string): Promise<boolean> {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
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
export async function SerchDataUser(): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      throw new Error(error.message);
    }
    if (!data.session) {
      return null;
    }
    /* consulta o ip do usuário autenticado */
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError) {
      throw new Error(userError.message);
    }
    /* consulta os dados do perfil do usuário */
    const { data: perfil, error: errorPerfil } = await supabase
      .from("perfis")
      .select("nome_ou_razao, tipo_perfil, foto_url")
      .eq("id", user?.id)
      .single();
    if (errorPerfil) {
      throw new Error(errorPerfil.message);
    }

    return {
      name: perfil.nome_ou_razao,
      role: perfil.tipo_perfil === "EMPRESA" ? "Empresa" : "Pessoa física",
      avatarUrl: perfil.foto_url,
    };
  } catch (error) {
    console.error("Erro ao buscar dados do usuário:", error);
    throw error;
  }
}
