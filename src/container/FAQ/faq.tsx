import { useState, useEffect, useId } from "react";
import { Link } from "react-router-dom";
import Sidebar, { type UserProfile } from "../../components/Sidebar/sidebar";
import Footer from "../../components/Footer/footer";
import Logo from "../../assets/image/logo-front.webp";
import FundoHeader from "../../assets/image/background/firstcard.webp";
import { SerchDataUser } from "../../lib/supabase/auth";
import "./faq.css";

interface FaqItem {
  id: number;
  question: string;
  answer: string;
  category: "geral" | "tecnico" | "orcamento" | "seguranca";
}

const FAQ_DATA: FaqItem[] = [
  {
    id: 1,
    question: "1. O que é a plataforma LifeTopografia?",
    answer:
      "A LifeTopografia é uma plataforma web responsiva desenvolvida para simplificar e organizar a interação entre clientes e a empresa Nilton Santos Pinto Topografia. O sistema centraliza o envio de documentos, a solicitação de orçamentos, o atendimento via chat e o acompanhamento das etapas do seu projeto.",
    category: "geral",
  },
  {
    id: 2,
    question:
      "2. A plataforma realiza o levantamento topográfico e a medição do terreno diretamente pelo site?",
    answer:
      "Não. A plataforma atua exclusivamente como uma ferramenta digital de apoio e sintetização de informações. As medições físicas, levantamentos planialtimétricos e serviços de campo continuam sendo executados presencialmente pelo topógrafo responsável. O site agiliza a análise prévia e a preparação técnica dos dados.",
    category: "tecnico",
  },
  {
    id: 3,
    question: "3. Para que serve o envio da certidão de matrícula em PDF?",
    answer:
      "Ao anexar o arquivo da matrícula do seu imóvel em PDF, nosso sistema utiliza tecnologia de leitura automatizada para extrair os dados e descrições do terreno. Essas informações são convertidas em instruções técnicas para o software AutoCAD (via rotinas LISP), reduzindo o tempo de digitação manual e agilizando a elaboração do projeto técnico pelo profissional.",
    category: "tecnico",
  },
  {
    id: 4,
    question: "4. Como funciona a solicitação e aprovação de orçamentos?",
    answer:
      "Após você se cadastrar e enviar as informações básicas do seu terreno ou projeto, o topógrafo analisa a complexidade do serviço e emite o orçamento detalhado. Você recebe a notificação no painel do sistema e pode tirar dúvidas diretamente com o profissional por meio do nosso chat integrado.",
    category: "orcamento",
  },
  {
    id: 5,
    question: "5. Quais são as formas de pagamento aceitas na plataforma?",
    answer:
      "Após a aprovação formal do orçamento, o pagamento pode ser efetuado diretamente pelo site com total segurança via PIX ou cartão de crédito, através da integração com o processador de pagamentos homologado SumUp.",
    category: "orcamento",
  },
  {
    id: 6,
    question: "6. Como acompanho o andamento do meu serviço?",
    answer:
      "Na sua área restrita de cliente, você tem acesso ao painel de status do projeto, podendo verificar se o trabalho está em avaliação, agendado, em processo de medição ou concluído.",
    category: "geral",
  },
  {
    id: 7,
    question: "7. Meus dados e documentos estão seguros no site?",
    answer:
      "Sim. A plataforma utiliza banco de dados seguro (PostgreSQL) e mecanismos de criptografia para proteger seus dados cadastrais, arquivos enviados e mensagens de chat, em total observância à Lei Geral de Proteção de Dados (LGPD).",
    category: "seguranca",
  },
];

export default function FAQ() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [openItemIds, setOpenItemIds] = useState<number[]>([1]); // Primeira pergunta aberta por padrão
  const [searchTerm, setSearchTerm] = useState("");

  const searchInputId = useId();

  // Carrega os dados do perfil autenticado para manter a Sidebar integrada
  useEffect(() => {
    let active = true;
    async function loadUserData() {
      try {
        const cached = await SerchDataUser();
        if (cached && active) {
          const profileData = JSON.parse(cached);
          setUserProfile({
            name: profileData.nome_ou_razao || "Cliente",
            role: profileData.tipo_perfil || "pessoa",
            avatarUrl: profileData.foto_url,
          });
        }
      } catch (err) {
        console.warn("Usuário não autenticado na página FAQ:", err);
      }
    }
    void loadUserData();
    return () => {
      active = false;
    };
  }, []);

  const toggleItem = (id: number) => {
    setOpenItemIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const expandAll = () => {
    setOpenItemIds(FAQ_DATA.map((item) => item.id));
  };

  const collapseAll = () => {
    setOpenItemIds([]);
  };

  const filteredFaq = FAQ_DATA.filter(
    (item) =>
      item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="faq-page">
      {/* Sidebar integrada padrão */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        user={userProfile}
      />

      {/* Topbar com background padronizado, logo e menu hambúrguer */}
      <header
        className="faq-topbar"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.45)), url(${FundoHeader})`,
        }}
      >
        <button
          type="button"
          className="faq-menu-button"
          onClick={() => setIsSidebarOpen(true)}
          aria-label="Abrir menu"
          aria-expanded={isSidebarOpen}
          aria-controls="menu-drawer"
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>

        <Link
          to="/"
          className="faq-topbar-logo"
          aria-label="Ir para a página inicial"
        >
          <img src={Logo} alt="Life Topografia" />
        </Link>
      </header>

      {/* Conteúdo Principal */}
      <main className="faq-main">
        {/* Cabeçalho de Título com Divisória Oficial */}
        <div className="faq-title-container">
          <span className="faq-badge">Central de Ajuda &amp; Dúvidas</span>
          <h1 className="faq-title">PERGUNTAS FREQUENTES</h1>
          <p className="faq-subtitle">
            Entenda como funciona a plataforma Life Topografia, o fluxo de envio
            de matrículas em PDF, emissão de orçamentos, execução presencial em
            campo e segurança das informações.
          </p>
          <div className="title-divider" aria-hidden="true">
            <span className="line" />
            <span className="rhombus" />
            <span className="line" />
          </div>
        </div>

        {/* Barra de Filtro e Controles de Acessibilidade */}
        <div className="faq-controls-bar">
          <div className="faq-search-box">
            <span className="search-icon" aria-hidden="true">
              🔍
            </span>
            <input
              id={searchInputId}
              type="search"
              placeholder="Pesquisar por palavra-chave (ex: matrícula, orçamento, SumUp, campo)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Buscar perguntas frequentes"
            />
            {searchTerm && (
              <button
                type="button"
                className="faq-clear-search"
                onClick={() => setSearchTerm("")}
                aria-label="Limpar busca"
              >
                ✕
              </button>
            )}
          </div>

          <div className="faq-actions-buttons">
            <button
              type="button"
              className="faq-action-btn"
              onClick={expandAll}
              title="Expandir todas as respostas"
            >
              Expandir todas
            </button>
            <button
              type="button"
              className="faq-action-btn"
              onClick={collapseAll}
              title="Recolher todas as respostas"
            >
              Recolher todas
            </button>
          </div>
        </div>

        {/* CONTAINER AZUL PRINCIPAL DO FAQ (CONFORME DESIGN SOLICITADO) */}
        <section
          className="faq-accordion-card"
          aria-label="Lista de Perguntas Frequentes"
        >
          <header className="faq-card-header">
            <div className="faq-card-header-info">
              <h2>Perguntas Frequentes (FAQ) – Life Topografia</h2>
              <span className="faq-card-count">
                {filteredFaq.length} de {FAQ_DATA.length} perguntas
              </span>
            </div>
          </header>

          <div className="faq-items-list" role="region" aria-live="polite">
            {filteredFaq.length > 0 ? (
              filteredFaq.map((item) => {
                const isOpen = openItemIds.includes(item.id);
                const buttonId = `faq-btn-${item.id}`;
                const panelId = `faq-panel-${item.id}`;

                return (
                  <article
                    key={item.id}
                    className={`faq-item ${isOpen ? "is-open" : ""}`}
                  >
                    <button
                      id={buttonId}
                      type="button"
                      className="faq-question-btn"
                      onClick={() => toggleItem(item.id)}
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                    >
                      <span className="faq-question-text">{item.question}</span>
                      <span
                        className={`faq-chevron-icon ${isOpen ? "is-rotated" : ""}`}
                        aria-hidden="true"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2.5"
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </span>
                    </button>

                    <div
                      id={panelId}
                      role="region"
                      aria-labelledby={buttonId}
                      className="faq-answer-wrapper"
                      style={{
                        display: isOpen ? "block" : "none",
                      }}
                    >
                      <div className="faq-answer-inner">
                        <p>{item.answer}</p>
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="faq-empty-state">
                <span className="empty-icon">🔎</span>
                <h3>Nenhuma pergunta encontrada</h3>
                <p>
                  Não encontramos respostas correspondentes ao termo "
                  {searchTerm}".
                </p>
                <button
                  type="button"
                  className="btn-reset-search"
                  onClick={() => setSearchTerm("")}
                >
                  Ver todas as perguntas
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Card Inferior: Suporte & Contato */}
        <div className="faq-contact-card">
          <div className="faq-contact-text">
            <h3>Ainda tem dúvidas sobre o seu projeto?</h3>
            <p>
              Nossa equipe técnica e agrimensores estão prontos para analisar
              suas necessidades e elaborar o orçamento sob medida.
            </p>
          </div>
          <div className="faq-contact-actions">
            <Link to="/chat" className="btn-faq-chat">
              Falar com a Equipe no Chat →
            </Link>
            <Link to="/servicos" className="btn-faq-services">
              Conhecer Nossos Serviços
            </Link>
          </div>
        </div>
      </main>

      {/* Footer padrão do site */}
      <Footer />
    </div>
  );
}
