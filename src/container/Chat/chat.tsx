import { useState, useRef, useEffect } from "react";
import Sidebar from "../../components/Sidebar/sidebar";
import LogoIcon from "../../assets/image/logo-front.webp";
import { SerchDataUser } from "../../lib/supabase/auth";
import "./chat.css";

interface UserProfile {
  name: string;
  role: string;
  avatarUrl?: string;
}

interface Message {
  id: string;
  sender: "client" | "admin";
  type: "text" | "file-pdf" | "file-dxf" | "sumup-proposal" | "sumup-success";
  content?: string;
  fileName?: string;
  amount?: string;
}

interface ChatConversation {
  id: string;
  interlocutorName: string;
  interlocutorAvatar?: string;
  lastMessage: string;
  updatedAt: string;
  statusText?: string;
  statusType?: "green" | "red" | "default";
  messages: Message[];
}

export default function Chat() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  
  // TODO: Substituir por chamada à API do backend para buscar conversas reais do usuário autenticado.
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  
  const [inputText, setInputText] = useState("");
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetAmount, setBudgetAmount] = useState("");
  const [showActionMenu, setShowActionMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Autenticação e vínculo com a conta atual do site
  useEffect(() => {
    SerchDataUser()
      .then((response) => {
        if (!response) {
          setUserProfile(null);
          return;
        }
        const profileData = JSON.parse(response);
        setUserProfile({
          name: profileData.nome_ou_razao,
          role: profileData.tipo_perfil,
          avatarUrl: profileData.foto_url,
        });
      })
      .catch((error) => {
        console.error("Erro ao validar sessão do usuário:", error);
        setUserProfile(null);
      });
  }, []);

  // TODO: Buscar mensagens e chats do backend quando o usuário estiver autenticado
  useEffect(() => {
    if (userProfile) {
      // Exemplo de integração futura: fetchConversationsByUserId()
    }
  }, [userProfile]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChatId]);

  const handleSendMessage = () => {
    if (!inputText.trim() || !activeChatId) return;

    // TODO: Enviar mensagem para o backend via API/WebSocket
    const newMessage: Message = {
      id: Date.now().toString(),
      sender: "admin", // ou o perfil logado atual
      type: "text",
      content: inputText,
    };

    setConversations((prev) =>
      prev.map((chat) =>
        chat.id === activeChatId
          ? { ...chat, messages: [...chat.messages, newMessage], lastMessage: inputText }
          : chat
      )
    );
    setInputText("");
    setShowActionMenu(false);
  };

  const currentChat = conversations.find((c) => c.id === activeChatId);

  return (
    <div className="chat-page">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} user={userProfile} />

      <header className="chat-topbar">
        <button
          type="button"
          className="btn-menu-header"
          onClick={() => setIsSidebarOpen(true)}
          aria-label="Abrir menu"
        >
          <span />
          <span />
          <span />
        </button>

        <div className="topbar-logo">
          <img src={LogoIcon} alt="Life Topografia" />
        </div>
      </header>

      <main className="chat-main-content">
        <div className="chat-title-container">
          <div className="brand-header-box">
            <div className="brand-icon-wrapper">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
              </svg>
            </div>
            <h1 className="chat-main-title">Life Topografia</h1>
          </div>
          <div className="title-divider">
            <span className="line" />
            <span className="rhombus" />
            <span className="line" />
          </div>
        </div>

        {!activeChatId ? (
          /* LISTAGEM DE CONVERSAS VINDAS DO BACKEND */
          <div className="chat-list-card">
            {conversations.length === 0 ? (
              <p className="no-chats-text">Nenhuma conversa encontrada ou aguardando integração com o backend.</p>
            ) : (
              conversations.map((chat) => (
                <div
                  key={chat.id}
                  className="chat-list-item"
                  onClick={() => setActiveChatId(chat.id)}
                >
                  {chat.interlocutorAvatar ? (
                    <img src={chat.interlocutorAvatar} alt={chat.interlocutorName} className="chat-item-avatar" />
                  ) : (
                    <div className="chat-item-avatar-placeholder">
                      {chat.interlocutorName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="chat-item-info">
                    <div className="chat-item-header-row">
                      <span className="chat-item-name">{chat.interlocutorName}</span>
                      <span className={`chat-item-time ${chat.statusType || ""}`}>
                        {chat.statusText || chat.updatedAt}
                      </span>
                    </div>
                    <p className="chat-item-last-msg">{chat.lastMessage}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* JANELA DO CHAT ATIVO */
          <div className="chat-window-card animation-fade-in">
            <div className="chat-window-header">
              <button
                type="button"
                className="btn-close-chat"
                onClick={() => setActiveChatId(null)}
                aria-label="Fechar chat"
              >
                ✕
              </button>
              <div className="chat-header-profile">
                {currentChat?.interlocutorAvatar ? (
                  <img src={currentChat.interlocutorAvatar} alt={currentChat.interlocutorName} />
                ) : (
                  <div className="chat-header-avatar-placeholder">
                    {currentChat?.interlocutorName.charAt(0).toUpperCase()}
                  </div>
                )}
                <span>{currentChat?.interlocutorName}</span>
              </div>
            </div>

            <div className="chat-messages-container">
              {currentChat?.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`chat-message-row ${msg.sender === "admin" ? "admin" : "client"}`}
                >
                  <div className={`message-bubble ${msg.sender}`}>
                    {msg.type === "text" && <p>{msg.content}</p>}
                    {/* TODO: Renderização de PDF, DXF e Orçamentos processados pelo Back-end */}
                    {msg.type === "sumup-proposal" && (
                      <div className="sumup-card">
                        <div className="sumup-brand">sumup®</div>
                        <p className="sumup-title">Proposta de Orçamento</p>
                        <p className="sumup-value">R$ {msg.amount}</p>
                        {/* TODO: Botão integrado à API de Pagamento do Backend */}
                        <button type="button" className="sumup-btn-confirm">Confirmar</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* AÇÕES RÁPIDAS (Orçamento / Arquivos processados pelo Back) */}
            {showActionMenu && (
              <div className="chat-quick-actions-card animation-fade-in">
                <button
                  type="button"
                  className="quick-action-btn"
                  onClick={() => {
                    setShowActionMenu(false);
                    setShowBudgetModal(true);
                  }}
                >
                  <span className="action-icon-circle">$</span>
                  <span>Realizar orçamento</span>
                </button>
                <button
                  type="button"
                  className="quick-action-btn"
                  onClick={() => {
                    setShowActionMenu(false);
                    // TODO: Acionar seletor de arquivos PDF/DXF para upload via backend
                  }}
                >
                  <span className="action-icon-circle">📁</span>
                  <span>Enviar arquivos</span>
                </button>
              </div>
            )}

            {/* MODAL DE ORÇAMENTO */}
            {showBudgetModal && (
              <div className="chat-modal-overlay">
                <div className="chat-modal-card">
                  <div className="sumup-brand-modal">sumup®</div>
                  <p className="modal-instruction">Insira o valor do orçamento:</p>
                  <div className="budget-input-wrapper">
                    <span>R$</span>
                    <input
                      type="text"
                      value={budgetAmount}
                      onChange={(e) => setBudgetAmount(e.target.value)}
                      placeholder="0,00"
                    />
                  </div>
                  <button
                    type="button"
                    className="btn-send-budget"
                    onClick={() => {
                      setShowBudgetModal(false);
                      // TODO: Enviar valor do orçamento para o backend gerar a cobrança/proposta
                    }}
                  >
                    Enviar Orçamento
                  </button>
                </div>
              </div>
            )}

            <div className="chat-input-bar">
              <input
                type="text"
                placeholder="Enviar mensagem..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              />
              <button
                type="button"
                className="btn-attach"
                onClick={() => setShowActionMenu(!showActionMenu)}
                aria-label="Anexar arquivo"
              >
                🔗
              </button>
              <button
                type="button"
                className="btn-send"
                onClick={handleSendMessage}
                aria-label="Enviar mensagem"
              >
                ➤
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}