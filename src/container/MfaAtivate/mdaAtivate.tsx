import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type FormEvent,
} from "react";

import Logo from "../../assets/image/logo-front.webp";
import type { MdaAtivateProps } from "./mdaAtivate.types";
import "./mdaAtivate.css";

function resolveQrCodeSrc(qrCodeUrl?: string): string | null {
  if (!qrCodeUrl) return null;
  const trimmed = qrCodeUrl.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("<svg")) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(trimmed)}`;
  }

  return trimmed;
}

function sanitizeOtpCode(value: string): string {
  return value.replace(/\D/g, "").slice(0, 6);
}

function ShieldLockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <rect x="9" y="11" width="6" height="5" rx="1" />
      <path d="M10 11V9a2 2 0 1 1 4 0v2" />
    </svg>
  );
}

export function MdaAtivate({
  mode,
  qrCodeUrl,
  secretKey,
  isLoading = false,
  errorMessage,
  onVerifyCode,
  onCancel,
}: MdaAtivateProps) {
  const [code, setCode] = useState("");
  const [secretCopied, setSecretCopied] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const codeInputId = useId();
  const errorMessageId = useId();
  const titleId = useId();

  const isEnroll = mode === "enroll";
  const qrSrc = resolveQrCodeSrc(qrCodeUrl);
  const trimmedSecret = secretKey?.trim() || "";
  const isCodeComplete = code.length === 6;

  useEffect(() => {
    setCode("");
    setSecretCopied(false);

    if (mode === "verify") {
      const frame = window.requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
      return () => window.cancelAnimationFrame(frame);
    }
  }, [mode]);

  useEffect(() => {
    if (!secretCopied) return;
    const timer = window.setTimeout(() => setSecretCopied(false), 2500);
    return () => window.clearTimeout(timer);
  }, [secretCopied]);

  const handleCodeChange = (event: ChangeEvent<HTMLInputElement>) => {
    setCode(sanitizeOtpCode(event.target.value));
  };

  const handleCodePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData("text");
    const digits = sanitizeOtpCode(pasted);
    if (!digits) return;
    event.preventDefault();
    setCode(digits);
  };

  const handleCopySecret = async () => {
    if (!trimmedSecret) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(trimmedSecret);
      } else {
        const tempInput = document.createElement("textarea");
        tempInput.value = trimmedSecret;
        tempInput.setAttribute("readonly", "");
        tempInput.style.position = "fixed";
        tempInput.style.opacity = "0";
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand("copy");
        document.body.removeChild(tempInput);
      }
      setSecretCopied(true);
    } catch {
      setSecretCopied(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLoading || !isCodeComplete) return;
    onVerifyCode(code);
  };

  const pageTitle = isEnroll
    ? "Ativar Autenticação em Dois Fatores - Life Topografia"
    : "Verificação em Dois Fatores - Life Topografia";

  return (
    <>
      <title>{pageTitle}</title>
      <meta
        name="description"
        content="Proteção de conta corporativa e administrativa via autenticação em dois fatores (TOTP) na Life Topografia."
      />

      <main className="mfa-page">
        <section className="mfa-card" aria-labelledby={titleId}>
          <header className="mfa-header">
            <img
              src={Logo}
              alt="Life Topografia"
              className="mfa-brand-logo"
              width={2413}
              height={991}
            />

            <div className="mfa-security-badge">
              <span className="mfa-shield-icon">
                <ShieldLockIcon />
              </span>
              <span>SEGURANÇA CORPORATIVA / ADMINISTRATIVA • 2FA</span>
            </div>

            <h1 id={titleId} className="mfa-title">
              {isEnroll
                ? "Ativar Autenticação em Dois Fatores"
                : "Verificação em Dois Fatores"}
            </h1>

            <p className="mfa-subtitle">
              {isEnroll
                ? "Proteja o acesso administrativo e corporativo vinculando um aplicativo autenticador TOTP."
                : "Sua conta corporativa ou administrativa exige a validação do código temporário para continuar."}
            </p>
          </header>

          {isEnroll ? (
            <div className="mfa-enroll-block">
              <ol className="mfa-steps-list">
                <li>
                  <span className="mfa-step-number" aria-hidden="true">
                    1
                  </span>
                  <span>
                    Escaneie o QR Code abaixo no{" "}
                    <strong>Google Authenticator</strong> ou{" "}
                    <strong>Authy</strong>.
                  </span>
                </li>
                <li>
                  <span className="mfa-step-number" aria-hidden="true">
                    2
                  </span>
                  <span>
                    Digite o código de <strong>6 dígitos</strong> gerado pelo
                    aplicativo.
                  </span>
                </li>
              </ol>

              <div className="mfa-qr-section">
                <div className="mfa-qr-frame">
                  {qrSrc ? (
                    <img
                      src={qrSrc}
                      alt="QR Code para configuração do aplicativo autenticador"
                      className="mfa-qr-image"
                    />
                  ) : (
                    <div
                      className="mfa-qr-placeholder"
                      role="status"
                      aria-label="Aguardando geração do QR Code"
                    >
                      <span>QR Code TOTP</span>
                    </div>
                  )}
                </div>

                {trimmedSecret && (
                  <div className="mfa-secret-box">
                    <span className="mfa-secret-label">
                      Não conseguiu ler pela câmera? Use a chave manual:
                    </span>
                    <div className="mfa-secret-row">
                      <code className="mfa-secret-code">{trimmedSecret}</code>
                      <button
                        type="button"
                        className={`mfa-copy-btn ${secretCopied ? "is-copied" : ""}`}
                        onClick={handleCopySecret}
                        disabled={isLoading}
                      >
                        {secretCopied ? "✓ Copiada" : "Copiar chave"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="mfa-verify-notice">
              <p>
                Digite o código de <strong>6 dígitos</strong> do seu aplicativo
                autenticador.
              </p>
            </div>
          )}

          <form className="mfa-form" onSubmit={handleSubmit} noValidate>
            <div className="mfa-field">
              <label htmlFor={codeInputId} className="mfa-field-label">
                Código do autenticador (6 dígitos)
              </label>
              <input
                ref={inputRef}
                id={codeInputId}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="000000"
                className="mfa-code-input"
                value={code}
                onChange={handleCodeChange}
                onPaste={handleCodePaste}
                disabled={isLoading}
                aria-invalid={Boolean(errorMessage)}
                aria-describedby={errorMessage ? errorMessageId : undefined}
                required
              />
            </div>

            {errorMessage && (
              <p id={errorMessageId} className="mfa-error-alert" role="alert">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              className="mfa-submit-btn"
              disabled={isLoading || !isCodeComplete}
            >
              {isLoading ? (
                <span className="mfa-btn-loading">
                  <span className="mfa-spinner" aria-hidden="true" />
                  <span>{isEnroll ? "Ativando…" : "Verificando…"}</span>
                </span>
              ) : isEnroll ? (
                "Ativar e Entrar"
              ) : (
                "Verificar e Entrar"
              )}
            </button>
          </form>

          <footer className="mfa-footer">
            <button
              type="button"
              className="mfa-cancel-btn"
              onClick={onCancel}
              disabled={isLoading || !onCancel}
            >
              Sair / Voltar ao login
            </button>
          </footer>
        </section>
      </main>
    </>
  );
}

export default MdaAtivate;
