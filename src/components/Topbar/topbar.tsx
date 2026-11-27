import { useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

import { useAuth } from "../../hook/useAuth";
import Logo from "../../assets/image/logo-front.webp";
import "./topbar.css";

const TOPBAR_NAV_ITEMS = [
  { to: "/", label: "INÍCIO" },
  { to: "/sobre", label: "SOBRE NÓS" },
  { to: "/servicos", label: "SERVIÇOS" },
  { to: "/faq", label: "FAQ" },
  { to: "/chat", label: "CHAT" },
] as const;

export interface TopbarProps {
  /** Define se o menu lateral está aberto (para acessibilidade do botão). */
  isSidebarOpen: boolean;

  /** Função disparada ao clicar no botão hambúrguer para abrir a Sidebar. */
  onOpenSidebar: () => void;

  /** Conteúdo opcional alinhado à direita da barra superior. */
  rightContent?: ReactNode;
}

export const Topbar = ({
  isSidebarOpen,
  onOpenSidebar,
  rightContent,
}: TopbarProps) => {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);

  const normalizedPathname = pathname.toLowerCase();
  const displayName = user?.name.trim() || "Cliente";

  return (
    <header className={`topbar${rightContent ? " topbar--with-right" : ""}`}>
      <div className="topbar__inner">
        <button
          type="button"
          className="topbar__menu-button"
          onClick={onOpenSidebar}
          aria-label="Abrir menu"
          aria-expanded={isSidebarOpen}
          aria-controls="menu-drawer"
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>

        <Link
          to="/"
          className="topbar__logo-link"
          aria-label="Ir para a página inicial"
        >
          <img src={Logo} alt="Life Topografia" className="topbar__logo" />
        </Link>

        <nav className="topbar__desktop-nav" aria-label="Navegação principal">
          {TOPBAR_NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="topbar__desktop-link"
              aria-current={normalizedPathname === item.to ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="topbar__right-group">
          {rightContent && <div className="topbar__right">{rightContent}</div>}

          {user ? (
            <Link
              to="/perfil"
              className="topbar__user-pill"
              aria-label={`Acessar perfil de ${displayName}`}
            >
              <span className="topbar__user-avatar" aria-hidden="true">
                {user.avatarUrl && failedAvatarUrl !== user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt=""
                    onError={() => setFailedAvatarUrl(user.avatarUrl ?? null)}
                  />
                ) : (
                  displayName.charAt(0).toUpperCase()
                )}
              </span>
              <span className="topbar__user-meta">
                <span className="topbar__user-name">{displayName}</span>
                <span className="topbar__user-cta">Acessar perfil</span>
              </span>
            </Link>
          ) : (
            <Link to="/login" className="topbar__user-pill">
              <span className="topbar__user-avatar" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
                </svg>
              </span>
              <span className="topbar__user-meta">
                <span className="topbar__user-name">Minha conta</span>
                <span className="topbar__user-cta">Acessar perfil</span>
              </span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
