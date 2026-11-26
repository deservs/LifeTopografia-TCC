import { useEffect, useRef, useState, type FormEvent } from "react";

type PermissionKey =
  | "usuarios_leitura"
  | "usuarios_edicao"
  | "matriculas_ocr"
  | "dxf_arquivos"
  | "chat_suporte";

interface PermissionOption {
  key: PermissionKey;
  label: string;
}

interface TargetScopeOption {
  id: string;
  label: string;
  shortLabel: string;
  isGlobal: boolean;
}

interface HelperPermissionRule {
  id: string;
  scopeId: string;
  scopeLabel: string;
  isGlobal: boolean;
  permissions: PermissionKey[];
}

interface AdminHelper {
  id: string;
  name: string;
  email: string;
  status: "ATIVO" | "PENDENTE";
  rules: HelperPermissionRule[];
}

interface FeedbackState {
  message: string;
  isError: boolean;
}

const PERMISSION_OPTIONS: readonly PermissionOption[] = [
  { key: "usuarios_leitura", label: "Visualizar cadastro de usuários" },
  { key: "usuarios_edicao", label: "Editar / inativar usuários" },
  { key: "matriculas_ocr", label: "Revisar matrículas e OCR" },
  { key: "dxf_arquivos", label: "Acessar / baixar arquivos DXF" },
  { key: "chat_suporte", label: "Responder chat de suporte" },
];

const PERMISSION_LABELS: Record<PermissionKey, string> = {
  usuarios_leitura: "Visualizar cadastro de usuários",
  usuarios_edicao: "Editar / inativar usuários",
  matriculas_ocr: "Revisar matrículas e OCR",
  dxf_arquivos: "Acessar / baixar arquivos DXF",
  chat_suporte: "Responder chat de suporte",
};

const TARGET_SCOPE_OPTIONS: readonly TargetScopeOption[] = [
  {
    id: "global",
    label: "Todos os usuários (Acesso Global)",
    shortLabel: "Global",
    isGlobal: true,
  },
  {
    id: "client-alpha",
    label: "Construtora Alpha — CNPJ 12.345.678/0001-90",
    shortLabel: "Construtora Alpha — CNPJ 12.345.678/0001-90",
    isGlobal: false,
  },
  {
    id: "client-maria",
    label: "Maria Oliveira",
    shortLabel: "Maria Oliveira",
    isGlobal: false,
  },
  {
    id: "client-paulista",
    label: "Topografia Paulista Ltda — CNPJ 45.678.910/0001-22",
    shortLabel: "Topografia Paulista Ltda — CNPJ 45.678.910/0001-22",
    isGlobal: false,
  },
];

const INITIAL_HELPERS: AdminHelper[] = [
  {
    id: "helper-1",
    name: "João Silva",
    email: "joao.silva@lifetopografia.com.br",
    status: "ATIVO",
    rules: [
      {
        id: "rule-1",
        scopeId: "global",
        scopeLabel: "Global",
        isGlobal: true,
        permissions: ["usuarios_leitura", "chat_suporte"],
      },
      {
        id: "rule-2",
        scopeId: "client-alpha",
        scopeLabel: "Construtora Alpha — CNPJ 12.345.678/0001-90",
        isGlobal: false,
        permissions: ["matriculas_ocr", "dxf_arquivos"],
      },
    ],
  },
  {
    id: "helper-2",
    name: "Camila Ferreira",
    email: "camila.ferreira@lifetopografia.com.br",
    status: "PENDENTE",
    rules: [],
  },
];

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Painel visual de gerenciamento de ajudantes e permissões granulares do Administrador.
 * Utiliza apenas estado local em memória (dados mockados) para validação de UI/UX.
 */
export default function AdminHelpersPanel() {
  const [helpers, setHelpers] = useState<AdminHelper[]>(INITIAL_HELPERS);
  const [selectedHelperId, setSelectedHelperId] = useState<string | null>(
    INITIAL_HELPERS[0]?.id ?? null,
  );
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [selectedScopeId, setSelectedScopeId] = useState(
    TARGET_SCOPE_OPTIONS[0].id,
  );
  const [selectedPermissions, setSelectedPermissions] = useState<
    PermissionKey[]
  >([]);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const feedbackTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current !== null) {
        window.clearTimeout(feedbackTimerRef.current);
      }
    };
  }, []);

  function showFeedback(message: string, isError = false) {
    if (feedbackTimerRef.current !== null) {
      window.clearTimeout(feedbackTimerRef.current);
    }
    setFeedback({ message, isError });
    feedbackTimerRef.current = window.setTimeout(() => {
      setFeedback(null);
      feedbackTimerRef.current = null;
    }, 4500);
  }

  const selectedHelper =
    helpers.find((item) => item.id === selectedHelperId) ?? null;

  function handleInviteHelper(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = inviteName.trim();
    const trimmedEmail = inviteEmail.trim().toLowerCase();

    if (!trimmedName || !trimmedEmail) {
      showFeedback("Informe nome e e-mail do ajudante.", true);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      showFeedback("Informe um endereço de e-mail válido.", true);
      return;
    }

    const alreadyExists = helpers.some(
      (item) => item.email.toLowerCase() === trimmedEmail,
    );
    if (alreadyExists) {
      showFeedback("Já existe um ajudante cadastrado com este e-mail.", true);
      return;
    }

    const newHelper: AdminHelper = {
      id: `helper-${crypto.randomUUID()}`,
      name: trimmedName,
      email: trimmedEmail,
      status: "PENDENTE",
      rules: [],
    };

    setHelpers((previous) => [...previous, newHelper]);
    setSelectedHelperId(newHelper.id);
    setInviteName("");
    setInviteEmail("");
    setSelectedPermissions([]);
    showFeedback(
      "Ajudante adicionado com sucesso. O acesso será efetivado após a confirmação do convite.",
    );
  }

  function handleRemoveHelper(helper: AdminHelper) {
    const remaining = helpers.filter((item) => item.id !== helper.id);
    setHelpers(remaining);

    if (selectedHelperId === helper.id) {
      setSelectedHelperId(remaining[0]?.id ?? null);
      setSelectedPermissions([]);
    }

    showFeedback(`Ajudante "${helper.name}" removido com sucesso.`);
  }

  function togglePermission(key: PermissionKey) {
    setSelectedPermissions((previous) =>
      previous.includes(key)
        ? previous.filter((item) => item !== key)
        : [...previous, key],
    );
  }

  function handleAddRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedHelper) return;

    if (selectedPermissions.length === 0) {
      showFeedback(
        "Selecione ao menos um conteúdo permitido antes de adicionar a regra.",
        true,
      );
      return;
    }

    const scope =
      TARGET_SCOPE_OPTIONS.find((item) => item.id === selectedScopeId) ??
      TARGET_SCOPE_OPTIONS[0];
    const hasExistingScopeRule = selectedHelper.rules.some(
      (rule) => rule.scopeId === scope.id,
    );

    setHelpers((previous) =>
      previous.map((helper) => {
        if (helper.id !== selectedHelper.id) return helper;

        if (hasExistingScopeRule) {
          return {
            ...helper,
            rules: helper.rules.map((rule) => {
              if (rule.scopeId !== scope.id) return rule;
              const merged = PERMISSION_OPTIONS.map((opt) => opt.key).filter(
                (key) =>
                  rule.permissions.includes(key) ||
                  selectedPermissions.includes(key),
              );
              return { ...rule, permissions: merged };
            }),
          };
        }

        const orderedPermissions = PERMISSION_OPTIONS.map(
          (opt) => opt.key,
        ).filter((key) => selectedPermissions.includes(key));

        const newRule: HelperPermissionRule = {
          id: `rule-${crypto.randomUUID()}`,
          scopeId: scope.id,
          scopeLabel: scope.shortLabel,
          isGlobal: scope.isGlobal,
          permissions: orderedPermissions,
        };

        return {
          ...helper,
          rules: [...helper.rules, newRule],
        };
      }),
    );

    setSelectedPermissions([]);
    showFeedback(
      hasExistingScopeRule
        ? "Permissão atualizada com sucesso para o escopo selecionado."
        : "Permissão adicionada com sucesso.",
    );
  }

  function handleRemoveRule(helperId: string, ruleId: string) {
    setHelpers((previous) =>
      previous.map((helper) =>
        helper.id === helperId
          ? {
              ...helper,
              rules: helper.rules.filter((rule) => rule.id !== ruleId),
            }
          : helper,
      ),
    );
    showFeedback("Regra de permissão removida com sucesso.");
  }

  return (
    <div className="profile-card profile-helpers-card">
      {feedback && (
        <p
          className={`profile-feedback${feedback.isError ? " profile-feedback--error" : ""}`}
          role={feedback.isError ? "alert" : "status"}
        >
          {feedback.message}
        </p>
      )}

      <section
        className="profile-helpers-section"
        aria-labelledby="helpers-list-title"
      >
        <h2 id="helpers-list-title" className="profile-helpers-section-title">
          Ajudantes cadastrados
        </h2>

        <form
          className="profile-helpers-invite-form"
          onSubmit={handleInviteHelper}
          noValidate
        >
          <label className="profile-field" htmlFor="helper-invite-name">
            Nome:
            <input
              id="helper-invite-name"
              name="helperName"
              type="text"
              autoComplete="off"
              placeholder="Ex: João Silva"
              maxLength={160}
              value={inviteName}
              onChange={(event) => setInviteName(event.target.value)}
            />
          </label>
          <label className="profile-field" htmlFor="helper-invite-email">
            E-mail:
            <input
              id="helper-invite-email"
              name="helperEmail"
              type="email"
              autoComplete="off"
              placeholder="ajudante@empresa.com"
              maxLength={254}
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
            />
          </label>
          <button
            className="profile-primary-button profile-helpers-invite-submit"
            type="submit"
          >
            Adicionar ajudante
          </button>
        </form>

        {helpers.length === 0 ? (
          <p className="profile-empty-members">
            Nenhum ajudante cadastrado no momento. Use o formulário acima para
            convidar o primeiro ajudante.
          </p>
        ) : (
          <ul className="profile-members-list profile-helpers-list">
            {helpers.map((helper) => {
              const isSelected = helper.id === selectedHelperId;
              const initial =
                helper.name.trim().charAt(0).toUpperCase() || "A";

              return (
                <li
                  key={helper.id}
                  className={`profile-helper-item${isSelected ? " profile-helper-item--selected" : ""}`}
                >
                  <span className="profile-avatar">
                    <span aria-hidden="true">{initial}</span>
                  </span>

                  <div className="profile-member-summary">
                    <span className="profile-helper-name">{helper.name}</span>
                    <span className="profile-helper-email">{helper.email}</span>
                    <span
                      className={`profile-status profile-helper-status-badge profile-status--${helper.status.toLowerCase()}`}
                    >
                      {helper.status}
                    </span>
                  </div>

                  <div className="profile-helper-row-actions">
                    <button
                      type="button"
                      className={`profile-helper-select-btn${isSelected ? " profile-helper-select-btn--active" : ""}`}
                      aria-pressed={isSelected}
                      onClick={() => {
                        setSelectedHelperId(helper.id);
                        setSelectedPermissions([]);
                      }}
                    >
                      Permissões
                    </button>
                    <button
                      type="button"
                      className="profile-icon-button profile-helper-remove-icon"
                      aria-label={`Remover ajudante ${helper.name}`}
                      title="Remover ajudante"
                      onClick={() => handleRemoveHelper(helper)}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section
        className="profile-helpers-section profile-helpers-permissions"
        aria-labelledby="helpers-permissions-title"
      >
        {!selectedHelper ? (
          <>
            <h2
              id="helpers-permissions-title"
              className="profile-helpers-section-title"
            >
              Permissões granulares
            </h2>
            <p className="profile-empty-members">
              Selecione ou cadastre um ajudante para configurar as permissões
              granulares.
            </p>
          </>
        ) : (
          <>
            <div className="profile-helpers-selected-header">
              <h2
                id="helpers-permissions-title"
                className="profile-helpers-section-title"
              >
                Permissões de:{" "}
                <strong className="profile-helpers-selected-name">
                  {selectedHelper.name}
                </strong>
              </h2>
              <span className="profile-helper-email">
                {selectedHelper.email}
              </span>
            </div>

            <form
              className="profile-helpers-rule-form"
              onSubmit={handleAddRule}
            >
              <label className="profile-field" htmlFor="helper-scope-select">
                Escopo de usuário alvo:
                <select
                  id="helper-scope-select"
                  value={selectedScopeId}
                  onChange={(event) => setSelectedScopeId(event.target.value)}
                >
                  {TARGET_SCOPE_OPTIONS.map((scope) => (
                    <option key={scope.id} value={scope.id}>
                      {scope.label}
                    </option>
                  ))}
                </select>
              </label>

              <fieldset className="profile-helpers-fieldset">
                <legend>Conteúdos permitidos:</legend>
                <div className="profile-helpers-checkboxes">
                  {PERMISSION_OPTIONS.map((option) => (
                    <label
                      key={option.key}
                      className="profile-helper-checkbox"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPermissions.includes(option.key)}
                        onChange={() => togglePermission(option.key)}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <button className="profile-primary-button" type="submit">
                Adicionar permissão
              </button>
            </form>

            <div className="profile-helpers-rules-block">
              <div className="profile-helpers-rules-heading">
                <h3>Regras ativas</h3>
                <span className="profile-helpers-rules-count">
                  {selectedHelper.rules.length}{" "}
                  {selectedHelper.rules.length === 1 ? "regra" : "regras"}
                </span>
              </div>

              {selectedHelper.rules.length === 0 ? (
                <p className="profile-empty-members profile-helpers-empty-rules">
                  Nenhuma regra de permissão atribuída a este ajudante.
                </p>
              ) : (
                <ul className="profile-helpers-rules-list">
                  {selectedHelper.rules.map((rule) => (
                    <li key={rule.id} className="profile-helper-rule-card">
                      <div className="profile-helper-rule-header">
                        <span
                          className={`profile-scope-badge ${rule.isGlobal ? "profile-scope-badge--global" : "profile-scope-badge--client"}`}
                        >
                          {rule.scopeLabel}
                        </span>
                        <button
                          type="button"
                          className="profile-remove-button profile-helper-rule-remove"
                          onClick={() =>
                            handleRemoveRule(selectedHelper.id, rule.id)
                          }
                        >
                          Remover
                        </button>
                      </div>
                      <div className="profile-rule-tags">
                        {rule.permissions.map((permKey) => (
                          <span key={permKey} className="profile-rule-tag">
                            {PERMISSION_LABELS[permKey]}
                          </span>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
