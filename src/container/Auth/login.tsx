import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar/sidebar.tsx';
import type { UserProfile } from '../../components/Sidebar/sidebar';

import Logo from '../../assets/image/logo-front.webp';
import FundoHeader from '../../assets/image/background/firstcard.webp';
import './login.css';

// Etapas do fluxo de Login e Recuperação de Senha
type EtapaFluxo = 'login' | 'esqueci_email' | 'esqueci_codigo' | 'esqueci_nova_senha';

export const Login: React.FC = () => {
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [currentUser] = useState<UserProfile | null>(null);

    // Estado da Etapa Atual do Formulário
    const [etapa, setEtapa] = useState<EtapaFluxo>('login');

    // Estado do tipo de Login (Pessoas vs Empresas)
    const [tipoLogin, setTipoLogin] = useState<'pessoa' | 'empresa'>('pessoa');

    // Campos do Formulário
    const [formData, setFormData] = useState({
        loginIdentificador: '', // Email / Nome / CNPJ
        senha: '',
        emailRecuperacao: '',
        codigoDigits: ['', '', '', '', '', ''], // Array para os 6 dígitos do código
        novaSenha: '',
        confirmarNovaSenha: '',
        codigoFinal: ''
    });

    // Contador de 60 segundos para reenviar código
    const [timer, setTimer] = useState(60);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (etapa === 'esqueci_codigo' && timer > 0) {
            interval = setInterval(() => setTimer(prev => prev - 1), 1000);
        }
        return () => clearInterval(interval);
    }, [etapa, timer]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Manipulação dos 6 quadros de código
    const handleDigitChange = (index: number, value: string) => {
        if (value.length > 1) value = value[0];
        const newDigits = [...formData.codigoDigits];
        newDigits[index] = value;
        setFormData({ ...formData, codigoDigits: newDigits });

        // Auto-foco no próximo campo de código
        if (value && index < 5) {
            const nextInput = document.getElementById(`digit-${index + 1}`);
            nextInput?.focus();
        }
    };

    const handleSubmitLogin = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Login Enviado:', { tipoLogin, identificador: formData.loginIdentificador, senha: formData.senha });
        // Exemplo: redirecionar para a home após o login bem-sucedido
        navigate('/');
    };

    return (
        <div className="login-page">
            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                user={currentUser}
            />

            {/* Header com foto de topografia */}
            <header
                className="login-topbar"
                style={{
                    backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.45)), url(${FundoHeader})`
                }}
            >
                <button
                    type="button"
                    className="btn-menu-header"
                    onClick={() => setIsSidebarOpen(true)}
                    aria-label="Abrir Menu"
                >
                    <span></span>
                    <span></span>
                    <span></span>
                </button>

                <div className="topbar-logo">
                    <img src={Logo} alt="Life Topografia Logo" />
                </div>
            </header>

            <main className="login-main-content">
                {/* Título dinâmico baseado na etapa */}
                <div className="login-title-container">
                    <h1 className="login-title">
                        {etapa === 'login' ? 'ENTRAR' : 'Esqueci a senha'}
                    </h1>
                    <div className="title-divider">
                        <span className="line"></span>
                        <span className="rhombus"></span>
                        <span className="line"></span>
                    </div>
                </div>

                <div className="login-card">
                    {/* --- VISÃO 1 & 2: TELA DE LOGIN (PESSOAS / EMPRESAS) --- */}
                    {etapa === 'login' && (
                        <>
                            {/* Abas Pessoas / Empresas */}
                            <div className="tabs-header">
                                <button
                                    type="button"
                                    className={`tab-btn ${tipoLogin === 'pessoa' ? 'active' : ''}`}
                                    onClick={() => setTipoLogin('pessoa')}
                                >
                                    <svg viewBox="0 0 24 24" className="tab-icon">
                                        <path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                    </svg>
                                    <span>Pessoas</span>
                                </button>

                                <span className="tab-separator">|</span>

                                <button
                                    type="button"
                                    className={`tab-btn ${tipoLogin === 'empresa' ? 'active' : ''}`}
                                    onClick={() => setTipoLogin('empresa')}
                                >
                                    <svg viewBox="0 0 24 24" className="tab-icon">
                                        <path fill="currentColor" d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z" />
                                    </svg>
                                    <span>Empresas</span>
                                </button>
                            </div>

                            <form onSubmit={handleSubmitLogin} className="login-form">
                                {/* Campo Identificador (Email/Usuário para Pessoa | Nome/CNPJ para Empresa) */}
                                <div className="form-group">
                                    <div className="input-icon-box">
                                        <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
                                    </div>
                                    <div className="input-field-wrapper">
                                        <label htmlFor="loginIdentificador">
                                            {tipoLogin === 'pessoa' ? 'Email ou usuário:' : 'Nome ou CNPJ:'}
                                        </label>
                                        <input
                                            type="text"
                                            id="loginIdentificador"
                                            name="loginIdentificador"
                                            value={formData.loginIdentificador}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Campo Senha */}
                                <div className="form-group">
                                    <div className="input-icon-box">
                                        <svg viewBox="0 0 24 24"><path fill="currentColor" d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" /></svg>
                                    </div>
                                    <div className="input-field-wrapper">
                                        <label htmlFor="senha">Senha</label>
                                        <input
                                            type="password"
                                            id="senha"
                                            name="senha"
                                            value={formData.senha}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Link "Esqueceu a senha?" */}
                                <div className="forgot-password-link-container">
                                    <button
                                        type="button"
                                        className="btn-forgot-password"
                                        onClick={() => setEtapa('esqueci_email')}
                                    >
                                        Esqueceu a senha?
                                    </button>
                                </div>

                                {/* Botão Entrar */}
                                <button type="submit" className="btn-action-login">
                                    <svg viewBox="0 0 24 24" className="btn-key-icon">
                                        <path fill="currentColor" d="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v2h2v-2h2v-2H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
                                    </svg>
                                    <span>ENTRAR</span>
                                </button>

                                <div className="ou-divider">
                                    <span className="line"></span>
                                    <span className="text">ou</span>
                                    <span className="line"></span>
                                </div>

                                {/* Redirecionamento para cadastro */}
                                <Link to="/cadastrar" className="btn-register-redirect">
                                    VOCÊ NÃO POSSUI CONTA?
                                </Link>
                            </form>
                        </>
                    )}

                    {/* --- VISÃO 3: ESQUECI A SENHA - ETAPA 1 (INSIRA O EMAIL) --- */}
                    {etapa === 'esqueci_email' && (
                        <form
                            onSubmit={(e) => { e.preventDefault(); setEtapa('esqueci_codigo'); setTimer(60); }}
                            className="login-form animation-fade-in"
                        >
                            <div className="form-group">
                                <div className="input-icon-box">
                                    <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
                                </div>
                                <div className="input-field-wrapper">
                                    <label htmlFor="emailRecuperacao">Insira o Email</label>
                                    <input
                                        type="email"
                                        id="emailRecuperacao"
                                        name="emailRecuperacao"
                                        value={formData.emailRecuperacao}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>

                            <button type="submit" className="btn-action-login">
                                <svg viewBox="0 0 24 24" className="btn-key-icon">
                                    <path fill="currentColor" d="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v2h2v-2h2v-2H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
                                </svg>
                                <span>Enviar</span>
                            </button>

                            <button
                                type="button"
                                className="btn-back-login"
                                onClick={() => setEtapa('login')}
                            >
                                Voltar ao Login
                            </button>
                        </form>
                    )}

                    {/* --- VISÃO 4: ESQUECI A SENHA - ETAPA 2 (INSIRA O CÓDIGO DE 6 DÍGITOS) --- */}
                    {etapa === 'esqueci_codigo' && (
                        <form
                            onSubmit={(e) => { e.preventDefault(); setEtapa('esqueci_nova_senha'); }}
                            className="login-form animation-fade-in text-center"
                        >
                            <h2 className="codigo-subtitle-title">INSIRA O CODIGO</h2>
                            <p className="codigo-subtitle-desc">
                                Um codigo foi enviado para o email <span className="email-highlight">{formData.emailRecuperacao || 'teste@teste'}</span>.
                            </p>

                            {/* 6 Caixas de Dígitos */}
                            <div className="digits-container">
                                {formData.codigoDigits.map((digit, idx) => (
                                    <input
                                        key={idx}
                                        id={`digit-${idx}`}
                                        type="text"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleDigitChange(idx, e.target.value)}
                                        className="digit-box"
                                        required
                                    />
                                ))}
                            </div>

                            <button type="submit" className="btn-action-login">
                                <span>Enviar</span>
                            </button>

                            <p className="timer-text">
                                Não recebeu o codigo? {timer > 0 ? `${timer} segundos.` : <button type="button" onClick={() => setTimer(60)} className="btn-resend">Reenviar</button>}
                            </p>
                        </form>
                    )}

                    {/* --- VISÃO 5: ESQUECI A SENHA - ETAPA 3 (NOVA SENHA + CONFIRMAR + CÓDIGO) --- */}
                    {etapa === 'esqueci_nova_senha' && (
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                alert('Senha alterada com sucesso!');
                                setEtapa('login');
                            }}
                            className="login-form animation-fade-in"
                        >
                            {/* Nova Senha */}
                            <div className="form-group">
                                <div className="input-icon-box">
                                    <svg viewBox="0 0 24 24"><path fill="currentColor" d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" /></svg>
                                </div>
                                <div className="input-field-wrapper">
                                    <label htmlFor="novaSenha">Nova Senha:</label>
                                    <input
                                        type="password"
                                        id="novaSenha"
                                        name="novaSenha"
                                        value={formData.novaSenha}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Confirmar Senha */}
                            <div className="form-group">
                                <div className="input-icon-box relative-badge">
                                    <svg viewBox="0 0 24 24"><path fill="currentColor" d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" /></svg>
                                    <span className="check-badge">✓</span>
                                </div>
                                <div className="input-field-wrapper">
                                    <label htmlFor="confirmarNovaSenha">Confirmar Senha:</label>
                                    <input
                                        type="password"
                                        id="confirmarNovaSenha"
                                        name="confirmarNovaSenha"
                                        value={formData.confirmarNovaSenha}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Código */}
                            <div className="form-group">
                                <div className="input-icon-box">
                                    <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v2h2v-2h2v-2H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" /></svg>
                                </div>
                                <div className="input-field-wrapper">
                                    <label htmlFor="codigoFinal">Código</label>
                                    <input
                                        type="text"
                                        id="codigoFinal"
                                        name="codigoFinal"
                                        value={formData.codigoFinal}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>

                            <button type="submit" className="btn-action-login">
                                <svg viewBox="0 0 24 24" className="btn-key-icon">
                                    <path fill="currentColor" d="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v2h2v-2h2v-2H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
                                </svg>
                                <span>Enviar</span>
                            </button>
                        </form>
                    )}
                </div>
            </main>
        </div>
    );
};

export default Login;