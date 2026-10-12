import { SerchDataUser } from "../lib/supabase/auth";
import { useEffect, useState, createContext } from "react";

import { type UserProfile } from "../components/Sidebar/sidebar";

export const UserContexto = createContext<UserProfile | null>(null);

export function StartUser() {
  const [perfil, setPerfil] = useState<UserProfile | null>(null);
  /* função para buscar os dados do usuário */
  useEffect(() => {
    SerchDataUser()
      .then((dados) => setPerfil(dados))
      .catch(console.error);
  }, []);
  return perfil;
}
