import { supabase } from "../../lib/supabase/supabaseClient";
import { useEffect} from "react";
import { useNavigate, useLocation } from "react-router-dom";

const PUBLIC_AUTH_ROUTES = ["/login", "/cadastrar"];

export default function CheckSession() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (!PUBLIC_AUTH_ROUTES.includes(pathname)) return;

    let isMounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted && session) {
        navigate("/", { replace: true });
      }
    });
    return () => {
      isMounted = false;
    };
  }, [pathname, navigate]);

  return null;
}
