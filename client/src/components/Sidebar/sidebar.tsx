import React from 'react';
import './sidebar.css'; // Importa o CSS isolado do componente

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    children?: React.ReactNode;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, children }) => {
    return (
        <>
            {/* Overlay/Fundo escurecido */}
            <div 
                id="overlay-sidebar" 
                className={isOpen ? 'open' : ''} 
                onClick={onClose}
            />

            {/* Container do Menu Lateral */}
            <aside id="menu-drawer" className={isOpen ? 'open' : ''}>
                <button type="button" id="btn-fechar-sidebar" onClick={onClose}>
                    &times;
                </button>
                <div id="conteudo-sidebar">
                    {children}
                </div>
            </aside>
        </>
    );
};

export default Sidebar;