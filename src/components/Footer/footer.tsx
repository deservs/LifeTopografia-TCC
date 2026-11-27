import Logo from "../../assets/image/logo-front.webp";
import "./footer.css";

export const Footer = () => {
  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer id="footer-container">
      <div id="footer-content">
        <div id="footer-logo">
          <img
            src={Logo}
            alt="Life Topografia"
            width={2413}
            height={991}
            loading="lazy"
          />
        </div>

        <address id="footer-address">
          <span className="footer-section-label">LOCALIZAÇÃO</span>
          <p>Rua das Rosas, 688 – Parque Sinai</p>
          <p>Santana de Parnaíba/SP, 06532-320</p>
        </address>

        <address id="footer-contact">
          <span className="footer-section-label">CONTATO</span>
          <p>
            <strong>Telefone:</strong> (11) 96520-5244
          </p>
          <p>
            <strong>Email:</strong> contato@lifetopografia.com.br
          </p>
        </address>

        <div className="footer-top-action">
          <button
            type="button"
            className="footer-back-to-top"
            onClick={handleScrollToTop}
            aria-label="Voltar ao topo"
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 19V5" />
              <polyline points="5 12 12 5 19 12" />
            </svg>
            <span>Topo</span>
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
