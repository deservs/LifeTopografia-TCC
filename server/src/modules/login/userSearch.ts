import {supabase} from "../../Shared/database/banco.js";

export async function searchUser(valor: string, type: "cnpj" | "nome") {
    if (type === "cnpj") {
        const { data, error } = await supabase
            .from("perfis")
            .select("email")
            .ilike("cnpj", `%${valor}%`);
            
        if (error) {
            console.error("Erro ao buscar usuário:", error);
            return [];
        }
        return data;
    }else if (type === "nome") {
            const { data, error } = await supabase
                .from("perfis")
                .select("email")
                .ilike("nome_ou_razao", `%${valor}%`);
            
            if (error) {
                console.error("Erro ao buscar usuário:", error);
                return [];
            }
            return data;
        }
    }
