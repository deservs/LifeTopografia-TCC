import { SignOut } from "../../lib/supabase/auth.ts";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Logout() {
  const navigate = useNavigate();

  useEffect(() => {
    SignOut("local")
      .then(() => {
        navigate("/", { replace: true });
      })
      .catch((error) => {
        console.error("Erro ao fazer logout:", error);
      });
  }, [navigate]);

  return null;
}
