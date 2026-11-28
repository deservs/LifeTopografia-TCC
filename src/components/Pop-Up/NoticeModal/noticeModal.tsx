import {
  useEffect,
  useId,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../../../assets/image/logo-front.webp";

import "./noticeModal.css";

const DEFAULT_OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

export type NoticeModalProps = {
  buttonText?: string;
  buttonLink?: string;
  code: string;
  popupTitle: string;
  message: string;
  showOtpInput?: boolean;
  otpLength?: number;
  userEmail?: string;
  isSubmitting?: boolean;
  errorMessage?: string;
  onConfirmOtp?: (code: string) => void;
  onResendOtp?: () => Promise<void> | void;
  onCancel?: () => void;
};

export default function NoticeModal({
  buttonText = "Confirmar código",
  buttonLink,
  code,
  popupTitle,
  message,
  showOtpInput = false,
  otpLength = DEFAULT_OTP_LENGTH,
  userEmail,
  isSubmitting = false,
  errorMessage,
  onConfirmOtp,
  onResendOtp,
  onCancel,
}: NoticeModalProps) {
  const resolvedOtpLength = Math.max(1, Math.floor(otpLength));
  const otpIdPrefix = useId();
  const titleId = `${otpIdPrefix}-title`;
  const descriptionId = `${otpIdPrefix}-description`;
  const homeLinkRef = useRef<HTMLAnchorElement>(null);
  const digitRefs = useRef<Array<HTMLInputElement | null>>([]);
  const navigate = useNavigate();

  const [digits, setDigits] = useState<string[]>(() =>
    Array(resolvedOtpLength).fill(""),
  );
  const [resendTimer, setResendTimer] = useState(RESEND_COOLDOWN_SECONDS);
  const [isResending, setIsResending] = useState(false);
  const [localError, setLocalError] = useState("");
  const [errorDismissed, setErrorDismissed] = useState(false);

  // Sincroniza quantidade de dígitos e foco inicial ao alternar para modo OTP
  useEffect(() => {
    if (!showOtpInput) return;

    setDigits(Array(resolvedOtpLength).fill(""));
    setLocalError("");
    setErrorDismissed(false);
    setResendTimer(RESEND_COOLDOWN_SECONDS);

    const frame = window.requestAnimationFrame(() => {
      digitRefs.current[0]?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [showOtpInput, resolvedOtpLength]);

  useEffect(() => {
    setErrorDismissed(false);
  }, [errorMessage]);

  // Timer regressivo para reenvio do código OTP
  const isCounting = showOtpInput && resendTimer > 0;

  useEffect(() => {
    if (!isCounting) {
      return;
    }

    const interval = window.setInterval(() => {
      setResendTimer((previousTimer) => Math.max(0, previousTimer - 1));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isCounting]);

  // Gerencia bloqueio de fundo (inert), foco inicial e tecla Escape
  useEffect(() => {
    // A Home continua visível atrás do aviso, mas não deve receber cliques ou foco.
    const home = document.getElementById("initial-card");
    const wasInert = home?.inert ?? false;

    if (home) home.inert = true;

    if (!showOtpInput) {
      homeLinkRef.current?.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      if (showOtpInput) {
        if (!isSubmitting) onCancel?.();
        return;
      }

      if (buttonLink !== undefined) {
        navigate(`/${buttonLink}`, { replace: true });
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      if (home) home.inert = wasInert;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [navigate, showOtpInput, buttonLink, isSubmitting, onCancel]);

  const clearFeedback = () => {
    setLocalError("");
    setErrorDismissed(true);
  };

  const handleDigitChange = (index: number, value: string) => {
    const cleaned = value.replace(/\D/g, "");
    clearFeedback();

    if (cleaned.length > 1) {
      const nextDigits = [...digits];
      const chars = cleaned.slice(0, resolvedOtpLength - index).split("");
      chars.forEach((char, offset) => {
        nextDigits[index + offset] = char;
      });
      setDigits(nextDigits);

      const nextFocusIndex = Math.min(
        index + chars.length,
        resolvedOtpLength - 1,
      );
      digitRefs.current[nextFocusIndex]?.focus();
      return;
    }

    const digit = cleaned.slice(-1);
    setDigits((previousDigits) => {
      const nextDigits = [...previousDigits];
      nextDigits[index] = digit;
      return nextDigits;
    });

    if (digit && index < resolvedOtpLength - 1) {
      digitRefs.current[index + 1]?.focus();
    }
  };

  const handleDigitKeyDown = (
    index: number,
    event: ReactKeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      const previousIndex = Math.max(0, index - 1);
      digitRefs.current[previousIndex]?.focus();
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      const nextIndex = Math.min(resolvedOtpLength - 1, index + 1);
      digitRefs.current[nextIndex]?.focus();
      return;
    }

    if (event.key !== "Backspace" || digits[index] || index === 0) {
      return;
    }

    event.preventDefault();
    clearFeedback();

    setDigits((previousDigits) => {
      const nextDigits = [...previousDigits];
      nextDigits[index - 1] = "";
      return nextDigits;
    });

    digitRefs.current[index - 1]?.focus();
  };

  const handleDigitPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();

    const pastedDigits = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, resolvedOtpLength);

    if (!pastedDigits) return;

    const nextDigits = Array(resolvedOtpLength).fill("");
    pastedDigits.split("").forEach((digit, index) => {
      nextDigits[index] = digit;
    });

    setDigits(nextDigits);
    clearFeedback();

    const nextIndex = Math.min(pastedDigits.length, resolvedOtpLength - 1);
    digitRefs.current[nextIndex]?.focus();
  };

  const fullCode = digits.join("");
  const isOtpComplete =
    fullCode.length === resolvedOtpLength &&
    digits.every((digit) => digit.length === 1);
  const displayedError = localError || (!errorDismissed ? errorMessage : "");

  const handleSubmitOtp = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    if (!isOtpComplete) {
      setLocalError(
        `Informe os ${resolvedOtpLength} dígitos do código enviado.`,
      );
      return;
    }

    setLocalError("");
    setErrorDismissed(false);
    onConfirmOtp?.(fullCode);
  };

  const handleResendClick = async () => {
    if (isSubmitting || isResending || resendTimer > 0) return;
    clearFeedback();
    setIsResending(true);
    try {
      await onResendOtp?.();
      setResendTimer(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setLocalError(
        err instanceof Error
          ? err.message
          : "Não foi possível reenviar o código. Tente novamente.",
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <>
      {!showOtpInput && code === "ERRO 404" && (
        <>
          <title>Página não encontrada - Life Topografia</title>
          <meta
            name="description"
            content="A página solicitada não foi encontrada na plataforma Life Topografia."
          />
        </>
      )}
      <div className="notice-modal-overlay">
        <section
          className={`notice-modal-card${showOtpInput ? " notice-modal-card--otp" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
        >
          <div className="notice-modal-symbol" aria-hidden="true">
            <img src={logo} alt="Logo da LifeTopografia" />
          </div>

          <span className="notice-modal-code">{code}</span>
          <h1
            id={titleId}
            style={{
              margin: "0 0 12px",
              color: "#0b132b",
              fontSize: "clamp(1.65rem, 5vw, 2.1rem)",
              fontWeight: 700,
              lineHeight: 1.2,
            }}
          >
            {popupTitle}
          </h1>
          <p
            id={descriptionId}
            style={{
              maxWidth: "360px",
              margin: showOtpInput ? "0 auto 14px" : "0 auto 28px",
              color: "#42516b",
              fontSize: "0.98rem",
              lineHeight: 1.6,
            }}
          >
            {message}
          </p>

          {showOtpInput ? (
            <form
              className="notice-modal-otp-form"
              onSubmit={handleSubmitOtp}
              noValidate
            >
              <p className="notice-modal-otp-email">
                {userEmail ? (
                  <>
                    Enviamos um código de {resolvedOtpLength} dígitos para{" "}
                    <span className="notice-modal-email-highlight">
                      {userEmail}
                    </span>
                    .
                  </>
                ) : (
                  <>
                    Digite o código de {resolvedOtpLength} dígitos enviado para
                    o seu e-mail cadastrado.
                  </>
                )}
              </p>

              <div
                className="digits-container"
                role="group"
                aria-label={`Código de verificação de ${resolvedOtpLength} dígitos`}
              >
                {digits.map((digit, index) => (
                  <input
                    key={`${otpIdPrefix}-${index}`}
                    ref={(element) => {
                      digitRefs.current[index] = element;
                    }}
                    id={`${otpIdPrefix}-digit-${index}`}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]"
                    maxLength={index === 0 ? resolvedOtpLength : 1}
                    value={digit}
                    disabled={isSubmitting}
                    onChange={(event) =>
                      handleDigitChange(index, event.target.value)
                    }
                    onKeyDown={(event) => handleDigitKeyDown(index, event)}
                    onPaste={handleDigitPaste}
                    className="digit-box"
                    aria-label={`Dígito ${index + 1} de ${resolvedOtpLength}`}
                    aria-invalid={Boolean(displayedError)}
                    autoComplete={index === 0 ? "one-time-code" : "off"}
                    required
                  />
                ))}
              </div>

              {displayedError && (
                <p className="notice-modal-otp-error" role="alert">
                  {displayedError}
                </p>
              )}

              <div className="notice-modal-otp-actions">
                <button
                  type="submit"
                  className="notice-modal-action notice-modal-action--button"
                  disabled={!isOtpComplete || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span
                        className="notice-modal-spinner"
                        aria-hidden="true"
                      />
                      <span>Verificando…</span>
                    </>
                  ) : (
                    <>
                      {buttonText}
                      <span aria-hidden="true">→</span>
                    </>
                  )}
                </button>

                {onCancel && (
                  <button
                    type="button"
                    className="notice-modal-cancel"
                    onClick={onCancel}
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </button>
                )}
              </div>

              <p className="notice-modal-timer-text">
                Não recebeu o código?{" "}
                {resendTimer > 0 ? (
                  <span className="notice-modal-timer-countdown">
                    Reenviar em {resendTimer}s
                  </span>
                ) : (
                  <button
                    type="button"
                    className="notice-modal-resend-btn"
                    onClick={handleResendClick}
                    disabled={isSubmitting || isResending}
                  >
                    Reenviar código
                  </button>
                )}
              </p>
            </form>
          ) : (
            <Link
              ref={homeLinkRef}
              className="notice-modal-action"
              to={`/${buttonLink ?? ""}`}
              replace
            >
              {buttonText}
              <span aria-hidden="true">→</span>
            </Link>
          )}
        </section>
      </div>
    </>
  );
}
