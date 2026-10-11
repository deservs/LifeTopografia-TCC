import { supabase } from "./supabaseClient";

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

  console.log("Usuário registrado com sucesso:", data);
  return data;
}

/* função que irá fazer login de um usuário existente */
export async function SignIn(email: string, password: string, captchaToken: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password,
    options: {
      captchaToken: captchaToken,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  console.log("Usuário logado com sucesso:", data);
  return data;
}

/* função que irá enviar um código para o email do usuário */
export async function SendResetPassword(email: string): Promise<boolean> {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) {
    throw new Error(error.message);
  }
  console.log("Email de redefinição de senha enviado com sucesso:", data);
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
  console.log("Email confirmado com sucesso:", data);
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
  console.log("Senha redefinida com sucesso:", data);
  return data;
}

/*Busca os dados do usuário autenticado.*/
export async function SerchDataUser() {
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
}
