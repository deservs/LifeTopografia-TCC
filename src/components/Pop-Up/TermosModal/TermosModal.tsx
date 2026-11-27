import { useEffect, useRef, useState } from "react";
import "./TermosModal.css";

export type TermosModalTab = "termos" | "privacidade";

export interface TermosModalProps {
  isOpen: boolean;
  initialTab?: TermosModalTab;
  onClose: () => void;
  onAccept: () => void;
}

export default function TermosModal({
  isOpen,
  initialTab = "termos",
  onClose,
  onAccept,
}: TermosModalProps) {
  const [activeTab, setActiveTab] = useState<TermosModalTab>(initialTab);
  const bodyRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab(initialTab);
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (!isOpen) return;
    if (bodyRef.current) {
      bodyRef.current.scrollTop = 0;
    }
  }, [isOpen, activeTab]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="termos-modal-overlay" onClick={onClose}>
      <section
        className="termos-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="termos-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="termos-modal-header">
          <div className="termos-modal-heading">
            <span className="termos-modal-badge">
              LIFETOPOGRAFIA • DOCUMENTAÇÃO LEGAL
            </span>
            <h2 id="termos-modal-title">
              {activeTab === "termos"
                ? "Termos de Uso da Plataforma"
                : "Política de Privacidade (LGPD)"}
            </h2>
            <p className="termos-modal-updated">
              Última atualização: Novembro de 2026
            </p>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            className="termos-modal-close"
            onClick={onClose}
            aria-label="Fechar janela"
            title="Fechar"
          >
            ✕
          </button>
        </header>

        <div
          className="termos-modal-tabs"
          role="tablist"
          aria-label="Documentos legais da LifeTopografia"
        >
          <button
            type="button"
            id="tab-btn-termos"
            role="tab"
            aria-selected={activeTab === "termos"}
            aria-controls="panel-termos"
            className={`termos-modal-tab ${activeTab === "termos" ? "is-active" : ""}`}
            onClick={() => setActiveTab("termos")}
          >
            Termos de Uso
          </button>

          <button
            type="button"
            id="tab-btn-privacidade"
            role="tab"
            aria-selected={activeTab === "privacidade"}
            aria-controls="panel-privacidade"
            className={`termos-modal-tab ${activeTab === "privacidade" ? "is-active" : ""}`}
            onClick={() => setActiveTab("privacidade")}
          >
            Política de Privacidade
          </button>
        </div>

        <div className="termos-modal-body" ref={bodyRef}>
          {activeTab === "termos" ? (
            <div
              id="panel-termos"
              role="tabpanel"
              aria-labelledby="tab-btn-termos"
              className="termos-modal-document"
            >
              <p className="termos-doc-lead">
                Estes Termos de Uso regulam o acesso e a utilização dos serviços
                digitais da plataforma <strong>LifeTopografia</strong>,
                destinados à solicitação de orçamentos topográficos, atendimento
                técnico, leitura automatizada de certidões de matrícula de
                imóveis e geração assistida de arquivos CAD/DXF.
              </p>

              <section className="termos-doc-section">
                <h3>1. Aceitação dos Termos</h3>
                <p>
                  Ao concluir seu cadastro ou utilizar qualquer funcionalidade da
                  LifeTopografia, o usuário declara ter lido, compreendido e
                  concordado integralmente com as condições aqui estabelecidas e
                  com a legislação brasileira vigente. Caso não concorde com
                  qualquer disposição, não deverá prosseguir com o registro ou
                  uso da plataforma.
                </p>
              </section>

              <section className="termos-doc-section">
                <h3>2. Cadastro, Modalidades de Conta e Segurança</h3>
                <p>
                  A plataforma disponibiliza o cadastro nas modalidades{" "}
                  <strong>Pessoa Física</strong> e <strong>Empresa</strong>. O
                  usuário compromete-se a fornecer informações verdadeiras,
                  completas e atualizadas, incluindo razão social/nome, endereço
                  de e-mail válido e, quando aplicável à conta empresarial,
                  número de CNPJ regularizado.
                </p>
                <ul>
                  <li>
                    A ativação da conta depende da confirmação do endereço de
                    e-mail informado no ato do registro.
                  </li>
                  <li>
                    As credenciais de acesso são pessoais e intransferíveis,
                    sendo o usuário integralmente responsável pelas ações
                    realizadas sob sua conta.
                  </li>
                </ul>
              </section>

              <section className="termos-doc-section">
                <h3>3. Envio de Matrículas e Processamento de Arquivos CAD/DXF</h3>
                <p>
                  O usuário poderá submeter certidões de matrícula de imóveis,
                  memoriais descritivos ou documentos equivalentes em formato
                  PDF para extração de coordenadas, azimutes, distâncias e
                  geração preliminar de desenhos vetoriais em formato{" "}
                  <strong>CAD/DXF</strong>, bem como para análise pela equipe de
                  agrimensura.
                </p>
                <p>
                  O usuário declara possuir autorização legítima para o envio dos
                  documentos submetidos e reconhece que a precisão da extração
                  automatizada depende diretamente da legibilidade, integridade
                  e qualidade gráfica do arquivo original.
                </p>
              </section>

              <section className="termos-doc-section">
                <h3>4. Responsabilidade Técnica sobre os Arquivos Gerados</h3>
                <div className="termos-doc-callout">
                  <strong>Aviso de Responsabilidade Profissional:</strong> Os
                  arquivos CAD/DXF, polígonos, vértices e coordenadas gerados ou
                  convertidos pela plataforma constituem{" "}
                  <strong>ferramenta de apoio técnico e pré-análise</strong>.
                </div>
                <p>
                  A conferência geométrica, o ajuste geodésico (incluindo
                  datum SIRGAS 2000 e projeção UTM), a validação de divisas e
                  confrontações, o levantamento em campo e a emissão de Anotação
                  de Responsabilidade Técnica (ART/TRT) perante o CREA ou CFT
                  competente são de responsabilidade exclusiva do profissional
                  legalmente habilitado que utilizar os arquivos para fins
                  cartoriais, judiciais, urbanísticos ou de engenharia.
                </p>
              </section>

              <section className="termos-doc-section">
                <h3>5. Orçamentos e Pagamentos via Gateway Externo</h3>
                <p>
                  As propostas técnicas e orçamentos emitidos pelo atendimento
                  da LifeTopografia apresentam escopo, prazo e valor total de
                  forma transparente. Quando aprovados pelo cliente, os
                  pagamentos são processados exclusivamente em ambiente de{" "}
                  <strong>gateway de pagamento externo certificado</strong>,
                  sujeito aos termos de operação e políticas antifraude da
                  instituição processadora.
                </p>
              </section>

              <section className="termos-doc-section">
                <h3>6. Conduta, Propriedade Intelectual e Limitações</h3>
                <p>
                  É vedado utilizar a plataforma para fins ilícitos, tentar
                  burlar mecanismos de proteção automatizada, realizar engenharia
                  reversa da aplicação ou submeter arquivos maliciosos. Todo o
                  código-fonte, interface, marca e identidade visual pertencem à
                  LifeTopografia.
                </p>
              </section>

              <section className="termos-doc-section">
                <h3>7. Foro e Legislação Aplicável</h3>
                <p>
                  Estes Termos são regidos pelas leis da República Federativa do
                  Brasil, elegendo-se o foro do domicílio do usuário ou o da
                  sede da prestadora de serviços, conforme aplicável ao caso
                  concreto, para dirimir eventuais controvérsias.
                </p>
              </section>
            </div>
          ) : (
            <div
              id="panel-privacidade"
              role="tabpanel"
              aria-labelledby="tab-btn-privacidade"
              className="termos-modal-document"
            >
              <p className="termos-doc-lead">
                A <strong>LifeTopografia</strong> valoriza a proteção de dados
                pessoais e atua em conformidade com a{" "}
                <strong>
                  Lei Geral de Proteção de Dados Pessoais (LGPD — Lei nº
                  13.709/2018)
                </strong>
                . Esta política explica de forma clara quais dados tratamos,
                como os protegemos e quais são os seus direitos.
              </p>

              <section className="termos-doc-section">
                <h3>1. Minimização de Dados e Não Coleta Direta de CPF</h3>
                <div className="termos-doc-callout">
                  <strong>Compromisso de Privacidade:</strong> A LifeTopografia{" "}
                  <strong>não coleta CPF diretamente</strong> em seus
                  formulários de cadastro ou autenticação de usuários.
                </div>
                <p>
                  Seguindo o princípio da necessidade (Art. 6º, III, da LGPD),
                  solicitamos apenas os dados indispensáveis para autenticação e
                  prestação do atendimento técnico:
                </p>
                <ul>
                  <li>
                    <strong>Dados cadastrais de Pessoa Física:</strong> nome
                    completo, endereço de e-mail e senha armazenada em formato
                    criptografado (hash seguro).
                  </li>
                  <li>
                    <strong>Dados cadastrais de Empresa:</strong> nome do
                    responsável/empresa, e-mail corporativo, senha e número de
                    CNPJ para identificação da pessoa jurídica.
                  </li>
                  <li>
                    <strong>Documentos e arquivos enviados:</strong> certidões
                    de matrícula em PDF e arquivos DXF compartilhados
                    voluntariamente pelo usuário no chat ou conversor técnico.
                  </li>
                  <li>
                    <strong>Segurança e prevenção a abusos:</strong> verificação
                    de integridade via Cloudflare Turnstile para impedir
                    cadastros automatizados.
                  </li>
                </ul>
              </section>

              <section className="termos-doc-section">
                <h3>2. Finalidade e Base Legal do Tratamento</h3>
                <p>
                  Os dados informados são tratados com respaldo no Art. 7º da
                  LGPD (execução de contrato, procedimentos preliminares de
                  orçamento, cumprimento de obrigação legal e legítimo interesse
                  na segurança da conta) exclusivamente para:
                </p>
                <ul>
                  <li>
                    Criar, autenticar e manter a conta do usuário com verificação
                    por e-mail;
                  </li>
                  <li>
                    Viabilizar o atendimento técnico, análise de matrículas e
                    geração de arquivos CAD/DXF;
                  </li>
                  <li>
                    Emitir propostas comerciais e encaminhar a cobrança de
                    serviços contratados.
                  </li>
                </ul>
              </section>

              <section className="termos-doc-section">
                <h3>3. Pagamentos Seguros via Gateway Externo</h3>
                <p>
                  A LifeTopografia não solicita nem armazena números completos
                  de cartão de crédito, códigos de segurança (CVV) ou
                  credenciais bancárias em seus servidores. Todas as transações
                  financeiras ocorrem diretamente por meio de{" "}
                  <strong>gateway de pagamento externo</strong> criptografado e
                  em conformidade com os padrões de segurança do setor (PCI-DSS).
                </p>
              </section>

              <section className="termos-doc-section">
                <h3>4. Compartilhamento e Segurança da Informação</h3>
                <p>
                  Seus dados pessoais não são comercializados nem cedidos a
                  terceiros para fins publicitários. O compartilhamento ocorre
                  apenas com provedores essenciais de infraestrutura
                  (autenticação, banco de dados, proteção anti-bot e gateway de
                  pagamento), sob estritos controles de acesso e confidencialidade.
                </p>
                <p>
                  Recomendamos que o usuário utilize senhas fortes e não
                  compartilhe documentos contendo informações de terceiros sem
                  pertinência com o serviço topográfico solicitado.
                </p>
              </section>

              <section className="termos-doc-section">
                <h3>5. Retenção e Direitos do Titular (Art. 18 da LGPD)</h3>
                <p>
                  Os dados permanecem armazenados apenas pelo tempo necessário
                  ao cumprimento das finalidades descritas ou exigências legais
                  aplicáveis. A qualquer momento, o titular pode solicitar:
                </p>
                <ul>
                  <li>
                    Confirmação da existência de tratamento e acesso aos dados
                    cadastrados;
                  </li>
                  <li>
                    Correção de dados incompletos, inexatos ou desatualizados;
                  </li>
                  <li>
                    Eliminação ou anonimização de dados tratados mediante
                    consentimento, bem como a revogação deste, observadas as
                    obrigações legais de guarda.
                  </li>
                </ul>
              </section>

              <section className="termos-doc-section">
                <h3>6. Canal de Atendimento ao Titular</h3>
                <p>
                  Dúvidas, solicitações referentes à privacidade ou requisições
                  previstas na LGPD podem ser encaminhadas diretamente pelos
                  canais oficiais de atendimento da LifeTopografia disponíveis
                  na plataforma após o acesso à conta ou na página institucional.
                </p>
              </section>
            </div>
          )}
        </div>

        <footer className="termos-modal-footer">
          <button
            type="button"
            className="termos-btn-secondary"
            onClick={onClose}
          >
            Fechar
          </button>

          <button
            type="button"
            className="termos-btn-primary"
            onClick={onAccept}
          >
            Li e Aceito os Termos
          </button>
        </footer>
      </section>
    </div>
  );
}
