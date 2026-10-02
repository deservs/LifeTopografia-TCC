import { useState, type ReactNode } from 'react';

import Sidebar from '../../components/Sidebar/sidebar';
import type { UserProfile } from '../../components/Sidebar/sidebar';
import Footer from '../../components/footer/footer';

import Logo from '../../assets/image/logo-front.webp';
import Obra from '../../assets/image/obra.webp';
import Nivelamento from '../../assets/image/leveling.webp';
import Terraplanagem from '../../assets/image/surfacing.webp';
import Acompanhamento from '../../assets/image/why-choose.webp';

import './services.css';

type ServiceCardData = {
    title: string;
    image: string;
    description: string;
    alternateDescription: string;
};

type TechnicalService = {
    title: string;
    description: string;
    icon: ReactNode;
};

const services: ServiceCardData[] = [
    {
        title: 'Locação de Obras',
        image: Obra,
        description:
            'Garantimos a exatidão na locação dos elementos da construção com equipamentos modernos e equipe especializada.',
        alternateDescription:
            'Posicionamento preciso dos elementos construtivos, garantindo que o projeto seja executado conforme a planta aprovada.',
    },
    {
        title: 'Verticalidade e Nivelamento',
        image: Nivelamento,
        description:
            'Fundamental para nivelar o terreno e garantir a estabilidade da construção com base em dados do subsolo.',
        alternateDescription:
            'Conferência de prumo e nivelamento de estruturas, garantindo a qualidade e a conformidade da obra.',
    },
    {
        title: 'Terraplanagem e Sondagem',
        image: Terraplanagem,
        description:
            'Fundamental para nivelar o terreno e garantir a estabilidade da construção com base em dados do subsolo.',
        alternateDescription:
            'Locação para execução de terraplenagem e pontos de sondagem, essenciais para fundações e estudos geotécnicos.',
    },
    {
        title: 'Acompanhamento Técnico de Obra',
        image: Acompanhamento,
        description:
            'Oferece dados em tempo real e correções técnicas durante a execução da obra para evitar desvios e retrabalhos.',
        alternateDescription:
            'Monitoramento técnico da obra com vistorias e medições que asseguram a execução fiel ao projeto.',
    },
];

const technicalServices: TechnicalService[] = [
    {
        title: 'Levantamento Topográfico',
        description:
            'Base para obras civis, projetos de loteamento, regularização de imóveis e estudos técnicos diversos.',
        icon: (
            <svg viewBox="0 0 48 48" aria-hidden="true">
                <path
                    d="M7 42V10l13-5v32L7 42Zm13-5 13-5V6L20 10v27Zm13-5 8-3V15l-8-3v20Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                />
                <circle
                    cx="31"
                    cy="15"
                    r="4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                />
                <path
                    d="M31 19v7"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                />
            </svg>
        ),
    },
    {
        title: 'Demarcação de Divisa',
        description:
            'Conferência de limites de propriedades com exatidão, evitando conflitos jurídicos e patrimoniais.',
        icon: (
            <svg viewBox="0 0 48 48" aria-hidden="true">
                <circle
                    cx="24"
                    cy="24"
                    r="10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                />
                <circle cx="24" cy="24" r="3" fill="currentColor" />
                <path
                    d="M24 5v8M24 35v8M5 24h8M35 24h8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                />
            </svg>
        ),
    },
    {
        title: 'Unificação, Desdobro e Usucapião',
        description:
            'Projetos técnicos para regularização fundiária, viabilizando legalmente alterações em matrículas de imóveis.',
        icon: (
            <svg viewBox="0 0 48 48" aria-hidden="true">
                <path
                    d="M24 7 17 20h14L24 7Zm-9 15-7 13h14l-7-13Zm18 0-7 13h14l-7-13Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                />
                <path
                    d="M24 7v29M10 36h28"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                />
            </svg>
        ),
    },
    {
        title: 'Cálculo de Volume',
        description:
            'Medição precisa de volumes de corte ou aterro em terrenos, essencial para planejamento de movimentações de solo.',
        icon: (
            <svg viewBox="0 0 48 48" aria-hidden="true">
                <path
                    d="M8 40V8M8 40h32"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                />
                <path
                    d="M14 40v-6M20 40v-4M26 40v-6M32 40v-4M38 40v-6M8 14h6M8 20h4M8 26h6M8 32h4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                />
            </svg>
        ),
    },
    {
        title: 'Georreferenciamento',
        description:
            'Atendimento à legislação do INCRA para regularização de imóveis rurais com precisão geográfica.',
        icon: (
            <svg viewBox="0 0 48 48" aria-hidden="true">
                <circle
                    cx="24"
                    cy="24"
                    r="18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                />
                <path
                    d="M6 24h36M24 6c5 5 7 11 7 18s-2 13-7 18M24 6c-5 5-7 11-7 18s2 13 7 18M10 14h28M10 34h28"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                />
            </svg>
        ),
    },
    {
        title: 'Levantamento Cadastral Urbano',
        description:
            'Atualização e mapeamento de edificações, loteamentos e infraestruturas urbanas para regularização junto aos órgãos competentes.',
        icon: (
            <svg viewBox="0 0 48 48" aria-hidden="true">
                <path
                    d="M7 42V20h12v22M19 42V11h12v31M31 42V17h10v25"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                />
                <path
                    d="M11 25h4M11 31h4M11 37h4M23 16h4M23 22h4M23 28h4M23 34h4M35 22h3M35 28h3M35 34h3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                />
            </svg>
        ),
    },
];

function ServiceCard({
    service,
}: {
    service: ServiceCardData;
}) {
    const [isFlipped, setIsFlipped] = useState(false);

    const handleFlip = () => {
        setIsFlipped((current) => !current);
    };

    return (
        <div className="service-card-wrapper">
            <button
                type="button"
                className={`service-card ${
                    isFlipped ? 'is-flipped' : ''
                }`}
                onClick={handleFlip}
                aria-expanded={isFlipped}
                aria-label={`${service.title}: ${
                    isFlipped
                        ? 'voltar para a frente do card'
                        : 'ver informações adicionais'
                }`}
            >
                <span className="service-card__inner">
                    <span className="service-card__face service-card__front">
                        <span className="service-card__content">
                            <span className="service-card__title">
                                {service.title}
                            </span>

                            <span className="service-card__description">
                                {service.description}
                            </span>
                        </span>

                        <span className="service-card__image">
                            <img
                                src={service.image}
                                alt=""
                            />

                            <span
                                className="service-card__image-overlay"
                                aria-hidden="true"
                            />
                        </span>

                        <span
                            className="service-card__arrow"
                            aria-hidden="true"
                        >
                            →
                        </span>
                    </span>

                    <span className="service-card__face service-card__back">
                        <span className="service-card__image">
                            <img
                                src={service.image}
                                alt=""
                            />
                        </span>

                        <span className="service-card__content">
                            <span className="service-card__title">
                                {service.title}
                            </span>

                            <span className="service-card__description">
                                {service.alternateDescription}
                            </span>
                        </span>

                        <span
                            className="service-card__arrow"
                            aria-hidden="true"
                        >
                            ←
                        </span>
                    </span>
                </span>
            </button>
        </div>
    );
}

export default function Services() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    /*
     * A autenticação ainda será conectada ao backend.
     * Até lá, a Sidebar permanece no estado de visitante.
     */
    const currentUser: UserProfile | null = null;

    return (
        <div className="services-page">
            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                user={currentUser}
            />

            <header className="services-header">
                <button
                    type="button"
                    className="services-menu-button"
                    onClick={() => setIsSidebarOpen(true)}
                    aria-label="Abrir menu"
                    aria-expanded={isSidebarOpen}
                    aria-controls="menu-drawer"
                >
                    <span />
                    <span />
                    <span />
                </button>

                <img
                    src={Logo}
                    alt="Life Topografia"
                    className="services-header__logo"
                />
            </header>

            <main className="services-main">
                <section className="services-intro">
                    <div
                        className="services-title-divider"
                        aria-hidden="true"
                    >
                        <span />
                        <h1>Serviços</h1>
                        <span />
                    </div>

                    <p>
                        Serviços essenciais para garantir precisão,
                        alinhamento e segurança na execução de obras de
                        pequeno, médio ou grande porte.
                    </p>
                </section>

                <section
                    className="services-featured"
                    aria-label="Principais serviços"
                >
                    {services.map((service) => (
                        <ServiceCard
                            key={service.title}
                            service={service}
                        />
                    ))}
                </section>

                <section className="technical-services">
                    <div className="technical-services__heading">
                        <h2>Levantamento Técnico</h2>

                        <p>
                            Serviços topográficos para regularização,
                            documentação, cálculos de área e volume, entre
                            outros fins legais e técnicos.
                        </p>
                    </div>

                    <div className="technical-services__list">
                        {technicalServices.map((service) => (
                            <article
                                className="technical-service"
                                key={service.title}
                            >
                                <div className="technical-service__icon">
                                    {service.icon}
                                </div>

                                <h3>{service.title}</h3>

                                <div
                                    className="technical-service__divider"
                                    aria-hidden="true"
                                />

                                <p>{service.description}</p>
                            </article>
                        ))}
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}