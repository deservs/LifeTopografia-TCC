import { useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay } from 'swiper/modules';
import { Link } from 'react-router-dom';

import Sidebar from '../../components/Sidebar/sidebar.tsx';
import type { UserProfile } from '../../components/Sidebar/sidebar';

import Fundo1 from '../../assets/image/background/firstcard.webp';
import Fundo2 from '../../assets/image/background/secondcard.webp';
import Fundo3 from '../../assets/image/background/thirdcard.webp';
import Logo from '../../assets/image/logo-front.webp';

import 'swiper/css';
import './home.css';

/**
 * Página inicial da aplicação.
 *
 * Responsabilidades deste componente:
 * - apresentar a identidade visual principal;
 * - controlar a abertura da Sidebar;
 * - exibir o carrossel de imagens de fundo;
 * - disponibilizar o acesso à solicitação de orçamento.
 *
 * A autenticação e os dados reais do usuário serão integrados
 * posteriormente pelo backend.
 */
export default function Home() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    /*
     * Enquanto a autenticação não estiver conectada,
     * a Sidebar recebe null e apresenta as opções de acesso.
     */
    const currentUser: UserProfile | null = null;

    /*
     * O carrossel é apenas decorativo.
     *
     * Se o usuário tiver solicitado redução de movimento no sistema,
     * o autoplay é desativado para evitar movimento automático.
     */
    const prefersReducedMotion =
        window.matchMedia(
            '(prefers-reduced-motion: reduce)'
        ).matches;

    return (
        <div id="initial-card">
            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                user={currentUser}
            />

            <main id="superposition">
                <div id="main-content">
                    <div id="barra-lateral">
                        <button
                            type="button"
                            className="btn-menu"
                            onClick={() => setIsSidebarOpen(true)}
                            aria-label="Abrir menu"
                            aria-expanded={isSidebarOpen}
                            aria-controls="menu-drawer"
                        >
                            <span aria-hidden="true"></span>
                            <span aria-hidden="true"></span>
                            <span aria-hidden="true"></span>
                        </button>
                    </div>

                    <div id="logo">
                        <img
                            src={Logo}
                            alt="Life Topografia"
                        />
                    </div>

                    <div id="text">
                        <h1>
                            Topografia de{' '}
                            <span className="highlight">
                                alto nível
                            </span>
                        </h1>
                    </div>

                    <div
                        className="divider-container"
                        aria-hidden="true"
                    >
                        <div className="line"></div>
                        <div className="rhombus"></div>
                        <div className="line"></div>
                    </div>

                    <p className="home-description">
                        Precisão, confiança e agilidade para
                        transformar projetos em realidade.
                        Trabalhamos com excelência em levantamentos
                        topográficos, georreferenciamento,
                        acompanhamento de obras e muito mais.
                    </p>

                    <div
                        className="divider-container"
                        aria-hidden="true"
                    >
                        <div className="line"></div>
                        <div className="rhombus"></div>
                        <div className="line"></div>
                    </div>

                    {/*
                     * A rota ainda é provisória porque a página
                     * definitiva de orçamento não está registrada
                     * no App.tsx.
                     *
                     * O backend poderá posteriormente definir o
                     * fluxo de envio/processamento dessa solicitação.
                     */}
                    <div id="btn-solicite">
                        <Link to="/teste">
                            SOLICITE UM ORÇAMENTO
                        </Link>
                    </div>
                </div>
            </main>

            {/*
             * As imagens não possuem informação necessária para
             * compreensão do conteúdo da página.
             *
             * O conteúdo textual já está disponível no elemento
             * principal, portanto o carrossel fica oculto para
             * tecnologias assistivas.
             */}
            <Swiper
                id="init-carrossel"
                modules={[Autoplay]}
                slidesPerView={1}
                spaceBetween={0}
                loop
                speed={3000}
                autoplay={
                    prefersReducedMotion
                        ? false
                        : {
                              delay: 8000,
                              disableOnInteraction: false,
                          }
                }
                aria-hidden="true"
            >
                <SwiperSlide>
                    <img
                        id="bg1"
                        src={Fundo1}
                        alt=""
                        loading="eager"
                    />
                </SwiperSlide>

                <SwiperSlide>
                    <img
                        id="bg2"
                        src={Fundo2}
                        alt=""
                        loading="lazy"
                    />
                </SwiperSlide>

                <SwiperSlide>
                    <img
                        id="bg3"
                        src={Fundo3}
                        alt=""
                        loading="lazy"
                    />
                </SwiperSlide>
            </Swiper>
        </div>
    );
}