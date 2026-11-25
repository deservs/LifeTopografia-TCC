import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useLocation } from "react-router-dom";

import { useLayout } from "../../components/Layout/AppLayout";

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

interface ErrorState {
  kind: AdminApiErrorKind;
  message: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

function buildPageRange(current: number, totalPages: number): Array<number | "ellipsis"> {
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
  const searchInputId = useId();
  const pageSizeSelectId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
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
  const [searchDraft, setSearchDraft] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [reloadTick, setReloadTick] = useState(0);

  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<ErrorState | null>(null);

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

  const handleCloseModal = useCallback(() => {
    setSelectedCompany(null);
    setModalMembers([]);
    setModalError(null);
    setModalLoading(false);
  }, []);

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
    setPage(1);
  }, []);

  const pageNumbers = useMemo(
    () => buildPageRange(pagination.page, pagination.totalPages),
    [pagination.page, pagination.totalPages],
  );

  const memberSummary = useMemo(() => {
    let activeCount = 0;
    let removedCount = 0;
    for (const member of modalMembers) {
      if (member.bondStatus === "REMOVIDO") {
        removedCount += 1;
      } else {
        activeCount += 1;
      }
    }
    return {
      total: modalMembers.length,
      activeCount,
      removedCount,
    };
  }, [modalMembers]);

  const hasActiveFilters =
    debouncedSearch.length > 0 || accountFilter !== "ALL";
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
            <h2 id="admin-forbidden-title">Acesso restrito a administradores</h2>
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
            ) : users.length === 0 ? (
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
                      {users.map((account) => {
                        const isCompany = account.accountType === "EMPRESA";
                        const canInspectMembers =
                          isCompany ||
                          Boolean(account.cnpj) ||
                          (account.members !== undefined &&
                            account.members.length > 0);

                        return (
                          <tr key={account.id}>
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
                              <span
                                className={`admin-users-type-badge ${
                                  isCompany ? "is-company" : "is-person"
                                }`}
                              >
                                {isCompany ? "Empresa" : "Pessoa Física"}
                              </span>
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
                              data-label="Membros"
                              className="admin-users-col-actions"
                            >
                              {canInspectMembers ? (
                                <button
                                  type="button"
                                  className="admin-users-members-btn"
                                  onClick={() => setSelectedCompany(account)}
                                >
                                  Ver membros
                                  {typeof account.membersCount === "number" && (
                                    <span className="admin-users-count-pill">
                                      {account.membersCount}
                                    </span>
                                  )}
                                </button>
                              ) : (
                                <span className="admin-users-muted-dash">—</span>
                              )}
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
                    const hasDetailStatus =
                      member.rawStatus !== "ATIVO" &&
                      member.rawStatus !== "REMOVIDO" &&
                      member.rawStatus !== "EXCLUIDO";

                    return (
                      <li
                        key={member.vinculoId ?? member.id}
                        className={`admin-users-member-item${
                          isRemoved ? " is-removed" : ""
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
                            isRemoved ? "is-removed" : "is-active"
                          }`}
                        >
                          {isRemoved ? "Removido" : "Ativo"}
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
    </div>
  );
}
