import { useEffect, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';

import Sidebar from '../../components/Sidebar/sidebar.tsx';
import type { UserProfile } from '../../components/Sidebar/sidebar';

import Logo from '../../assets/image/logo-front.webp';
import FundoHeader from '../../assets/image/background/firstcard.webp';

import './login.css';

type EtapaFluxo =
    | 'login'
    | 'esqueci_email'
    | 'esqueci_codigo'
    | 'esqueci_nova_senha';

type TipoLogin = 'pessoa' | 'empresa';

interface LoginFormData {
    loginIdentificador: string;
    senha: string;
    emailRecuperacao: string;
    codigoDigits: string[];
    novaSenha: string;
    confirmarNovaSenha: string;
}

const CODIGO_LENGTH = 6;
const TEMPO_REENVIO = 60;

export const Login = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Será substituído pelos dados da sessão quando a autenticação for integrada.
    const currentUser: UserProfile | null = null;

    const [etapa, setEtapa] = useState<EtapaFluxo>('login');
    const [tipoLogin, setTipoLogin] = useState<TipoLogin>('pessoa');

    const [showModalResend, setShowModalResend] = useState(false);
    const [feedback, setFeedback] = useState('');

    const [formData, setFormData] = useState<LoginFormData>({
        loginIdentificador: '',
        senha: '',
        emailRecuperacao: '',
        codigoDigits: Array(CODIGO_LENGTH).fill(''),
        novaSenha: '',
        confirmarNovaSenha: '',
    });

    const [timer, setTimer] = useState(TEMPO_REENVIO);

    useEffect(() => {
        if (etapa !== 'esqueci_codigo' || timer <= 0) {
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

        setFeedback('');
    };

    const handleDigitChange = (index: number, value: string) => {
        const digit = value.replace(/\D/g, '').slice(-1);

        setFormData((previousData) => {
            const newDigits = [...previousData.codigoDigits];
            newDigits[index] = digit;

            return {
                ...previousData,
                codigoDigits: newDigits,
            };
        });

        setFeedback('');

        if (digit && index < CODIGO_LENGTH - 1) {
            const nextInput = document.getElementById(
                `digit-${index + 1}`
            ) as HTMLInputElement | null;

            nextInput?.focus();
        }
    };

    const handleDigitKeyDown = (
        index: number,
        event: KeyboardEvent<HTMLInputElement>
    ) => {
        if (
            event.key !== 'Backspace' ||
            formData.codigoDigits[index] ||
            index === 0
        ) {
            return;
        }

        event.preventDefault();

        setFormData((previousData) => {
            const newDigits = [...previousData.codigoDigits];
            newDigits[index - 1] = '';

            return {
                ...previousData,
                codigoDigits: newDigits,
            };
        });

        const previousInput = document.getElementById(
            `digit-${index - 1}`
        ) as HTMLInputElement | null;

        previousInput?.focus();
    };

    const handleReenviarCodigo = () => {
        setTimer(TEMPO_REENVIO);
        setFeedback('');

        /*
         * Integração futura:
         * somente abrir o modal depois que o backend confirmar
         * o envio do novo código.
         */
        setShowModalResend(true);
    };

    const handleSubmitLogin = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setFeedback('');

        /*
         * Integração futura:
         * enviar tipoLogin, loginIdentificador e senha ao backend.
         *
         * O frontend não deve redirecionar ou considerar o login
         * concluído antes da resposta de autenticação.
         */
    };

    const handleSubmitRecoveryEmail = (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();
        setFeedback('');

        /*
         * A mudança para a etapa seguinte representa o fluxo visual.
         * Na integração definitiva, esta transição deve ocorrer somente
         * após o serviço de recuperação aceitar a solicitação.
         */
        setTimer(TEMPO_REENVIO);
        setEtapa('esqueci_codigo');
    };

    const handleSubmitRecoveryCode = (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        const codigoCompleto = formData.codigoDigits.join('');

        if (codigoCompleto.length !== CODIGO_LENGTH) {
            setFeedback('Informe os 6 dígitos do código.');
            return;
        }

        setFeedback('');

        /*
         * Integração futura:
         * o backend deverá validar o código e fornecer a autorização
         * necessária para permitir a troca da senha.
         */
        setEtapa('esqueci_nova_senha');
    };

    const handleSubmitNewPassword = (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        if (formData.novaSenha !== formData.confirmarNovaSenha) {
            setFeedback('As senhas informadas não são iguais.');
            return;
        }

        if (formData.novaSenha.length < 6) {
            setFeedback('A senha deve possuir pelo menos 6 caracteres.');
            return;
        }

        setFeedback('');

        /*
         * Integração futura:
         * enviar novaSenha + autorização/token recebido na etapa
         * anterior ao backend.
         *
         * Não retornamos automaticamente para o login aqui, pois
         * ainda não existe confirmação de sucesso da operação.
         */
    };

    const voltarParaLogin = () => {
        setEtapa('login');
        setFeedback('');
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
                    <img
                        src={Logo}
                        alt="Life Topografia"
                    />
                </div>
            </header>

            <main className="login-main-content">
                <div className="login-title-container">
                    <h1 className="login-title">
                        {etapa === 'login'
                            ? 'ENTRAR'
                            : 'ESQUECI A SENHA'}
                    </h1>

                    <div
                        className="title-divider"
                        aria-hidden="true"
                    >
                        <span className="line"></span>
                        <span className="rhombus"></span>
                        <span className="line"></span>
                    </div>
                </div>

                <div className="login-card">
                    {etapa === 'login' && (
                        <>
                            <div className="tabs-header">
                                <button
                                    type="button"
                                    className={`tab-btn ${
                                        tipoLogin === 'pessoa'
                                            ? 'active'
                                            : ''
                                    }`}
                                    onClick={() => {
                                        setTipoLogin('pessoa');
                                        setFeedback('');
                                    }}
                                    aria-pressed={tipoLogin === 'pessoa'}
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

                                <span
                                    className="tab-separator"
                                    aria-hidden="true"
                                >
                                    |
                                </span>

                                <button
                                    type="button"
                                    className={`tab-btn ${
                                        tipoLogin === 'empresa'
                                            ? 'active'
                                            : ''
                                    }`}
                                    onClick={() => {
                                        setTipoLogin('empresa');
                                        setFeedback('');
                                    }}
                                    aria-pressed={tipoLogin === 'empresa'}
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

                            <form
                                onSubmit={handleSubmitLogin}
                                className="login-form"
                            >
                                <div className="form-group">
                                    <div className="input-icon-box">
                                        <svg
                                            viewBox="0 0 24 24"
                                            aria-hidden="true"
                                        >
                                            <path
                                                fill="currentColor"
                                                d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
                                            />
                                        </svg>
                                    </div>

                                    <div className="input-field-wrapper">
                                        <label htmlFor="loginIdentificador">
                                            {tipoLogin === 'pessoa'
                                                ? 'Email ou usuário:'
                                                : 'Nome ou CNPJ:'}
                                        </label>

                                        <input
                                            type="text"
                                            id="loginIdentificador"
                                            name="loginIdentificador"
                                            value={
                                                formData.loginIdentificador
                                            }
                                            onChange={handleChange}
                                            autoComplete="username"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <div className="input-icon-box">
                                        <svg
                                            viewBox="0 0 24 24"
                                            aria-hidden="true"
                                        >
                                            <path
                                                fill="currentColor"
                                                d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"
                                            />
                                        </svg>
                                    </div>

                                    <div className="input-field-wrapper">
                                        <label htmlFor="senha">
                                            Senha:
                                        </label>

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
                                    <p
                                        className="form-feedback error"
                                        role="alert"
                                    >
                                        {feedback}
                                    </p>
                                )}

                                <div className="forgot-password-link-container">
                                    <button 
                                        type="button" 
                                        className="btn-forgot-password"
                                        onClick={() => {
                                            setEtapa('esqueci_email');
                                            setFeedback('');
                                        }}
                                    >
                                        Esqueci minha senha
                                    </button>
                                </div>

                                <button
                                    type="submit"
                                    className="btn-action-login"
                                >
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

                                <Link
                                    to="/cadastrar"
                                    className="btn-register-redirect"
                                >
                                    VOCÊ NÃO POSSUI CONTA?
                                </Link>
                            </form>
                        </>
                    )}

                    {etapa === 'esqueci_email' && (
                        <form
                            onSubmit={handleSubmitRecoveryEmail}
                            className="login-form animation-fade-in"
                        >
                            <div className="form-group">
                                <div className="input-icon-box">
                                    <svg
                                        viewBox="0 0 24 24"
                                        aria-hidden="true"
                                    >
                                        <path
                                            fill="currentColor"
                                            d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"
                                        />
                                    </svg>
                                </div>

                                <div className="input-field-wrapper">
                                    <label htmlFor="emailRecuperacao">
                                        Insira o Email:
                                    </label>

                                    <input
                                        type="email"
                                        id="emailRecuperacao"
                                        name="emailRecuperacao"
                                        value={
                                            formData.emailRecuperacao
                                        }
                                        onChange={handleChange}
                                        autoComplete="email"
                                        required
                                    />
                                </div>
                            </div>

                            {feedback && (
                                <p
                                    className="form-feedback error"
                                    role="alert"
                                >
                                    {feedback}
                                </p>
                            )}

                            <button
                                type="submit"
                                className="btn-action-login"
                            >
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

                    {etapa === 'esqueci_codigo' && (
                        <form
                            onSubmit={handleSubmitRecoveryCode}
                            className="login-form animation-fade-in text-center"
                        >
                            <h2 className="codigo-subtitle-title">
                                INSIRA O CÓDIGO
                            </h2>

                            <p className="codigo-subtitle-desc">
                                Um código foi enviado para o email{' '}
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
                                {formData.codigoDigits.map(
                                    (digit, index) => (
                                        <input
                                            key={index}
                                            id={`digit-${index}`}
                                            type="text"
                                            inputMode="numeric"
                                            pattern="[0-9]"
                                            maxLength={1}
                                            value={digit}
                                            onChange={(event) =>
                                                handleDigitChange(
                                                    index,
                                                    event.target.value
                                                )
                                            }
                                            onKeyDown={(event) =>
                                                handleDigitKeyDown(
                                                    index,
                                                    event
                                                )
                                            }
                                            className="digit-box"
                                            aria-label={`Dígito ${
                                                index + 1
                                            } de ${CODIGO_LENGTH}`}
                                            autoComplete={
                                                index === 0
                                                    ? 'one-time-code'
                                                    : 'off'
                                            }
                                            required
                                        />
                                    )
                                )}
                            </div>

                            {feedback && (
                                <p
                                    className="form-feedback error"
                                    role="alert"
                                >
                                    {feedback}
                                </p>
                            )}

                            <button
                                type="submit"
                                className="btn-action-login"
                            >
                                <span>ENVIAR</span>
                            </button>

                            <p className="timer-text">
                                Não recebeu o código?{' '}
                                {timer > 0 ? (
                                    <span>
                                        {timer} segundos.
                                    </span>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleReenviarCodigo}
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

                    {etapa === 'esqueci_nova_senha' && (
                        <form
                            onSubmit={handleSubmitNewPassword}
                            className="login-form animation-fade-in"
                        >
                            <div className="form-group">
                                <div className="input-icon-box">
                                    <svg
                                        viewBox="0 0 24 24"
                                        aria-hidden="true"
                                    >
                                        <path
                                            fill="currentColor"
                                            d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"
                                        />
                                    </svg>
                                </div>

                                <div className="input-field-wrapper">
                                    <label htmlFor="novaSenha">
                                        Nova Senha:
                                    </label>

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
                                    <svg
                                        viewBox="0 0 24 24"
                                        aria-hidden="true"
                                    >
                                        <path
                                            fill="currentColor"
                                            d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"
                                        />
                                    </svg>

                                    <span
                                        className="check-badge"
                                        aria-hidden="true"
                                    >
                                        ✓
                                    </span>
                                </div>

                                <div className="input-field-wrapper">
                                    <label htmlFor="confirmarNovaSenha">
                                        Confirmar Senha:
                                    </label>

                                    <input
                                        type="password"
                                        id="confirmarNovaSenha"
                                        name="confirmarNovaSenha"
                                        value={
                                            formData.confirmarNovaSenha
                                        }
                                        onChange={handleChange}
                                        autoComplete="new-password"
                                        required
                                    />
                                </div>
                            </div>

                            {feedback && (
                                <p
                                    className="form-feedback error"
                                    role="alert"
                                >
                                    {feedback}
                                </p>
                            )}

                            <button
                                type="submit"
                                className="btn-action-login"
                            >
                                <span>ALTERAR SENHA</span>
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
                </div>
            </main>

            {showModalResend && (
                <div
                    className="modal-overlay"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="modal-resend-title"
                >
                    <div className="modal-card animation-fade-in">
                        <h2
                            id="modal-resend-title"
                            className="modal-title"
                        >
                            SOLICITAÇÃO ENVIADA
                        </h2>

                        <p className="modal-text">
                            A solicitação para reenviar o código foi
                            registrada. O envio efetivo será realizado
                            pelo serviço de recuperação.
                        </p>

                        <button
                            type="button"
                            className="btn-modal-ok"
                            onClick={() =>
                                setShowModalResend(false)
                            }
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