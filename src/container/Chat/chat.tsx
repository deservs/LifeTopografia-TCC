import { useState, useRef, useEffect } from "react";
import Sidebar from "../../components/Sidebar/sidebar";
import LogoIcon from "../../assets/image/logo-front.webp";
import "./chat.css";

interface Message {
  id: string;
  sender: "client" | "admin";
  type: "text" | "file-pdf" | "file-dxf" | "sumup-proposal" | "sumup-success" | "dxf-validation" | "feedback" | "rating-box";
  content?: string;
  fileName?: string;
  amount?: string;
  status?: string;
}

interface ChatItem {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  statusText?: string;
  statusType?: "green" | "red" | "default";
  messages: Message[];
}

export default function Chat() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetAmount, setBudgetAmount] = useState("10.000,00");
  const [showActionMenu, setShowActionMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mock de conversas baseado no design (chat1.png)
  const [chats, setChats] = useState<ChatItem[]>([
    {
      id: "1",
      name: "Felipe Carlos",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
      lastMessage: "projetoTeste.pdf",
      time: "Ontem",
      messages: [
        { id: "m1", sender: "client", type: "text", content: "Boa tarde, gostaria de fazer a topografia da minha casa" },
        { id: "m2", sender: "admin", type: "text", content: "Certo, poderia mandar um pdf do seu terreno para que eu possa dar uma olhada?" },
        { id: "m3", sender: "client", type: "file-pdf", fileName: "ArquivosProjeto.pdf" },
        { id: "m4", sender: "admin", type: "sumup-proposal", amount: "10.000,00" },
        { id: "m5", sender: "client", type: "sumup-success", amount: "10.000,00" }
      ]
    },
    {
      id: "2",
      name: "Nilton Santos",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
      lastMessage: "pagamento do pro...",
      time: "Hoje",
      messages: []
    },
    {
      id: "3",
      name: "Gian Carlos",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
      lastMessage: "pagamento realizado",
      time: "12/09",
      messages: []
    },
    {
      id: "4",
      name: "Lazaro Silva",
      avatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150",
      lastMessage: "Projeto finalizado",
      time: "25/11/2024",
      statusText: "Projeto finalizado",
      statusType: "green",
      messages: []
    },
    {
      id: "5",
      name: "Pablo da Silva",
      avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150",
      lastMessage: "Valor muito alto",
      time: "25/10/2024",
      statusText: "Valor muito alto",
      statusType: "red",
      messages: []
    }
  ]);

  const currentChat = chats.find((c) => c.id === activeChatId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentChat?.messages]);

  const handleSendMessage = () => {
    if (!inputText.trim() || !activeChatId) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      sender: "admin",
      type: "text",
      content: inputText
    };

    setChats((prev) =>
      prev.map((chat) =>
        chat.id === activeChatId
          ? { ...chat, messages: [...chat.messages, newMessage], lastMessage: inputText }
          : chat
      )
    );
    setInputText("");
    setShowActionMenu(false);
  };

  return (
    <div className="chat-page">
      {/* Sidebar do sistema */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Topbar padrão */}
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

      {/* Conteúdo Principal */}
      <main className="chat-main-content">
        <div className="chat-title-container">
          <div className="brand-header-box">
            <div className="brand-icon-wrapper">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>
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
          /* TELA 1: LISTAGEM DE CONVERSAS */
          <div className="chat-list-card">
            {chats.map((chat) => (
              <div
                key={chat.id}
                className="chat-list-item"
                onClick={() => setActiveChatId(chat.id)}
              >
                <img src={chat.avatar} alt={chat.name} className="chat-item-avatar" />
                <div className="chat-item-info">
                  <div className="chat-item-header-row">
                    <span className="chat-item-name">{chat.name}</span>
                    <span className={`chat-item-time ${chat.statusType || ""}`}>
                      {chat.statusText || chat.time}
                    </span>
                  </div>
                  <p className="chat-item-last-msg">{chat.lastMessage}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* TELA DO CHAT ATIVO (MODAL / JANELA) */
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
                <img src={currentChat?.avatar} alt={currentChat?.name} />
                <span>{currentChat?.name}</span>
              </div>
            </div>

            <div className="chat-messages-container">
              {currentChat?.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`chat-message-row ${msg.sender === "admin" ? "admin" : "client"}`}
                >
                  {msg.sender === "admin" && (
                    <div className="msg-avatar-admin">
                      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/></svg>
                    </div>
                  )}

                  <div className={`message-bubble ${msg.sender}`}>
                    {msg.type === "text" && <p>{msg.content}</p>}
                    {msg.type === "file-pdf" && (
                      <div className="file-bubble-content">
                        <div className="file-preview-mock"></div>
                        <span className="file-name-label">{msg.fileName}</span>
                      </div>
                    )}
                    {msg.type === "sumup-proposal" && (
                      <div className="sumup-card">
                        <div className="sumup-brand">sumup®</div>
                        <p className="sumup-title">Proposta de Orçamento</p>
                        <p className="sumup-value">R$ {msg.amount}</p>
                        <button type="button" className="sumup-btn-confirm">Confirmar</button>
                      </div>
                    )}
                    {msg.type === "sumup-success" && (
                      <div className="sumup-card success">
                        <div className="sumup-brand">sumup®</div>
                        <p className="sumup-success-text">Pagamento de R$ {msg.amount} realizado com sucesso</p>
                      </div>
                    )}
                  </div>

                  {msg.sender === "client" && (
                    <img src={currentChat?.avatar} alt="User" className="msg-avatar-client" />
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* MENU DE AÇÕES RÁPIDAS (Orçamento / Arquivos) */}
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
                <button type="button" className="quick-action-btn" onClick={() => setShowActionMenu(false)}>
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
                    />
                  </div>
                  <button
                    type="button"
                    className="btn-send-budget"
                    onClick={() => {
                      setShowBudgetModal(false);
                      // Adiciona proposta ao chat
                      const propMsg: Message = {
                        id: Date.now().toString(),
                        sender: "admin",
                        type: "sumup-proposal",
                        amount: budgetAmount
                      };
                      setChats((prev) =>
                        prev.map((c) =>
                          c.id === activeChatId ? { ...c, messages: [...c.messages, propMsg] } : c
                        )
                      );
                    }}
                  >
                    Enviar Orçamento
                  </button>
                </div>
              </div>
            )}

            {/* INPUT DE MENSAGEM */}
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
                aria-label="Anexar arquivo ou orçamento"
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