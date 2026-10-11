import { supabase } from "../../lib/supabase/supabaseClient";

import { useEffect, useState } from "react";

export default function CheckSession() {
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    const fetchSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);
    };
    fetchSession();
  }, []);

  if (session) {
    if (
      window.location.pathname === "/login" ||
      window.location.pathname === "/cadastrar"
    ) {
      window.location.href = "/";
    }
  }
  return null;
}
