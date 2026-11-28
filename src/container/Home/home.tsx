import { useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import { Link, useLocation } from "react-router-dom";

import { useAuth } from "../../hook/useAuth";
import { useLayout } from "../../hook/useLayout";

import Fundo1 from "../../assets/image/background/firstcard.webp";
import Fundo2 from "../../assets/image/background/secondcard.webp";
import Fundo3 from "../../assets/image/background/thirdcard.webp";
import Logo from "../../assets/image/logo-front.webp";

import "swiper/css";
import "./home.css";

const HOME_NAV_ITEMS = [
  { to: "/", label: "INÍCIO" },
  { to: "/sobre", label: "SOBRE NÓS" },
  { to: "/servicos", label: "SERVIÇOS" },
  { to: "/faq", label: "FAQ" },
  { to: "/chat", label: "CHAT" },
] as const;

/**
 * Página inicial da aplicação.
 *
 * Responsabilidades deste componente:
 * - apresentar a identidade visual principal;
 * - acionar a abertura da Sidebar compartilhada;
 * - exibir o carrossel de imagens de fundo;
 * - disponibilizar o acesso à solicitação de orçamento.
 */
export default function Home() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const { isSidebarOpen, openSidebar } = useLayout();
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);

  const normalizedPathname = pathname.toLowerCase();
  const displayName = user?.name.trim() || "Cliente";

  /*
   * O carrossel é apenas decorativo.
   *
   * Se o usuário tiver solicitado redução de movimento no sistema,
   * o autoplay é desativado para evitar movimento automático.
   */
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  return (
    <>
      <title>Home - Life Topografia</title>
      <meta
        name="description"
        content="Página inicial da Life Topografia, com informações sobre a empresa e seus serviços."
      />
      <div id="initial-card">
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
              width={1920}
              height={1345}
              loading="eager"
              fetchPriority="high"
            />
          </SwiperSlide>

          <SwiperSlide>
            <img
              id="bg2"
              src={Fundo2}
              alt=""
              width={1920}
              height={1108}
              loading="eager"
              decoding="async"
            />
          </SwiperSlide>

          <SwiperSlide>
            <img
              id="bg3"
              src={Fundo3}
              alt=""
              width={1920}
              height={1198}
              loading="eager"
              decoding="async"
            />
          </SwiperSlide>
        </Swiper>

        <main id="superposition">
          <div id="main-content">
            <header id="barra-lateral">
              <button
                type="button"
                className="btn-menu"
                onClick={openSidebar}
                aria-label="Abrir menu"
                aria-expanded={isSidebarOpen}
                aria-controls="menu-drawer"
              >
                <span aria-hidden="true"></span>
                <span aria-hidden="true"></span>
                <span aria-hidden="true"></span>
              </button>

              <div className="home-desktop-nav">
                <span className="home-desktop-logo-slot" aria-hidden="true" />

                <nav
                  className="home-desktop-links"
                  aria-label="Navegação principal"
                >
                  {HOME_NAV_ITEMS.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      className="home-desktop-link"
                      aria-current={
                        normalizedPathname === item.to ? "page" : undefined
                      }
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>

                {user ? (
                  <Link
                    to="/perfil"
                    className="home-user-pill"
                    aria-label={`Acessar perfil de ${displayName}`}
                  >
                    <span className="home-user-avatar" aria-hidden="true">
                      {user.avatarUrl && failedAvatarUrl !== user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt=""
                          onError={() =>
                            setFailedAvatarUrl(user.avatarUrl ?? null)
                          }
                        />
                      ) : (
                        displayName.charAt(0).toUpperCase()
                      )}
                    </span>
                    <span className="home-user-meta">
                      <span className="home-user-name">{displayName}</span>
                      <span className="home-user-cta">Acessar perfil</span>
                    </span>
                  </Link>
                ) : (
                  <Link to="/login" className="home-user-pill">
                    <span className="home-user-avatar" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
                      </svg>
                    </span>
                    <span className="home-user-meta">
                      <span className="home-user-name">Minha conta</span>
                      <span className="home-user-cta">Acessar perfil</span>
                    </span>
                  </Link>
                )}
              </div>
            </header>

            <section className="home-hero" aria-labelledby="home-hero-title">
              <div id="logo">
                <img
                  src={Logo}
                  alt="Life Topografia"
                  width={2413}
                  height={991}
                />
              </div>

              <div id="text">
                <h1 id="home-hero-title">
                  Topografia de <span className="highlight">alto nível</span>
                </h1>
              </div>

              <div className="divider-container" aria-hidden="true">
                <div className="line"></div>
                <div className="rhombus"></div>
                <div className="line"></div>
              </div>

              <p className="home-description">
                Precisão, confiança e agilidade para transformar projetos em
                realidade. Trabalhamos com excelência em levantamentos
                topográficos, georreferenciamento, acompanhamento de obras e
                muito mais.
              </p>

              <div id="btn-solicite">
                <Link to="/chat">SOLICITE UM ORÇAMENTO</Link>
              </div>
            </section>
          </div>
        </main>
      </div>
    </>
  );
}
