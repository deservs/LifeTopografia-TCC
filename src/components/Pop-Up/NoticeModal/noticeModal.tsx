import { useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../../../assets/image/logo-front.webp";

import "./noticeModal.css";

type NoticeModalProps = {
  buttonText: string;
  buttonLink?: string;
  code: string;
  popupTitle: string;
  message: string;
};

export default function NoticeModal(NoticeModalProps: NoticeModalProps) {
  const homeLinkRef = useRef<HTMLAnchorElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // A Home continua visível atrás do aviso, mas não deve receber cliques ou foco.
    const home = document.getElementById("initial-card");
    const wasInert = home?.inert ?? false;

    if (home) home.inert = true;
    homeLinkRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") navigate("/", { replace: true });
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      if (home) home.inert = wasInert;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [navigate]);

  return (
    <>
      {NoticeModalProps.code === "ERRO 404" && (
        <head>
          <title>Página não encontrada - Life Topografia</title>
          <meta
            name="description"
            content="A página solicitada não foi encontrada na plataforma Life Topografia."
          />
        </head>
      )}
      <div className="notice-modal-overlay">
        <section
          className="notice-modal-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="notice-modal-title"
          aria-describedby="notice-modal-description"
        >
          <div className="notice-modal-symbol" aria-hidden="true">
            <img src={logo} alt="Logo da LifeTopografia" />
          </div>

          <span className="notice-modal-code">{NoticeModalProps.code}</span>
          <h1 id="notice-modal-title">{NoticeModalProps.popupTitle}</h1>
          <p id="notice-modal-description">{NoticeModalProps.message}</p>

          <Link ref={homeLinkRef} className="notice-modal-action" to={`/${NoticeModalProps.buttonLink}`} replace>
            {NoticeModalProps.buttonText}
            <span aria-hidden="true">→</span>
          </Link>
        </section>
      </div>
    </>
  );
}
