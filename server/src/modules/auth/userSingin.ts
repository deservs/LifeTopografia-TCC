import { supabase, supabaseAdmin } from '../../Shared/database/banco.js'

type LoginResult = | { ok: true; session:NonNullable<Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>['data']['session']>; user: NonNullable<Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>['data']['user']> }
  | { ok: false; message: string }

export async function Login(
  valor: string,
  type: 'cnpj' | 'email',
  password: string,
  captchaToken: string,
): Promise<LoginResult>  {

  let email = valor;

  if (type === 'cnpj') {
    const { data, error } = await supabaseAdmin
      .from('perfis')
      .select('email')
      .eq('cnpj', `${valor}`)
      .maybeSingle()

    if (error) {
      console.error('Erro ao buscar usuário:', error)
      return {ok: false, message: "Falha no login. Verifique suas credenciais."}
    }
    if (!data?.email) {
      console.error('Credenciais inválidas.')
      return {ok: false, message: "Falha no login. Verifique suas credenciais."}
    } else {
      email = data.email
    }
  }
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password,
    options: {
      captchaToken
    },
  })
  if (error || !data.session || !data.user) {
    return {ok:false, message: "Falha no login. Verifique suas credenciais."}
  }
  return {
    ok: true,
    session: data.session,
    user: data.user,
  }
}

