import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Register } from '../../lib/supabase/auth.ts';

import Sidebar from '../../components/Sidebar/sidebar.tsx';
import type { UserProfile } from '../../components/Sidebar/sidebar';

import Logo from '../../assets/image/logo-front.webp';
import FundoHeader from '../../assets/image/background/firstcard.webp';

import './cadastrar.css';

type TipoCadastro = 'pessoa' | 'empresa';

interface FormData {
    nome: string;
    email: string;
    confirmarEmail: string;
    senha: string;
    confirmarSenha: string;
    cnpj: string;
}

export const Cadastrar = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [formError, setFormError] = useState('');

    // Mantido como ponto de integração para a autenticação futura.
    const currentUser: UserProfile | null = null;

    const [tipoCadastro, setTipoCadastro] =
        useState<TipoCadastro>('pessoa');

    const [formData, setFormData] = useState<FormData>({
        nome: '',
        email: '',
        confirmarEmail: '',
        senha: '',
        confirmarSenha: '',
        cnpj: '',
    });

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;

        setFormData((previousData) => ({
            ...previousData,
            [name]: value,
        }));

        if (formError) {
            setFormError('');
        }
    };

    const handleTipoCadastroChange = (tipo: TipoCadastro) => {
        setTipoCadastro(tipo);
        setFormError('');

        // O CNPJ não pertence ao cadastro de pessoa física.
        if (tipo === 'pessoa') {
            setFormData((previousData) => ({
                ...previousData,
                cnpj: '',
            }));
        }
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setFormError('');

        if (formData.email !== formData.confirmarEmail) {
            setFormError('Os emails informados não são iguais.');
            return;
        }

        if (formData.senha !== formData.confirmarSenha) {
            setFormError('As senhas informadas não são iguais.');
            return;
        }

        if (tipoCadastro === 'empresa' && !formData.cnpj.trim()) {
            setFormError('Informe o CNPJ da empresa.');
            return;
        }

        Register(formData.email, formData.senha, formData.nome)
            .then((data) => {
                console.log('Usuário cadastrado com sucesso:', data);
                // Redirecionar ou exibir mensagem de sucesso, se necessário.
            })
            .catch((error) => {
                console.error('Erro ao cadastrar usuário:', error);
                setFormError(
                    'Ocorreu um erro ao cadastrar. Tente novamente mais tarde.'
                );
            });
        /*
         * Ponto de integração com o backend.
         *
         * O formulário já está validado no frontend, mas a criação
         * da conta, armazenamento dos dados e validação definitiva
         * deverão ser realizados pelo backend.
         *
         * Não registrar senha ou outros dados sensíveis no console.
         */
    };

    return (
        <div className="cadastrar-page">
            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                user={currentUser}
            />

            <header
                className="cadastrar-topbar"
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

            <main className="cadastrar-main-content">
                <div className="cadastrar-title-container">
                    <h1 className="cadastrar-title">
                        CADASTRE-SE
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

                <div className="cadastrar-card">
                    <div className="tabs-header">
                        <button
                            type="button"
                            className={`tab-btn ${
                                tipoCadastro === 'pessoa' ? 'active' : ''
                            }`}
                            onClick={() =>
                                handleTipoCadastroChange('pessoa')
                            }
                            aria-pressed={tipoCadastro === 'pessoa'}
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
                                tipoCadastro === 'empresa' ? 'active' : ''
                            }`}
                            onClick={() =>
                                handleTipoCadastroChange('empresa')
                            }
                            aria-pressed={tipoCadastro === 'empresa'}
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
                        onSubmit={handleSubmit}
                        className="cadastrar-form"
                        noValidate={false}
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
                                <label htmlFor="nome">
                                    Nome:
                                </label>

                                <input
                                    type="text"
                                    id="nome"
                                    name="nome"
                                    value={formData.nome}
                                    onChange={handleChange}
                                    autoComplete="name"
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
                                        d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"
                                    />
                                </svg>
                            </div>

                            <div className="input-field-wrapper">
                                <label htmlFor="email">
                                    Email:
                                </label>

                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    autoComplete="email"
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
                                        d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"
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
                                <label htmlFor="confirmarEmail">
                                    Confirmar Email:
                                </label>

                                <input
                                    type="email"
                                    id="confirmarEmail"
                                    name="confirmarEmail"
                                    value={formData.confirmarEmail}
                                    onChange={handleChange}
                                    autoComplete="off"
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
                                <label htmlFor="confirmarSenha">
                                    Confirmar Senha:
                                </label>

                                <input
                                    type="password"
                                    id="confirmarSenha"
                                    name="confirmarSenha"
                                    value={formData.confirmarSenha}
                                    onChange={handleChange}
                                    autoComplete="new-password"
                                    required
                                />
                            </div>
                        </div>

                        {tipoCadastro === 'empresa' && (
                            <div className="form-group animation-fade-in">
                                <div className="input-icon-box">
                                    <svg
                                        viewBox="0 0 24 24"
                                        aria-hidden="true"
                                    >
                                        <path
                                            fill="currentColor"
                                            d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"
                                        />
                                    </svg>
                                </div>

                                <div className="input-field-wrapper">
                                    <label htmlFor="cnpj">
                                        CNPJ:
                                    </label>

                                    <input
                                        type="text"
                                        id="cnpj"
                                        name="cnpj"
                                        value={formData.cnpj}
                                        onChange={handleChange}
                                        placeholder="00.000.000/0001-00"
                                        autoComplete="organization"
                                        inputMode="numeric"
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        {formError && (
                            <p
                                className="form-feedback error"
                                role="alert"
                            >
                                {formError}
                            </p>
                        )}

                        <button
                            type="submit"
                            className="btn-action-cadastrar"
                        >
                            <svg
                                viewBox="0 0 24 24"
                                className="btn-add-user-icon"
                                aria-hidden="true"
                            >
                                <path
                                    fill="currentColor"
                                    d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9 0c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V20h14v-2.5c0-2.33-4.67-3.5-7-3.5zm9 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V20h6v-2.5c0-2.33-4.67-3.5-7-3.5z"
                                />
                            </svg>

                            <span>CADASTRAR</span>
                        </button>

                        <div className="ou-divider">
                            <span className="line"></span>
                            <span className="text">ou</span>
                            <span className="line"></span>
                        </div>

                        <Link
                            to="/login"
                            className="btn-login-redirect"
                        >
                            VOCÊ JÁ POSSUI CONTA?
                        </Link>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default Cadastrar;