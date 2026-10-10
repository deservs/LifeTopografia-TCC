import { supabase } from "./supabaseClient";

/* função que irá registrar um novo usuário */
export async function SignUp(
  email: string,
  password: string,
  nome: string,
  cnpj: string | null = null,
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
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  console.log("Usuário registrado com sucesso:", data);
  return data;
}

/* função que irá fazer login de um usuário existente */
export async function SignIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password,
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
export async function ConfirmOTP(
  accessToken: string,
  email: string
) {
  const { data, error } = await supabase.auth.verifyOtp({token: accessToken, email: email, type: 'recovery'});
  if (error) {
    throw new Error(error.message);
  }
  console.log("Email confirmado com sucesso:", data);
  return data;
}

/* função que irá alterar a senha do usuário */
export async function ConfirmResetPassword(
  newPassword: string
) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  if (error) {
    throw new Error(error.message);
  }
  console.log("Senha redefinida com sucesso:", data);
  return data;
}
