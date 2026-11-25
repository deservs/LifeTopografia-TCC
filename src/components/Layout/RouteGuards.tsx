import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function RouteAuthLoading() {
  return (
    <div className="route-guard-status" role="status" aria-live="polite">
      Verificando sessão…
    </div>
  );
}

export function GuestRoute() {
  const { status, isPasswordRecovery } = useAuth();

  if (status === "loading") {
    return <RouteAuthLoading />;
  }

  if (status === "authenticated" && !isPasswordRecovery) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export function ProtectedRoute() {
  const location = useLocation();
  const { status, user } = useAuth();

  if (status === "loading") {
    return <RouteAuthLoading />;
  }

  if (status !== "authenticated" || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export function AdminRoute() {
  const location = useLocation();
  const { status, user } = useAuth();

  if (status === "loading") {
    return <RouteAuthLoading />;
  }

  if (status !== "authenticated" || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (user.role !== "ADMIN") {
    return (
      <section
        className="route-guard-card"
        role="alert"
        aria-labelledby="admin-route-forbidden-title"
      >
        <h1 id="admin-route-forbidden-title">
          Acesso restrito a administradores
        </h1>
        <p>
          Sua conta não possui permissão administrativa para acessar esta área.
        </p>
        <div className="route-guard-actions">
          <Link to="/perfil" className="route-guard-btn route-guard-btn--primary">
            Ir para meu perfil
          </Link>
          <Link to="/" className="route-guard-btn route-guard-btn--secondary">
            Voltar ao início
          </Link>
        </div>
      </section>
    );
  }

  return <Outlet />;
}
