import { supabase, supabaseAdmin } from '../../Shared/database/banco.js'

export async function Login(
  valor: string,
  type: 'cnpj' | 'email' | 'nome',
  password: string,
  captchaToken: string,
) {
  function logar(email: string, password: string, captchaToken: string) {
    return supabase.auth.signInWithPassword({
      email: email,
      password: password,
      options: {
        captchaToken: captchaToken,
      },
    })
  }
  if (type === 'cnpj') {
    const { data, error } = await supabaseAdmin
      .from('perfis')
      .select('email')
      .eq('cnpj', `${valor}`)

    if (error) {
      console.error('Erro ao buscar usuário:', error)
      return []
    }
    if (data.length === 0) {
      console.error('Nenhum usuário encontrado com o CNPJ fornecido.')
      return []
    } else if (data.length < 2) {
      const email = data[0].email
      return logar(email, password, captchaToken)
    } else {
      console.error('Mais de um usuário encontrado com o CNPJ fornecido.')
      return []
    }
  } else {
    return logar(valor, password, captchaToken)
  }
}
