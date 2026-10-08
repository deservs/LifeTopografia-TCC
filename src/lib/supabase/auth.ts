import { uuid } from 'zod';
import { supabase } from './supabaseClient';

export async function SignUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password
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

async function singIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        throw new Error(error.message);
    }

    return data;
}

export async function Register(email: string, password: string, nome: string) {
    
    await SignUp(email, password);

    const { error } = await supabase.from('perfis').insert({
        id: (await getSession())?.user?.id,
        email: email,
        tipo_perfil: 'PESSOA_FISICA',
        status: 'ATIVO',
        nome_ou_razao: nome,
        cnpj: null,
        foto_url: null,
    });

    if (error) {
        throw new Error(error.message);
    }
}