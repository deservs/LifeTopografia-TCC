import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import Sidebar, { type UserProfile } from "../../components/Sidebar/sidebar";
import Footer from "../../components/Footer/footer";
import { SerchDataUser } from "../../lib/supabase/auth";
import { supabase } from "../../lib/supabase/supabaseClient";
import Logo from "../../assets/image/logo-front.webp";
import "./profile.css";

export interface ProfileData extends UserProfile {
  id: string;
  email: string;
}

export interface CompanyMember {
  id: string;
  name: string;
  email: string;
  cpf: string;
  status: "ativo" | "afastado";
  avatarUrl?: string;
}

export type MemberAction =
  | { type: "status"; member: CompanyMember; status: CompanyMember["status"] }
  | { type: "remove"; member: CompanyMember };

/**
 * Contrato de integração do frontend. A confirmação deve validar a senha da
 * conta responsável e executar a operação no servidor; false indica senha
 * incorreta. Não validar senhas nem autorizar operações no navegador.
 * Os callbacks de gravação só devem resolver após a confirmação do serviço.
 */
export interface ProfileServices {
  loadMembers?: (profileId: string) => Promise<CompanyMember[]>;
  saveProfile?: (profile: ProfileData) => Promise<void>;
  saveMembers?: (profileId: string, members: CompanyMember[]) => Promise<void>;
  confirmMemberAction?: (
    profileId: string,
    action: MemberAction,
    password: string,
  ) => Promise<boolean>;
  changePassword?: (password: string) => Promise<void>;
}

interface ProfileProps {
  initialProfile?: ProfileData;
  initialMembers?: CompanyMember[];
  services?: ProfileServices;
}

type PageView = "profile" | "members" | "member" | "password";
const unavailableMessage =
  "Esta ação ainda não está disponível. Suas alterações não foram enviadas.";

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M13 5H5v14h14v-8M10 14l1-4L19 2l3 3-8 8-4 1Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Avatar({ name, avatarUrl }: Pick<UserProfile, "name" | "avatarUrl">) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  return (
    <span className="profile-avatar">
      {avatarUrl && failedUrl !== avatarUrl ? (
        <img
          src={avatarUrl}
          alt={`Foto de ${name}`}
          onError={() => setFailedUrl(avatarUrl)}
        />
      ) : (
        <span aria-label={`Perfil de ${name}`}>
          {name.trim().charAt(0).toUpperCase() || "P"}
        </span>
      )}
    </span>
  );
}

function formatCpf(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function isCompany(role: string) {
  return [
    "empresa",
    "pj",
    "pessoa juridica",
    "pessoa_juridica",
    "pessoa-juridica",
  ].includes(
    role
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase(),
  );
}

export default function Profile({
  initialProfile,
  initialMembers = [],
  services,
}: ProfileProps = {}) {
  const [profile, setProfile] = useState<ProfileData | null>(
    initialProfile ?? null,
  );
  const [draft, setDraft] = useState<ProfileData | null>(
    initialProfile ?? null,
  );
  const [loading, setLoading] = useState(!initialProfile);
  const [loadError, setLoadError] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [view, setView] = useState<PageView>("profile");
  const [members, setMembers] = useState<CompanyMember[]>(initialMembers);
  const [membersLoaded, setMembersLoaded] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [member, setMember] = useState<CompanyMember | null>(null);
  const [action, setAction] = useState<MemberAction | null>(null);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [invalidPassword, setInvalidPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [feedback, setFeedback] = useState("");
  const [feedbackIsError, setFeedbackIsError] = useState(false);
  const [busy, setBusy] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousViewRef = useRef(view);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (initialProfile) return;
    let active = true;
    async function loadProfile() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!data.session) return;
        const cached = await SerchDataUser();
        if (!cached) throw new Error("Perfil não encontrado");
        const user = JSON.parse(cached);
        const loadedProfile: ProfileData = {
          id: data.session.user.id,
          name: user.nome_ou_razao ?? "",
          role:
            user.tipo_perfil ??
            (data.session.user.user_metadata.cnpj ? "empresa" : "pessoa"),
          avatarUrl: user.foto_url ?? undefined,
          email: data.session.user.email ?? "",
        };
        if (active) {
          setProfile(loadedProfile);
          setDraft(loadedProfile);
        }
      } catch (error) {
        console.error("Erro ao carregar perfil:", error);
        if (active) setLoadError(true);
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadProfile();
    return () => {
      active = false;
    };
  }, [initialProfile]);

  useEffect(() => {
    if (previousViewRef.current !== view) headingRef.current?.focus();
    previousViewRef.current = view;
  }, [view]);

  useEffect(() => {
    if (!action) return;
    const dialog = dialogRef.current;
    const previouslyFocused = document.activeElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (
        previouslyFocused instanceof HTMLElement &&
        previouslyFocused.isConnected
      )
        previouslyFocused.focus();
    };
  }, [action]);

  function notify(message: string, error = false) {
    setFeedback(message);
    setFeedbackIsError(error);
  }

  function navigate(view: PageView) {
    setFeedback("");
    setView(view);
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || submittingRef.current) return;
    if (!services?.saveProfile) {
      notify(unavailableMessage, true);
      return;
    }
    submittingRef.current = true;
    setBusy(true);
    setFeedback("");
    try {
      const updated = {
        ...draft,
        name: draft.name.trim(),
        email: draft.email.trim(),
      };
      await services.saveProfile(updated);
      setProfile(updated);
      setDraft(updated);
      notify("Perfil salvo com sucesso.");
    } catch {
      notify("Não foi possível salvar o perfil. Tente novamente.", true);
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  }

  async function openMembers() {
    navigate("members");
    if (!profile || membersLoaded || !services?.loadMembers) return;
    setMembersLoading(true);
    try {
      setMembers(await services.loadMembers(profile.id));
      setMembersLoaded(true);
    } catch {
      notify(
        "Não foi possível carregar os membros. Volte ao perfil e tente novamente.",
        true,
      );
    } finally {
      setMembersLoading(false);
    }
  }

  function editMember(selected?: CompanyMember) {
    setMember(
      selected
        ? { ...selected, cpf: formatCpf(selected.cpf) }
        : {
            id: crypto.randomUUID(),
            name: "",
            email: "",
            cpf: "",
            status: "ativo",
          },
    );
    navigate("member");
  }

  function saveMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!member) return;
    const updated = {
      ...member,
      name: member.name.trim(),
      email: member.email.trim(),
    };
    setMembers((previous) =>
      previous.some((item) => item.id === updated.id)
        ? previous.map((item) => (item.id === updated.id ? updated : item))
        : [...previous, updated],
    );
    navigate("members");
    notify("Alterações preparadas. Clique em Salvar para concluir.");
  }

  async function saveMembers() {
    if (!profile || submittingRef.current) return;
    if (!services?.saveMembers) {
      notify(unavailableMessage, true);
      return;
    }
    submittingRef.current = true;
    setBusy(true);
    setFeedback("");
    try {
      await services.saveMembers(profile.id, members);
      notify("Membros salvos com sucesso.");
    } catch {
      notify("Não foi possível salvar os membros. Tente novamente.", true);
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  }

  function requestAction(requested: MemberAction) {
    setPassword("");
    setPasswordError("");
    setInvalidPassword(false);
    setAction(requested);
  }

  function closeDialog() {
    if (submittingRef.current) return;
    setAction(null);
    setPassword("");
    setPasswordError("");
    setInvalidPassword(false);
  }

  async function confirmAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile || !action || submittingRef.current) return;
    if (!services?.confirmMemberAction) {
      setPasswordError(
        "Não foi possível confirmar a senha. Serviço indisponível.",
      );
      return;
    }
    submittingRef.current = true;
    setBusy(true);
    setPasswordError("");
    setInvalidPassword(false);
    try {
      const confirmed = await services.confirmMemberAction(
        profile.id,
        action,
        password,
      );
      if (!confirmed) {
        setInvalidPassword(true);
        setPasswordError("Senha incorreta.");
        return;
      }
      if (action.type === "remove") {
        setMembers((previous) =>
          previous.filter((item) => item.id !== action.member.id),
        );
        navigate("members");
        notify("Membro removido com sucesso.");
      } else {
        setMembers((previous) =>
          previous.map((item) =>
            item.id === action.member.id
              ? { ...item, status: action.status }
              : item,
          ),
        );
        setMember((previous) =>
          previous ? { ...previous, status: action.status } : previous,
        );
        notify("Status alterado com sucesso.");
      }
      setAction(null);
    } catch {
      setPasswordError(
        "Não foi possível confirmar a alteração. Tente novamente.",
      );
    } finally {
      setPassword("");
      submittingRef.current = false;
      setBusy(false);
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    if (newPassword !== repeatPassword) {
      notify("As senhas informadas não são iguais.", true);
      return;
    }
    if (!services?.changePassword) {
      notify(unavailableMessage, true);
      return;
    }
    submittingRef.current = true;
    setBusy(true);
    setFeedback("");
    try {
      await services.changePassword(newPassword);
      setNewPassword("");
      setRepeatPassword("");
      navigate("profile");
      notify("Senha alterada com sucesso.");
    } catch {
      notify("Não foi possível alterar a senha. Tente novamente.", true);
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  }

  const company = !!profile && isCompany(profile.role);
  const existingMember = members.some((item) => item.id === member?.id);
  const title =
    view === "members"
      ? "MEMBROS"
      : view === "member"
        ? existingMember
          ? "EDITAR MEMBRO"
          : "ADICIONAR MEMBRO"
        : view === "password"
          ? "ALTERAR SENHA"
          : "EDITAR PERFIL";
  const feedbackNode = feedback && (
    <p
      className={`profile-feedback${feedbackIsError ? " profile-feedback--error" : ""}`}
      role={feedbackIsError ? "alert" : "status"}
    >
      {feedback}
    </p>
  );

  return (
    <>
      <div className="profile-page">
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          user={profile}
        />
        <header className="profile-topbar">
          <button
            className="profile-menu-button"
            type="button"
            aria-label="Abrir menu"
            aria-expanded={isSidebarOpen}
            aria-controls="menu-drawer"
            onClick={() => setIsSidebarOpen(true)}
          >
            <span />
            <span />
            <span />
          </button>
          <Link to="/" className="profile-logo">
            <img src={Logo} alt="Life Topografia — Início" />
          </Link>
        </header>

        <main className="profile-main" aria-busy={loading}>
          <div className="profile-title-container">
            <h1 ref={headingRef} tabIndex={-1}>
              {title}
            </h1>
            <div className="profile-title-divider" aria-hidden="true">
              <span />
              <i />
              <span />
            </div>
          </div>

          {loading ? (
            <p className="profile-page-message" role="status">
              Carregando perfil…
            </p>
          ) : !profile || !draft ? (
            <section className="profile-card profile-empty">
              <p role={loadError ? "alert" : undefined}>
                {loadError
                  ? "Não foi possível carregar seu perfil. Tente novamente mais tarde."
                  : "Entre na sua conta para acessar seu perfil."}
              </p>
              <Link className="profile-primary-button" to="/login">
                ENTRAR
              </Link>
            </section>
          ) : (
            <>
              {view !== "profile" && (
                <button
                  type="button"
                  className="profile-back-button"
                  disabled={busy || membersLoading}
                  onClick={() => {
                    setNewPassword("");
                    setRepeatPassword("");
                    navigate(view === "member" ? "members" : "profile");
                  }}
                >
                  ←{" "}
                  {view === "member"
                    ? "Voltar aos membros"
                    : "Voltar ao perfil"}
                </button>
              )}

              {view === "profile" && (
                <form
                  className="profile-card profile-form"
                  onSubmit={saveProfile}
                >
                  <div className="profile-identity">
                    <Avatar {...profile} />
                    <p>
                      <span>Status:</span>{" "}
                      {company ? "Empresa" : "Pessoa Física"}
                    </p>
                  </div>
                  <div className="profile-field">
                    <label htmlFor="profile-name">Nome:</label>
                    <span className="profile-edit-field">
                      <input
                        id="profile-name"
                        name="name"
                        autoComplete={company ? "organization" : "name"}
                        value={draft.name}
                        required
                        maxLength={160}
                        pattern=".*\S.*"
                        disabled={busy}
                        onChange={(event) =>
                          setDraft({ ...draft, name: event.target.value })
                        }
                      />
                      <button
                        type="button"
                        aria-label="Editar nome"
                        disabled={busy}
                        onClick={() =>
                          document.getElementById("profile-name")?.focus()
                        }
                      >
                        <EditIcon />
                      </button>
                    </span>
                  </div>
                  <div className="profile-field">
                    <label htmlFor="profile-email">Email:</label>
                    <span className="profile-edit-field">
                      <input
                        id="profile-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        value={draft.email}
                        required
                        maxLength={254}
                        disabled={busy}
                        onChange={(event) =>
                          setDraft({ ...draft, email: event.target.value })
                        }
                      />
                      <button
                        type="button"
                        aria-label="Editar email"
                        disabled={busy}
                        onClick={() =>
                          document.getElementById("profile-email")?.focus()
                        }
                      >
                        <EditIcon />
                      </button>
                    </span>
                  </div>
                  <div className="profile-actions">
                    <button
                      className="profile-text-button"
                      type="button"
                      disabled={busy}
                      onClick={() => navigate("password")}
                    >
                      Alterar senha <EditIcon />
                    </button>
                    {company && (
                      <button
                        className="profile-text-button"
                        type="button"
                        disabled={busy}
                        onClick={() => void openMembers()}
                      >
                        Gerenciar membros <span aria-hidden="true">⚙</span>
                      </button>
                    )}
                  </div>
                  {feedbackNode}
                  <button
                    className="profile-primary-button"
                    type="submit"
                    disabled={busy}
                  >
                    {busy ? "SALVANDO…" : "SALVAR"}
                  </button>
                </form>
              )}

              {company && view === "members" && (
                <section
                  className="profile-card profile-members-card"
                  aria-label="Membros da empresa"
                  aria-busy={membersLoading}
                >
                  {membersLoading ? (
                    <p role="status">Carregando membros…</p>
                  ) : (
                    <>
                      <ul className="profile-members-list">
                        {members.map((item) => (
                          <li key={item.id}>
                            <Avatar {...item} />
                            <div className="profile-member-summary">
                              <span>{item.name}</span>
                              <span
                                className={`profile-status profile-status--${item.status}`}
                              >
                                {item.status === "ativo" ? "Ativo" : "Afastado"}
                              </span>
                            </div>
                            <button
                              className="profile-icon-button"
                              type="button"
                              aria-label={`Editar membro ${item.name}`}
                              disabled={busy}
                              onClick={() => editMember(item)}
                            >
                              <EditIcon />
                            </button>
                          </li>
                        ))}
                      </ul>
                      {!members.length && (
                        <p className="profile-empty-members">
                          Nenhum membro para exibir.
                        </p>
                      )}
                      <button
                        className="profile-text-button profile-add-member"
                        type="button"
                        disabled={busy}
                        onClick={() => editMember()}
                      >
                        Adicionar membros +
                      </button>
                    </>
                  )}
                  {feedbackNode}
                  <button
                    className="profile-primary-button"
                    type="button"
                    disabled={busy || membersLoading}
                    onClick={() => void saveMembers()}
                  >
                    {busy ? "SALVANDO…" : "SALVAR"}
                  </button>
                </section>
              )}

              {company && view === "member" && member && (
                <form
                  className="profile-card profile-form"
                  onSubmit={saveMember}
                >
                  <div className="profile-identity">
                    <Avatar {...member} />
                    {existingMember ? (
                      <p>{member.name}</p>
                    ) : (
                      <span>Novo membro</span>
                    )}
                  </div>
                  {!existingMember && (
                    <label
                      className="profile-field"
                      htmlFor="profile-member-name"
                    >
                      Nome:
                      <input
                        id="profile-member-name"
                        name="memberName"
                        autoComplete="off"
                        value={member.name}
                        required
                        maxLength={160}
                        pattern=".*\S.*"
                        onChange={(event) =>
                          setMember({ ...member, name: event.target.value })
                        }
                      />
                    </label>
                  )}
                  <label
                    className="profile-field"
                    htmlFor="profile-member-email"
                  >
                    Email:
                    <input
                      id="profile-member-email"
                      name="memberEmail"
                      type="email"
                      autoComplete="off"
                      value={member.email}
                      required
                      maxLength={254}
                      onChange={(event) =>
                        setMember({ ...member, email: event.target.value })
                      }
                    />
                  </label>
                  <label className="profile-field" htmlFor="profile-member-cpf">
                    CPF:
                    <input
                      id="profile-member-cpf"
                      name="memberCpf"
                      inputMode="numeric"
                      value={member.cpf}
                      required
                      pattern="\d{3}\.\d{3}\.\d{3}-\d{2}"
                      maxLength={14}
                      title="Informe os 11 dígitos do CPF"
                      onChange={(event) =>
                        setMember({
                          ...member,
                          cpf: formatCpf(event.target.value),
                        })
                      }
                    />
                  </label>
                  <label
                    className="profile-field"
                    htmlFor="profile-member-status"
                  >
                    Status:
                    <select
                      id="profile-member-status"
                      aria-label="Status do membro"
                      value={member.status}
                      className={`profile-status profile-status--${member.status}`}
                      onChange={(event) => {
                        const status = event.target
                          .value as CompanyMember["status"];
                        if (existingMember)
                          requestAction({ type: "status", member, status });
                        else setMember({ ...member, status });
                      }}
                    >
                      <option value="ativo">Ativo</option>
                      <option value="afastado">Afastado</option>
                    </select>
                  </label>
                  {existingMember && (
                    <button
                      type="button"
                      className="profile-remove-button"
                      onClick={() => requestAction({ type: "remove", member })}
                    >
                      Remover funcionário
                    </button>
                  )}
                  {feedbackNode}
                  <button className="profile-primary-button" type="submit">
                    SALVAR
                  </button>
                </form>
              )}

              {view === "password" && (
                <form
                  className="profile-card profile-form"
                  onSubmit={changePassword}
                >
                  <label
                    className="profile-field"
                    htmlFor="profile-new-password"
                  >
                    Nova senha:
                    <input
                      id="profile-new-password"
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^a-zA-Z0-9\s]).{8,}"
                      title="Use ao menos 8 caracteres, uma letra maiúscula, uma minúscula, um número e um símbolo"
                      value={newPassword}
                      required
                      disabled={busy}
                      onChange={(event) => setNewPassword(event.target.value)}
                    />
                  </label>
                  <p className="profile-password-hint">
                    Use ao menos 8 caracteres, uma letra maiúscula, uma
                    minúscula, um número e um símbolo.
                  </p>
                  <label
                    className="profile-field"
                    htmlFor="profile-repeat-password"
                  >
                    Confirmar senha:
                    <input
                      id="profile-repeat-password"
                      type="password"
                      autoComplete="new-password"
                      value={repeatPassword}
                      required
                      disabled={busy}
                      onChange={(event) =>
                        setRepeatPassword(event.target.value)
                      }
                    />
                  </label>
                  {feedbackNode}
                  <button
                    className="profile-primary-button"
                    type="submit"
                    disabled={busy}
                  >
                    {busy ? "SALVANDO…" : "SALVAR"}
                  </button>
                </form>
              )}
            </>
          )}
        </main>
        <Footer />
      </div>

      {action && (
        <dialog
          className="profile-dialog"
          ref={dialogRef}
          aria-labelledby="profile-confirm-title"
          aria-describedby="profile-confirm-description"
          onCancel={(event) => {
            event.preventDefault();
            closeDialog();
          }}
        >
          <button
            className="profile-dialog-close"
            type="button"
            aria-label="Fechar confirmação"
            disabled={busy}
            onClick={closeDialog}
          >
            X
          </button>
          <h2 id="profile-confirm-title" className="profile-sr-only">
            {action.type === "remove"
              ? "Confirmar remoção de membro"
              : "Confirmar alteração de status"}
          </h2>
          <div className="profile-identity">
            <Avatar {...action.member} />
            <p>{action.member.name}</p>
          </div>
          <p
            id="profile-confirm-description"
            className="profile-confirm-description"
          >
            Insira a senha para{" "}
            {action.type === "remove" ? (
              <>
                <span className="profile-danger-text">remover</span> o perfil de{" "}
                <span className="profile-accent-text">
                  {action.member.name}
                </span>
                .
              </>
            ) : (
              <>
                alterar o status de{" "}
                <span className={`profile-status--${action.member.status}`}>
                  {action.member.status}
                </span>{" "}
                para{" "}
                <span className={`profile-status--${action.status}`}>
                  {action.status}
                </span>
                .
              </>
            )}
          </p>
          <form className="profile-confirm-form" onSubmit={confirmAction}>
            <label
              className="profile-sr-only"
              htmlFor="profile-confirm-password"
            >
              Senha da conta responsável
            </label>
            <input
              id="profile-confirm-password"
              type="password"
              placeholder="Senha:"
              autoComplete="current-password"
              autoFocus
              required
              value={password}
              disabled={busy}
              aria-invalid={invalidPassword}
              aria-describedby={
                passwordError ? "profile-password-error" : undefined
              }
              onChange={(event) => {
                setPassword(event.target.value);
                setPasswordError("");
                setInvalidPassword(false);
              }}
            />
            {passwordError && (
              <p
                id="profile-password-error"
                className="profile-password-error"
                role="alert"
              >
                {passwordError}
              </p>
            )}
            <button
              className="profile-primary-button"
              type="submit"
              disabled={busy}
            >
              {busy ? "CONFIRMANDO…" : "CONFIRMAR"}
            </button>
          </form>
        </dialog>
      )}
    </>
  );
}
