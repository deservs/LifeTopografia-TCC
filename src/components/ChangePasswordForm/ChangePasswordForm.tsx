import { lazy, Suspense, useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabase/supabaseClient";
import "./ChangePasswordForm.css";

const PasswordInput = lazy(() => import("../PasswordInput/passwordInput"));

interface ChangePasswordFormProps {
  onSuccess?: (message: string) => void;
}

function getReadableUpdateError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("different from the old password")) {
    return "A nova senha deve ser diferente da senha atual.";
  }
  if (lower.includes("session") || lower.includes("jwt")) {
    return "Sua sessão expirou. Faça login novamente para alterar a senha.";
  }
  if (lower.includes("weak") || lower.includes("password")) {
    return "A senha informada não atende aos requisitos mínimos de segurança.";
  }
  return message || "Não foi possível alterar a senha. Tente novamente.";
}

export default function ChangePasswordForm({
  onSuccess,
}: ChangePasswordFormProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [feedbackIsError, setFeedbackIsError] = useState(false);

  const passwordRules = [
    {
      id: "length",
      label: "Pelo menos 8 caracteres",
      valid: newPassword.length >= 8,
    },
    {
      id: "lowercase",
      label: "Pelo menos uma letra minúscula",
      valid: /[a-z]/.test(newPassword),
    },
    {
      id: "uppercase",
      label: "Pelo menos uma letra maiúscula",
      valid: /[A-Z]/.test(newPassword),
    },
    {
      id: "number",
      label: "Pelo menos um número",
      valid: /\p{N}/u.test(newPassword),
    },
    {
      id: "symbol",
      label: "Pelo menos um símbolo (!@#$...)",
      valid: /[^\p{L}\p{N}\s]/u.test(newPassword),
    },
  ];

  const isPasswordStrong = passwordRules.every((rule) => rule.valid);
  const hasConfirmation = confirmPassword.length > 0;
  const passwordsMatch = newPassword === confirmPassword;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setFeedback("");
    setFeedbackIsError(false);

    if (!isPasswordStrong) {
      setFeedback(
        "A senha deve ter pelo menos 8 caracteres, letra maiúscula, minúscula, número e símbolo.",
      );
      setFeedbackIsError(true);
      return;
    }

    if (!passwordsMatch) {
      setFeedback("As senhas informadas não são iguais.");
      setFeedbackIsError(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setFeedback(getReadableUpdateError(error.message));
        setFeedbackIsError(true);
        return;
      }

      setNewPassword("");
      setConfirmPassword("");
      setFeedback("Senha alterada com sucesso.");
      setFeedbackIsError(false);
      onSuccess?.("Senha alterada com sucesso.");
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? getReadableUpdateError(error.message)
          : "Não foi possível alterar a senha. Tente novamente.",
      );
      setFeedbackIsError(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="profile-card profile-form" onSubmit={handleSubmit}>
      <div className="profile-field">
        <label htmlFor="profile-new-password">Nova senha:</label>
        <Suspense fallback={null}>
          <PasswordInput
            id="profile-new-password"
            visibilityLabel="nova senha"
            autoComplete="new-password"
            minLength={8}
            value={newPassword}
            required
            disabled={isSubmitting}
            onChange={(event) => {
              setNewPassword(event.target.value);
              if (feedback) setFeedback("");
            }}
          />
        </Suspense>
      </div>

      {newPassword.length > 0 && (
        <ul
          className="change-password-requirements"
          aria-label="Requisitos da nova senha"
        >
          {passwordRules.map((rule) => (
            <li
              key={rule.id}
              className={rule.valid ? "is-valid" : "is-invalid"}
            >
              <span aria-hidden="true">{rule.valid ? "✓" : "✕"}</span>
              <span>{rule.label}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="profile-field">
        <label htmlFor="profile-repeat-password">Confirmar nova senha:</label>
        <Suspense fallback={null}>
          <PasswordInput
            id="profile-repeat-password"
            visibilityLabel="confirmação da nova senha"
            autoComplete="new-password"
            value={confirmPassword}
            required
            disabled={isSubmitting}
            aria-invalid={hasConfirmation ? !passwordsMatch : undefined}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              if (feedback) setFeedback("");
            }}
          />
        </Suspense>
      </div>

      {hasConfirmation && (
        <p
          className={`change-password-match ${
            passwordsMatch ? "is-valid" : "is-invalid"
          }`}
          role="status"
        >
          <span aria-hidden="true">{passwordsMatch ? "✓ " : "✕ "}</span>
          {passwordsMatch
            ? "As senhas coincidem."
            : "As senhas informadas ainda não coincidem."}
        </p>
      )}

      {feedback && (
        <p
          className={`profile-feedback${
            feedbackIsError ? " profile-feedback--error" : ""
          }`}
          role={feedbackIsError ? "alert" : "status"}
        >
          {feedback}
        </p>
      )}

      <button
        className="profile-primary-button"
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? "SALVANDO…" : "SALVAR"}
      </button>
    </form>
  );
}
