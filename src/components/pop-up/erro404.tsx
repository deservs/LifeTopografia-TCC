import { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from'../../assets/image/logo-front.webp';

import './erro404.css';

export default function Erro404() {
    const homeLinkRef = useRef<HTMLAnchorElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        // A Home continua visível atrás do aviso, mas não deve receber cliques ou foco.
        const home = document.getElementById('initial-card');
        const wasInert = home?.inert ?? false;

        if (home) home.inert = true;
        homeLinkRef.current?.focus();

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') navigate('/', { replace: true });
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            if (home) home.inert = wasInert;
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [navigate]);

    return (
        <div className="erro404-overlay">
            <section
                className="erro404-card"
                role="dialog"
                aria-modal="true"
                aria-labelledby="erro404-title"
                aria-describedby="erro404-description"
            >
                <div className="erro404-symbol" aria-hidden="true">
                    <img src={logo} alt="Logo da LifeTopografia" />
                </div>

                <span className="erro404-code">ERRO 404</span>
                <h1 id="erro404-title">Saímos da rota.</h1>
                <p id="erro404-description">
                    A página que você procura não foi encontrada. Volte ao início
                    para continuar navegando pela LifeTopografia.
                </p>

                <Link ref={homeLinkRef} className="erro404-action" to="/" replace>
                    VOLTAR AO INÍCIO
                    <span aria-hidden="true">→</span>
                </Link>
            </section>
        </div>
    );
}
