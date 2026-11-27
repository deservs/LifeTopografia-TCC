import type { ReactNode } from "react";

import HistoryImage from "../../assets/image/cards/history-part.webp";
import WhyChooseImage from "../../assets/image/cards/why-choose.webp";

import "./about.css";

interface AboutPillar {
  title: string;
  description: string;
  icon: ReactNode;
}

const HISTORY_HIGHLIGHTS: readonly string[] = [
  "Atuação em obras urbanas e rurais com tecnologia de ponta.",
  "Equipe especializada, sempre pronta para enfrentar os desafios mais complexos.",
  "Soluções sob medida para cada cliente, com atendimento personalizado.",
];

const WHY_PILLARS: readonly AboutPillar[] = [
  {
    title: "Tecnologia de alta precisão",
    description:
      "Equipamentos e softwares modernos que garantem medições exatas e seguras, com total confiabilidade técnica.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 2.5a6.5 6.5 0 0 0-6.5 6.5c0 4.6 6.5 11 6.5 11s6.5-6.4 6.5-11A6.5 6.5 0 0 0 12 2.5Zm0 8.8a2.3 2.3 0 1 1 0-4.6 2.3 2.3 0 0 1 0 4.6Z"
          fill="currentColor"
        />
        <ellipse
          cx="12"
          cy="20.5"
          rx="6.2"
          ry="1.5"
          stroke="currentColor"
          strokeWidth="1.6"
        />
      </svg>
    ),
  },
  {
    title: "Equipe especializada",
    description:
      "Profissionais experientes, preparados para atender obras de pequeno, médio ou grande porte com excelência.",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 11.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-6 1a2.3 2.3 0 1 0 0-4.6 2.3 2.3 0 0 0 0 4.6Zm12 0a2.3 2.3 0 1 0 0-4.6 2.3 2.3 0 0 0 0 4.6ZM12 13c-2.67 0-5.5 1.34-5.5 3.8V19h11v-2.2c0-2.46-2.83-3.8-5.5-3.8Zm-6.8 1.2c-1.8 0-3.7.9-3.7 2.7V19h3.9v-2.1c0-1.08.45-2 1.19-2.66-.45-.03-.93-.04-1.39-.04Zm13.6 0c-.46 0-.94.01-1.39.04.74.66 1.19 1.58 1.19 2.66V19h3.9v-2.1c0-1.8-1.9-2.7-3.7-2.7Z" />
      </svg>
    ),
  },
  {
    title: "Atendimento personalizado",
    description:
      "Suporte ágil, diálogo constante e soluções sob medida para atender cada cliente com total transparência.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 3.5c-4.97 0-9 3.58-9 8 0 2.08.89 3.98 2.36 5.4L4.2 20.5l4.02-1.4c1.18.42 2.45.65 3.78.65 4.97 0 9-3.58 9-8s-4.03-8.25-9-8.25Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <circle cx="8.5" cy="11.6" r="1.15" fill="currentColor" />
        <circle cx="12" cy="11.6" r="1.15" fill="currentColor" />
        <circle cx="15.5" cy="11.6" r="1.15" fill="currentColor" />
      </svg>
    ),
  },
  {
    title: "Compromisso com prazos",
    description:
      "Garantimos agilidade e responsabilidade na entrega dos serviços, cumprindo cronogramas com qualidade.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle
          cx="12"
          cy="12"
          r="8.75"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M12 7.2v5l3.5 2.1"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

function CheckCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M8.5 12.3 10.9 14.7 15.8 9.6"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PinLocalizacao({ size = 24, color = "#11499E", ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      {...props}
    >
      <path
        d="M19 47.5C13.5 49 10 51.3 10 54C10 58.4 19.8 62 32 62C44.2 62 54 58.4 54 54C54 51.3 50.5 49 45 47.5"
        stroke={color}
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M32 4C20.954 4 12 12.954 12 24C12 37.5 29.2 51.8 30.8 53.1C31.5 53.65 32.5 53.65 33.2 53.1C34.8 51.8 52 37.5 52 24C52 12.954 43.046 4 32 4ZM32 31C36.418 31 40 27.418 40 23C40 18.582 36.418 15 32 15C27.582 15 24 18.582 24 23C24 27.418 27.582 31 32 31Z"
        fill={color}
      />
    </svg>
  );
}

export default function About() {
  return (
    <div className="about-page">
      <main className="about-main">
        <div className="about-intro">
          <div className="about-title-divider">
            <span aria-hidden="true" />
            <h1>A LifeTopografia</h1>
            <span aria-hidden="true" />
          </div>
        </div>

        <section
          className="about-card about-card--history"
          aria-labelledby="about-history-title"
        >
          <img
            src={HistoryImage}
            alt="Identidade visual da Life Topografia sobre obra"
            className="about-card__image about-card__image--history"
            decoding="async"
            draggable={false}
          />

          <h2 id="about-history-title" className="about-card__subtitle">
            Nossa História:
          </h2>

          <p className="about-card__lead">
            Fundada em 1993, a Life Topografia é uma empresa especializada na
            realização de levantamentos topográficos urbanos e rurais. Ao longo
            de mais de três décadas de experiência, consolidamos nossa presença
            no mercado, sendo reconhecidos pela precisão e pela qualidade dos
            nossos serviços. Comprometidos com a inovação, utilizamos a mais
            alta tecnologia para garantir que cada projeto seja executado com
            excelência.
          </p>

          <ul className="about-check-list">
            {HISTORY_HIGHLIGHTS.map((highlight) => (
              <li key={highlight} className="about-check-list__item">
                <span className="about-check-list__icon">
                  <CheckCircleIcon />
                </span>
                <span>{highlight}</span>
              </li>
            ))}
          </ul>

          <p className="about-card__closing">
            Ao longo dos anos, a Life Topografia se tornou sinônimo de qualidade
            e confiabilidade, sempre com o compromisso de transformar projetos
            em realidade, respeitando prazos e orçamentos.
          </p>
        </section>

        <section
          className="about-card about-card--why"
          aria-labelledby="about-why-title"
        >
          <img
            src={WhyChooseImage}
            alt="Estação total de alta precisão da Life Topografia"
            className="about-card__image about-card__image--why"
            loading="lazy"
            decoding="async"
            draggable={false}
          />

          <h2 id="about-why-title" className="about-card__subtitle">
            Por que escolher a Life Topografia?
          </h2>

          <p className="about-card__lead">
            Com um histórico sólido em obras urbanas e rurais, a Life Topografia
            se destaca pela precisão, inovação e compromisso com resultados.
            Atuamos com tecnologia de ponta e equipe altamente qualificada para
            oferecer soluções que vão além do esperado.
          </p>

          <ul className="about-pillars-list">
            {WHY_PILLARS.map((pillar) => (
              <li key={pillar.title} className="about-pillar">
                <div className="about-pillar__icon">{pillar.icon}</div>
                <div className="about-pillar__body">
                  <h3>{pillar.title}</h3>
                  <p>{pillar.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
        <section
          className="about-card about-card--location"
          aria-labelledby="about-location-title"
        >
          <div className="about-location">
            <div className="about-location__header">
              <PinLocalizacao
                size={42}
                color="#11499E"
                className="about-location__icon"
                aria-hidden="true"
              />
              <h2 id="about-location-title" className="about-location__title">
                NOSSA SEDE
              </h2>
              <p className="about-location__address">
                Rua das Rosas, 688 - Parque Sinai
                <br />
                Santana de Parnaíba/SP, 06532-320.
              </p>
            </div>

            <iframe
              className="about-location__map"
              title="Localização da sede da Life Topografia"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3660.5821149075377!2d-46.881873225630535!3d-23.439458078884147!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94cf1ccb74078913%3A0x65484879783df94a!2sR.%20das%20Rosas%2C%20688%20-%20Parque%20Sinai%2C%20Santana%20de%20Parna%C3%ADba%20-%20SP%2C%2006532-320!5e0!3m2!1spt-BR!2sbr!4v1795741980258!5m2!1spt-BR!2sbr"
              allowFullScreen={false}
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        </section>
      </main>
    </div>
  );
}
