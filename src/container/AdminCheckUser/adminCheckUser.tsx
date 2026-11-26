import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useLocation } from "react-router-dom";

import { useAuth } from "../../hook/useAuth";
import { useLayout } from "../../hook/useLayout";

import {
  fetchAdminCompanyMembers,
  fetchAdminUsers,
} from "./adminCheckUser.service";
import type {
  AccountKind,
  AdminApiErrorKind,
  AdminCompanyMember,
  AdminUserItem,
  AdminUsersPagination,
} from "./adminCheckUser.types";

import "./adminCheckUser.css";

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

type AccountFilter = "ALL" | AccountKind;
type AccountVisualStatus = "ativo" | "pendente" | "inativo" | "excluido";
type StatusFilter = "ALL" | "ativo" | "inativo" | "excluido";

interface PendingStatusAction {
  account: AdminUserItem;
  targetStatus: "inativo" | "ativo";
}

interface ErrorState {
  kind: AdminApiErrorKind;
  message: string;
}

const MOCK_INACTIVE_USER: AdminUserItem = {
  id: "mock-inactive-account-1",
  name: "Marcos Andrade",
  email: "marcos.andrade@topografiasul.com.br",
  accountType: "PESSOA_FISICA",
  isAdminAccount: false,
  status: "inativo",
};

function normalizeVisualStatus(rawStatus?: string): AccountVisualStatus {
  const token = (rawStatus ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();

  if (token === "INATIVO") return "inativo";
  if (token === "EXCLUIDO" || token === "REMOVIDO") return "excluido";
  if (token === "PENDENTE") return "pendente";
  return "ativo";
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

function buildPageRange(
  current: number,
  totalPages: number,
): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, idx) => idx + 1);
  }

  const pages: Array<number | "ellipsis"> = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);

  if (start > 2) {
    pages.push("ellipsis");
  }
  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }
  if (end < totalPages - 1) {
    pages.push("ellipsis");
  }
  pages.push(totalPages);

  return pages;
}

function UserAvatar({
  name,
  avatarUrl,
  size = "md",
}: {
  name: string;
  avatarUrl?: string;
  size?: "md" | "sm" | "lg";
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const canRenderImage = Boolean(avatarUrl && failedUrl !== avatarUrl);

  return (
    <span className={`admin-users-avatar admin-users-avatar--${size}`}>
      {canRenderImage ? (
        <img
          src={avatarUrl}
          alt={`Foto de perfil de ${name}`}
          loading="lazy"
          decoding="async"
          onError={() => setFailedUrl(avatarUrl ?? null)}
        />
      ) : (
        <span aria-hidden="true">{getInitials(name)}</span>
      )}
    </span>
  );
}

export default function AdminCheckUser() {
  const location = useLocation();
  const { user: currentUser } = useAuth();
  const searchInputId = useId();
  const statusSelectId = useId();
  const pageSizeSelectId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const statusDialogRef = useRef<HTMLDialogElement>(null);
  const noticeTimerRef = useRef<number | null>(null);
  const { setTopbarRightContent } = useLayout();

  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [pagination, setPagination] = useState<AdminUsersPagination>({
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(DEFAULT_PAGE_SIZE);
  const [accountFilter, setAccountFilter] = useState<AccountFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [searchDraft, setSearchDraft] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [reloadTick, setReloadTick] = useState(0);

  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<ErrorState | null>(null);

  // Estados visuais locais para inativação/reativação (sem persistência em backend)
  const [statusOverrides, setStatusOverrides] = useState<
    Record<string, AccountVisualStatus>
  >({});
  const [pendingStatusAction, setPendingStatusAction] =
    useState<PendingStatusAction | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // Estado do modal de membros da empresa (PJ)
  const [selectedCompany, setSelectedCompany] = useState<AdminUserItem | null>(
    null,
  );
  const [modalMembers, setModalMembers] = useState<AdminCompanyMember[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Registra o badge administrativo na Topbar compartilhada.
  useEffect(() => {
    setTopbarRightContent(
      <span className="admin-users-topbar-badge">Área Admin</span>,
    );
    return () => {
      setTopbarRightContent(null);
    };
  }, [setTopbarRightContent]);

  // Debounce da busca para evitar requisições excessivas durante a digitação.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const normalized = searchDraft.trim();
      setDebouncedSearch((previous) => {
        if (previous !== normalized) {
          setPage(1);
        }
        return normalized;
      });
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchDraft]);

  // Busca paginada no backend via GET /api/admin/users.
  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadUsers() {
      setLoading(true);
      setErrorState(null);

      try {
        const result = await fetchAdminUsers({
          page,
          limit,
          search: debouncedSearch || undefined,
          accountType: accountFilter,
          signal: controller.signal,
        });

        if (!active) return;

        if (!result.ok) {
          setUsers([]);
          setErrorState({
            kind: result.errorKind,
            message: result.message,
          });
          return;
        }

        setUsers(result.users);
        setPagination(result.pagination);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        if (active) {
          setUsers([]);
          setErrorState({
            kind: "network_error",
            message: "Erro inesperado ao carregar usuários.",
          });
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadUsers();

    return () => {
      active = false;
      controller.abort();
    };
  }, [page, limit, debouncedSearch, accountFilter, reloadTick]);

  // Controla a abertura e acessibilidade do <dialog> nativo de membros da empresa.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (!selectedCompany) {
      if (dialog.open) dialog.close();
      return;
    }

    const previouslyFocused = document.activeElement;
    if (!dialog.open) {
      dialog.showModal();
    }

    return () => {
      if (dialog.open) dialog.close();
      if (
        previouslyFocused instanceof HTMLElement &&
        previouslyFocused.isConnected
      ) {
        previouslyFocused.focus();
      }
    };
  }, [selectedCompany]);

  // Carrega os membros sob demanda caso não tenham vindo embutidos no item da empresa.
  useEffect(() => {
    if (!selectedCompany) return;

    if (selectedCompany.members !== undefined) {
      setModalMembers(selectedCompany.members);
      setModalLoading(false);
      setModalError(null);
      return;
    }

    const controller = new AbortController();
    let active = true;

    async function loadCompanyMembers(companyId: string) {
      setModalLoading(true);
      setModalError(null);
      setModalMembers([]);

      try {
        const result = await fetchAdminCompanyMembers(
          companyId,
          controller.signal,
        );
        if (!active) return;

        if (!result.ok) {
          setModalError(result.message);
          return;
        }
        setModalMembers(result.members);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        if (active) {
          setModalError(
            "Não foi possível carregar os membros vinculados a esta empresa.",
          );
        }
      } finally {
        if (active) {
          setModalLoading(false);
        }
      }
    }

    void loadCompanyMembers(selectedCompany.id);

    return () => {
      active = false;
      controller.abort();
    };
  }, [selectedCompany]);

  // Limpa timer de notificação temporária ao desmontar.
  useEffect(() => {
    return () => {
      if (noticeTimerRef.current !== null) {
        window.clearTimeout(noticeTimerRef.current);
      }
    };
  }, []);

  // Controla a abertura e acessibilidade do <dialog> de confirmação de status.
  useEffect(() => {
    const dialog = statusDialogRef.current;
    if (!dialog) return;

    if (!pendingStatusAction) {
      if (dialog.open) dialog.close();
      return;
    }

    const previouslyFocused = document.activeElement;
    if (!dialog.open) {
      dialog.showModal();
    }

    return () => {
      if (dialog.open) dialog.close();
      if (
        previouslyFocused instanceof HTMLElement &&
        previouslyFocused.isConnected
      ) {
        previouslyFocused.focus();
      }
    };
  }, [pendingStatusAction]);

  const handleCloseModal = useCallback(() => {
    setSelectedCompany(null);
    setModalMembers([]);
    setModalError(null);
    setModalLoading(false);
  }, []);

  const handleCloseStatusModal = useCallback(() => {
    setPendingStatusAction(null);
  }, []);

  const handleConfirmStatusChange = useCallback(() => {
    if (!pendingStatusAction) return;

    const { account, targetStatus } = pendingStatusAction;
    setStatusOverrides((previous) => ({
      ...previous,
      [account.id]: targetStatus,
    }));
    setPendingStatusAction(null);

    if (noticeTimerRef.current !== null) {
      window.clearTimeout(noticeTimerRef.current);
    }
    setStatusNotice(
      targetStatus === "inativo"
        ? `Conta de ${account.name} inativada com sucesso.`
        : `Conta de ${account.name} reativada com sucesso.`,
    );
    noticeTimerRef.current = window.setTimeout(() => {
      setStatusNotice(null);
      noticeTimerRef.current = null;
    }, 4500);
  }, [pendingStatusAction]);

  const handleFilterChange = useCallback((nextFilter: AccountFilter) => {
    setAccountFilter(nextFilter);
    setPage(1);
  }, []);

  const handleLimitChange = useCallback((nextLimit: number) => {
    setLimit(nextLimit);
    setPage(1);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchDraft("");
    setDebouncedSearch("");
    setAccountFilter("ALL");
    setStatusFilter("ALL");
    setPage(1);
  }, []);

  const displayedUsers = useMemo(() => {
    const hasInactiveInPage = users.some(
      (item) => normalizeVisualStatus(item.status) === "inativo",
    );
    const matchesAccountFilter =
      accountFilter === "ALL" ||
      accountFilter === MOCK_INACTIVE_USER.accountType;
    const lowerSearch = debouncedSearch.toLowerCase();
    const matchesSearch =
      lowerSearch.length === 0 ||
      MOCK_INACTIVE_USER.name.toLowerCase().includes(lowerSearch) ||
      MOCK_INACTIVE_USER.email.toLowerCase().includes(lowerSearch);

    const baseUsers =
      !hasInactiveInPage &&
      page === 1 &&
      matchesAccountFilter &&
      matchesSearch
        ? [...users, MOCK_INACTIVE_USER]
        : users;

    return baseUsers
      .map((account) => ({
        account,
        visualStatus:
          statusOverrides[account.id] ?? normalizeVisualStatus(account.status),
      }))
      .filter(
        ({ visualStatus }) =>
          statusFilter === "ALL" || visualStatus === statusFilter,
      );
  }, [
    users,
    accountFilter,
    debouncedSearch,
    page,
    statusOverrides,
    statusFilter,
  ]);

  const pageNumbers = useMemo(
    () => buildPageRange(pagination.page, pagination.totalPages),
    [pagination.page, pagination.totalPages],
  );

  const memberSummary = useMemo(() => {
    let activeCount = 0;
    let pendingCount = 0;
    let removedCount = 0;
    for (const member of modalMembers) {
      if (member.bondStatus === "REMOVIDO") {
        removedCount += 1;
      } else if (member.bondStatus === "PENDENTE") {
        pendingCount += 1;
      } else {
        activeCount += 1;
      }
    }
    return {
      total: modalMembers.length,
      activeCount,
      pendingCount,
      removedCount,
    };
  }, [modalMembers]);

  const hasActiveFilters =
    debouncedSearch.length > 0 ||
    accountFilter !== "ALL" ||
    statusFilter !== "ALL";
  const rangeStart =
    pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const rangeEnd = Math.min(
    pagination.page * pagination.limit,
    pagination.total,
  );

  return (
    <div className="admin-users-page">
      <main className="admin-users-main" aria-busy={loading}>
        <section className="admin-users-hero">
          <div className="admin-users-badge-row">
            <span className="admin-users-pill">Auditoria e Suporte</span>
          </div>

          <h1 className="admin-users-title">CONTAS CADASTRADAS</h1>

          <p className="admin-users-subtitle">
            Consulte pessoas físicas e empresas registradas na plataforma,
            verifique CNPJs cadastrados e audite os vínculos de funcionários.
          </p>

          <div className="admin-users-divider" aria-hidden="true">
            <span className="line" />
            <span className="rhombus" />
            <span className="line" />
          </div>
        </section>

        {errorState?.kind === "unauthenticated" ? (
          <section
            className="admin-users-state-card"
            role="alert"
            aria-labelledby="admin-auth-title"
          >
            <h2 id="admin-auth-title">Autenticação necessária</h2>
            <p>{errorState.message}</p>
            <div className="admin-users-state-actions">
              <Link
                to="/login"
                state={{ from: location }}
                className="admin-users-btn admin-users-btn--primary"
              >
                Entrar na conta
              </Link>
              <Link
                to="/"
                className="admin-users-btn admin-users-btn--secondary"
              >
                Voltar ao início
              </Link>
            </div>
          </section>
        ) : errorState?.kind === "forbidden" ? (
          <section
            className="admin-users-state-card admin-users-state-card--danger"
            role="alert"
            aria-labelledby="admin-forbidden-title"
          >
            <h2 id="admin-forbidden-title">
              Acesso restrito a administradores
            </h2>
            <p>{errorState.message}</p>
            <div className="admin-users-state-actions">
              <Link
                to="/perfil"
                className="admin-users-btn admin-users-btn--primary"
              >
                Ir para meu perfil
              </Link>
              <Link
                to="/"
                className="admin-users-btn admin-users-btn--secondary"
              >
                Voltar ao início
              </Link>
            </div>
          </section>
        ) : (
          <section
            className="admin-users-panel"
            aria-label="Listagem de contas cadastradas"
          >
            <div className="admin-users-toolbar">
              <div className="admin-users-search-box">
                <label htmlFor={searchInputId} className="admin-users-sr-only">
                  Buscar por nome, e-mail ou CNPJ
                </label>
                <svg
                  className="admin-users-search-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M21 21l-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                <input
                  id={searchInputId}
                  type="search"
                  className="admin-users-search-input"
                  placeholder="Buscar por nome, e-mail ou CNPJ..."
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                />
                {searchDraft && (
                  <button
                    type="button"
                    className="admin-users-search-clear"
                    aria-label="Limpar busca"
                    onClick={() => {
                      setSearchDraft("");
                      setDebouncedSearch("");
                      setPage(1);
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>

              <div
                className="admin-users-filter-group"
                role="group"
                aria-label="Filtrar por tipo de conta"
              >
                <button
                  type="button"
                  className={`admin-users-filter-btn${accountFilter === "ALL" ? " is-active" : ""}`}
                  aria-pressed={accountFilter === "ALL"}
                  onClick={() => handleFilterChange("ALL")}
                >
                  Todas
                </button>
                <button
                  type="button"
                  className={`admin-users-filter-btn${accountFilter === "PESSOA_FISICA" ? " is-active" : ""}`}
                  aria-pressed={accountFilter === "PESSOA_FISICA"}
                  onClick={() => handleFilterChange("PESSOA_FISICA")}
                >
                  Pessoa Física
                </button>
                <button
                  type="button"
                  className={`admin-users-filter-btn${accountFilter === "EMPRESA" ? " is-active" : ""}`}
                  aria-pressed={accountFilter === "EMPRESA"}
                  onClick={() => handleFilterChange("EMPRESA")}
                >
                  Empresa
                </button>
              </div>

              <div className="admin-users-toolbar-right">
                <label
                  htmlFor={statusSelectId}
                  className="admin-users-limit-label"
                >
                  <select
                    id={statusSelectId}
                    className="admin-users-limit-select admin-users-status-select"
                    aria-label="Filtrar por status da conta"
                    value={statusFilter}
                    disabled={loading}
                    onChange={(event) =>
                      setStatusFilter(event.target.value as StatusFilter)
                    }
                  >
                    <option value="ALL">Status: Todos</option>
                    <option value="ativo">Ativos</option>
                    <option value="inativo">Inativos</option>
                    <option value="excluido">Excluídos</option>
                  </select>
                </label>

                <label
                  htmlFor={pageSizeSelectId}
                  className="admin-users-limit-label"
                >
                  Por página:
                  <select
                    id={pageSizeSelectId}
                    className="admin-users-limit-select"
                    value={limit}
                    disabled={loading}
                    onChange={(event) =>
                      handleLimitChange(Number(event.target.value))
                    }
                  >
                    {PAGE_SIZE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  className="admin-users-refresh-btn"
                  disabled={loading}
                  onClick={() => setReloadTick((value) => value + 1)}
                >
                  {loading ? "Carregando..." : "Atualizar"}
                </button>
              </div>
            </div>

            {statusNotice && (
              <div
                className="admin-users-status-banner"
                role="status"
                aria-live="polite"
              >
                <span>{statusNotice}</span>
                <button
                  type="button"
                  className="admin-users-status-banner-close"
                  aria-label="Fechar aviso"
                  onClick={() => setStatusNotice(null)}
                >
                  ✕
                </button>
              </div>
            )}

            {loading ? (
              <div
                className="admin-users-skeleton-list"
                role="status"
                aria-live="polite"
                aria-label="Carregando usuários cadastrados"
              >
                {Array.from({ length: 5 }, (_, index) => (
                  <div key={index} className="admin-users-skeleton-row">
                    <span className="admin-users-skeleton-circle" />
                    <div className="admin-users-skeleton-lines">
                      <span className="admin-users-skeleton-line admin-users-skeleton-line--title" />
                      <span className="admin-users-skeleton-line admin-users-skeleton-line--sub" />
                    </div>
                    <span className="admin-users-skeleton-pill" />
                  </div>
                ))}
              </div>
            ) : errorState ? (
              <div className="admin-users-inline-alert" role="alert">
                <h2>Não foi possível carregar os usuários</h2>
                <p>{errorState.message}</p>
                <button
                  type="button"
                  className="admin-users-btn admin-users-btn--primary"
                  onClick={() => setReloadTick((value) => value + 1)}
                >
                  Tentar novamente
                </button>
              </div>
            ) : displayedUsers.length === 0 ? (
              <div className="admin-users-empty-state" role="status">
                <h2>Nenhuma conta encontrada</h2>
                <p>
                  {hasActiveFilters
                    ? "Nenhuma conta corresponde aos filtros ou termo buscado."
                    : "Ainda não existem contas cadastradas para exibir."}
                </p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    className="admin-users-btn admin-users-btn--secondary"
                    onClick={handleClearFilters}
                  >
                    Limpar filtros
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="admin-users-table-wrapper">
                  <table className="admin-users-table">
                    <thead>
                      <tr>
                        <th scope="col">Usuário</th>
                        <th scope="col">E-mail</th>
                        <th scope="col">Tipo de Conta</th>
                        <th scope="col">CNPJ</th>
                        <th scope="col" className="admin-users-col-actions">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedUsers.map(({ account, visualStatus }) => {
                        const isCompany = account.accountType === "EMPRESA";
                        const canInspectMembers =
                          isCompany ||
                          Boolean(account.cnpj) ||
                          (account.members !== undefined &&
                            account.members.length > 0);
                        const isSelf = Boolean(
                          currentUser?.id && account.id === currentUser.id,
                        );
                        const rowStatusClass =
                          visualStatus === "inativo"
                            ? "is-inactive"
                            : visualStatus === "excluido"
                              ? "is-deleted"
                              : "";

                        return (
                          <tr
                            key={account.id}
                            className={rowStatusClass || undefined}
                          >
                            <td data-label="Usuário">
                              <div className="admin-users-identity">
                                <UserAvatar
                                  name={account.name}
                                  avatarUrl={account.avatarUrl}
                                />
                                <div className="admin-users-identity-text">
                                  <span className="admin-users-name">
                                    {account.name}
                                  </span>
                                  {account.isAdminAccount && (
                                    <span className="admin-users-role-note">
                                      Administrador
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td data-label="E-mail">
                              <span className="admin-users-email">
                                {account.email}
                              </span>
                            </td>

                            <td data-label="Tipo">
                              <div className="admin-users-type-badges">
                                <span
                                  className={`admin-users-type-badge ${
                                    isCompany ? "is-company" : "is-person"
                                  }`}
                                >
                                  {isCompany ? "Empresa" : "Pessoa Física"}
                                </span>
                                {visualStatus === "inativo" && (
                                  <span className="admin-users-status-pill is-inactive">
                                    Inativo
                                  </span>
                                )}
                                {visualStatus === "excluido" && (
                                  <span className="admin-users-status-pill is-deleted">
                                    Excluído
                                  </span>
                                )}
                              </div>
                            </td>

                            <td data-label="CNPJ">
                              {account.cnpj ? (
                                <span className="admin-users-cnpj">
                                  {account.cnpj}
                                </span>
                              ) : (
                                <span
                                  className="admin-users-muted-dash"
                                  aria-label="Não se aplica"
                                >
                                  —
                                </span>
                              )}
                            </td>

                            <td
                              data-label="Ações"
                              className="admin-users-col-actions"
                            >
                              <div className="admin-users-actions-group">
                                {canInspectMembers && (
                                  <button
                                    type="button"
                                    className="admin-users-members-btn"
                                    onClick={() => setSelectedCompany(account)}
                                  >
                                    Ver membros
                                    {typeof account.membersCount ===
                                      "number" && (
                                      <span className="admin-users-count-pill">
                                        {account.membersCount}
                                      </span>
                                    )}
                                  </button>
                                )}

                                {isSelf ? (
                                  <span className="admin-users-self-badge">
                                    Você
                                  </span>
                                ) : visualStatus === "ativo" ||
                                  visualStatus === "pendente" ? (
                                  <button
                                    type="button"
                                    className="admin-users-action-btn admin-users-action-btn--inactivate"
                                    onClick={() =>
                                      setPendingStatusAction({
                                        account,
                                        targetStatus: "inativo",
                                      })
                                    }
                                  >
                                    Inativar
                                  </button>
                                ) : visualStatus === "inativo" ? (
                                  <button
                                    type="button"
                                    className="admin-users-action-btn admin-users-action-btn--reactivate"
                                    onClick={() =>
                                      setPendingStatusAction({
                                        account,
                                        targetStatus: "ativo",
                                      })
                                    }
                                  >
                                    Reativar
                                  </button>
                                ) : (
                                  !canInspectMembers && (
                                    <span
                                      className="admin-users-muted-dash"
                                      aria-label="Nenhuma ação disponível"
                                    >
                                      —
                                    </span>
                                  )
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <nav
                  className="admin-users-pagination"
                  aria-label="Paginação de usuários"
                >
                  <p className="admin-users-pagination-summary">
                    Exibindo <strong>{rangeStart}</strong>–
                    <strong>{rangeEnd}</strong> de{" "}
                    <strong>{pagination.total}</strong>{" "}
                    {pagination.total === 1 ? "conta" : "contas"}
                  </p>

                  <div className="admin-users-pagination-controls">
                    <button
                      type="button"
                      className="admin-users-page-btn"
                      disabled={loading || pagination.page <= 1}
                      onClick={() =>
                        setPage((current) => Math.max(1, current - 1))
                      }
                    >
                      Anterior
                    </button>

                    <div className="admin-users-page-numbers">
                      {pageNumbers.map((entry, idx) =>
                        entry === "ellipsis" ? (
                          <span
                            key={`ellipsis-${idx}`}
                            className="admin-users-page-ellipsis"
                            aria-hidden="true"
                          >
                            …
                          </span>
                        ) : (
                          <button
                            key={entry}
                            type="button"
                            className={`admin-users-page-btn admin-users-page-btn--num${
                              entry === pagination.page ? " is-current" : ""
                            }`}
                            aria-current={
                              entry === pagination.page ? "page" : undefined
                            }
                            disabled={loading}
                            onClick={() => setPage(entry)}
                          >
                            {entry}
                          </button>
                        ),
                      )}
                    </div>

                    <button
                      type="button"
                      className="admin-users-page-btn"
                      disabled={
                        loading || pagination.page >= pagination.totalPages
                      }
                      onClick={() =>
                        setPage((current) =>
                          Math.min(pagination.totalPages, current + 1),
                        )
                      }
                    >
                      Próxima
                    </button>
                  </div>
                </nav>
              </>
            )}
          </section>
        )}
      </main>

      <dialog
        ref={dialogRef}
        className="admin-users-dialog"
        aria-labelledby="admin-company-dialog-title"
        onCancel={(event) => {
          event.preventDefault();
          handleCloseModal();
        }}
        onClick={(event) => {
          if (event.target === dialogRef.current) {
            handleCloseModal();
          }
        }}
      >
        {selectedCompany && (
          <div className="admin-users-dialog-body">
            <div className="admin-users-dialog-header">
              <div className="admin-users-dialog-company">
                <UserAvatar
                  name={selectedCompany.name}
                  avatarUrl={selectedCompany.avatarUrl}
                  size="lg"
                />
                <div className="admin-users-dialog-heading">
                  <span className="admin-users-type-badge is-company">
                    Empresa
                  </span>
                  <h2 id="admin-company-dialog-title">
                    {selectedCompany.name}
                  </h2>
                  <p>{selectedCompany.email}</p>
                  {selectedCompany.cnpj && (
                    <p className="admin-users-dialog-cnpj">
                      <strong>CNPJ:</strong> {selectedCompany.cnpj}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                className="admin-users-dialog-close"
                aria-label="Fechar detalhes da empresa"
                onClick={handleCloseModal}
              >
                ✕
              </button>
            </div>

            <div className="admin-users-dialog-summary">
              <span>
                Total: <strong>{memberSummary.total}</strong>
              </span>
              <span className="is-active">
                Ativos: <strong>{memberSummary.activeCount}</strong>
              </span>
              <span className="is-pending">
                Pendentes: <strong>{memberSummary.pendingCount}</strong>
              </span>
              <span className="is-removed">
                Removidos: <strong>{memberSummary.removedCount}</strong>
              </span>
            </div>

            <div className="admin-users-dialog-content">
              {modalLoading ? (
                <p className="admin-users-dialog-status" role="status">
                  Carregando membros vinculados…
                </p>
              ) : modalError ? (
                <div className="admin-users-inline-alert" role="alert">
                  <p>{modalError}</p>
                  <button
                    type="button"
                    className="admin-users-btn admin-users-btn--primary"
                    onClick={() =>
                      setSelectedCompany((current) =>
                        current ? { ...current } : null,
                      )
                    }
                  >
                    Tentar novamente
                  </button>
                </div>
              ) : modalMembers.length === 0 ? (
                <p className="admin-users-dialog-status" role="status">
                  Nenhum membro ou funcionário vinculado a esta empresa.
                </p>
              ) : (
                <ul
                  className="admin-users-members-list"
                  aria-label="Lista de membros da empresa"
                >
                  {modalMembers.map((member) => {
                    const isRemoved = member.bondStatus === "REMOVIDO";
                    const isPending = member.bondStatus === "PENDENTE";
                    const hasDetailStatus =
                      member.rawStatus !== "ATIVO" &&
                      member.rawStatus !== "PENDENTE" &&
                      member.rawStatus !== "REMOVIDO" &&
                      member.rawStatus !== "EXCLUIDO";

                    return (
                      <li
                        key={member.vinculoId ?? member.id}
                        className={`admin-users-member-item${
                          isRemoved
                            ? " is-removed"
                            : isPending
                              ? " is-pending"
                              : ""
                        }`}
                      >
                        <UserAvatar
                          name={member.name}
                          avatarUrl={member.avatarUrl}
                          size="sm"
                        />

                        <div className="admin-users-member-info">
                          <span className="admin-users-member-name">
                            {member.name}
                          </span>
                          <span className="admin-users-member-email">
                            {member.email}
                          </span>
                        </div>

                        <span
                          className={`admin-users-bond-badge ${
                            isRemoved
                              ? "is-removed"
                              : isPending
                                ? "is-pending"
                                : "is-active"
                          }`}
                        >
                          {isRemoved
                            ? "Removido"
                            : isPending
                              ? "Pendente"
                              : "Ativo"}
                          {hasDetailStatus ? ` · ${member.rawStatus}` : ""}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="admin-users-dialog-footer">
              <button
                type="button"
                className="admin-users-btn admin-users-btn--secondary"
                onClick={handleCloseModal}
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </dialog>

      <dialog
        ref={statusDialogRef}
        className="admin-users-dialog admin-users-confirm-dialog"
        aria-labelledby="admin-status-dialog-title"
        onCancel={(event) => {
          event.preventDefault();
          handleCloseStatusModal();
        }}
        onClick={(event) => {
          if (event.target === statusDialogRef.current) {
            handleCloseStatusModal();
          }
        }}
      >
        {pendingStatusAction && (
          <div className="admin-users-dialog-body">
            <div className="admin-users-dialog-header">
              <div className="admin-users-dialog-heading">
                <span
                  className={`admin-users-type-badge ${
                    pendingStatusAction.account.accountType === "EMPRESA"
                      ? "is-company"
                      : "is-person"
                  }`}
                >
                  {pendingStatusAction.account.accountType === "EMPRESA"
                    ? "Empresa"
                    : "Pessoa Física"}
                </span>
                <h2 id="admin-status-dialog-title">
                  {pendingStatusAction.targetStatus === "inativo"
                    ? "Inativar conta"
                    : "Reativar conta"}
                </h2>
              </div>

              <button
                type="button"
                className="admin-users-dialog-close"
                aria-label="Fechar confirmação"
                onClick={handleCloseStatusModal}
              >
                ✕
              </button>
            </div>

            <div className="admin-users-dialog-content">
              <div className="admin-users-confirm-account">
                <UserAvatar
                  name={pendingStatusAction.account.name}
                  avatarUrl={pendingStatusAction.account.avatarUrl}
                  size="sm"
                />
                <div className="admin-users-member-info">
                  <span className="admin-users-member-name">
                    {pendingStatusAction.account.name}
                  </span>
                  <span className="admin-users-member-email">
                    {pendingStatusAction.account.email}
                  </span>
                </div>
              </div>

              {pendingStatusAction.targetStatus === "inativo" ? (
                <>
                  <p className="admin-users-confirm-message">
                    {pendingStatusAction.account.accountType === "EMPRESA" ? (
                      <>
                        Deseja inativar a conta da empresa{" "}
                        <strong>{pendingStatusAction.account.name}</strong>? O
                        acesso à plataforma será suspenso imediatamente até a
                        reativação.
                      </>
                    ) : (
                      <>
                        Deseja inativar a conta de{" "}
                        <strong>{pendingStatusAction.account.name}</strong>? O
                        usuário perderá o acesso à plataforma imediatamente até
                        ser reativado.
                      </>
                    )}
                  </p>
                  {(pendingStatusAction.account.accountType === "EMPRESA" ||
                    Boolean(pendingStatusAction.account.cnpj)) && (
                    <div
                      className="admin-users-confirm-warning"
                      role="note"
                    >
                      Atenção: todos os funcionários vinculados em{" "}
                      <code>membros_empresa</code> também terão o acesso
                      suspenso enquanto esta empresa estiver inativa.
                    </div>
                  )}
                </>
              ) : (
                <p className="admin-users-confirm-message">
                  Deseja reativar a conta de{" "}
                  <strong>{pendingStatusAction.account.name}</strong>? O acesso
                  à plataforma será restabelecido imediatamente.
                </p>
              )}
            </div>

            <div className="admin-users-dialog-footer admin-users-confirm-footer">
              <button
                type="button"
                className="admin-users-btn admin-users-btn--secondary"
                onClick={handleCloseStatusModal}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={`admin-users-btn ${
                  pendingStatusAction.targetStatus === "inativo"
                    ? "admin-users-btn--danger"
                    : "admin-users-btn--success"
                }`}
                onClick={handleConfirmStatusChange}
              >
                {pendingStatusAction.targetStatus === "inativo"
                  ? "Confirmar inativação"
                  : "Confirmar reativação"}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
