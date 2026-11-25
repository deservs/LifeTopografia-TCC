import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import Logo from "../../assets/image/logo-front.webp";
import "./topbar.css";

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
  return (
    <header className={`topbar${rightContent ? " topbar--with-right" : ""}`}>
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

      {rightContent && <div className="topbar__right">{rightContent}</div>}
    </header>
  );
};

export default Topbar;
