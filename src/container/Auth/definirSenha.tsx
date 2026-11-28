import { lazy, Suspense, useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { ConfirmResetPassword } from "../../lib/supabase/auth";

import "./definirSenha.css";
import { useAuth } from "../../hook/useAuth";

const PasswordInput = lazy(
  () => import("../../components/PasswordInput/passwordInput"),
);

export const DefinirSenha = () => {
  const { user, status } = useAuth();
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (status !== "authenticated" || !user) return;

    if (user.status === "PENDENTE") {
      navigate("/", { replace: true });
    }
  }, [status, user, navigate]);
  const senhaRequisitos = [
    {
      id: "comprimento",
      texto: "Pelo menos 8 caracteres",
      valido: novaSenha.length >= 8,
    },
    {
      id: "letra minuscula",
      texto: "Pelo menos uma letra minúscula",
      valido: /[a-z]/.test(novaSenha),
    },
    {
      id: "letra maiuscula",
      texto: "Pelo menos uma letra maiúscula",
      valido: /[A-Z]/.test(novaSenha),
    },
    {
      id: "numero",
      texto: "Pelo menos um número",
      valido: /\p{N}/u.test(novaSenha),
    },
    {
      id: "simbolo",
      texto: "Pelo menos um símbolo (!@#$...)",
      valido: /[^\p{L}\p{N}\s]/u.test(novaSenha),
    },
  ];

  const senhaValida = senhaRequisitos.every((requisito) => requisito.valido);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    setFormError("");

    if (!senhaValida) {
      setFormError(
        "A senha deve ter pelo menos 8 caracteres, uma letra maiúscula, uma letra minúscula, um número e um símbolo.",
      );
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setFormError("As senhas informadas não são iguais.");
      return;
    }

    setIsSubmitting(true);
    try {
      await ConfirmResetPassword(novaSenha);
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Erro ao definir a senha:", error);
      const rawMessage = error instanceof Error ? error.message : "";
      if (
        rawMessage.toLowerCase().includes("different from the old password")
      ) {
        setFormError("A nova senha precisa ser diferente da senha atual.");
      } else {
        setFormError(
          rawMessage ||
            "Ocorreu um erro ao definir a senha. Por favor, tente novamente.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <title>Definir Senha - Life Topografia</title>
      <meta
        name="description"
        content="Defina sua nova senha de acesso à plataforma Life Topografia."
      />
      <div className="definir-senha-page">
        <main className="definir-senha-main">
          <div className="definir-senha-title-container">
            <h1 className="definir-senha-title">DEFINIR SENHA</h1>

            <div className="definir-senha-divider" aria-hidden="true">
              <span className="line" />
              <span className="rhombus" />
              <span className="line" />
            </div>
          </div>

          <div className="definir-senha-card">
            <form onSubmit={handleSubmit} className="definir-senha-form">
              <div
                className={`definir-senha-group${
                  novaSenha.length > 0
                    ? " definir-senha-group--align-start"
                    : ""
                }`}
              >
                <div className="definir-senha-icon-box" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"
                    />
                  </svg>
                </div>

                <div className="definir-senha-field">
                  <label htmlFor="definirNovaSenha">Nova Senha:</label>

                  <Suspense fallback={null}>
                    <PasswordInput
                      id="definirNovaSenha"
                      visibilityLabel="nova senha"
                      name="novaSenha"
                      value={novaSenha}
                      disabled={isSubmitting}
                      onChange={(event) => {
                        setNovaSenha(event.target.value);
                        if (formError) setFormError("");
                      }}
                      autoComplete="new-password"
                      required
                    />
                  </Suspense>

                  {novaSenha.length > 0 && (
                    <ul className="definir-senha-requirements">
                      {senhaRequisitos.map((requisito) => (
                        <li
                          key={requisito.id}
                          className={
                            requisito.valido ? "is-valid" : "is-invalid"
                          }
                        >
                          <span aria-hidden="true">
                            {requisito.valido ? "✓" : "✕"}
                          </span>
                          {requisito.texto}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="definir-senha-group">
                <div className="definir-senha-icon-box" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"
                    />
                  </svg>

                  {confirmarSenha.length > 0 && (
                    <span
                      className={`definir-senha-check-badge ${
                        novaSenha === confirmarSenha ? "is-valid" : "is-invalid"
                      }`}
                      aria-hidden="true"
                    >
                      {novaSenha === confirmarSenha ? "✓" : "✕"}
                    </span>
                  )}
                </div>

                <div className="definir-senha-field">
                  <label htmlFor="definirConfirmarSenha">
                    Confirmar Senha:
                  </label>

                  <Suspense fallback={null}>
                    <PasswordInput
                      id="definirConfirmarSenha"
                      visibilityLabel="confirmação da nova senha"
                      name="confirmarSenha"
                      value={confirmarSenha}
                      disabled={isSubmitting}
                      onChange={(event) => {
                        setConfirmarSenha(event.target.value);
                        if (formError) setFormError("");
                      }}
                      autoComplete="new-password"
                      required
                    />
                  </Suspense>
                </div>
              </div>

              {formError && (
                <p className="definir-senha-feedback" role="alert">
                  {formError}
                </p>
              )}

              <button
                type="submit"
                className="definir-senha-submit"
                disabled={isSubmitting}
              >
                <span>DEFINIR SENHA</span>
              </button>

              <button
                disabled={isSubmitting}
                type="button"
                className="definir-senha-cancel"
              >
                Cancelar
              </button>
            </form>
          </div>
        </main>
      </div>
    </>
  );
};

export default DefinirSenha;
