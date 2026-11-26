import {
  useState,
  useRef,
  useEffect,
  type FormEvent,
  type ChangeEvent,
  type ClipboardEvent,
} from "react";
import { Link } from "react-router-dom";
import { useLayout } from "../../hook/useLayout";
import { useAuth } from "../../hook/useAuth";
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

export interface AdminClientChat {
  id: string;
  ticketCode: string;
  title: string;
  lastMessageTime: string;
  unreadCount: number;
  chatStatus: ChatStatus;
  serviceStatus: ServiceStatus;
  messages: ChatMessage[];
}

export interface AdminClientGroup {
  id: string;
  clientName: string;
  clientType: "pessoa" | "empresa";
  document: string;
  lastInteractionTime: string;
  chats: AdminClientChat[];
}

/**
 * Gera um DXF ASCII demonstrativo com coordenadas fictícias fixas.
 * Não extrai dados do PDF nem substitui uma rotina real de conversão.
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

const MAX_BUDGET_CENTS = 99_999_999_99;

function formatCentsToBRL(cents: number): string {
  const value = cents / 100;
  const [intPart, decPart] = value.toFixed(2).split(".");
  const paddedInt = intPart
    .padStart(2, "0")
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `R$ ${paddedInt},${decPart}`;
}

function extractCentsFromDigits(raw: string): number {
  const digits = raw.replace(/\D/g, "").replace(/^0+/, "").slice(0, 11);
  if (!digits) return 0;
  return Math.min(Number(digits), MAX_BUDGET_CENTS);
}

function formatBudgetAmountDisplay(amount: string): string {
  return amount.startsWith("R$") ? amount : `R$ ${amount}`;
}

// Mensagens fictícias para demonstrar a visualização do cliente.
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
      amount: formatCentsToBRL(245000),
      description:
        "Mapeamento topográfico com curvas de nível de 1m, georreferenciamento ao SIRGAS 2000, memorial descritivo e ART emitida.",
      status: "pending",
      createdAt: "09:12",
    },
  },
];

// Atendimentos fictícios agrupados por Cliente -> Chats para demonstrar a gaveta administrativa.
const INITIAL_ADMIN_CLIENTS: AdminClientGroup[] = [
  {
    id: "client-1",
    clientName: "Construtora São Paulo Engenharia",
    clientType: "empresa",
    document: "CNPJ 24.891.042/0001-80",
    lastInteractionTime: "09:12",
    chats: [
      {
        id: "chat-c1-02",
        ticketCode: "#02",
        title: "Loteamento Residencial",
        lastMessageTime: "09:12",
        unreadCount: 1,
        chatStatus: "open",
        serviceStatus: "in_progress",
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
        id: "chat-c1-01",
        ticketCode: "#01",
        title: "Georreferenciamento Sítio",
        lastMessageTime: "12/11",
        unreadCount: 0,
        chatStatus: "closed",
        serviceStatus: "completed",
        messages: [
          {
            id: "adm-c1-01-m1",
            sender: "client",
            senderName: "Construtora São Paulo",
            text: "Precisamos do georreferenciamento e memorial descritivo para certificação no SIGEF.",
            time: "12/11 10:15",
            type: "text",
          },
          {
            id: "adm-c1-01-m2",
            sender: "admin",
            senderName: "Life Topografia (Admin)",
            time: "12/11 16:40",
            type: "file",
            file: {
              name: "georreferenciamento_sitio_final.dxf",
              size: "510 KB",
              type: "dxf",
              dxfContent: generateCadDxfContent("sitio_sigef.pdf"),
              isConverted: true,
            },
          },
          {
            id: "adm-c1-01-m3",
            sender: "client",
            senderName: "Construtora São Paulo",
            text: "Recebido e validado com sucesso. Obrigado pelo atendimento!",
            time: "12/11 17:05",
            type: "text",
          },
        ],
      },
    ],
  },
  {
    id: "client-2",
    clientName: "Mariana Alencar Ferreira",
    clientType: "pessoa",
    document: "CPF ***.482.198-**",
    lastInteractionTime: "Ontem",
    chats: [
      {
        id: "chat-c2-01",
        ticketCode: "#01",
        title: "Desdobro de Terreno",
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
    ],
  },
];

export default function Chat() {
  const { user } = useAuth();
  const { setTopbarRightContent } = useLayout();

  // Papel do usuário: admin ou cliente (pessoa/empresa)
  const [activeRole, setActiveRole] = useState<"client" | "admin">(() =>
    user?.role === "ADMIN" ? "admin" : "client",
  );

  // Estado do chat para Clientes
  const [clientMessages, setClientMessages] = useState<ChatMessage[]>(
    DEFAULT_CLIENT_MESSAGES,
  );
  // Controle da avaliação do serviço
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [submittedRating, setSubmittedRating] = useState<{
    score: number;
    comment: string;
  } | null>(null);
  // Estado do chat para Administradores (Gaveta Cliente -> Chats)
  const [adminClients, setAdminClients] = useState<AdminClientGroup[]>(
    INITIAL_ADMIN_CLIENTS,
  );
  const [activeChatId, setActiveChatId] = useState<string>("chat-c1-02");
  const [expandedClientIds, setExpandedClientIds] = useState<
    Record<string, boolean>
  >({ "client-1": true });

  // Inputs e controles de mensagens
  const [inputText, setInputText] = useState("");
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [convertingPdfId, setConvertingPdfId] = useState<string | null>(null);

  // Modal de orçamento (exclusivo para Administrador)
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetTitle, setBudgetTitle] = useState("");
  const [budgetCents, setBudgetCents] = useState<number>(0);
  const [budgetAmountError, setBudgetAmountError] = useState("");
  const [budgetDescription, setBudgetDescription] = useState("");

  // Busca e filtro na lista de clientes (visão admin)
  const [searchTerm, setSearchTerm] = useState("");
  const [sidebarFilter, setSidebarFilter] = useState<"all" | "unread">("all");

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Controle de scroll e navegação responsiva mobile
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const isScrolledUpRef = useRef(false);
  const [unreadWhileScrolled, setUnreadWhileScrolled] = useState(0);
  const [mobileView, setMobileView] = useState<"list" | "chat">(() =>
    user?.role === "ADMIN" ? "list" : "chat",
  );

  const closeBudgetModal = () => {
    setShowBudgetModal(false);
    setBudgetAmountError("");
  };

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior,
      });
      setIsScrolledUp(false);
      isScrolledUpRef.current = false;
      setUnreadWhileScrolled(0);
    }
  };

  const handleMessagesScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const distanceToBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    const isAway = distanceToBottom > 90;
    setIsScrolledUp(isAway);
    isScrolledUpRef.current = isAway;
    if (!isAway) {
      setUnreadWhileScrolled(0);
    }
  };

  // Sincroniza papel inicial com o usuário autenticado no AuthContext
  useEffect(() => {
    const nextIsAdmin = user?.role === "ADMIN";
    setActiveRole(nextIsAdmin ? "admin" : "client");
    setMobileView(nextIsAdmin ? "list" : "chat");
  }, [user?.role]);

  // Configura o seletor de perfil demonstrativo na Topbar compartilhada
  useEffect(() => {
    setTopbarRightContent(
      <div className="chat-role-indicator">
        <span className="role-indicator-label">Perfil Ativo:</span>
        <button
          type="button"
          className={`role-toggle-btn ${activeRole === "admin" ? "is-admin" : "is-client"}`}
          onClick={() => {
            const nextRole = activeRole === "admin" ? "client" : "admin";
            setActiveRole(nextRole);
            setMobileView(nextRole === "admin" ? "list" : "chat");
          }}
          title="Alternar visão entre Cliente e Administrador para testes de hierarquia"
        >
          {activeRole === "admin"
            ? "🛡️ Administrador"
            : "👤 Cliente (Empresa/Pessoa)"}
        </button>
      </div>,
    );

    return () => {
      setTopbarRightContent(null);
    };
  }, [activeRole, setTopbarRightContent]);

  // Limpa controles temporários ao trocar de perfil ou atendimento para evitar
  // que uma mensagem, orçamento ou avaliação seja enviada ao cliente errado.
  useEffect(() => {
    setShowQuickActions(false);
    setShowBudgetModal(false);
    setInputText("");
    setBudgetTitle("");
    setBudgetCents(0);
    setBudgetAmountError("");
    setBudgetDescription("");
    setRating(0);
    setRatingComment("");
    setRatingSubmitted(false);
    setSubmittedRating(null);
    setShowRatingModal(false);
  }, [activeRole, activeChatId]);

  // Rolagem inteligente para o fim das mensagens
  useEffect(() => {
    if (!isScrolledUpRef.current) {
      scrollToBottom("smooth");
    } else {
      setUnreadWhileScrolled((prev) => prev + 1);
    }
  }, [clientMessages, adminClients]);

  // Ao trocar conversa ou papel, sempre posiciona no fim
  useEffect(() => {
    scrollToBottom("auto");
    setUnreadWhileScrolled(0);
  }, [activeChatId, activeRole]);

  // Fecha modais e menus de ação com tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowQuickActions(false);
        setShowBudgetModal(false);
        setShowRatingModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const isAdmin = activeRole === "admin";

  // Localiza cliente e chat selecionados na estrutura Cliente -> chats[]
  let activeClient: AdminClientGroup | undefined;
  let activeAdminChat: AdminClientChat | undefined;
  for (const client of adminClients) {
    const foundChat = client.chats.find((chat) => chat.id === activeChatId);
    if (foundChat) {
      activeClient = client;
      activeAdminChat = foundChat;
      break;
    }
  }
  const activeSelection =
    activeClient && activeAdminChat
      ? { client: activeClient, chat: activeAdminChat }
      : null;

  const clientChatStatus = activeSelection?.chat.chatStatus ?? "open";
  const clientServiceStatus =
    activeSelection?.chat.serviceStatus ?? "not_started";
  const activeChatIsClosed =
    (isAdmin ? activeSelection?.chat.chatStatus : clientChatStatus) ===
    "closed";

  const activeMessages = isAdmin
    ? activeSelection?.chat.messages || []
    : clientMessages;

  const currentChatTitle = isAdmin
    ? activeSelection
      ? `${activeSelection.client.clientName} (${activeSelection.client.clientType === "empresa" ? "Empresa" : "Pessoa Física"})`
      : "Atendimento ao Cliente"
    : "Life Topografia • Atendimento & Engenharia";

  const currentChatSubtitle = isAdmin
    ? activeSelection
      ? `Chamado ${activeSelection.chat.ticketCode} — ${activeSelection.chat.title} • ${activeSelection.client.document}`
      : "Selecione um chamado na fila"
    : "Canal Oficial com agrimensores e topógrafos responsáveis (CREA/SP)";

  const updateAdminChat = (
    chatId: string,
    updater: (chat: AdminClientChat) => AdminClientChat,
    nextLastInteractionTime?: string,
  ) => {
    setAdminClients((previous) =>
      previous.map((client) => {
        const hasTargetChat = client.chats.some((chat) => chat.id === chatId);
        if (!hasTargetChat) return client;
        return {
          ...client,
          lastInteractionTime:
            nextLastInteractionTime ?? client.lastInteractionTime,
          chats: client.chats.map((chat) =>
            chat.id === chatId ? updater(chat) : chat,
          ),
        };
      }),
    );
  };

  const handleToggleClientDrawer = (clientId: string) => {
    setExpandedClientIds((previous) => ({
      ...previous,
      [clientId]: !previous[clientId],
    }));
  };

  const handleSelectAdminChat = (clientId: string, chatId: string) => {
    setActiveChatId(chatId);
    setExpandedClientIds((previous) => ({
      ...previous,
      [clientId]: true,
    }));
    updateAdminChat(chatId, (chat) =>
      chat.unreadCount === 0 ? chat : { ...chat, unreadCount: 0 },
    );
    setMobileView("chat");
  };

  /**
   * Envia mensagem de texto
   */
  const handleSendMessage = (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (activeChatIsClosed) return;
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
        ? user?.name || "Life Topografia (Admin)"
        : user?.name || "Você",
      text,
      time: formattedTime,
      type: "text",
    };

    if (isAdmin) {
      if (!activeChatId) return;
      updateAdminChat(
        activeChatId,
        (chat) => ({
          ...chat,
          lastMessageTime: formattedTime,
          messages: [...chat.messages, newMessage],
        }),
        formattedTime,
      );
    } else {
      setClientMessages((prev) => [...prev, newMessage]);
    }

    setInputText("");
    setShowQuickActions(false);
    setTimeout(() => scrollToBottom("smooth"), 30);
  };

  /**
   * Registra localmente os metadados do PDF selecionado.
   * O arquivo não é enviado nem armazenado sem integração de backend.
   */
  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (activeChatIsClosed) {
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
        ? user?.name || "Life Topografia (Admin)"
        : user?.name || "Você",
      time: formattedTime,
      type: "file",
      file: {
        name: file.name,
        size: `${sizeInMb} MB`,
        type: "pdf",
      },
    };

    if (isAdmin) {
      if (!activeChatId) return;
      updateAdminChat(
        activeChatId,
        (chat) => ({
          ...chat,
          lastMessageTime: formattedTime,
          messages: [...chat.messages, newMessage],
        }),
        formattedTime,
      );
    } else {
      setClientMessages((prev) => [...prev, newMessage]);
    }

    setShowQuickActions(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setTimeout(() => scrollToBottom("smooth"), 30);
  };

  /**
   * DEMONSTRAÇÃO DE GERAÇÃO DE DXF (EXCLUSIVO PARA ADMIN)
   * Usa coordenadas fictícias fixas; não lê nem extrai dados do PDF enviado.
   * A conversão real depende de integração de processamento no backend.
   */
  const handleConvertPdfToDxf = (msgId: string, pdfName: string) => {
    if (!isAdmin) {
      alert("Apenas administradores podem converter coordenadas para DXF.");
      return;
    }

    const targetChatId = activeChatId;
    setConvertingPdfId(msgId);

    // Simulação visual: as coordenadas abaixo são dados de exemplo, não extraídos do PDF.
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
        text: `Demonstração concluída para "${pdfName}". Foi gerado um DXF de exemplo com coordenadas fictícias; nenhum dado foi extraído do PDF original.`,
      };

      if (targetChatId) {
        updateAdminChat(
          targetChatId,
          (chat) => ({
            ...chat,
            lastMessageTime: formattedTime,
            messages: [...chat.messages, systemNotice, convertedMessage],
          }),
          formattedTime,
        );
      } else {
        setClientMessages((prev) => [...prev, systemNotice, convertedMessage]);
      }

      setConvertingPdfId(null);
      setTimeout(() => scrollToBottom("smooth"), 40);
    }, 1200);
  };

  const handleBudgetAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const nextCents = extractCentsFromDigits(e.target.value);
    setBudgetCents(nextCents);
    if (nextCents > 0) {
      setBudgetAmountError("");
    }
  };

  const handleBudgetAmountPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text");
    if (pasted.replace(/\D/g, "").length === 0) return;

    const nextCents = extractCentsFromDigits(pasted);
    setBudgetCents(nextCents);
    if (nextCents > 0) {
      setBudgetAmountError("");
    }
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

    if (budgetCents <= 0) {
      setBudgetAmountError("Informe um valor maior que R$ 00,00.");
      return;
    }

    if (
      !budgetTitle.trim() ||
      !activeChatId ||
      activeSelection?.chat.chatStatus === "closed"
    )
      return;

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
        amount: formatCentsToBRL(budgetCents),
        description:
          budgetDescription.trim() ||
          "Proposta técnica detalhada com ART, planta topográfica e memorial descritivo.",
        status: "pending",
        createdAt: formattedTime,
      },
    };

    updateAdminChat(
      activeChatId,
      (chat) => ({
        ...chat,
        lastMessageTime: formattedTime,
        messages: [...chat.messages, newBudgetMessage],
      }),
      formattedTime,
    );

    setBudgetTitle("");
    setBudgetCents(0);
    setBudgetAmountError("");
    setBudgetDescription("");
    setShowBudgetModal(false);
    setTimeout(() => scrollToBottom("smooth"), 40);
  };

  /**
   * RESPOSTA DO CLIENTE AO ORÇAMENTO (Aceitar ou Recusar)
   */
  const handleClientBudgetDecision = (
    budgetId: string,
    decision: "accepted" | "rejected",
  ) => {
    // A decisão pertence ao cliente e só pode ocorrer enquanto a conversa
    // estiver aberta e a proposta ainda aguardar resposta.
    if (isAdmin || clientChatStatus === "closed") return;
    const targetBudget = clientMessages.find(
      (message) => message.type === "budget" && message.budget?.id === budgetId,
    );
    if (!targetBudget?.budget || targetBudget.budget.status !== "pending")
      return;

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
        senderName: user?.name || "Você",
        text: responseText,
        time: formattedTime,
        type: "text",
      };

      return [...updated, statusMsg];
    };

    setClientMessages((prev) => updateBudgetInList(prev));
    setTimeout(() => scrollToBottom("smooth"), 40);
  };
  /**
   * Encerra a conversa atual.
   * Não significa que o serviço foi concluído.
   */
  const handleCloseChat = () => {
    if (activeChatIsClosed) return;

    const confirmed = window.confirm(
      "Deseja realmente encerrar esta conversa? O serviço não será marcado como concluído.",
    );

    if (!confirmed) return;

    if (activeSelection) {
      updateAdminChat(activeSelection.chat.id, (chat) => ({
        ...chat,
        chatStatus: "closed",
      }));
    }

    setShowQuickActions(false);
  };

  /**
   * Conclui o serviço.
   * Nesta versão, somente o administrador pode executar a ação.
   */
  const handleCompleteService = () => {
    if (!isAdmin || !activeSelection) return;
    if (activeSelection.chat.serviceStatus === "completed") return;

    const confirmed = window.confirm(
      "Confirma que o serviço deste cliente foi concluído? Esta ação também encerrará a conversa.",
    );

    if (!confirmed) return;

    updateAdminChat(activeSelection.chat.id, (chat) => ({
      ...chat,
      serviceStatus: "completed",
      chatStatus: "closed",
    }));

    setShowQuickActions(false);
  };

  /**
   * Registra a avaliação localmente.
   * A persistência definitiva dependerá do backend.
   */
  const handleSubmitRating = (e: FormEvent) => {
    e.preventDefault();

    if (rating < 1 || rating > 5 || clientServiceStatus !== "completed") return;

    setSubmittedRating({
      score: rating,
      comment: ratingComment.trim(),
    });
    setRatingSubmitted(true);
    setShowRatingModal(false);
  };

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredAdminClients = adminClients
    .map((client) => {
      const visibleChats =
        sidebarFilter === "unread"
          ? client.chats.filter((chat) => chat.unreadCount > 0)
          : client.chats;
      return { ...client, chats: visibleChats };
    })
    .filter((client) => {
      if (client.chats.length === 0) return false;
      if (!normalizedSearch) return true;
      return (
        client.clientName.toLowerCase().includes(normalizedSearch) ||
        client.document.toLowerCase().includes(normalizedSearch) ||
        client.chats.some(
          (chat) =>
            chat.ticketCode.toLowerCase().includes(normalizedSearch) ||
            chat.title.toLowerCase().includes(normalizedSearch),
        )
      );
    });

  return (
    <>
      <title>Chat e Orçamentos - Life Topografia</title>
      <meta
        name="description"
        content="Converse com a equipe da Life Topografia, envie documentos e acompanhe suas propostas de orçamento."
      />
      <div className="chat-page">
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
          <section
            className={`chat-card ${
              isAdmin
                ? mobileView === "list"
                  ? "mobile-view--list"
                  : "mobile-view--chat"
                : "is-client-view"
            }`}
            aria-label="Central de Mensagens"
          >
            {/* PAINEL LATERAL: 
              - No modo ADMIN: Lista todos os clientes e solicitações em aberto.
              - No modo CLIENTE: Mostra o canal direto com a Life Topografia e status. */}
            <aside className="chat-sidebar-panel">
              <div className="chat-sidebar-panel__header">
                <div className="sidebar-header-top">
                  <h2>{isAdmin ? "Atendimentos" : "Canal Oficial"}</h2>
                  {isAdmin && (
                    <div
                      className="sidebar-filter-tabs"
                      role="group"
                      aria-label="Filtrar atendimentos"
                    >
                      <button
                        type="button"
                        className={`sidebar-filter-tab ${sidebarFilter === "all" ? "is-active" : ""}`}
                        aria-pressed={sidebarFilter === "all"}
                        onClick={() => setSidebarFilter("all")}
                      >
                        Todos
                      </button>
                      <button
                        type="button"
                        className={`sidebar-filter-tab ${sidebarFilter === "unread" ? "is-active" : ""}`}
                        aria-pressed={sidebarFilter === "unread"}
                        onClick={() => setSidebarFilter("unread")}
                      >
                        Não lidos
                      </button>
                    </div>
                  )}
                </div>
                {isAdmin && (
                  <div className="chat-search-box">
                    <span className="search-icon" aria-hidden="true">
                      🔍
                    </span>
                    <input
                      type="text"
                      placeholder="Buscar nome, CNPJ/CPF ou assunto..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      aria-label="Buscar clientes ou chamados"
                    />
                  </div>
                )}
              </div>

              <div className="chat-conversations-list" role="list">
                {isAdmin ? (
                  filteredAdminClients.length === 0 ? (
                    <div className="chat-empty-search" role="status">
                      <span className="empty-search-icon" aria-hidden="true">
                        🔍
                      </span>
                      <p>
                        {normalizedSearch
                          ? `Nenhum cliente encontrado para "${searchTerm}".`
                          : "Nenhum atendimento não lido no momento."}
                      </p>
                    </div>
                  ) : (
                    filteredAdminClients.map((client) => {
                      const isExpanded =
                        Boolean(expandedClientIds[client.id]) ||
                        normalizedSearch.length > 0 ||
                        sidebarFilter === "unread";
                      const totalUnread = client.chats.reduce(
                        (sum, item) => sum + item.unreadCount,
                        0,
                      );
                      const hasOpenChat = client.chats.some(
                        (item) => item.chatStatus === "open",
                      );
                      const hasActiveChat = client.chats.some(
                        (item) => item.id === activeChatId,
                      );
                      const drawerId = `client-drawer-${client.id}`;

                      return (
                        <div
                          key={client.id}
                          role="listitem"
                          className={`client-drawer-group ${hasActiveChat ? "has-active-chat" : ""}`}
                        >
                          <button
                            type="button"
                            className={`client-drawer-trigger ${isExpanded ? "is-expanded" : ""}`}
                            aria-expanded={isExpanded}
                            aria-controls={drawerId}
                            onClick={() => handleToggleClientDrawer(client.id)}
                          >
                            <div className="conversation-avatar-box is-compact">
                              <div className="conversation-avatar">
                                {client.clientName.charAt(0)}
                              </div>
                              {hasOpenChat && (
                                <span
                                  className="online-indicator"
                                  title="Cliente com atendimento aberto"
                                />
                              )}
                            </div>

                            <span className="client-drawer-name">
                              {client.clientName}
                            </span>

                            <span className="client-trigger-meta">
                              {totalUnread > 0 && (
                                <span
                                  className="client-unread-badge"
                                  aria-label={`${totalUnread} mensagem(ns) não lida(s)`}
                                >
                                  {totalUnread}
                                </span>
                              )}
                              <span
                                className="client-drawer-chevron"
                                aria-hidden="true"
                              >
                                {isExpanded ? "▾" : "▸"}
                              </span>
                            </span>
                          </button>

                          {isExpanded && (
                            <div
                              id={drawerId}
                              className="client-chats-sublist"
                              role="list"
                              aria-label={`Atendimentos de ${client.clientName}`}
                            >
                              {client.chats.map((chat) => {
                                const isChatActive = chat.id === activeChatId;
                                const lastMsg =
                                  chat.messages[chat.messages.length - 1];
                                const previewText =
                                  lastMsg?.type === "file"
                                    ? `📎 Arquivo: ${lastMsg.file?.name}`
                                    : lastMsg?.type === "budget"
                                      ? `💼 Orçamento: ${formatBudgetAmountDisplay(lastMsg.budget?.amount || "")}`
                                      : lastMsg?.text ||
                                        "Inicie a conversa...";

                                return (
                                  <button
                                    key={chat.id}
                                    type="button"
                                    role="listitem"
                                    className={`client-chat-item ${isChatActive ? "is-active" : ""} ${chat.chatStatus === "closed" ? "is-closed" : ""}`}
                                    onClick={() =>
                                      handleSelectAdminChat(client.id, chat.id)
                                    }
                                  >
                                    <div className="client-chat-item__top">
                                      <span
                                        className={`chat-status-dot ${chat.chatStatus === "open" ? "is-open" : "is-closed"}`}
                                        title={
                                          chat.chatStatus === "open"
                                            ? "Aberto"
                                            : "Encerrado"
                                        }
                                        aria-hidden="true"
                                      />
                                      <span className="client-chat-item__title">
                                        {chat.title}
                                      </span>
                                      <span className="client-chat-item__time">
                                        {chat.lastMessageTime}
                                      </span>
                                    </div>

                                    <div className="client-chat-item__bottom">
                                      <span className="client-chat-item__preview">
                                        {previewText}
                                      </span>
                                      {chat.unreadCount > 0 && (
                                        <span className="client-chat-item__meta">
                                          <span
                                            className="chat-unread-dot"
                                            aria-label="Mensagem não lida"
                                          />
                                        </span>
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )
                ) : (
                  <div className="conversation-item is-active">
                    <div className="conversation-avatar-box">
                      <div className="conversation-avatar brand-avatar">LT</div>
                      {clientChatStatus === "open" && (
                        <span
                          className="online-indicator"
                          title="Conversa aberta"
                        />
                      )}
                    </div>
                    <div className="conversation-details">
                      <div className="conversation-top-row">
                        <span className="conversation-name">
                          Life Topografia
                        </span>
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
                <div className="chat-header-main">
                  <div className="chat-header-row-top">
                    {isAdmin && (
                      <button
                        type="button"
                        className="btn-mobile-back"
                        onClick={() => setMobileView("list")}
                        aria-label="Voltar para lista de clientes"
                        title="Voltar para lista de clientes"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          width="16"
                          height="16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <polyline points="15 18 9 12 15 6" />
                        </svg>
                        <span>Clientes</span>
                      </button>
                    )}

                    <div
                      className={`active-attendant-avatar ${isAdmin ? "" : "brand-avatar"}`}
                      aria-hidden="true"
                    >
                      {isAdmin ? currentChatTitle.charAt(0) : "LT"}
                      {!activeChatIsClosed && (
                        <span
                          className="online-indicator"
                          title="Conversa ativa"
                        />
                      )}
                    </div>

                    <div className="active-attendant-text">
                      <div className="active-attendant-title-row">
                        <h3
                          className="active-attendant-name"
                          title={currentChatTitle}
                        >
                          {currentChatTitle}
                        </h3>
                        <span
                          className={`chat-status-label ${
                            activeChatIsClosed ? "is-closed" : "is-open"
                          }`}
                        >
                          <span className="status-dot" aria-hidden="true" />
                          <span className="status-label-text">
                            {activeChatIsClosed
                              ? "Chat encerrado"
                              : "Chat aberto"}
                          </span>
                        </span>
                      </div>

                      <span
                        className="active-attendant-status active-attendant-status--desktop"
                        title={currentChatSubtitle}
                      >
                        {activeChatIsClosed ? (
                          `Atendimento encerrado • ${currentChatSubtitle}`
                        ) : (
                          <span className="online-status-line">
                            <span className="pulse-dot" aria-hidden="true" />
                            {currentChatSubtitle}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  <span
                    className="active-attendant-status active-attendant-status--mobile"
                    title={currentChatSubtitle}
                  >
                    {currentChatSubtitle}
                  </span>
                </div>

                {/* Ações e status do atendimento */}
                <div className="active-header-actions">
                  {isAdmin && activeSelection && (
                    <>
                      <button
                        type="button"
                        className="btn-header-budget"
                        onClick={() => setShowBudgetModal(true)}
                        disabled={activeChatIsClosed}
                      >
                        + Orçamento
                      </button>

                      {activeSelection.chat.serviceStatus !== "completed" && (
                        <button
                          type="button"
                          className="btn-complete-service"
                          onClick={handleCompleteService}
                        >
                          Concluir
                          <span className="action-btn-extra"> Serviço</span>
                        </button>
                      )}
                    </>
                  )}

                  {!activeChatIsClosed && (
                    <button
                      type="button"
                      className="btn-close-chat"
                      onClick={handleCloseChat}
                      title="Encerrar conversa atual"
                    >
                      Encerrar
                      <span className="action-btn-extra"> Chat</span>
                    </button>
                  )}
                </div>
              </header>

              {/* Área de Mensagens */}
              <div
                className="chat-messages-area"
                role="log"
                aria-live="polite"
                ref={messagesContainerRef}
                onScroll={handleMessagesScroll}
              >
                <div className="chat-date-badge">
                  <span>Canal Oficial de Atendimento • Life Topografia</span>
                </div>

                {activeMessages.length === 0 && (
                  <div className="chat-empty-messages">
                    <p>
                      Nenhuma mensagem nesta conversa ainda. Inicie o
                      atendimento enviando uma mensagem ou arquivo.
                    </p>
                  </div>
                )}

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
                        <div
                          className="message-sender-avatar"
                          aria-hidden="true"
                        >
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
                              {msg.file.type === "dxf" &&
                              msg.file.dxfContent ? (
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
                                  title="Gera um DXF demonstrativo com coordenadas fictícias; não processa o PDF"
                                >
                                  {convertingPdfId === msg.id ? (
                                    <span className="converting-spinner">
                                      Convertendo...
                                    </span>
                                  ) : (
                                    "📐 Gerar DXF de demonstração"
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
                                {formatBudgetAmountDisplay(msg.budget.amount)}
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
                                  disabled={clientChatStatus === "closed"}
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
                                  disabled={clientChatStatus === "closed"}
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

              {/* Botão flutuante para descer ao fim das mensagens */}
              {isScrolledUp && (
                <button
                  type="button"
                  className="btn-scroll-bottom"
                  onClick={() => scrollToBottom("smooth")}
                  aria-label="Rolar para mensagens recentes"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                  <span>Recentes</span>
                  {unreadWhileScrolled > 0 && (
                    <span className="scroll-bottom-badge">
                      {unreadWhileScrolled}
                    </span>
                  )}
                </button>
              )}

              {/* Menu de Ações Rápidas (Anexar PDF / Gerar Orçamento) */}
              {showQuickActions && (
                <>
                  <div
                    className="quick-actions-backdrop"
                    onClick={() => setShowQuickActions(false)}
                    aria-hidden="true"
                  />
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
                          Certidão de matrícula, escrituras ou memorial
                          descritivo
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
                </>
              )}

              {activeChatIsClosed ? (
                <div className="chat-closed-notice" role="status">
                  Este atendimento foi encerrado. Histórico disponível apenas
                  para consulta.
                </div>
              ) : (
                /* Barra de Entrada de Mensagens */
                <form className="chat-input-bar" onSubmit={handleSendMessage}>
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: "none" }}
                    accept=".pdf,application/pdf"
                    onChange={handleFileUpload}
                  />

                  <button
                    type="button"
                    className={`btn-action-trigger ${showQuickActions ? "is-active" : ""}`}
                    onClick={() => setShowQuickActions(!showQuickActions)}
                    aria-label="Abrir opções de anexo"
                    title="Anexar matrícula em PDF ou ações rápidas"
                  >
                    +
                  </button>

                  <div
                    className="chat-input-pill"
                    data-replicated-value={inputText}
                  >
                    <textarea
                      rows={1}
                      className="chat-text-input"
                      placeholder={
                        isAdmin
                          ? "Responder cliente como Administrador..."
                          : "Digite sua mensagem para a Life Topografia..."
                      }
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      aria-label="Mensagem de atendimento"
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn-send-message"
                    disabled={!inputText.trim()}
                    aria-label="Enviar mensagem"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                  </button>
                </form>
              )}
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
              Obrigado pela sua avaliação! Nota registrada nesta sessão:{" "}
              {submittedRating?.score}/5.
            </p>
          )}

          {/* MODAL EXCLUSIVO DO ADMINISTRADOR: Criar Proposta de Orçamento */}
          {showBudgetModal && isAdmin && (
            <div
              className="budget-modal-backdrop"
              onClick={closeBudgetModal}
            >
              <div
                className="budget-modal-content"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-budget-title"
              >
                <header className="budget-modal-header">
                  <span className="sumup-badge-pill">
                    sumup® emissão oficial
                  </span>
                  <h3 id="modal-budget-title">Gerar Proposta de Orçamento</h3>
                  <button
                    type="button"
                    className="btn-close-modal"
                    onClick={closeBudgetModal}
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
                      Valor Total:
                    </label>
                    <input
                      id="budget-service-amount"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="R$ 00,00"
                      value={formatCentsToBRL(budgetCents)}
                      onChange={handleBudgetAmountChange}
                      onPaste={handleBudgetAmountPaste}
                      aria-invalid={Boolean(budgetAmountError)}
                      aria-describedby="budget-amount-feedback"
                      required
                    />
                    {budgetAmountError ? (
                      <p
                        id="budget-amount-feedback"
                        className="modal-field-error"
                        role="alert"
                      >
                        {budgetAmountError}
                      </p>
                    ) : budgetCents <= 0 ? (
                      <p
                        id="budget-amount-feedback"
                        className="modal-field-hint"
                      >
                        Informe um valor maior que R$ 00,00.
                      </p>
                    ) : null}
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
                      onClick={closeBudgetModal}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn-modal-submit"
                      disabled={budgetCents <= 0 || !budgetTitle.trim()}
                    >
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

                <form
                  onSubmit={handleSubmitRating}
                  className="budget-modal-form"
                >
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
                    <label htmlFor="rating-comment">
                      Comentário (opcional):
                    </label>
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
      </div>
    </>
  );
}
