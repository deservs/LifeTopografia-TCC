import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

import './sidebar.css';
import LogoIcon from '../../assets/image/logo-front.webp';

/**
 * Dados básicos que a Sidebar precisa para exibir
 * as informações do usuário autenticado.
 *
 * Esses dados poderão posteriormente ser preenchidos
 * pela resposta da API de autenticação do backend.
 */
export interface UserProfile {
    name: string;
    role: string;
    avatarUrl?: string;
}

interface SidebarProps {
    /** Define se o menu lateral está aberto ou fechado. */
    isOpen: boolean;

    /** Função responsável por fechar o menu lateral. */
    onClose: () => void;

    /** Dados do usuário atualmente autenticado, quando disponíveis. */
    user?: UserProfile | null;
}

export const Sidebar = ({ isOpen, onClose, user }: SidebarProps) => {
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const previousFocusedElementRef = useRef<HTMLElement | null>(null);

    /**
     * Controla o teclado enquanto o drawer está aberto.
     *
     * Além do Escape, o Tab permanece limitado aos elementos
     * interativos da Sidebar para que o usuário não navegue
     * acidentalmente pelo conteúdo que está atrás do overlay.
     */
    useEffect(() => {
        if (!isOpen) {
            previousFocusedElementRef.current?.focus();
            previousFocusedElementRef.current = null;
            return;
        }

        previousFocusedElementRef.current =
            document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null;

        closeButtonRef.current?.focus();

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onClose();
                return;
            }

            if (event.key !== 'Tab') {
                return;
            }

            const drawer = document.getElementById('menu-drawer');

            if (!drawer) {
                return;
            }

            const focusableElements = Array.from(
                drawer.querySelectorAll<HTMLElement>(
                    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
                )
            );

            if (focusableElements.length === 0) {
                event.preventDefault();
                return;
            }

            const firstElement = focusableElements[0];
            const lastElement =
                focusableElements[focusableElements.length - 1];

            if (
                event.shiftKey &&
                document.activeElement === firstElement
            ) {
                event.preventDefault();
                lastElement.focus();
            } else if (
                !event.shiftKey &&
                document.activeElement === lastElement
            ) {
                event.preventDefault();
                firstElement.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    return (
        <>
            {/*
             * O overlay é apenas uma camada visual/clicável.
             * A navegação por teclado continua concentrada no drawer.
             */}
            <div
                id="overlay-sidebar"
                className={isOpen ? 'open' : ''}
                onClick={onClose}
                aria-hidden="true"
            />

            {/*
             * Quando fechado, visibility: hidden no CSS impede que
             * links fora da tela recebam foco pelo teclado.
             */}
            <aside
                id="menu-drawer"
                className={isOpen ? 'open' : ''}
                aria-label="Menu principal"
                aria-hidden={!isOpen}
            >
                <div className="sidebar-header">
                    <button
                        ref={closeButtonRef}
                        type="button"
                        className="btn-close-sidebar"
                        onClick={onClose}
                        aria-label="Fechar menu"
                    >
                        <span aria-hidden="true">✕</span>
                    </button>

                    <img
                        src={LogoIcon}
                        alt="Life Topografia"
                        className="sidebar-logo-icon"
                    />
                </div>

                <div id="conteudo-sidebar">
                    {/*
                     * A área de autenticação recebe dados reais quando
                     * o componente pai estiver conectado ao backend.
                     */}
                    <div className="sidebar-profile">
                        {user ? (
                            <div className="user-box">
                                <div className="avatar-container">
                                    {user.avatarUrl ? (
                                        <img
                                            src={user.avatarUrl}
                                            alt={`Foto de perfil de ${user.name}`}
                                            className="avatar-img"
                                        />
                                    ) : (
                                        <div
                                            className="avatar-placeholder"
                                            aria-hidden="true"
                                        >
                                            {user.name
                                                .charAt(0)
                                                .toUpperCase()}
                                        </div>
                                    )}
                                </div>

                                <div className="profile-details">
                                    <h2 className="user-name">
                                        {user.name}
                                    </h2>

                                    <span className="user-role">
                                        {user.role}
                                    </span>

                                    <Link
                                        to="/perfil"
                                        className="account-link"
                                        onClick={onClose}
                                    >
                                        Acesse sua conta
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div className="user-box">
                                <div
                                    className="avatar-icon"
                                    aria-hidden="true"
                                >
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                    >
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
                                    </svg>
                                </div>

                                <div className="profile-details">
                                    <h2>Acesse sua conta</h2>

                                    <Link
                                        to="/cadastrar"
                                        className="auth-btn"
                                        onClick={onClose}
                                    >
                                        CADASTRAR
                                    </Link>

                                    <Link
                                        to="/login"
                                        className="auth-btn"
                                        onClick={onClose}
                                    >
                                        ENTRAR
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>

                    <div
                        className="sidebar-divider"
                        aria-hidden="true"
                    >
                        <span className="line" />
                        <span className="rhombus" />
                        <span className="line" />
                    </div>

                    <nav
                        className="sidebar-nav"
                        aria-label="Navegação principal"
                    >
                        <ul>
                            <li>
                                <Link to="/" onClick={onClose}>
                                    INÍCIO
                                </Link>
                            </li>

                            <li>
                                <Link to="/sobre" onClick={onClose}>
                                    SOBRE NÓS
                                </Link>
                            </li>

                            <li>
                                <Link to="/servicos" onClick={onClose}>
                                    SERVIÇOS
                                </Link>
                            </li>

                            <li>
                                <Link to="/faq" onClick={onClose}>
                                    FAQ
                                </Link>
                            </li>

                            <li>
                                <Link to="/contato" onClick={onClose}>
                                    CONTATO
                                </Link>
                            </li>
                        </ul>
                    </nav>

                    <div
                        className="sidebar-divider"
                        aria-hidden="true"
                    >
                        <span className="line" />
                        <span className="rhombus" />
                        <span className="line" />
                    </div>

                    <div className="sidebar-footer">
                        <h4>Atendemos em todo o Brasil</h4>

                        <p>
                            Com sede em Santana de Parnaíba/SP, a Life
                            Topografia atua em obras de pequeno, médio e
                            grande porte por todo o território nacional,
                            com presença em capitais, regiões
                            metropolitanas e zonas rurais.
                        </p>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;