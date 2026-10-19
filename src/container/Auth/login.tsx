import {
  useEffect,
  useState,
  useRef,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  type ClipboardEvent,
} from "react";
import { Link } from "react-router-dom";

import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";

import Sidebar from "../../components/Sidebar/sidebar.tsx";
import type { UserProfile } from "../../components/Sidebar/sidebar";
import {
  SendResetPassword,
  ConfirmResetPassword,
  ConfirmOTP,
  SignIn,
  SignOut,
} from "../../lib/supabase/auth.ts";

import Logo from "../../assets/image/logo-front.webp";
import FundoHeader from "../../assets/image/background/firstcard.webp";

import "./login.css";

type EtapaFluxo =
  "login" | "esqueci_email" | "esqueci_codigo" | "esqueci_nova_senha";

type TipoLogin = "pessoa" | "empresa";

interface LoginFormData {
  loginIdentificador: string;
  senha: string;
  emailRecuperacao: string;
  codigoDigits: string[];
  novaSenha: string;
  confirmarNovaSenha: string;
}

const CODIGO_LENGTH = 8;
const TEMPO_REENVIO = 60;

export const Login = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [inviCaptcha, setInviCaptcha] = useState(false);
  // Será substituído pelos dados da sessão quando a autenticação for integrada.
  const currentUser: UserProfile | null = null;
  const captcha = useRef<TurnstileInstance | null>(null); // Referência para o componente Turnstile

  const [etapa, setEtapa] = useState<EtapaFluxo>("login");
  const [tipoLogin, setTipoLogin] = useState<TipoLogin>("pessoa");
  const [logoutFail, setLogoutFail] = useState(false);
  const [clickedButton, setClickedButton] = useState(false);

  const [showModalResend, setShowModalResend] = useState(false);
  const [feedback, setFeedback] = useState("");

  const [formData, setFormData] = useState<LoginFormData>({
    loginIdentificador: "",
    senha: "",
    emailRecuperacao: "",
    codigoDigits: Array(CODIGO_LENGTH).fill(""),
    novaSenha: "",
    confirmarNovaSenha: "",
  });

  const [timer, setTimer] = useState(TEMPO_REENVIO);

  useEffect(() => {
    if (etapa !== "esqueci_codigo" || timer <= 0) {
      return;
    }

    const interval = setInterval(() => {
      setTimer((previousTimer) => previousTimer - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [etapa, timer]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));

    setFeedback("");
  };

  const handleDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);

    setFormData((previousData) => {
      const newDigits = [...previousData.codigoDigits];
      newDigits[index] = digit;

      return {
        ...previousData,
        codigoDigits: newDigits,
      };
    });

    setFeedback("");

    if (digit && index < CODIGO_LENGTH - 1) {
      const nextInput = document.getElementById(
        `digit-${index + 1}`,
      ) as HTMLInputElement | null;

      nextInput?.focus();
    }
  };

  const handleDigitKeyDown = (
    index: number,
    event: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (
      event.key !== "Backspace" ||
      formData.codigoDigits[index] ||
      index === 0
    ) {
      return;
    }

    event.preventDefault();

    setFormData((previousData) => {
      const newDigits = [...previousData.codigoDigits];
      newDigits[index - 1] = "";

      return {
        ...previousData,
        codigoDigits: newDigits,
      };
    });

    const previousInput = document.getElementById(
      `digit-${index - 1}`,
    ) as HTMLInputElement | null;

    previousInput?.focus();
  };
  const handleDigitPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();

    const pastedDigits = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, CODIGO_LENGTH);

    if (!pastedDigits) return;

    const newDigits = Array(CODIGO_LENGTH).fill("");

    pastedDigits.split("").forEach((digit, index) => {
      newDigits[index] = digit;
    });

    setFormData((previousData) => ({
      ...previousData,
      codigoDigits: newDigits,
    }));

    setFeedback("");

    const nextIndex = Math.min(pastedDigits.length, CODIGO_LENGTH - 1);
    document.getElementById(`digit-${nextIndex}`)?.focus();
  };

  const handleReenviarCodigo = async (token: string) => {
    setFeedback("");

    if (!token) {
      setFeedback("Ocorreu um erro, por favor tente novamente.");
      return;
    }
    try {
      await SendResetPassword(formData.emailRecuperacao, token);
      setInviCaptcha(false);
      setTimer(TEMPO_REENVIO);
    } catch (error) {
      console.error("Erro ao reenviar código:", error);
      setFeedback("Erro ao reenviar o código. Tente novamente.");
      setInviCaptcha(false);
      return;
    } finally {
      setCaptchaToken(null);
    }
    /*
     * Integração:
     * somente abrir o modal depois que o backend confirmar
     * o envio do novo código.
     */
    setShowModalResend(true);
  };

  const handleSubmitLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback("");
    if (!captchaToken) {
      setFeedback("Por favor, complete o captcha.");
      return;
    }
    const identificador = formData.loginIdentificador.trim();
    const cnpjNormalizado = identificador.replace(/[./-]/g, "").toUpperCase();

    const formaDeLogin = tipoLogin === "pessoa" ? "email" : "cnpj";

    if (
      tipoLogin === "pessoa" &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identificador)
    ) {
      setFeedback("Informe um e-mail válido.");
      return;
    }

    if (
      tipoLogin === "empresa" &&
      !/^[A-Z0-9]{12}[0-9]{2}$/.test(cnpjNormalizado)
    ) {
      setFeedback("Informe um CNPJ válido com 14 caracteres.");
      return;
    }
    try {
      const resultado = await SignIn(
        tipoLogin === "empresa" ? cnpjNormalizado : identificador,
        formData.senha,
        captchaToken,
        formaDeLogin,
      );
      if (!resultado.data?.user) {
        setFeedback("Credenciais inválidas. Tente novamente.");
        throw new Error("Credenciais inválidas");
      }
      window.location.href = "/";
    } catch (error) {
      setFeedback("Erro ao fazer login. Verifique suas credenciais.");
      console.error("Erro ao fazer login:", error);
    } finally {
      setCaptchaToken(null);
      captcha.current?.reset();
    }
  };

  const handleSubmitRecoveryEmail = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setFeedback("");

    /*
     * A mudança para a etapa seguinte representa o fluxo visual.
     * Na integração definitiva, esta transição deve ocorrer somente
     * após o serviço de recuperação aceitar a solicitação.
     */

    if (!captchaToken) {
      setFeedback("Por favor, complete o captcha.");
      return;
    }

    try {
      await SendResetPassword(formData.emailRecuperacao, captchaToken);
      setEtapa("esqueci_codigo");
      setTimer(TEMPO_REENVIO);
    } catch (error) {
      console.error("Erro ao enviar solicitação de recuperação:", error);
      setFeedback(
        "Erro ao enviar solicitação de recuperação. Verifique o email informado.",
      );
      return;
    } finally {
      setCaptchaToken(null);
      captcha.current?.reset();
    }
  };

  const handleSubmitRecoveryCode = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const codigoCompleto = formData.codigoDigits.join("");

    if (codigoCompleto.length !== CODIGO_LENGTH) {
      setFeedback(`Informe os ${CODIGO_LENGTH} dígitos do código.`);
      return;
    }

    setFeedback("");
    try {
      await ConfirmOTP(codigoCompleto, formData.emailRecuperacao);
      setClickedButton(false);
      setEtapa("esqueci_nova_senha");
    } catch (error) {
      console.error("Erro ao confirmar o código:", error);
      setFeedback(
        "Erro ao confirmar o código. Verifique se o código informado está correto.",
      );
      return;
    }
    /*
     * Integração:
     * o backend deverá validar o código e fornecer a autorização
     * necessária para permitir a troca da senha.
     */
  };

  const handleSubmitNewPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (formData.novaSenha !== formData.confirmarNovaSenha) {
      setFeedback("As senhas informadas não são iguais.");
      return;
    }

    if (formData.novaSenha.length < 6) {
      setFeedback("A senha deve possuir pelo menos 6 caracteres.");
      return;
    }

    setFeedback("");

    /*
     * Integração:
     * enviar novaSenha + autorização/token recebido na etapa
     * anterior ao backend.
     *
     * Não retornamos automaticamente para o login aqui, pois
     * ainda não existe confirmação de sucesso da operação.
     */
    try {
      setClickedButton(true);
      await ConfirmResetPassword(formData.novaSenha);
    } catch (error) {
      console.error("Erro ao confirmar a nova senha:", error);
      setClickedButton(false);
      setFeedback("Erro ao confirmar a nova senha. Tente novamente.");
      return;
    }
    try {
      await SignOut("global");
      setEtapa("login");
    } catch (error) {
      setLogoutFail(true);
      console.error("Erro ao deslogar o usuário:", error);
    }
  };

  const handleTryLogout = async () => {
    try {
      await SignOut("global");
      setLogoutFail(false);
      setEtapa("login");
    } catch (error) {
      setLogoutFail(true);
      console.error("Erro ao deslogar o usuário:", error);
    }
  };

  const voltarParaLogin = () => {
    setEtapa("login");
    setFeedback("");
    setLogoutFail(false);
    setShowModalResend(false);
  };

  return (
    <div className="login-page">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        user={currentUser}
      />

      <header
        className="login-topbar"
        style={{
          backgroundImage: `
                        linear-gradient(
                            rgba(0, 0, 0, 0.45),
                            rgba(0, 0, 0, 0.45)
                        ),
                        url(${FundoHeader})
                    `,
        }}
      >
        <button
          type="button"
          className="btn-menu-header"
          onClick={() => setIsSidebarOpen(true)}
          aria-label="Abrir menu"
          aria-expanded={isSidebarOpen}
          aria-controls="menu-drawer"
        >
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
        </button>

        <div className="topbar-logo">
          <img src={Logo} alt="Life Topografia" />
        </div>
      </header>

      <main className="login-main-content">
        <div className="login-title-container">
          <h1 className="login-title">
            {etapa === "login" ? "ENTRAR" : "ESQUECI A SENHA"}
          </h1>

          <div className="title-divider" aria-hidden="true">
            <span className="line"></span>
            <span className="rhombus"></span>
            <span className="line"></span>
          </div>
        </div>

        <div className="login-card">
          {etapa === "login" && (
            <>
              <div className="tabs-header">
                <button
                  type="button"
                  className={`tab-btn ${
                    tipoLogin === "pessoa" ? "active" : ""
                  }`}
                  onClick={() => {
                    setTipoLogin("pessoa");
                    setFeedback("");
                  }}
                  aria-pressed={tipoLogin === "pessoa"}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="tab-icon"
                    aria-hidden="true"
                  >
                    <path
                      fill="currentColor"
                      d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
                    />
                  </svg>

                  <span>Pessoas</span>
                </button>

                <span className="tab-separator" aria-hidden="true">
                  |
                </span>

                <button
                  type="button"
                  className={`tab-btn ${
                    tipoLogin === "empresa" ? "active" : ""
                  }`}
                  onClick={() => {
                    setTipoLogin("empresa");
                    setFeedback("");
                  }}
                  aria-pressed={tipoLogin === "empresa"}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="tab-icon"
                    aria-hidden="true"
                  >
                    <path
                      fill="currentColor"
                      d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"
                    />
                  </svg>

                  <span>Empresas</span>
                </button>
              </div>

              <form onSubmit={handleSubmitLogin} className="login-form">
                <div className="form-group">
                  <div className="input-icon-box">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="currentColor"
                        d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
                      />
                    </svg>
                  </div>

                  <div className="input-field-wrapper">
                    <label htmlFor="loginIdentificador">
                      {tipoLogin === "pessoa" ? "E-mail:" : "CNPJ:"}
                    </label>

                    <input
                      type={tipoLogin === "pessoa" ? "email" : "text"}
                      inputMode={tipoLogin === "empresa" ? "numeric" : "email"}
                      id="loginIdentificador"
                      name="loginIdentificador"
                      value={formData.loginIdentificador}
                      onChange={handleChange}
                      autoComplete="username"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <div className="input-icon-box">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="currentColor"
                        d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"
                      />
                    </svg>
                  </div>

                  <div className="input-field-wrapper">
                    <label htmlFor="senha">Senha:</label>

                    <input
                      type="password"
                      id="senha"
                      name="senha"
                      value={formData.senha}
                      onChange={handleChange}
                      autoComplete="current-password"
                      required
                    />
                  </div>
                </div>

                {feedback && (
                  <p className="form-feedback error" role="alert">
                    {feedback}
                  </p>
                )}

                <div className="forgot-password-link-container">
                  <button
                    type="button"
                    className="btn-forgot-password"
                    onClick={() => {
                      setEtapa("esqueci_email");
                      setFeedback("");
                    }}
                  >
                    Esqueci minha senha
                  </button>
                </div>

                <div className="captcha-container">
                  <Turnstile
                    ref={captcha}
                    siteKey="0x4AAAAAAFabYKAT6aVT3YYq"
                    onSuccess={(token) => {
                      setCaptchaToken(token);
                    }}
                    onExpire={() => setCaptchaToken(null)}
                  />
                </div>

                <button type="submit" className="btn-action-login">
                  <svg
                    viewBox="0 0 24 24"
                    className="btn-key-icon"
                    aria-hidden="true"
                  >
                    <path
                      fill="currentColor"
                      d="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v2h2v-2h2v-2H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"
                    />
                  </svg>

                  <span>ENTRAR</span>
                </button>

                <div className="ou-divider">
                  <span className="line"></span>
                  <span className="text">ou</span>
                  <span className="line"></span>
                </div>

                <Link to="/cadastrar" className="btn-register-redirect">
                  VOCÊ NÃO POSSUI CONTA?
                </Link>
              </form>
            </>
          )}

          {etapa === "esqueci_email" && (
            <form
              onSubmit={handleSubmitRecoveryEmail}
              className="login-form animation-fade-in"
            >
              <div className="form-group">
                <div className="input-icon-box">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"
                    />
                  </svg>
                </div>
                <div className="input-field-wrapper">
                  <label htmlFor="emailRecuperacao">Insira o Email:</label>

                  <input
                    type="email"
                    id="emailRecuperacao"
                    name="emailRecuperacao"
                    value={formData.emailRecuperacao}
                    onChange={handleChange}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>
              <div className="captcha-container">
                <Turnstile
                  ref={captcha}
                  siteKey="0x4AAAAAAFabYKAT6aVT3YYq"
                  onSuccess={(token) => {
                    setCaptchaToken(token);
                  }}
                  onExpire={() => setCaptchaToken(null)}
                />
              </div>

              {feedback && (
                <p className="form-feedback error" role="alert">
                  {feedback}
                </p>
              )}

              <button type="submit" className="btn-action-login">
                <span>ENVIAR</span>
              </button>

              <button
                type="button"
                className="btn-back-login"
                onClick={voltarParaLogin}
              >
                Voltar ao Login
              </button>
            </form>
          )}

          {etapa === "esqueci_codigo" && (
            <form
              onSubmit={handleSubmitRecoveryCode}
              className="login-form animation-fade-in text-center"
            >
              <h2 className="codigo-subtitle-title">INSIRA O CÓDIGO</h2>

              <p className="codigo-subtitle-desc">
                Um código foi enviado para o email{" "}
                <span className="email-highlight">
                  {formData.emailRecuperacao}
                </span>
                .
              </p>

              <div
                className="digits-container"
                role="group"
                aria-label="Código de recuperação"
              >
                {formData.codigoDigits.map((digit, index) => (
                  <input
                    key={index}
                    id={`digit-${index}`}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]"
                    maxLength={1}
                    value={digit}
                    onChange={(event) =>
                      handleDigitChange(index, event.target.value)
                    }
                    onKeyDown={(event) => handleDigitKeyDown(index, event)}
                    onPaste={handleDigitPaste}
                    className="digit-box"
                    aria-label={`Dígito ${index + 1} de ${CODIGO_LENGTH}`}
                    autoComplete={index === 0 ? "one-time-code" : "off"}
                    required
                  />
                ))}
              </div>
              {feedback && (
                <p className="form-feedback error" role="alert">
                  {feedback}
                </p>
              )}

              <button type="submit" className="btn-action-login">
                <span>ENVIAR</span>
              </button>

              <p className="timer-text">
                Não recebeu o código?{" "}
                {timer > 0 ? (
                  <span>{timer} segundos.</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setInviCaptcha(true)}
                    className="btn-resend"
                  >
                    Reenviar
                  </button>
                )}
              </p>

              <button
                type="button"
                className="btn-back-login"
                onClick={voltarParaLogin}
              >
                Voltar ao Login
              </button>
            </form>
          )}

          {etapa === "esqueci_nova_senha" &&
            (!logoutFail ? (
              <form
                onSubmit={handleSubmitNewPassword}
                className="login-form animation-fade-in"
              >
                <div className="form-group">
                  <div className="input-icon-box">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="currentColor"
                        d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"
                      />
                    </svg>
                  </div>

                  <div className="input-field-wrapper">
                    <label htmlFor="novaSenha">Nova Senha:</label>

                    <input
                      type="password"
                      id="novaSenha"
                      name="novaSenha"
                      value={formData.novaSenha}
                      onChange={handleChange}
                      autoComplete="new-password"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <div className="input-icon-box relative-badge">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="currentColor"
                        d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"
                      />
                    </svg>

                    <span className="check-badge" aria-hidden="true">
                      ✓
                    </span>
                  </div>

                  <div className="input-field-wrapper">
                    <label htmlFor="confirmarNovaSenha">Confirmar Senha:</label>

                    <input
                      type="password"
                      id="confirmarNovaSenha"
                      name="confirmarNovaSenha"
                      value={formData.confirmarNovaSenha}
                      onChange={handleChange}
                      autoComplete="new-password"
                      required
                    />
                  </div>
                </div>

                {feedback && (
                  <p className="form-feedback error" role="alert">
                    {feedback}
                  </p>
                )}

                <button
                  type="submit"
                  className="btn-action-login"
                  disabled={clickedButton}
                >
                  <span>ALTERAR SENHA</span>
                </button>

                <button
                  type="button"
                  className="btn-back-login"
                  disabled={clickedButton}
                  onClick={async () => {
                    try {
                      await SignOut("local");
                      setEtapa("login");
                    } catch (error) {
                      console.error("Erro ao deslogar o usuário:", error);
                      setFeedback(
                        "Erro ao tentar voltar ao login. Tente novamente.",
                      );
                    }
                  }}
                >
                  Cancelar Tudo
                </button>
              </form>
            ) : (
              <div className="login-form animation-fade-in">
                <p>Não foi possível deslogar, tente novamente.</p>
                <button className="btn-action-login" onClick={handleTryLogout}>
                  Tentar Novamente
                </button>
              </div>
            ))}
        </div>
      </main>

      {inviCaptcha && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-resend-title"
          style={{ zIndex: 1000 }}
        >
          <div
            className="modal-card animation-fade-in"
            style={{ padding: "20px 0", background: "transparent" }}
          >
            <Turnstile
              ref={captcha}
              siteKey="0x4AAAAAAFabYKAT6aVT3YYq"
              onSuccess={(token) => {
                setCaptchaToken(token);
                void handleReenviarCodigo(token);
              }}
              onError={() => {
                setFeedback("Erro ao validar o captcha. Tente novamente.");
                setInviCaptcha(false);
              }}
              onExpire={() => setCaptchaToken(null)}
            />
          </div>
        </div>
      )}

      {showModalResend && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-resend-title"
        >
          <div className="modal-card animation-fade-in">
            <h2 id="modal-resend-title" className="modal-title">
              SOLICITAÇÃO ENVIADA
            </h2>

            <p className="modal-text">
              A solicitação para reenviar o código foi registrada. O envio
              efetivo será realizado pelo serviço de recuperação.
            </p>

            <button
              type="button"
              className="btn-modal-ok"
              onClick={() => setShowModalResend(false)}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
