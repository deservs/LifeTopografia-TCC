import { supabase, supabaseAdmin } from '../../Shared/database/banco.js'

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