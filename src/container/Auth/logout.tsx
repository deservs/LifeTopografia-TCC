import { SignOut } from "../../lib/supabase/auth.ts";
import { useEffect } from "react";

export default function Logout() {
  useEffect(() => {
    SignOut()
      .then(() => {
        window.location.href = "/";
      })
      .catch((error) => {
        console.error("Erro ao fazer logout:", error);
      });
  }, []);

  return null;
}
