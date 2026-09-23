import React from 'react';
import './sidebar.css';
import LogoIcon from '../../assets/image/logo-front.png';

export interface UserProfile {
    name: string;
    role: string;
    avatarUrl?: string;
}

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    user?: UserProfile | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, user }) => {
    return (
        <>
            {/* Fundo escuro atrás da sidebar */}
            <div 
                id="overlay-sidebar" 
                className={isOpen ? 'open' : ''} 
                onClick={onClose}
            />

            {/* Painel da Barra Lateral */}
            <aside id="menu-drawer" className={isOpen ? 'open' : ''}>
                {/* Cabeçalho */}
                <div className="sidebar-header">
                    <button 
                        type="button" 
                        className="btn-close-sidebar" 
                        onClick={onClose}
                        aria-label="Fechar menu"
                    >
                        ✕
                    </button>
                    <img src={LogoIcon} alt="Life Topografia" className="sidebar-logo-icon" />
                </div>

                <div id="conteudo-sidebar">
                    {/* Bloco de Perfil / Autenticação */}
                    <div className="sidebar-profile">
                        {user ? (
                            /* Usuário Logado */
                            <div className="user-box">
                                <div className="avatar-container">
                                    {user.avatarUrl ? (
                                        <img src={user.avatarUrl} alt={user.name} className="avatar-img" />
                                    ) : (
                                        <div className="avatar-placeholder">{user.name.charAt(0)}</div>
                                    )}
                                </div>
                                <div className="profile-details">
                                    <h2 className="user-name">{user.name}</h2>
                                    <span className="user-role">{user.role}</span>
                                    <a href="#minha-conta" className="account-link">Acesse sua conta</a>
                                </div>
                            </div>
                        ) : (
                            /* Usuário Não Logado */
                            <div className="user-box">
                                <div className="avatar-icon">
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                                    </svg>
                                </div>
                                <div className="profile-details">
                                    <h2>Acesse sua conta</h2>
                                    <a href="#cadastrar" className="auth-btn">CADASTRAR</a>
                                    <a href="#entrar" className="auth-btn">ENTRAR</a>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="sidebar-divider">
                        <span className="line"></span>
                        <span className="rhombus"></span>
                        <span className="line"></span>
                    </div>

                    {/* Navegação de Páginas */}
                    <nav className="sidebar-nav">
                        <ul>
                            <li><a href="#inicio">INÍCIO</a></li>
                            <li><a href="#sobre">SOBRE NÓS</a></li>
                            <li><a href="#servicos">SERVIÇOS</a></li>
                            <li><a href="#faq">FAQ</a></li>
                            <li><a href="#contato">CONTATO</a></li>
                        </ul>
                    </nav>

                    <div className="sidebar-divider">
                        <span className="line"></span>
                        <span className="rhombus"></span>
                        <span className="line"></span>
                    </div>

                    {/* Rodapé Informativo */}
                    <div className="sidebar-footer">
                        <h4>Atendemos em todo o Brasil</h4>
                        <p>
                            Com sede em Santana de Parnaíba/SP, a Life Topografia atua em obras 
                            de pequeno, médio e grande porte por todo o território nacional, com 
                            presença em capitais, regiões metropolitanas e zonas rurais.
                        </p>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;