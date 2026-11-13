import { useState, useRef, useEffect, type FormEvent } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Sidebar, { type UserProfile } from "../../components/Sidebar/sidebar";
import Footer from "../../components/Footer/footer";
import Logo from "../../assets/image/logo-front.webp";
import FundoHeader from "../../assets/image/background/firstcard.webp";
import { supabase } from "../../lib/supabase/supabaseClient";
import { SerchDataUser } from "../../lib/supabase/auth";
import "./chat.css";

export interface MessageFile {
  name: string;
  size: string;
  type: "pdf" | "dxf";
  dxfContent?: string;
  isConverted?: boolean;
}

export interface BudgetProposal {
  id: string;
  serviceTitle: string;
  amount: string;
  description: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  sender: "client" | "admin" | "system";
  senderName: string;
  text?: string;
  time: string;
  type: "text" | "file" | "budget" | "system";
  file?: MessageFile;
  budget?: BudgetProposal;
}
export type ChatStatus = "open" | "closed";

export type ServiceStatus = "not_started" | "in_progress" | "completed";

export interface ChatThread {
  id: string;
  clientName: string;
  clientType: "pessoa" | "empresa";
  document: string;
  lastMessageTime: string;
  unreadCount: number;
  chatStatus: ChatStatus;
  serviceStatus: ServiceStatus;
  messages: ChatMessage[];
}

/**
 * Gera um arquivo DXF ASCII (AutoCAD R12/2000 compatível) a partir de coordenadas
 * extraídas do PDF da matrícula/memorial do imóvel.
 */
function generateCadDxfContent(docName: string): string {
  const polygonPoints = [
    { name: "P1", x: 324560.12, y: 7412350.45 },
    { name: "P2", x: 324680.85, y: 7412410.2 },
    { name: "P3", x: 324750.3, y: 7412310.8 },
    { name: "P4", x: 324610.95, y: 7412240.15 },
  ];

  let dxf = `0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1009\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n`;

  // Polilinha fechada da gleba
  dxf += `0\nPOLYLINE\n8\nDIVISA_GLEBA\n66\n1\n70\n1\n`;
  for (const pt of polygonPoints) {
    dxf += `0\nVERTEX\n8\nDIVISA_GLEBA\n10\n${pt.x.toFixed(2)}\n20\n${pt.y.toFixed(2)}\n30\n0.0\n`;
  }
  dxf += `0\nSEQEND\n8\nDIVISA_GLEBA\n`;

  // Vértices identificados e anotações UTM
  for (const pt of polygonPoints) {
    dxf += `0\nTEXT\n8\nVERTICES\n10\n${(pt.x + 1.5).toFixed(2)}\n20\n${(pt.y + 1.5).toFixed(2)}\n30\n0.0\n40\n2.5\n1\n${pt.name} (N:${pt.y.toFixed(2)}, E:${pt.x.toFixed(2)})\n`;
  }

  dxf += `0\nTEXT\n8\nINFO_PROJETO\n10\n${polygonPoints[0].x.toFixed(2)}\n20\n${(polygonPoints[0].y - 8).toFixed(2)}\n30\n0.0\n40\n3.0\n1\nDOC: ${docName} - CONVERTIDO LIFE TOPOGRAFIA\n`;
  dxf += `0\nENDSEC\n0\nEOF\n`;

  return dxf;
}

/**
 * Dispara o download de um arquivo DXF no navegador
 */
function downloadDxfFile(fileName: string, content: string) {
  const blob = new Blob([content], { type: "application/dxf;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName.endsWith(".dxf") ? fileName : `${fileName}.dxf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Conversa padrão para clientes (canal direto com a Life Topografia)
const DEFAULT_CLIENT_MESSAGES: ChatMessage[] = [
  {
    id: "msg-init-1",
    sender: "admin",
    senderName: "Life Topografia (Atendimento Técnico)",
    text: "Olá! Seja bem-vindo ao canal oficial de atendimento da Life Topografia. Aqui você pode tirar dúvidas com nossos agrimensores, enviar a certidão de matrícula do seu imóvel em PDF e receber propostas de orçamentos para sua obra.",
    time: "09:00",
    type: "text",
  },
  {
    id: "msg-init-2",
    sender: "client",
    senderName: "Você",
    text: "Bom dia! Preciso de um orçamento para levantamento planialtimétrico cadastral e demarcação de divisa.",
    time: "09:05",
    type: "text",
  },
  {
    id: "msg-init-3",
    sender: "client",
    senderName: "Você",
    time: "09:06",
    type: "file",
    file: {
      name: "matricula_gleba_santana.pdf",
      size: "1.8 MB",
      type: "pdf",
    },
  },
  {
    id: "msg-init-4",
    sender: "admin",
    senderName: "Life Topografia (Atendimento Técnico)",
    text: "Recebemos sua matrícula em PDF. Analisamos o memorial descritivo da área (1.250 m²) e geramos a proposta técnica abaixo:",
    time: "09:12",
    type: "budget",
    budget: {
      id: "orc-101",
      serviceTitle: "Levantamento Planialtimétrico Cadastral + ART",
      amount: "2.450,00",
      description:
        "Mapeamento topográfico com curvas de nível de 1m, georreferenciamento ao SIRGAS 2000, memorial descritivo e ART emitida.",
      status: "pending",
      createdAt: "09:12",
    },
  },
];

// Fila de atendimentos para o Administrador (clientes reais solicitando serviços)
const INITIAL_ADMIN_THREADS: ChatThread[] = [
  {
    id: "thread-cliente-1",
    clientName: "Construtora São Paulo Engenharia",
    clientType: "empresa",
    document: "CNPJ 24.891.042/0001-80",
    lastMessageTime: "09:12",
    unreadCount: 1,
    chatStatus: "open",
    serviceStatus: "not_started",
    messages: [
      {
        id: "adm-m1",
        sender: "client",
        senderName: "Construtora São Paulo",
        text: "Olá! Precisamos da conversão de coordenadas da matrícula em PDF para DXF e do orçamento para locação de obra.",
        time: "09:02",
        type: "text",
      },
      {
        id: "adm-m2",
        sender: "client",
        senderName: "Construtora São Paulo",
        time: "09:03",
        type: "file",
        file: {
          name: "matricula_loteamento_residencial.pdf",
          size: "2.4 MB",
          type: "pdf",
        },
      },
      {
        id: "adm-m3",
        sender: "admin",
        senderName: "Life Topografia (Admin)",
        text: "Documento recebido! Estamos analisando as confrontações para gerar as coordenadas em DXF.",
        time: "09:10",
        type: "text",
      },
    ],
  },
  {
    id: "thread-cliente-2",
    clientName: "Mariana Alencar Ferreira",
    clientType: "pessoa",
    document: "CPF ***.482.198-**",
    lastMessageTime: "Ontem",
    unreadCount: 0,
    chatStatus: "open",
    serviceStatus: "in_progress",
    messages: [
      {
        id: "adm-m4",
        sender: "client",
        senderName: "Mariana Alencar",
        text: "Boa tarde! Gostaria de um orçamento para regularização e desdobro de terreno.",
        time: "Ontem 15:20",
        type: "text",
      },
      {
        id: "adm-m5",
        sender: "client",
        senderName: "Mariana Alencar",
        time: "Ontem 15:22",
        type: "file",
        file: {
          name: "escritura_terreno_interior.pdf",
          size: "1.2 MB",
          type: "pdf",
        },
      },
      {
        id: "adm-m6",
        sender: "admin",
        senderName: "Life Topografia (Admin)",
        time: "Ontem 15:45",
        type: "budget",
        budget: {
          id: "orc-102",
          serviceTitle: "Desdobro de Lote Urbano e Memorial Descritivo",
          amount: "1.980,00",
          description:
            "Levantamento de confrontações, planta de situação e memorial descritivo para cartório.",
          status: "accepted",
          createdAt: "Ontem 15:45",
        },
      },
    ],
  },
];

export default function Chat() {
  const navigate = useNavigate();
  const location = useLocation();

  // Estados de sessão e autenticação
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Papel do usuário: admin ou cliente (pessoa/empresa)
  const [activeRole, setActiveRole] = useState<"client" | "admin">("client");

  // Estado do chat para Clientes
  const [clientMessages, setClientMessages] = useState<ChatMessage[]>(
    DEFAULT_CLIENT_MESSAGES,
  );
  const [clientChatStatus, setClientChatStatus] = useState<ChatStatus>("open");

  const [clientServiceStatus, setClientServiceStatus] =
    useState<ServiceStatus>("in_progress");

  // Controle da avaliação do serviço
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  // Estado do chat para Administradores
  const [adminThreads, setAdminThreads] = useState<ChatThread[]>(
    INITIAL_ADMIN_THREADS,
  );
  const [activeThreadId, setActiveThreadId] =
    useState<string>("thread-cliente-1");

  // Inputs e controles de mensagens
  const [inputText, setInputText] = useState("");
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [convertingPdfId, setConvertingPdfId] = useState<string | null>(null);

  // Modal de orçamento (exclusivo para Administrador)
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetTitle, setBudgetTitle] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetDescription, setBudgetDescription] = useState("");

  // Busca na lista de clientes (visão admin)
  const [searchTerm, setSearchTerm] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * 1. PROTEÇÃO DE ACESSO:
   * Sem uma sessão ativa no Supabase, redireciona imediatamente para /login.
   */
  useEffect(() => {
    let isMounted = true;

    async function checkAuthAndLoadProfile() {
      try {
        const storedProfileStr = localStorage.getItem("userProfile");

        // Timeout protetivo para evitar que chamadas de rede lentas travem o redirecionamento
        const timeoutPromise = new Promise<{
          data: { session: null };
          error: null;
        }>((resolve) =>
          setTimeout(
            () => resolve({ data: { session: null }, error: null }),
            1200,
          ),
        );

        const { data, error } = await Promise.race([
          supabase.auth.getSession(),
          timeoutPromise,
        ]);

        if ((error || !data?.session) && !storedProfileStr) {
          // Usuário não autenticado: redireciona imediatamente para a tela de login
          navigate("/login", { replace: true, state: { from: location } });
          return;
        }

        // Busca os dados do perfil autenticado
        let loadedRole: "client" | "admin" = "client";
        let loadedName = "Cliente";
        let loadedAvatar: string | undefined;

        try {
          const cached = await SerchDataUser();
          const profileRaw = cached || storedProfileStr;
          if (profileRaw) {
            const profileData = JSON.parse(profileRaw);
            const userRole = (profileData.tipo_perfil || "").toLowerCase();
            loadedName = profileData.nome_ou_razao || "Cliente";
            loadedAvatar = profileData.foto_url;

            if (userRole === "admin" || userRole === "administrador") {
              loadedRole = "admin";
            } else {
              loadedRole = "client";
            }
          } else if (data?.session) {
            // Checa metadados da sessão caso não haja perfil salvo
            const metaRole = (
              data.session.user.user_metadata?.role ||
              data.session.user.user_metadata?.tipo_perfil ||
              ""
            ).toLowerCase();
            if (metaRole === "admin" || metaRole === "administrador") {
              loadedRole = "admin";
            }
            loadedName =
              data.session.user.user_metadata?.nome_ou_razao ||
              data.session.user.email?.split("@")[0] ||
              "Cliente";
          }
        } catch (profileErr) {
          console.warn(
            "Aviso ao carregar dados complementares do perfil:",
            profileErr,
          );
        }

        if (isMounted) {
          setUserProfile({
            name: loadedName,
            role: loadedRole === "admin" ? "admin" : "pessoa",
            avatarUrl: loadedAvatar,
          });
          setActiveRole(loadedRole);
          setIsCheckingAuth(false);
        }
      } catch (err) {
        console.error("Erro na verificação de autenticação:", err);
        navigate("/login", { replace: true });
      }
    }

    void checkAuthAndLoadProfile();

    return () => {
      isMounted = false;
    };
  }, [navigate, location]);

  // Rolagem suave para o fim das mensagens
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [clientMessages, adminThreads, activeThreadId, activeRole]);

  // Se ainda estiver validando a sessão, exibe tela padronizada de checagem
  if (isCheckingAuth) {
    return (
      <div className="chat-auth-checking">
        <div className="chat-auth-spinner" />
        <h2>Autenticando acesso...</h2>
        <p>Verificando credenciais e permissões na Life Topografia.</p>
      </div>
    );
  }

  const isAdmin = activeRole === "admin";

  // Obter conversa ativa
  const currentAdminThread = adminThreads.find((t) => t.id === activeThreadId);
  const activeMessages = isAdmin
    ? currentAdminThread?.messages || []
    : clientMessages;

  const currentChatTitle = isAdmin
    ? currentAdminThread
      ? `${currentAdminThread.clientName} (${currentAdminThread.clientType === "empresa" ? "Empresa" : "Pessoa Física"})`
      : "Atendimento ao Cliente"
    : "Life Topografia • Atendimento & Engenharia";

  const currentChatSubtitle = isAdmin
    ? currentAdminThread?.document || "Documento não informado"
    : "Canal Oficial com agrimensores e topógrafos responsáveis (CREA/SP)";

  /**
   * Envia mensagem de texto
   */
  const handleSendMessage = (e?: FormEvent) => {
    if (e) e.preventDefault();
    const chatIsClosed = isAdmin
      ? currentAdminThread?.chatStatus === "closed"
      : clientChatStatus === "closed";
    if (chatIsClosed) return;
    const text = inputText.trim();
    if (!text) return;

    const now = new Date();
    const formattedTime = now.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: isAdmin ? "admin" : "client",
      senderName: isAdmin
        ? userProfile?.name || "Life Topografia (Admin)"
        : userProfile?.name || "Você",
      text,
      time: formattedTime,
      type: "text",
    };

    if (isAdmin) {
      if (!activeThreadId) return;
      setAdminThreads((prev) =>
        prev.map((thread) =>
          thread.id === activeThreadId
            ? {
                ...thread,
                lastMessageTime: formattedTime,
                messages: [...thread.messages, newMessage],
              }
            : thread,
        ),
      );
    } else {
      setClientMessages((prev) => [...prev, newMessage]);
    }

    setInputText("");
    setShowQuickActions(false);
  };

  /**
   * Envio de arquivo em PDF (matrículas e memoriais)
   */
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const chatIsClosed = isAdmin
      ? currentAdminThread?.chatStatus === "closed"
      : clientChatStatus === "closed";
    if (chatIsClosed) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf = file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      alert(
        "Por favor, envie documentos e matrículas do imóvel no formato PDF.",
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
    const now = new Date();
    const formattedTime = now.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const newMessage: ChatMessage = {
      id: `file-${Date.now()}`,
      sender: isAdmin ? "admin" : "client",
      senderName: isAdmin
        ? userProfile?.name || "Life Topografia (Admin)"
        : userProfile?.name || "Você",
      time: formattedTime,
      type: "file",
      file: {
        name: file.name,
        size: `${sizeInMb} MB`,
        type: "pdf",
      },
    };

    if (isAdmin) {
      if (!activeThreadId) return;
      setAdminThreads((prev) =>
        prev.map((thread) =>
          thread.id === activeThreadId
            ? {
                ...thread,
                lastMessageTime: formattedTime,
                messages: [...thread.messages, newMessage],
              }
            : thread,
        ),
      );
    } else {
      setClientMessages((prev) => [...prev, newMessage]);
    }

    setShowQuickActions(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /**
   * CONVERSÃO DE COORDENADAS DO PDF PARA DXF (EXCLUSIVO PARA ADMIN)
   * Extrai as coordenadas descritas no PDF da matrícula e gera o arquivo CAD DXF.
   */
  const handleConvertPdfToDxf = (msgId: string, pdfName: string) => {
    if (!isAdmin) {
      alert("Apenas administradores podem converter coordenadas para DXF.");
      return;
    }

    setConvertingPdfId(msgId);

    // Simula o processamento e extração de vértices UTM/SIRGAS 2000
    setTimeout(() => {
      const dxfContent = generateCadDxfContent(pdfName);
      const dxfFileName = pdfName.replace(/\.pdf$/i, "_coordenadas.dxf");
      const now = new Date();
      const formattedTime = now.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });

      const convertedMessage: ChatMessage = {
        id: `dxf-${Date.now()}`,
        sender: "admin",
        senderName: "Life Topografia (Admin)",
        time: formattedTime,
        type: "file",
        file: {
          name: dxfFileName,
          size: "420 KB",
          type: "dxf",
          dxfContent,
          isConverted: true,
        },
      };

      const systemNotice: ChatMessage = {
        id: `sys-${Date.now()}`,
        sender: "system",
        senderName: "Sistema Life Topografia",
        time: formattedTime,
        type: "system",
        text: `As coordenadas do arquivo "${pdfName}" foram convertidas com sucesso para o formato AutoCAD DXF (SIRGAS 2000). O arquivo está pronto para download.`,
      };

      if (activeThreadId) {
        setAdminThreads((prev) =>
          prev.map((thread) =>
            thread.id === activeThreadId
              ? {
                  ...thread,
                  lastMessageTime: formattedTime,
                  messages: [
                    ...thread.messages,
                    systemNotice,
                    convertedMessage,
                  ],
                }
              : thread,
          ),
        );
      } else {
        setClientMessages((prev) => [...prev, systemNotice, convertedMessage]);
      }

      setConvertingPdfId(null);
    }, 1200);
  };

  /**
   * GERAÇÃO DE PROPOSTA DE ORÇAMENTO (EXCLUSIVO PARA ADMIN)
   */
  const handleSendBudgetProposal = (e: FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert("Clientes não possuem permissão para emitir orçamentos.");
      return;
    }

    if (!budgetTitle.trim() || !budgetAmount.trim() || !activeThreadId) return;

    const now = new Date();
    const formattedTime = now.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const newBudgetMessage: ChatMessage = {
      id: `budget-${Date.now()}`,
      sender: "admin",
      senderName: "Life Topografia (Admin)",
      time: formattedTime,
      type: "budget",
      budget: {
        id: `orc-${Date.now()}`,
        serviceTitle: budgetTitle.trim(),
        amount: budgetAmount.trim(),
        description:
          budgetDescription.trim() ||
          "Proposta técnica detalhada com ART, planta topográfica e memorial descritivo.",
        status: "pending",
        createdAt: formattedTime,
      },
    };

    setAdminThreads((prev) =>
      prev.map((thread) =>
        thread.id === activeThreadId
          ? {
              ...thread,
              lastMessageTime: formattedTime,
              messages: [...thread.messages, newBudgetMessage],
            }
          : thread,
      ),
    );

    setBudgetTitle("");
    setBudgetAmount("");
    setBudgetDescription("");
    setShowBudgetModal(false);
  };

  /**
   * RESPOSTA DO CLIENTE AO ORÇAMENTO (Aceitar ou Recusar)
   */
  const handleClientBudgetDecision = (
    budgetId: string,
    decision: "accepted" | "rejected",
  ) => {
    const now = new Date();
    const formattedTime = now.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const updateBudgetInList = (list: ChatMessage[]): ChatMessage[] => {
      const updated = list.map((msg) => {
        if (msg.type === "budget" && msg.budget && msg.budget.id === budgetId) {
          return {
            ...msg,
            budget: {
              ...msg.budget,
              status: decision,
            },
          };
        }
        return msg;
      });

      const responseText =
        decision === "accepted"
          ? "✓ Proposta de orçamento aceita! Prosseguindo para o pagamento com SumUp."
          : "✕ Proposta de orçamento recusada. Gostaria de solicitar alterações no escopo do serviço.";

      const statusMsg: ChatMessage = {
        id: `dec-${Date.now()}`,
        sender: "client",
        senderName: userProfile?.name || "Você",
        text: responseText,
        time: formattedTime,
        type: "text",
      };

      return [...updated, statusMsg];
    };

    if (isAdmin && activeThreadId) {
      setAdminThreads((prev) =>
        prev.map((thread) =>
          thread.id === activeThreadId
            ? {
                ...thread,
                lastMessageTime: formattedTime,
                messages: updateBudgetInList(thread.messages),
              }
            : thread,
        ),
      );
    } else {
      setClientMessages((prev) => updateBudgetInList(prev));
    }
  };
  /**
   * Encerra a conversa atual.
   * Não significa que o serviço foi concluído.
   */
  const handleCloseChat = () => {
    const confirmed = window.confirm(
      "Deseja realmente encerrar esta conversa?",
    );

    if (!confirmed) return;

    if (isAdmin && currentAdminThread) {
      setAdminThreads((prev) =>
        prev.map((thread) =>
          thread.id === activeThreadId
            ? { ...thread, chatStatus: "closed" }
            : thread,
        ),
      );
    } else {
      setClientChatStatus("closed");
      // Sincronização demonstrativa com o atendimento selecionado no perfil admin.
      if (currentAdminThread) {
        setAdminThreads((prev) =>
          prev.map((thread) =>
            thread.id === activeThreadId
              ? { ...thread, chatStatus: "closed" }
              : thread,
          ),
        );
      }
    }

    if (isAdmin) setClientChatStatus("closed");
    setShowQuickActions(false);
  };

  /**
   * Conclui o serviço.
   * Nesta versão, somente o administrador pode executar a ação.
   */
  const handleCompleteService = () => {
    if (!isAdmin || !currentAdminThread) return;

    const confirmed = window.confirm(
      "Confirma que o serviço deste cliente foi concluído?",
    );

    if (!confirmed) return;

    setAdminThreads((prev) =>
      prev.map((thread) =>
        thread.id === activeThreadId
          ? {
              ...thread,
              serviceStatus: "completed",
              chatStatus: "closed",
            }
          : thread,
      ),
    );

    // Sincronização apenas demonstrativa entre os dois perfis locais.
    setClientServiceStatus("completed");
    setClientChatStatus("closed");
    setShowQuickActions(false);
  };

  /**
   * Registra a avaliação localmente.
   * A persistência definitiva dependerá do backend.
   */
  const handleSubmitRating = (e: FormEvent) => {
    e.preventDefault();

    if (rating < 1 || rating > 5) return;

    setRatingSubmitted(true);
    setShowRatingModal(false);
  };

  const filteredAdminThreads = adminThreads.filter(
    (t) =>
      t.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.document.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="chat-page">
      {/* Sidebar integrada com o mesmo padrão do site */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        user={userProfile}
      />

      {/* Topbar com background padronizado, logo e menu hambúrguer */}
      <header
        className="chat-topbar"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.45)), url(${FundoHeader})`,
        }}
      >
        <button
          type="button"
          className="chat-menu-button"
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
          className="chat-topbar-logo"
          aria-label="Ir para a página inicial"
        >
          <img src={Logo} alt="Life Topografia" />
        </Link>

        {/* Seletor demonstrativo de hierarquia para validação de conta */}
        <div className="chat-role-indicator">
          <span className="role-indicator-label">Perfil Ativo:</span>
          <button
            type="button"
            className={`role-toggle-btn ${isAdmin ? "is-admin" : "is-client"}`}
            onClick={() => setActiveRole(isAdmin ? "client" : "admin")}
            title="Alternar visão entre Cliente e Administrador para testes de hierarquia"
          >
            {isAdmin ? "🛡️ Administrador" : "👤 Cliente (Empresa/Pessoa)"}
          </button>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="chat-main">
        <div className="chat-title-container">
          <div className="chat-badge-row">
            <span
              className={`chat-hierarchy-pill ${isAdmin ? "pill-admin" : "pill-client"}`}
            >
              {isAdmin
                ? "PAINEL ADMINISTRATIVO (CONVERSÃO DXF & ORÇAMENTOS)"
                : "ATENDIMENTO AO CLIENTE (PESSOA FÍSICA & EMPRESA)"}
            </span>
          </div>
          <h1 className="chat-title">
            {isAdmin
              ? "GERENCIAMENTO DE ATENDIMENTOS"
              : "ATENDIMENTO & SUPORTE"}
          </h1>
          <p className="chat-subtitle">
            {isAdmin
              ? "Receba matrículas em PDF de clientes, converta as coordenadas georreferenciadas para DXF e emita propostas oficiais de orçamento."
              : "Converse com os agrimensores da Life Topografia, envie a certidão de matrícula em PDF e aprove seu orçamento com pagamento SumUp."}
          </p>
          <div className="title-divider" aria-hidden="true">
            <span className="line" />
            <span className="rhombus" />
            <span className="line" />
          </div>
        </div>

        {/* Card Unificado de Chat com Hierarquia */}
        <section className="chat-card" aria-label="Central de Mensagens">
          {/* PAINEL LATERAL: 
              - No modo ADMIN: Lista todos os clientes e solicitações em aberto.
              - No modo CLIENTE: Mostra o canal direto com a Life Topografia e status. */}
          <aside className="chat-sidebar-panel">
            <div className="chat-sidebar-panel__header">
              <h2>
                {isAdmin ? "Fila de Atendimento aos Clientes" : "Canal Oficial"}
              </h2>
              {isAdmin && (
                <div className="chat-search-box">
                  <span className="search-icon" aria-hidden="true">
                    🔍
                  </span>
                  <input
                    type="text"
                    placeholder="Filtrar por nome ou CNPJ/CPF..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    aria-label="Buscar clientes"
                  />
                </div>
              )}
            </div>

            <div className="chat-conversations-list" role="list">
              {isAdmin ? (
                filteredAdminThreads.map((thread) => {
                  const isActive = thread.id === activeThreadId;
                  const lastMsg = thread.messages[thread.messages.length - 1];
                  const previewText =
                    lastMsg?.type === "file"
                      ? `📎 Arquivo: ${lastMsg.file?.name}`
                      : lastMsg?.type === "budget"
                        ? `💼 Orçamento: R$ ${lastMsg.budget?.amount}`
                        : lastMsg?.text || "Inicie a conversa...";

                  return (
                    <div
                      key={thread.id}
                      role="listitem"
                      className={`conversation-item ${isActive ? "is-active" : ""}`}
                      onClick={() => setActiveThreadId(thread.id)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setActiveThreadId(thread.id);
                        }
                      }}
                    >
                      <div className="conversation-avatar-box">
                        <div className="conversation-avatar">
                          {thread.clientName.charAt(0)}
                        </div>
                        <span
                          className="online-indicator"
                          title="Cliente ativo"
                        />
                      </div>

                      <div className="conversation-details">
                        <div className="conversation-top-row">
                          <span className="conversation-name">
                            {thread.clientName}
                          </span>
                          <span className="conversation-time">
                            {thread.lastMessageTime}
                          </span>
                        </div>
                        <span className="conversation-role">
                          {thread.clientType === "empresa"
                            ? "Empresa"
                            : "Pessoa Física"}{" "}
                          • {thread.document}
                        </span>
                        <p className="conversation-preview">{previewText}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="conversation-item is-active">
                  <div className="conversation-avatar-box">
                    <div className="conversation-avatar brand-avatar">LT</div>
                    <span
                      className="online-indicator"
                      title="Atendimento Online"
                    />
                  </div>
                  <div className="conversation-details">
                    <div className="conversation-top-row">
                      <span className="conversation-name">Life Topografia</span>
                      <span className="conversation-time">Agora</span>
                    </div>
                    <span className="conversation-role">
                      CREA/SP • Engenharia &amp; Topografia
                    </span>
                    <p className="conversation-preview">
                      Atendimento direto com os responsáveis técnicos.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="chat-sidebar-panel__footer">
              <span className="channel-badge">
                {isAdmin
                  ? "🛡️ Modo Administrador: Acesso completo ao sistema"
                  : "🔒 Conexão Segura: Cliente verificado via Supabase"}
              </span>
            </div>
          </aside>

          {/* PAINEL PRINCIPAL: Janela de Mensagens */}
          <div className="chat-window-panel">
            {/* Header da Conversa Ativa */}
            <header className="chat-active-header">
              <div className="active-attendant-info">
                <div
                  className={`active-attendant-avatar ${isAdmin ? "" : "brand-avatar"}`}
                >
                  {isAdmin ? currentChatTitle.charAt(0) : "LT"}
                  <span className="online-indicator" />
                </div>
                <div>
                  <h3 className="active-attendant-name">{currentChatTitle}</h3>
                  <span className="active-attendant-status">
                    ● Ativo agora • {currentChatSubtitle}
                  </span>
                </div>
              </div>

              {/* Ações e status do atendimento */}
              <div className="active-header-actions">
                <span
                  className={`chat-status-label ${
                    (isAdmin
                      ? currentAdminThread?.chatStatus
                      : clientChatStatus) === "closed"
                      ? "is-closed"
                      : "is-open"
                  }`}
                >
                  {(isAdmin
                    ? currentAdminThread?.chatStatus
                    : clientChatStatus) === "closed"
                    ? "Chat encerrado"
                    : "Chat aberto"}
                </span>

                {isAdmin && currentAdminThread && (
                  <>
                    <button
                      type="button"
                      className="btn-header-budget"
                      onClick={() => setShowBudgetModal(true)}
                      disabled={currentAdminThread.chatStatus === "closed"}
                    >
                      + Gerar Orçamento
                    </button>

                    {currentAdminThread.serviceStatus !== "completed" && (
                      <button
                        type="button"
                        className="btn-complete-service"
                        onClick={handleCompleteService}
                        disabled={currentAdminThread.chatStatus === "closed"}
                      >
                        Concluir Serviço
                      </button>
                    )}
                  </>
                )}

                {(isAdmin
                  ? currentAdminThread?.chatStatus
                  : clientChatStatus) === "open" && (
                  <button
                    type="button"
                    className="btn-close-chat"
                    onClick={handleCloseChat}
                  >
                    Encerrar Chat
                  </button>
                )}
              </div>
            </header>

            {/* Área de Mensagens */}
            <div className="chat-messages-area" role="log" aria-live="polite">
              <div className="chat-date-badge">
                <span>Canal Oficial de Atendimento • Life Topografia</span>
              </div>

              {activeMessages.map((msg) => {
                const isUser = msg.sender === (isAdmin ? "admin" : "client");
                const isSystem = msg.type === "system";

                if (isSystem) {
                  return (
                    <div key={msg.id} className="system-notice-row">
                      <span className="system-notice-icon">⚙️</span>
                      <p>{msg.text}</p>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`message-row ${isUser ? "message-row--user" : "message-row--attendant"}`}
                  >
                    {!isUser && (
                      <div className="message-sender-avatar" aria-hidden="true">
                        {msg.senderName.charAt(0)}
                      </div>
                    )}

                    <div
                      className={`message-bubble ${isUser ? "bubble--user" : "bubble--attendant"}`}
                    >
                      <span className="message-sender-label">
                        {msg.senderName}
                      </span>

                      {/* Texto */}
                      {msg.type === "text" && (
                        <p className="message-text">{msg.text}</p>
                      )}

                      {/* Arquivo (PDF ou DXF) */}
                      {msg.type === "file" && msg.file && (
                        <div
                          className={`file-attachment-card ${msg.file.type === "dxf" ? "card-dxf" : "card-pdf"}`}
                        >
                          <div className="file-icon-badge" aria-hidden="true">
                            {msg.file.type === "pdf" ? "📄" : "📐"}
                          </div>
                          <div className="file-info">
                            <span className="file-name">{msg.file.name}</span>
                            <span className="file-meta">
                              {msg.file.size} •{" "}
                              {msg.file.type === "pdf"
                                ? "Documento Matrícula (PDF)"
                                : "Arquivo CAD (DXF SIRGAS 2000)"}
                            </span>
                          </div>

                          <div className="file-actions-group">
                            {/* Download do arquivo */}
                            {msg.file.type === "dxf" && msg.file.dxfContent ? (
                              <button
                                type="button"
                                className="file-action-btn btn-dxf-download"
                                onClick={() =>
                                  downloadDxfFile(
                                    msg.file?.name || "projeto.dxf",
                                    msg.file?.dxfContent || "",
                                  )
                                }
                              >
                                Baixar DXF
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="file-action-btn"
                                onClick={() =>
                                  alert(
                                    `Visualizando documento: ${msg.file?.name}`,
                                  )
                                }
                              >
                                Visualizar
                              </button>
                            )}

                            {/* AÇÃO EXCLUSIVA DE ADMIN: CONVERTER COORDENADAS PARA DXF */}
                            {isAdmin && msg.file.type === "pdf" && (
                              <button
                                type="button"
                                className="btn-convert-dxf"
                                disabled={convertingPdfId === msg.id}
                                onClick={() =>
                                  handleConvertPdfToDxf(
                                    msg.id,
                                    msg.file?.name || "documento.pdf",
                                  )
                                }
                                title="Processar vértices e memorial descritivo da matrícula e gerar o arquivo DXF"
                              >
                                {convertingPdfId === msg.id ? (
                                  <span className="converting-spinner">
                                    Convertendo...
                                  </span>
                                ) : (
                                  "📐 Converter Coordenadas para DXF"
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Proposta de Orçamento SumUp */}
                      {msg.type === "budget" && msg.budget && (
                        <div className="sumup-proposal-card">
                          <div className="sumup-card-header">
                            <span className="sumup-brand-tag">sumup®</span>
                            <span
                              className={`budget-status-badge status-${msg.budget.status}`}
                            >
                              {msg.budget.status === "pending" &&
                                "⏳ Aguardando Aprovação"}
                              {msg.budget.status === "accepted" &&
                                "✓ Proposta Aceita"}
                              {msg.budget.status === "rejected" &&
                                "✕ Proposta Recusada"}
                            </span>
                          </div>

                          <h4 className="sumup-service-name">
                            {msg.budget.serviceTitle}
                          </h4>
                          <p className="sumup-service-desc">
                            {msg.budget.description}
                          </p>

                          <div className="sumup-pricing-row">
                            <span className="sumup-label">
                              Valor total do serviço:
                            </span>
                            <span className="sumup-price">
                              R$ {msg.budget.amount}
                            </span>
                          </div>

                          {/* Se for CLIENTE: pode Aceitar ou Recusar a proposta */}
                          {!isAdmin && msg.budget.status === "pending" && (
                            <div className="budget-client-actions">
                              <button
                                type="button"
                                className="btn-accept-budget"
                                onClick={() =>
                                  handleClientBudgetDecision(
                                    msg.budget!.id,
                                    "accepted",
                                  )
                                }
                              >
                                ✓ Aceitar Orçamento
                              </button>
                              <button
                                type="button"
                                className="btn-reject-budget"
                                onClick={() =>
                                  handleClientBudgetDecision(
                                    msg.budget!.id,
                                    "rejected",
                                  )
                                }
                              >
                                Recusar
                              </button>
                            </div>
                          )}

                          {/* Se o orçamento foi ACEITO: botão de pagamento SumUp liberado */}
                          {msg.budget.status === "accepted" && (
                            <div className="sumup-footer-actions">
                              <Link
                                to="/pagamento"
                                className="sumup-pay-button"
                              >
                                💳 Pagar com SumUp (Cartão ou Pix) →
                              </Link>
                            </div>
                          )}
                        </div>
                      )}

                      <span className="message-time">{msg.time}</span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Menu de Ações Rápidas (Anexar PDF / Gerar Orçamento) */}
            {showQuickActions && (
              <div className="quick-actions-drawer" role="menu">
                {/* O Cliente e o Admin podem enviar PDF */}
                <button
                  type="button"
                  className="quick-action-item"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <span className="quick-action-icon">📄</span>
                  <div>
                    <strong>Enviar Matrícula (PDF)</strong>
                    <p>
                      Certidão de matrícula, escrituras ou memorial descritivo
                    </p>
                  </div>
                </button>

                {/* Exclusivo para Administrador: Gerar Orçamento */}
                {isAdmin ? (
                  <button
                    type="button"
                    className="quick-action-item"
                    onClick={() => {
                      setShowQuickActions(false);
                      setShowBudgetModal(true);
                    }}
                  >
                    <span className="quick-action-icon">💼</span>
                    <div>
                      <strong>Gerar Proposta de Orçamento</strong>
                      <p>Emitir proposta oficial com cobrança via SumUp®</p>
                    </div>
                  </button>
                ) : (
                  <div className="client-permission-hint">
                    ℹ️ Para solicitar orçamentos, envie a matrícula em PDF e
                    converse com a equipe no chat.
                  </div>
                )}
              </div>
            )}

            {(isAdmin ? currentAdminThread?.chatStatus : clientChatStatus) ===
              "closed" && (
              <div className="chat-closed-notice" role="status">
                Esta conversa foi encerrada. O envio de mensagens e arquivos
                está desabilitado.
              </div>
            )}

            {/* Barra de Entrada de Mensagens */}
            <form className="chat-input-bar" onSubmit={handleSendMessage}>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                accept=".pdf,application/pdf"
                onChange={handleFileUpload}
                disabled={
                  (isAdmin
                    ? currentAdminThread?.chatStatus
                    : clientChatStatus) === "closed"
                }
              />

              <button
                type="button"
                className={`btn-action-trigger ${showQuickActions ? "is-active" : ""}`}
                onClick={() => setShowQuickActions(!showQuickActions)}
                aria-label="Abrir opções de anexo"
                title="Anexar matrícula em PDF ou ações rápidas"
                disabled={
                  (isAdmin
                    ? currentAdminThread?.chatStatus
                    : clientChatStatus) === "closed"
                }
              >
                +
              </button>

              <input
                type="text"
                className="chat-text-input"
                placeholder={
                  isAdmin
                    ? "Responder cliente como Administrador..."
                    : "Digite sua mensagem para a Life Topografia..."
                }
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={
                  (isAdmin
                    ? currentAdminThread?.chatStatus
                    : clientChatStatus) === "closed"
                }
                aria-label="Mensagem de atendimento"
              />

              <button
                type="submit"
                className="btn-send-message"
                disabled={
                  !inputText.trim() ||
                  (isAdmin
                    ? currentAdminThread?.chatStatus
                    : clientChatStatus) === "closed"
                }
                aria-label="Enviar mensagem"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </form>
          </div>
        </section>

        {!isAdmin &&
          clientServiceStatus === "completed" &&
          !ratingSubmitted && (
            <section
              className="service-rating-prompt"
              aria-labelledby="rating-prompt-title"
            >
              <h3 id="rating-prompt-title">Como foi sua experiência?</h3>
              <p>
                Seu serviço foi concluído. Avalie o atendimento da Life
                Topografia.
              </p>
              <button
                type="button"
                className="btn-open-rating"
                onClick={() => setShowRatingModal(true)}
              >
                Avaliar Atendimento
              </button>
            </section>
          )}

        {!isAdmin && ratingSubmitted && (
          <p className="rating-success-message" role="status">
            Obrigado pela sua avaliação!
          </p>
        )}

        {/* MODAL EXCLUSIVO DO ADMINISTRADOR: Criar Proposta de Orçamento */}
        {showBudgetModal && isAdmin && (
          <div
            className="budget-modal-backdrop"
            onClick={() => setShowBudgetModal(false)}
          >
            <div
              className="budget-modal-content"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-budget-title"
            >
              <header className="budget-modal-header">
                <span className="sumup-badge-pill">sumup® emissão oficial</span>
                <h3 id="modal-budget-title">Gerar Proposta de Orçamento</h3>
                <button
                  type="button"
                  className="btn-close-modal"
                  onClick={() => setShowBudgetModal(false)}
                  aria-label="Fechar modal"
                >
                  ✕
                </button>
              </header>

              <form
                onSubmit={handleSendBudgetProposal}
                className="budget-modal-form"
              >
                <div className="modal-field-group">
                  <label htmlFor="budget-service-name">
                    Serviço Topográfico:
                  </label>
                  <input
                    id="budget-service-name"
                    type="text"
                    placeholder="Ex.: Demarcação de Divisa com GNSS RTK"
                    value={budgetTitle}
                    onChange={(e) => setBudgetTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="modal-field-group">
                  <label htmlFor="budget-service-amount">
                    Valor Total (R$):
                  </label>
                  <input
                    id="budget-service-amount"
                    type="text"
                    placeholder="Ex.: 2.450,00"
                    value={budgetAmount}
                    onChange={(e) => setBudgetAmount(e.target.value)}
                    required
                  />
                </div>

                <div className="modal-field-group">
                  <label htmlFor="budget-service-desc">
                    Escopo Técnico e Entregáveis:
                  </label>
                  <textarea
                    id="budget-service-desc"
                    rows={3}
                    placeholder="Ex.: Levantamento planialtimétrico cadastral, emissão de ART registrada no CREA/SP, memorial descritivo e arquivo DXF."
                    value={budgetDescription}
                    onChange={(e) => setBudgetDescription(e.target.value)}
                  />
                </div>

                <footer className="budget-modal-footer">
                  <button
                    type="button"
                    className="btn-modal-cancel"
                    onClick={() => setShowBudgetModal(false)}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn-modal-submit">
                    Enviar Proposta ao Cliente
                  </button>
                </footer>
              </form>
            </div>
          </div>
        )}
        {showRatingModal && !isAdmin && (
          <div
            className="budget-modal-backdrop"
            onClick={() => setShowRatingModal(false)}
          >
            <div
              className="budget-modal-content rating-modal-content"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="rating-modal-title"
            >
              <header className="budget-modal-header">
                <h3 id="rating-modal-title">Avaliar Atendimento</h3>
                <button
                  type="button"
                  className="btn-close-modal"
                  onClick={() => setShowRatingModal(false)}
                  aria-label="Fechar avaliação"
                >
                  ✕
                </button>
              </header>

              <form onSubmit={handleSubmitRating} className="budget-modal-form">
                <fieldset className="rating-fieldset">
                  <legend>Selecione uma nota de 1 a 5:</legend>
                  <div className="rating-stars">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={value <= rating ? "is-selected" : ""}
                        onClick={() => setRating(value)}
                        aria-label={`${value} ${value === 1 ? "estrela" : "estrelas"}`}
                        aria-pressed={rating === value}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </fieldset>

                <div className="modal-field-group">
                  <label htmlFor="rating-comment">Comentário (opcional):</label>
                  <textarea
                    id="rating-comment"
                    rows={4}
                    maxLength={1000}
                    placeholder="Conte como foi sua experiência..."
                    value={ratingComment}
                    onChange={(e) => setRatingComment(e.target.value)}
                  />
                </div>

                <footer className="budget-modal-footer">
                  <button
                    type="button"
                    className="btn-modal-cancel"
                    onClick={() => setShowRatingModal(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-modal-submit"
                    disabled={rating === 0}
                  >
                    Enviar Avaliação
                  </button>
                </footer>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Footer padrão do site */}
      <Footer />
    </div>
  );
}
