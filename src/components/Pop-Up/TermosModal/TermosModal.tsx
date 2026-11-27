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
                ? "Termos e Condições de Uso"
                : "Política de Privacidade e Proteção de Dados (LGPD)"}
            </h2>
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
            Termos e Condições de Uso
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
            Política de Privacidade e Proteção de Dados (LGPD)
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
              <section className="termos-doc-section">
                <h3>14.1. PREÂMBULO</h3>
                <p>
                  <strong>Bem-vindo(a) à plataforma LifeTopografia!</strong>
                </p>
                <p>
                  O sistema LifeTopografia é um ecossistema tecnológico web
                  desenvolvido pelos discentes do Curso Técnico em
                  Desenvolvimento de Sistemas da ETEC Jardim Ângela (Centro
                  Paula Souza), em colaboração com a empresa Nilton Santos Pinto
                  Topografia (CNPJ nº 33.175.223/0001-49, sediada em Santana de
                  Parnaíba – SP).
                </p>
                <p>
                  A plataforma tem como finalidade exclusiva sintetizar,
                  organizar e centralizar as informações técnicas fornecidas
                  pelo próprio cliente (tais como documentos de matrícula de
                  terrenos em formato PDF), automatizando o processamento de
                  dados para extração e conversão em arquivos dxf direcionados
                  ao software AutoCAD, além de viabilizar a comunicação direta
                  via chat, a visualização do mostruário de serviços e a gestão
                  de orçamentos e pagamentos.
                </p>
                <div className="termos-doc-callout">
                  <strong>Aviso de Limitação de Escopo:</strong> A plataforma
                  LifeTopografia atua unicamente como ferramenta de software para
                  organização de dados e apoio ao fluxo de trabalho do
                  profissional, não executando, gerindo ou substituindo as
                  medições técnicas de campo, levantamentos topográficos manuais
                  ou validações geodésicas.
                </div>
                <p>
                  Este documento de Termos e Condições de Uso (&ldquo;Termos&rdquo;)
                  rege o acesso e a utilização de todas as funcionalidades da
                  plataforma. Ao navegar ou cadastrar-se no sistema, você
                  declara ter lido, compreendido e aceito integralmente estas
                  condições.
                </p>
              </section>

              <section className="termos-doc-section">
                <h3>14.2.1. CONCEITOS BÁSICOS E DEFINIÇÕES</h3>
                <p>
                  Para fins destes Termos e Condições de Uso, consideram-se as
                  seguintes definições:
                </p>
                <ul>
                  <li>
                    <strong>Plataforma / Sistema:</strong> O sistema web
                    responsivo LifeTopografia, acessível via navegadores em
                    múltiplos dispositivos (computadores, tablets e
                    smartphones), desenvolvido para a organização de informações
                    e agilização de fluxos operacionais.
                  </li>
                  <li>
                    <strong>Usuário:</strong> Qualquer pessoa física ou jurídica
                    que acesse, navegue ou utilize os serviços disponibilizados
                    na plataforma, subdividido em Cliente e Administrador.
                  </li>
                  <li>
                    <strong>Cliente:</strong> O usuário proprietário ou
                    responsável por um imóvel que utiliza a plataforma para
                    enviar documentações (como matrículas em PDF), solicitar
                    orçamentos, acompanhar o status do projeto e comunicar-se
                    com a equipe técnica.
                  </li>
                  <li>
                    <strong>Administrador / Topógrafo:</strong> O profissional
                    técnico pertencente à empresa Nilton Santos Pinto
                    Topografia, responsável por analisar as informações
                    sintetizadas, emitir orçamentos, executar os projetos no
                    ambiente CAD e gerenciar o atendimento.
                  </li>
                  <li>
                    <strong>Matrícula em PDF:</strong> O documento oficial de
                    registro do imóvel emitido por Cartório de Registro de
                    Imóveis, fornecido diretamente pelo Cliente em formato
                    digital PDF para extração de dados.
                  </li>
                  <li>
                    <strong>Sintetização de Dados:</strong> O processo
                    automatizado realizado pelo software para ler, extrair e
                    organizar os dados contidos na matrícula PDF,
                    convertendo-os em arquivos dxf.
                  </li>
                  <li>
                    <strong>Arquivo DXF / AutoCAD:</strong> O arquivo dxf
                    facilita a troca de dados entre diferentes softwares de
                    design assistido por computador (CAD).
                  </li>
                  <li>
                    <strong>Conta de Acesso:</strong> Credencial individual e
                    intransferível (login e senha) criada pelo usuário para
                    acesso às áreas restritas e funcionalidades da plataforma.
                  </li>
                  <li>
                    <strong>Dados Pessoais:</strong> Qualquer informação
                    fornecida pelo Usuário capaz de identificá-lo (como nome,
                    CPF, e-mail e telefone), tratada em conformidade com a Lei
                    Geral de Proteção de Dados (LGPD).
                  </li>
                </ul>
              </section>

              <section className="termos-doc-section">
                <h3>14.2.2. SOBRE AS FUNCIONALIDADES E SINTETIZAÇÃO DE DADOS</h3>

                <h4>2.1. Funcionalidades da Plataforma</h4>
                <p>
                  A plataforma LifeTopografia disponibiliza aos seus usuários,
                  por meio de sua interface web responsiva, as seguintes
                  ferramentas centrais:
                </p>
                <ul className="termos-doc-alpha-list">
                  <li>
                    <strong>a) Módulo de Upload e Leitura de Matrículas:</strong>{" "}
                    Espaço para anexar certidões de matrícula em formato PDF
                    para extração e sintetização automatizadas de informações do
                    imóvel.
                  </li>
                  <li>
                    <strong>b) Geração de Arquivos:</strong> Conversão dos dados
                    lidos na matrícula em arquivos com extensão DXF, compatíveis
                    com o software AutoCAD.
                  </li>
                  <li>
                    <strong>c) Chat Dinâmico de Comunicação:</strong> Canal de
                    mensagens instantâneas para alinhamento técnico e troca de
                    informações diretas entre o Cliente e o Topógrafo.
                  </li>
                  <li>
                    <strong>
                      d) Mostruário e Acompanhamento de Serviços:
                    </strong>{" "}
                    Interface para visualização do portfólio de serviços,
                    acompanhamento de status de solicitações e histórico de
                    orçamentos.
                  </li>
                  <li>
                    <strong>e) Módulo de Pagamentos:</strong> Integração com a
                    API do Mercado Pago para viabilizar o pagamento digital de
                    orçamentos aprovados.
                  </li>
                </ul>

                <h4>2.2. Delimitação e Sintetização</h4>
                <p>
                  O Usuário reconhece que a plataforma LifeTopografia atua
                  exclusivamente como uma ferramenta de sintetização e
                  organização digital de dados pré-existentes. O software não
                  realiza medições físicas de campo, levantamentos topográficos
                  presenciais, georreferenciamento in loco ou validações
                  periciais.
                </p>

                <h4>2.3. Responsabilidade pelo Documento de Origem</h4>
                <p>
                  A precisão, clareza e validade dos dados sintetizados pelo
                  software dependem integralmente da qualidade, legibilidade e
                  autenticidade do arquivo PDF fornecido pelo Cliente. A
                  plataforma não se responsabiliza por erros decorrentes de
                  documentos rasurados, ilegíveis, incompletos ou adulterados
                  enviados pelo Cliente.
                </p>
              </section>

              <section className="termos-doc-section">
                <h3>
                  14.2.3. CONDIÇÕES DE ACESSO, CADASTRO E RESPONSABILIDADE PELOS
                  DOCUMENTOS
                </h3>

                <h4>3.1. Requisitos para Cadastro</h4>
                <p>
                  O acesso às áreas restritas da plataforma é permitido a pessoas
                  físicas capazes e pessoas jurídicas regularmente constituídas.
                  Cada usuário deverá manter uma única Conta de Acesso vinculada
                  ao seu número de CPF ou CNPJ.
                </p>

                <h4>3.2. Guarda de Credenciais</h4>
                <p>
                  O Usuário é o único responsável pela guarda, sigilo e uso
                  adequado de seu e-mail e senha de acesso. Qualquer ação
                  realizada na plataforma mediante o uso das credenciais
                  cadastradas será presumida como efetuada pelo próprio usuário.
                </p>

                <h4>3.3. Responsabilidade pelos Arquivos Enviados</h4>
                <p>
                  O Cliente assume total e exclusiva responsabilidade civil e
                  criminal pela veracidade, exatidão, autenticidade e legalidade
                  dos documentos anexados no sistema (em especial as certidões
                  de matrícula de imóveis em PDF). A plataforma LifeTopografia e
                  a empresa parceira eximem-se de qualquer responsabilidade por
                  dados incorretos, omissões ou rasuras presentes nos documentos
                  fornecidos pelo Cliente.
                </p>
              </section>

              <section className="termos-doc-section">
                <h3>14.2.4. PROCESSAMENTO DE PAGAMENTOS E ORÇAMENTOS</h3>

                <h4>4.1. Emissão de Orçamentos</h4>
                <p>
                  Após a recepção dos dados do terreno e da matrícula em PDF, o
                  administrador (Topógrafo) avaliará a complexidade técnica e a
                  localização do imóvel para emitir o orçamento correspondente na
                  área do Cliente e no chat de atendimento.
                </p>

                <h4>4.2. Meios de Pagamento Integrados</h4>
                <p>
                  A aprovação e a quitação dos orçamentos serão processadas
                  diretamente na plataforma web por meio de integração com a API
                  homologada do Mercado Pago, aceitando pagamentos via PIX e
                  cartões de crédito.
                </p>

                <h4>4.3. Confirmação de Transação</h4>
                <p>
                  O agendamento presencial do serviço topográfico ou a liberação
                  da entrega dos trabalhos fica condicionado à confirmação e
                  compensação do pagamento pelo intermediador financeiro (Mercado
                  Pago).
                </p>
              </section>

              <section className="termos-doc-section">
                <h3>14.2.5. PROPRIEDADE INTELECTUAL E SEGURANÇA</h3>

                <h4>5.1. Direitos sobre a Aplicação</h4>
                <p>
                  Todos os direitos de propriedade intelectual sobre o software
                  LifeTopografia, incluindo o código-fonte, arquitetura web,
                  marca, layout de interface e as rotinas automatizadas de
                  conversão de dados de matrículas em arquivos DXF para AutoCAD
                  pertencem exclusivamente aos seus desenvolvedores (Grupo 2).
                </p>

                <h4>5.2. Vedações ao Usuário</h4>
                <p>
                  É expressamente proibido ao usuário copiar, modificar,
                  distribuir, alugar, sublicenciar, realizar engenharia reversa,
                  descompilar ou tentar extrair o código-fonte da aplicação sem
                  autorização prévia por escrito.
                </p>
              </section>

              <section className="termos-doc-section">
                <h3>14.2.6. ISENÇÃO DE RESPONSABILIDADE E FORO</h3>

                <h4>6.1. Limitação de Responsabilidade Técnica</h4>
                <p>
                  Por se tratar de uma ferramenta de sintetização digital, a
                  plataforma não garante que os dados extraídos de documentos
                  rasurados ou digitalizados em baixa qualidade sejam
                  convertidos sem necessidade de conferência técnica pelo
                  profissional.
                </p>

                <h4>6.2. Disponibilidade do Serviço</h4>
                <p>
                  A plataforma busca manter alta disponibilidade de acesso web,
                  porém não se responsabiliza por indisponibilidades temporárias
                  causadas por falhas na conexão de internet do usuário,
                  manutenção de servidores de hospedagem ou instabilidades em
                  APIs de terceiros (como Mercado Pago ou Cloudflare).
                </p>

                <h4>6.3. Foro Competente</h4>
                <p>
                  Para dirimir quaisquer controvérsias oriundas destes Termos,
                  as partes elegem o Foro da Comarca de Santana de Parnaíba /
                  São Paulo.
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
              <section className="termos-doc-section">
                <h3>15.1. DEFINIÇÕES E ESCOPO DA POLÍTICA</h3>
                <p>
                  Esta Política de Privacidade descreve como a plataforma web
                  responsiva LifeTopografia desenvolvida pelos discentes do
                  Curso Técnico em Desenvolvimento de Sistemas da ETEC Jardim
                  Ângela (Centro Paula Souza) em parceria com a empresa Nilton
                  Santos Pinto Topografia (CNPJ: 33.175.223/0001-49) coleta,
                  armazena, utiliza, compartilha e protege os dados pessoais dos
                  seus Usuários (Clientes e Administradores), em conformidade
                  integral com a Lei Geral de Proteção de Dados Pessoais (LGPD
                  – Lei nº 13.709/2018).
                </p>
              </section>

              <section className="termos-doc-section">
                <h3>15.2. DADOS PESSOAIS COLETADOS E ARMAZENAMENTO</h3>
                <p>
                  Para viabilizar a sintetização de informações técnicas e a
                  prestação dos serviços informativos e financeiros, a
                  plataforma coleta e armazena os seguintes dados no banco de
                  dados:
                </p>
                <ul>
                  <li>
                    <strong>Dados Cadastrais do Usuário:</strong> Nome completo,
                    número de CPF ou CNPJ, endereço de e-mail, telefone de
                    contato e senha de acesso armazenada em formato
                    criptografado.
                  </li>
                  <li>
                    <strong>
                      Dados do Imóvel e Documentação Técnica:
                    </strong>{" "}
                    Informações contidas nas certidões de matrícula enviadas em
                    formato PDF, coordenadas geográficas e dados descritivos
                    fornecidos diretamente pelo Cliente para sintetização e
                    conversão para arquivos dxf (AutoCAD).
                  </li>
                  <li>
                    <strong>Registros de Comunicação:</strong> Histórico de
                    mensagens enviadas e recebidas no chat interno da plataforma
                    entre Cliente e Topógrafo.
                  </li>
                  <li>
                    <strong>Registros Financeiros e de Transação:</strong>{" "}
                    Status de confirmação e identificadores de transações
                    processadas via API da intermediadora Mercado Pago (não
                    sendo armazenados na plataforma os dados sensíveis de cartão
                    de crédito).
                  </li>
                  <li>
                    <strong>Registros de Acesso (Logs):</strong> Endereço IP,
                    data, horário e tipo de navegador utilizado para acesso ao
                    sistema web responsivo, em atendimento ao Marco Civil da
                    Internet (Lei nº 12.965/2014).
                  </li>
                </ul>
              </section>

              <section className="termos-doc-section">
                <h3>15.3. FINALIDADE E BASE LEGAL DO TRATAMENTO DE DADOS</h3>
                <p>
                  O tratamento de dados pessoais na plataforma LifeTopografia
                  fundamenta-se nas hipóteses legais previstas no Artigo 7º da
                  LGPD, atendendo às seguintes finalidades específicas:
                </p>
                <ul>
                  <li>
                    <strong>
                      Execução de Contrato e Procedimentos Preliminares (Art.
                      7º, V):
                    </strong>{" "}
                    Viabilizar o cadastro do usuário, a análise e sintetização
                    das matrículas em PDF, a emissão de orçamentos e o
                    atendimento técnico via chat.
                  </li>
                  <li>
                    <strong>
                      Cumprimento de Obrigação Legal ou Regulatória (Art. 7º,
                      II):
                    </strong>{" "}
                    Manutenção dos registros de acesso à aplicação web e
                    conservação de comprovantes fiscais e financeiros
                    decorrentes de serviços contratados.
                  </li>
                  <li>
                    <strong>Legítimo Interesse (Art. 7º, IX):</strong> Garantir
                    a segurança da plataforma, prevenção contra fraudes e
                    melhoria contínua da experiência web responsiva.
                  </li>
                </ul>
              </section>

              <section className="termos-doc-section">
                <h3>15.4. COMPARTILHAMENTO DE DADOS COM TERCEIROS</h3>
                <p>
                  A plataforma LifeTopografia não comercializa nem compartilha
                  dados pessoais com terceiros para fins publicitários,
                  criminosos ou monetários. O compartilhamento ocorre
                  estritamente quando necessário para a operação do sistema com
                  os seguintes parceiros operacionais:
                </p>
                <ul>
                  <li>
                    <strong>Mercado Pago Serviços de Pagamento:</strong>{" "}
                    Compartilhamento dos dados necessários para autenticação e
                    processamento de pagamentos via PIX e cartão de crédito.
                  </li>
                  <li>
                    <strong>
                      Infraestrutura de Hospedagem e Segurança (Cloudflare e
                      Vercel):
                    </strong>{" "}
                    Trafegabilidade segura de dados e proteção contra ataques
                    cibernéticos na camada web.
                  </li>
                  <li>
                    <strong>Autoridades Judiciais ou Administrativas:</strong>{" "}
                    Quando exigido por ordem judicial ou determinação de
                    autoridade competente.
                  </li>
                </ul>
              </section>

              <section className="termos-doc-section">
                <h3>15.5. SEGURANÇA DOS DADOS E CRIPTOGRAFIA</h3>
                <p>
                  A plataforma adota medidas técnicas e administrativas aptas a
                  proteger os dados pessoais contra acessos não autorizados,
                  vazamentos, destruição ou alteração acidental:
                </p>
                <ul>
                  <li>
                    <strong>Criptografia:</strong> Senhas de acesso e conexões
                    web são protegidas por protocolos de criptografia de ponta a
                    ponta (HTTPS/TLS) e algoritmos de hashing no banco de dados
                    feito em PostgreSQL.
                  </li>
                  <li>
                    <strong>Controle de Acesso:</strong> Acesso restrito às
                    tabelas do banco de dados, categorizado por perfis de
                    autenticação (Cliente e Administrador/Topógrafo).
                  </li>
                  <li>
                    <strong>Armazenamento Isolado:</strong> Os arquivos de
                    matrícula em PDF enviados pelo cliente são mantidos em
                    diretórios de armazenamento com links de acesso protegidos.
                  </li>
                </ul>
              </section>

              <section className="termos-doc-section">
                <h3>15.6. DIREITOS DO TITULAR E EXCLUSÃO DE CONTA</h3>
                <p>
                  O Usuário, na condição de Titular dos Dados (Art. 18 da LGPD),
                  possui o direito de solicitar a confirmação da existência de
                  tratamento, o acesso aos seus dados, a correção de dados
                  incompletos e a eliminação da sua conta de acesso.
                </p>

                <h4>
                  15.6.1. TERMO DE CONSCIENTIZAÇÃO E CONFIRMAÇÃO DE EXCLUSÃO DE
                  CONTA
                </h4>
                <p>
                  Ao solicitar o encerramento voluntário de seu cadastro na
                  interface web da plataforma LifeTopografia, o Usuário será
                  submetido à leitura e aceitação do seguinte termo de
                  confirmação:
                </p>

                <div className="termos-doc-alert" role="note">
                  <p>
                    <strong>ATENÇÃO: AÇÃO IRREVERSÍVEL.</strong> Antes de
                    confirmar a exclusão da sua conta na plataforma
                    LifeTopografia, leia atentamente as condições e
                    consequências desta solicitação:
                  </p>
                  <ol className="termos-doc-ordered-list">
                    <li>
                      <strong>Revogação de Acesso:</strong> Ao confirmar a
                      exclusão, seu acesso às áreas restritas do sistema será
                      imediatamente encerrado, e suas credenciais de login e
                      senha serão invalidadas.
                    </li>
                    <li>
                      <strong>Histórico de Serviços e Mensagens:</strong> Todas
                      as conversas realizadas no chat, propostas recebidas e o
                      histórico de acompanhamento de serviços vinculados ao seu
                      usuário serão desvinculados de forma permanente.
                    </li>
                    <li>
                      <strong>Arquivos e Matrículas em PDF:</strong> Quaisquer
                      arquivos de matrículas ou documentos técnicos anexados que
                      não estejam vinculados a contratos ou projetos ativos com
                      execução presencial em andamento serão eliminados do nosso
                      armazenamento.
                    </li>
                    <li>
                      <strong>
                        Retenção Legal e Fiscal (LGPD – Art. 16):
                      </strong>{" "}
                      A exclusão da conta de usuário não implica o cancelamento
                      imediato de obrigações contratuais ou fiscais decorrentes
                      de serviços já contratados ou executados pela Nilton
                      Santos Pinto Topografia. Dados essenciais de faturamento,
                      recibos de transações (processados via Mercado Pago) e
                      registros técnicos necessários para cumprimento de
                      obrigação legal ou regulatória serão mantidos arquivados
                      pelos prazos exigidos pela legislação brasileira.
                    </li>
                    <li>
                      <strong>Projetos em Andamento:</strong> Caso você possua
                      algum serviço topográfico com medição agendada ou em
                      execução no momento, a exclusão da conta não cancela a
                      visita técnica nem o contrato firmado. Nesses casos,
                      recomendamos a finalização prévia do projeto via
                      atendimento direto com o topógrafo.
                    </li>
                  </ol>
                </div>
              </section>

              <section className="termos-doc-section">
                <h3>15.7. ALTERAÇÕES NESTA POLÍTICA E CONTATO</h3>
                <p>
                  Esta Política de Privacidade poderá ser atualizada
                  periodicamente para refletir melhorias no sistema web
                  responsivo ou adequações legislativas. Para exercer seus
                  direitos de titular ou esclarecer dúvidas sobre o tratamento
                  de seus dados, o Usuário poderá entrar em contato com a equipe
                  de desenvolvimento (Grupo 2) ou com a administração da empresa
                  parceira pelo e-mail oficial disponibilizado na plataforma.
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
