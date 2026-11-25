import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import ChangePasswordForm from "../../components/ChangePasswordForm/ChangePasswordForm";
import { useAuth } from "../../context/AuthContext";
import {
  DeleteAccount,
  RemoveCompanyMember,
  SaveNewMemberData,
  SearchMemberData,
  UpdateMemberStatus,
  UpdateUser,
} from "../../lib/supabase/auth";
import {
  isCompanyRole,
  type CompanyMember,
  type UserProfile,
} from "../../types/auth.types";

import "./profile.css";

const PasswordInput = lazy(
  () => import("../../components/PasswordInput/passwordInput"),
);

export type MemberAction =
  | {
      type: "status";
      member: CompanyMember;
      status: Extract<CompanyMember["status"], "ATIVO" | "AFASTADO">;
    }
  | { type: "remove"; member: CompanyMember };

type ConfirmationAction = MemberAction | { type: "delete_account" };

interface ProfileProps {
  initialProfile?: UserProfile;
  initialMembers?: CompanyMember[];
}

type PageView = "profile" | "members" | "member" | "password";

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

function Avatar({
  name = "",
  avatarUrl,
}: Partial<Pick<UserProfile, "name" | "avatarUrl">>) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const safeName = (name ?? "").trim();
  return (
    <span className="profile-avatar">
      {avatarUrl && failedUrl !== avatarUrl ? (
        <img
          src={avatarUrl}
          alt={`Foto de ${safeName || "usuário"}`}
          onError={() => setFailedUrl(avatarUrl)}
        />
      ) : (
        <span aria-label={`Perfil de ${safeName || "usuário"}`}>
          {safeName.charAt(0).toUpperCase() || "P"}
        </span>
      )}
    </span>
  );
}

export default function Profile({
  initialProfile,
  initialMembers = [],
}: ProfileProps = {}) {
  const location = useLocation();
  const navigateTo = useNavigate();
  const {
    user: authUser,
    status: authStatus,
    refreshProfile,
    signOut: authSignOut,
  } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(
    initialProfile ?? authUser ?? null,
  );
  const [draft, setDraft] = useState<UserProfile | null>(
    initialProfile ?? authUser ?? null,
  );
  const [view, setView] = useState<PageView>("profile");
  const [members, setMembers] = useState<CompanyMember[]>(initialMembers);
  const [membersLoaded, setMembersLoaded] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [member, setMember] = useState<CompanyMember | null>(null);
  const [action, setAction] = useState<ConfirmationAction | null>(null);
  const [deletionText, setDeletionText] = useState("");
  const [deletionAcknowledged, setDeletionAcknowledged] = useState(false);
  const [companyDeletionAcknowledged, setCompanyDeletionAcknowledged] =
    useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [invalidPassword, setInvalidPassword] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [feedbackIsError, setFeedbackIsError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousViewRef = useRef(view);
  const submittingRef = useRef(false);

  const loading = !initialProfile && authStatus === "loading";

  useEffect(() => {
    if (initialProfile) {
      setProfile(initialProfile);
      setDraft(initialProfile);
      return;
    }
    if (authStatus === "loading") return;
    setProfile(authUser);
    setDraft(authUser);
  }, [authStatus, authUser, initialProfile]);

  // Gera uma prévia local e libera a URL temporária quando ela deixa de ser usada.
  useEffect(() => {
    if (!avatarFile) return;
    const previewUrl = URL.createObjectURL(avatarFile);
    setDraft((current) =>
      current ? { ...current, avatarUrl: previewUrl } : current,
    );
    return () => URL.revokeObjectURL(previewUrl);
  }, [avatarFile]);

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      notify("Selecione uma imagem JPG, PNG ou WEBP.", true);
      event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      notify("A imagem deve ter no máximo 5 MB.", true);
      event.target.value = "";
      return;
    }

    setFeedback("");
    setAvatarFile(file);
  }

  useEffect(() => {
    if (previousViewRef.current !== view) headingRef.current?.focus();
    previousViewRef.current = view;
  }, [view]);

  useEffect(() => {
    if (!action) return;
    const dialog = dialogRef.current;
    const previouslyFocused = document.activeElement;
    dialog?.showModal();
    if (action.type === "delete_account") {
      dialog
        ?.querySelector<HTMLButtonElement>("#profile-delete-cancel")
        ?.focus({ preventScroll: true });
      if (dialog) dialog.scrollTop = 0;
    }
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

  function navigate(nextView: PageView) {
    setFeedback("");
    setView(nextView);
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile || !draft || submittingRef.current) return;

    submittingRef.current = true;
    setBusy(true);
    setFeedback("");
    try {
      const trimmedName = draft.name.trim();
      const trimmedEmail = draft.email.trim();

      const updateResponse = await UpdateUser(
        trimmedName !== profile.name ? trimmedName : undefined,
        trimmedEmail !== profile.email ? trimmedEmail : undefined,
        avatarFile ?? undefined,
      );
      if (!updateResponse.ok) {
        notify(
          updateResponse.message ?? "Erro ao atualizar os dados do usuário.",
          true,
        );
        return;
      }

      const freshUser = await refreshProfile();

      const updated: UserProfile = {
        ...(freshUser ?? draft),
        avatarUrl: freshUser?.avatarUrl ?? draft.avatarUrl,
        name: freshUser?.name || trimmedName,
        email: freshUser?.email || trimmedEmail,
      };

      setProfile(updated);
      setDraft(updated);
      setAvatarFile(null);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
      notify("Perfil salvo com sucesso.");
    } catch (err) {
      notify(
        err instanceof Error
          ? err.message
          : "Não foi possível salvar o perfil. Tente novamente.",
        true,
      );
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  }

  async function openMembers() {
    navigate("members");
    if (!profile || membersLoaded) return;
    setMembersLoading(true);
    try {
      const searchMembers = await SearchMemberData();
      setMembers(searchMembers ?? []);
      setMembersLoaded(true);
    } catch (err) {
      notify(
        err instanceof Error
          ? err.message
          : "Não foi possível carregar os membros. Volte ao perfil e tente novamente.",
        true,
      );
    } finally {
      setMembersLoading(false);
    }
  }

  async function signOut() {
    try {
      await authSignOut("local");
      navigateTo("/");
    } catch (error) {
      console.error("Erro ao sair da conta:", error);
      notify("Não foi possível encerrar a sessão. Tente novamente.", true);
    }
  }

  function editMember(selected?: CompanyMember) {
    setMember(
      selected
        ? { ...selected }
        : {
            id: crypto.randomUUID(),
            name: "",
            email: "",
            status: "ATIVO",
          },
    );
    navigate("member");
  }

  async function saveMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;

    const name = member?.name.trim();
    const email = member?.email.trim();
    if (!name || !email) {
      notify("Nome e email são obrigatórios.", true);
      return;
    }

    submittingRef.current = true;
    setBusy(true);
    setFeedback("");
    try {
      const newMember = await SaveNewMemberData(name, email);

      if (!newMember) {
        notify("Não foi possível salvar o membro. Tente novamente.", true);
        return;
      }

      const updated = await SearchMemberData();
      setMembers(updated ?? []);
      navigate("members");
      setMembersLoaded(true);
      notify(
        "Usuário salvo com sucesso. A alteração será efetivada após a confirmação do convite.",
      );
    } catch (err) {
      notify(
        err instanceof Error
          ? err.message
          : "Não foi possível salvar o membro. Tente novamente.",
        true,
      );
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  }

  function resetDeletionConfirmation() {
    setDeletionText("");
    setDeletionAcknowledged(false);
    setCompanyDeletionAcknowledged(false);
  }

  function requestAction(requested: ConfirmationAction) {
    resetDeletionConfirmation();
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
    resetDeletionConfirmation();
  }

  async function confirmAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile || !action || submittingRef.current) return;
    if (action.type === "delete_account") {
      await deleteAccount();
      return;
    }

    submittingRef.current = true;
    setBusy(true);
    setPasswordError("");
    setInvalidPassword(false);
    try {
      if (action.type === "remove") {
        const result = await RemoveCompanyMember(action.member.id, password);
        if (result === "invalid_password") {
          setInvalidPassword(true);
          setPasswordError("Senha incorreta.");
          return;
        }
        if (result === "forbidden") {
          setPasswordError(
            "Você não tem permissão para remover este membro.",
          );
          return;
        }

        setMembers((previous) =>
          previous.filter((item) => item.id !== action.member.id),
        );
        setAction(null);
        navigate("members");
        notify("Membro removido com sucesso.");
      } else {
        const result = await UpdateMemberStatus(
          action.member.id,
          action.status,
          password,
        );
        if (result === "invalid_password") {
          setInvalidPassword(true);
          setPasswordError("Senha incorreta.");
          return;
        }
        if (result === "forbidden") {
          setPasswordError(
            "Você não tem permissão para alterar o status deste membro.",
          );
          return;
        }

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
        setAction(null);
        notify("Status alterado com sucesso.");
      }
    } catch (err) {
      setPasswordError(
        err instanceof Error
          ? err.message
          : "Não foi possível confirmar a alteração. Tente novamente.",
      );
    } finally {
      setPassword("");
      submittingRef.current = false;
      setBusy(false);
    }
  }

  async function deleteAccount() {
    if (!profile || submittingRef.current || !canDeleteAccount) return;

    submittingRef.current = true;
    setBusy(true);
    setPasswordError("");
    setInvalidPassword(false);
    try {
      const result = await DeleteAccount(profile.id, password);
      if (result === "invalid_password") {
        setInvalidPassword(true);
        setPasswordError("Senha incorreta. Sua conta não foi excluída.");
      } else if (result === "forbidden") {
        setPasswordError(
          "Você não tem autorização para excluir esta conta. Procure o responsável pela empresa.",
        );
      } else if (result === "blocked") {
        setPasswordError(
          "Existem vínculos ou pendências que impedem a exclusão. Resolva-os com o atendimento antes de tentar novamente.",
        );
      } else if (result === "deleted") {
        await authSignOut("global");
        navigateTo("/", { replace: true });
      } else {
        setPasswordError(
          "Não foi possível confirmar a exclusão. Tente novamente mais tarde.",
        );
      }
    } catch {
      setPasswordError(
        "Não foi possível confirmar a exclusão. Tente novamente mais tarde.",
      );
    } finally {
      setPassword("");
      submittingRef.current = false;
      setBusy(false);
    }
  }

  const company = !!profile && isCompanyRole(profile.role);
  const deletingAccount = action?.type === "delete_account";
  const confirmationPerson = deletingAccount ? profile : action?.member;
  const deletionPhrase = company
    ? `EXCLUIR EMPRESA ${profile?.name ?? ""}`
    : "EXCLUIR MINHA CONTA";
  const canDeleteAccount =
    deletionAcknowledged &&
    (!company || companyDeletionAcknowledged) &&
    deletionText.trim() === deletionPhrase &&
    password.length > 0;
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
      <title>Perfil - Life Topografia</title>
      <meta
        name="description"
        content="Gerencie seus dados de perfil, foto, senha e membros da empresa na Life Topografia."
      />
      <div className="profile-page">
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
              <p>Entre na sua conta para acessar seu perfil.</p>
              <Link
                className="profile-primary-button"
                to="/login"
                state={{ from: location }}
              >
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
                    <div className="profile-avatar-editor">
                      <Avatar name={draft.name} avatarUrl={draft.avatarUrl} />
                      <input
                        ref={avatarInputRef}
                        className="profile-avatar-input"
                        id="profile-avatar-input"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={busy}
                        onChange={handleAvatarChange}
                        aria-describedby="profile-avatar-hint"
                      />
                      <button
                        className="profile-avatar-change"
                        type="button"
                        disabled={busy}
                        onClick={() => avatarInputRef.current?.click()}
                      >
                        {avatarFile || draft.avatarUrl
                          ? "Alterar foto"
                          : "Adicionar foto"}
                      </button>
                      <span
                        id="profile-avatar-hint"
                        className="profile-avatar-hint"
                      >
                        JPG, PNG ou WEBP · até 5 MB
                      </span>
                    </div>
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
                  <div className="profile-signout-area">
                    <button
                      className="profile-remove-button profile-signout-button"
                      type="button"
                      disabled={busy}
                      onClick={signOut}
                    >
                      Sair da conta
                    </button>
                  </div>
                </form>
              )}

              {view === "profile" && (
                <section
                  className="profile-delete-area"
                  aria-labelledby="profile-delete-area-title"
                >
                  <h2 id="profile-delete-area-title">
                    Exclusão permanente {company ? "da empresa" : "da conta"}
                  </h2>
                  <p>
                    {company
                      ? "Esta ação exclui a conta da empresa e encerra o acesso dos membros a ela."
                      : "Esta ação exclui sua conta permanentemente e encerra seu acesso aos recursos vinculados a ela."}
                  </p>
                  <button
                    className="profile-primary-button profile-danger-button"
                    type="button"
                    disabled={busy}
                    onClick={() => requestAction({ type: "delete_account" })}
                  >
                    {company
                      ? "Excluir conta da empresa"
                      : "Excluir minha conta"}
                  </button>
                </section>
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
                                className={`profile-status profile-status--${item.status.toLowerCase()}`}
                              >
                                {item.status}
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
                        disabled={busy}
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
                      disabled={busy || existingMember}
                      onChange={(event) =>
                        setMember({ ...member, email: event.target.value })
                      }
                    />
                  </label>
                  {existingMember && (
                    <label
                      className="profile-field"
                      htmlFor="profile-member-status"
                    >
                      Status:
                      <select
                        id="profile-member-status"
                        aria-label="Status do membro"
                        value={member.status}
                        className={`profile-status profile-status--${member.status.toLowerCase()}`}
                        disabled={busy}
                        onChange={(event) => {
                          const nextStatus = event.currentTarget.value as Extract<
                            CompanyMember["status"],
                            "ATIVO" | "AFASTADO"
                          >;
                          if (nextStatus !== member.status) {
                            requestAction({
                              type: "status",
                              member,
                              status: nextStatus,
                            });
                          }
                        }}
                      >
                        <option value="ATIVO">Ativo</option>
                        <option value="AFASTADO">Afastado</option>
                      </select>
                    </label>
                  )}
                  {existingMember && (
                    <button
                      type="button"
                      className="profile-remove-button"
                      disabled={busy}
                      onClick={() => requestAction({ type: "remove", member })}
                    >
                      Remover funcionário
                    </button>
                  )}
                  {feedbackNode}
                  {!existingMember && (
                    <button
                      className="profile-primary-button"
                      type="submit"
                      disabled={busy}
                    >
                      {busy ? "SALVANDO…" : "SALVAR"}
                    </button>
                  )}
                </form>
              )}

              {view === "password" && (
                <ChangePasswordForm
                  onSuccess={(message) => {
                    navigate("profile");
                    notify(message);
                  }}
                />
              )}
            </>
          )}
        </main>
      </div>

      {action && confirmationPerson && (
        <dialog
          className={`profile-dialog${deletingAccount ? " profile-delete-dialog" : ""}`}
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
          <h2
            id="profile-confirm-title"
            className={
              deletingAccount ? "profile-delete-title" : "profile-sr-only"
            }
          >
            {deletingAccount
              ? company
                ? "Excluir conta da empresa"
                : "Excluir minha conta"
              : action.type === "remove"
                ? "Confirmar remoção de membro"
                : "Confirmar alteração de status"}
          </h2>
          <div className="profile-identity">
            <Avatar {...confirmationPerson} />
            <p>{confirmationPerson.name}</p>
          </div>
          <p
            id="profile-confirm-description"
            className="profile-confirm-description"
          >
            {action.type === "delete_account" ? (
              <>
                <strong>
                  Esta exclusão é permanente e não pode ser desfeita.
                </strong>{" "}
                {company
                  ? "O acesso de todos os membros à conta da empresa será encerrado. As contas pessoais dos membros não serão excluídas. Revise os membros, arquivos e atendimentos vinculados antes de continuar."
                  : "Você perderá o acesso à sua conta e aos recursos vinculados a ela."}
              </>
            ) : action.type === "remove" ? (
              <>
                Insira a senha para{" "}
                <span className="profile-danger-text">remover</span> o perfil de{" "}
                <span className="profile-accent-text">
                  {action.member.name}
                </span>
                .
              </>
            ) : (
              <>
                Insira a senha para alterar o status de{" "}
                <span
                  className={`profile-status--${action.member.status.toLowerCase()}`}
                >
                  {action.member.status}
                </span>{" "}
                para{" "}
                <span
                  className={`profile-status--${action.status.toLowerCase()}`}
                >
                  {action.status}
                </span>
                .
              </>
            )}
          </p>
          <form className="profile-confirm-form" onSubmit={confirmAction}>
            {deletingAccount && (
              <div className="profile-delete-confirmations">
                <label className="profile-delete-check">
                  <input
                    type="checkbox"
                    required
                    disabled={busy}
                    checked={deletionAcknowledged}
                    onChange={(event) =>
                      setDeletionAcknowledged(event.target.checked)
                    }
                  />
                  <span>
                    Entendo que a exclusão é permanente e que perderei o acesso
                    a esta conta.
                  </span>
                </label>
                {company && (
                  <label className="profile-delete-check">
                    <input
                      type="checkbox"
                      required
                      disabled={busy}
                      checked={companyDeletionAcknowledged}
                      onChange={(event) =>
                        setCompanyDeletionAcknowledged(event.target.checked)
                      }
                    />
                    <span>
                      Sou o responsável autorizado pela empresa e estou ciente
                      do impacto sobre o acesso dos membros.
                    </span>
                  </label>
                )}
                <label className="profile-field" htmlFor="profile-delete-text">
                  <span>Para confirmar, digite exatamente:</span>
                  <strong className="profile-delete-phrase">
                    {deletionPhrase}
                  </strong>
                  <input
                    id="profile-delete-text"
                    autoComplete="off"
                    spellCheck={false}
                    required
                    disabled={busy}
                    value={deletionText}
                    aria-describedby="profile-delete-text-hint"
                    onChange={(event) => setDeletionText(event.target.value)}
                  />
                </label>
                <p
                  id="profile-delete-text-hint"
                  className="profile-delete-hint"
                >
                  {company
                    ? "Inclua o nome da empresa conforme exibido acima."
                    : "Respeite as letras maiúsculas da confirmação."}
                </p>
              </div>
            )}
            <label
              className={
                deletingAccount
                  ? "profile-delete-password-label"
                  : "profile-sr-only"
              }
              htmlFor="profile-confirm-password"
            >
              {deletingAccount && !company
                ? "Sua senha atual"
                : "Senha da conta responsável"}
            </label>
            <Suspense fallback={null}>
              <PasswordInput
                id="profile-confirm-password"
                visibilityLabel={
                  deletingAccount && !company
                    ? "sua senha atual"
                    : "senha da conta responsável"
                }
                placeholder="Senha:"
                autoComplete="current-password"
                autoFocus={!deletingAccount}
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
            </Suspense>
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
              className={`profile-primary-button${deletingAccount ? " profile-danger-button" : ""}`}
              type="submit"
              disabled={busy || (deletingAccount && !canDeleteAccount)}
            >
              {busy
                ? deletingAccount
                  ? "EXCLUINDO…"
                  : "CONFIRMANDO…"
                : deletingAccount
                  ? company
                    ? "EXCLUIR EMPRESA PERMANENTEMENTE"
                    : "EXCLUIR CONTA PERMANENTEMENTE"
                  : "CONFIRMAR"}
            </button>
            {deletingAccount && (
              <button
                id="profile-delete-cancel"
                className="profile-delete-cancel"
                type="button"
                disabled={busy}
                onClick={closeDialog}
              >
                Cancelar e manter a conta
              </button>
            )}
          </form>
        </dialog>
      )}
    </>
  );
}
