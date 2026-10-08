import { supabase } from './supabaseClient';

export async function SignUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
    });

    if (error) {
        throw new Error(error.message);
    }

    return data;
}

async function getSession() {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
        throw new Error(error.message);
    }
    return data.session;
}

export async function Register(email: string, password: string, nome: string) {
    try {

        await SignUp(email, password);
        console.log("teste diferente:", getSession());
        const { data, error } = await supabase
            .from('perfis')
            .insert({
                id: (await getSession())?.user?.id,
                email: email,
                tipo_perfil: 'PESSOA_FISICA',
                status: 'ATIVO',
                nome_ou_razao: nome,
                cnpj: null,
                foto_url: null,
            })
            .select()

            if (error) {
                throw new Error(error.message);
            }
            console.log('Inserção realizada com sucesso:', data)
            return { success: true, data }
    } catch (error) {
        console.error('Erro ao inserir dados:', error.message)
        return { success: false, error: error.message }
    }
}