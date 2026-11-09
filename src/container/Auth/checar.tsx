import { supabase } from "../../lib/supabase/supabaseClient";
import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function CheckSession() {
  const [session, setSession] = useState<Session | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);
    };
    fetchSession();
  }, []);

  useEffect(() => {
    if (
      session &&
      (window.location.pathname === "/login" ||
        window.location.pathname === "/cadastrar")
    ) {
      navigate("/", { replace: true });
    }
  }, [session, navigate]);

  return null;
}
