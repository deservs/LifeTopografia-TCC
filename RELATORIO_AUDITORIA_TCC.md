# Relatório de Auditoria Técnica e Pedagógica — TCC `LifeTopografia`

**Avaliação:** Professor Orientador & Desenvolvedor Full Stack Sênior  
**Nível de Referência:** Formandos do Curso Técnico em Desenvolvimento de Sistemas  
**Data da Auditoria:** 25/11/2026  
**Escopo Analisado:** Front-end (`src/`), Back-end (`server/`), Banco de Dados & Migrations (`supabase/`), Pipeline PDF/OCR/DXF (`src/utils/pdfConversor/`), Configurações e CI/CD (`.github/`, `vite.config.ts`, `vercel.json`, `package.json`).

---

## Resumo Executivo

O projeto **LifeTopografia** se destaca muito acima da média esperada para um Trabalho de Conclusão de Curso (TCC) técnico. Em vez de um CRUD genérico, o grupo enfrentou um problema real de **Engenharia e Topografia**: autenticação multi-perfil (Pessoa Física, Empresa com funcionários e Administrador), upload de mídia em Object Storage (Cloudflare R2), banco relacional com Row Level Security (Supabase/PostgreSQL), proteção contra bots (Cloudflare Turnstile) e um pipeline completo de **leitura nativa de PDF + fallback OCR (PaddleOCR via ONNX/WASM em Web Worker) + validação geométrica + geração de arquivos CAD `.dxf`** no navegador.

Ao mesmo tempo, a auditoria revelou **bugs críticos de execução**, **brechas importantes de segurança** e **inconsistências de UI/UX e banco de dados** que precisam ser corrigidos antes da apresentação para a banca examinadora.

### Quadro Geral de Avaliação

| Eixo Avaliado | Maturidade Atual | Principais Destaques | Pontos Críticos a Ajustar |
| :--- | :--- | :--- | :--- |
| **1. Arquitetura & Organização** | Bom / Intermediário-Avançado | Separação SPA (`src/`) × API (`server/`) × SQL (`supabase/`); domínio PDF/DXF desacoplado; CI com `oxlint` | Monolitos em `server/src/app.ts` (785 linhas) e `enviar_arquivos.tsx` (2.032 linhas); `logger: false` no Fastify; arquivos vazios/typos |
| **2. UI & Front-end** | Bom | Tipografia local `Poppins`; Flexbox/Grid; `<dialog>` nativo; responsividade no Chat/Perfil/Admin | `<h1>` oculto por `aria-hidden` em `Services`; tag `<head>` dentro de JSX em `NoticeModal`; colisões de CSS global; stub `/pagamento` |
| **3. UX, Usabilidade & A11y** | Regular-Bom | `ChangePasswordForm` e `PasswordInput` excelentes; `Sidebar` com focus trap; skeletons e feedbacks claros | Falta de `await` gera DXF vazio em terrenos convencionais; duplo clique em `Login`/`Cadastrar`; falhas de contraste WCAG AA |
| **4. Banco de Dados & Persistência** | Intermediário (com falhas SQL) | 3FN adequada; RLS ativo nas 7 tabelas; trigger bloqueando alteração de `tipo_perfil`/`status`/`cnpj`; `verify_user_password` protegido | Ordem das migrations quebrada; trigger `handle_company_soft_delete` com 3 erros fatais; `enum` divergente do TS; 0 índices em FKs |
| **5. Segurança da Informação** | Intermediário (com riscos pontuais críticos) | JWT validado via `getUser()`; `SUPABASE_SECRET_KEY` isolada; Zod nas envs; `.or()` sanitizado; sem `dangerouslySetInnerHTML` | `console.log` com senha em texto puro; `GRANT TRUNCATE` para `anon`/`authenticated`; `/api/send-email` aberto + HTML injection; validação de CNPJ sem `await` |

---

## 1. Visão Geral e Arquitetura do Projeto

### 1.1 Stack Identificada

- **Front-end (SPA):** React `^19.2.7`, TypeScript `6.0.3`, Vite `^8.1.1` (com `@vitejs/plugin-react`, `babel-plugin-react-compiler` e `codeSplitting` manual em `vite.config.ts:16-50`), React Router DOM `^7.18.4`, Swiper `^14.0.7`, `@marsidev/react-turnstile`.
- **Back-end (API REST):** Node.js (ESM + `tsx`), Fastify `^5.10.0`, `fastify-type-provider-zod`, Zod `^4.5.2`, `@fastify/cors`, `@fastify/multipart`, Resend `^6.38.0` (envio de e-mail), `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` (Cloudflare R2).
- **Banco de Dados & Autenticação:** Supabase (`@supabase/supabase-js ^2.117.3`, PostgreSQL, GoTrue Auth, RLS e triggers PL/pgSQL em `supabase/migrations/`).
- **Processamento Topográfico (Client-side):** `pdfjs-dist ^6.3.289`, `@paddleocr/paddleocr-js ^0.4.2`, `onnxruntime-web ^1.27.0` (Web Worker + WASM/ONNX) e `@tarikjabiri/dxf ^2.10.1`.
- **Qualidade, Deploy e CI:** Oxlint (`oxlint ^1.71.0` com workflow em `.github/workflows/lint.yml`), Biome (`server/biome.json`), Prettier e Vercel (`vercel.json` com proxy `/api/*` e header `Content-Security-Policy`).

### 1.2 Separação de Responsabilidades

**Pontos positivos:**
- O projeto separa bem a camada de apresentação (`src/container/` e `src/components/`), o acesso a dados/API no navegador (`src/lib/apiClient.ts`, `src/lib/supabase/auth.ts`), a gestão de sessão global (`src/context/AuthContext.tsx` com proteção contra condições de corrida via `authEpochRef`) e o núcleo puro de regras topográficas (`src/utils/pdfConversor/`).
- No back-end, há separação inicial por módulos de domínio (`server/src/modules/auth/`, `admin/`, `cnpj/`, `email/`) e utilitários compartilhados (`server/src/Shared/`).

**Pontos de atenção:**
- **`server/src/app.ts` monolítico (785 linhas):** Todas as 11 rotas da API estão declaradas inline em `app.ts`, misturando parsing de payload, regras de autorização, chamadas de módulo e formatação de erros sem `app.register(...)` por domínio e sem um `app.setErrorHandler` centralizado.
- **`ZodTypeProvider` e `@fastify/multipart` subutilizados (`server/src/app.ts:33-48`):** O `validatorCompiler` do Zod e o plugin multipart estão registrados, mas nenhuma rota usa `schema: { body: ... }` nem lê multipart (o upload de avatar vai direto do browser ao R2 por URL pré-assinada).
- **Logger desativado (`server/src/app.ts:33`):** O servidor instancia `fastify()` sem `{ logger: true }`, tornando todas as chamadas `request.log.error(...)` e `request.log.warn(...)` (`app.ts:226, 283, 331, 369...` e `getUser.ts:50`) nulas em runtime.
- **Componente monolítico (`src/container/Enviar-arquivos/enviar_arquivos.tsx`):** Concentra **2.032 linhas** com estado do formulário, preview de PDF, logs, editor de texto e estilos 100% inline no mesmo arquivo.
- **`README.md` desatualizado:** Afirma na linha 75 que `vite.config.ts` não possui proxy para `/api` e na linha 15 que `/perfil` não grava dados, embora `vite.config.ts:9` já configure o proxy para `http://localhost:3001` e `profile.tsx` já consuma o back-end real.

### 1.3 Mapa de Maturidade dos Módulos (Real vs. Protótipo Visual)

| Módulo / Rota | Arquivo Principal | Status Atual | Observação |
| :--- | :--- | :--- | :--- |
| Home, Sobre, Serviços, FAQ | `src/container/Home`, `About`, `Services`, `FAQ` | **Funcional (Estático)** | Conteúdo institucional funcional no navegador |
| Cadastro, Login e Recuperação | `src/container/Auth/cadastrar.tsx`, `login.tsx`, `definirSenha.tsx` | **Integrado** | Integrado a Fastify + Supabase Auth + Turnstile + BrasilAPI |
| Perfil e Gestão de Membros (PJ) | `src/container/Profile/profile.tsx` | **Integrado** | Edição de perfil, avatar no R2, troca de senha, membros e exclusão |
| Painel Admin — Ajudantes/Permissões | `src/container/Profile/AdminHelpersPanel.tsx` | **Protótipo Visual** | Estado local (`useState`) mockado para validação de UI/UX |
| Auditoria de Usuários (`/admin/usuarios`) | `src/container/AdminCheckUser/adminCheckUser.tsx` | **Híbrido** | Listagem/membros vêm de `GET /api/admin/users`; Inativar/Reativar está em estado local mockado |
| Chat, Orçamentos e Conversão Demo (`/chat`) | `src/container/Chat/chat.tsx` | **Protótipo Visual** | Interface completa e responsiva, com dados mockados em `useState` |
| Pipeline PDF → OCR → Validação → DXF (`/teste`) | `src/container/Enviar-arquivos/enviar_arquivos.tsx`, `src/utils/pdfConversor/*` | **Funcional (Client-side)** | Executa PDF.js + PaddleOCR + geração de DXF localmente (sem persistência em DB) |
| Pagamento (`/pagamento`) | `src/components/Pop-Up/Pagamento/pagamento.tsx` | **Stub / Incompleto** | Tela em rascunho com placeholders `"sdadsada"` e `server/src/modules/pagamento/payment.ts` sem rota |

### 1.4 Organização de Pastas, Nomenclatura e Código Morto

- **Inconsistência de nomenclatura e casing:**
  - Diretórios misturam hífen (`Pop-Up/`, `Enviar-arquivos/`) com PascalCase (`ChangePasswordForm/`, `AdminCheckUser/`), e no servidor `server/src/Shared/` está em PascalCase ao lado de `config/` e `modules/` em minúsculas (risco de erro em sistemas Linux *case-sensitive*).
  - Arquivos misturam PascalCase (`AppLayout.tsx`), camelCase (`noticeModal.tsx`), snake_case (`enviar_arquivos.tsx`) e inglês/português (`Services` vs `cadastrar.tsx`).
  - **Typos em nomes exportados:** `server/src/modules/auth/userSingin.ts` (`Singin`), `server/src/modules/auth/userSingup.ts` (`Singup`) e `export type SingInResponse` em `src/lib/supabase/auth.ts:13`.
- **Arquivos vazios, stubs e código morto identificados:**
  - `server/src/modules/autocad/manter.ts` (0 bytes) e `server/src/modules/chat/manter.ts` (0 bytes).
  - `server/src/modules/pagamento/payment.ts` (`L1-9`): arquivo não importado contendo `accessToken: 'access_token'` e chamada solta `paymentMethods.get()`.
  - `server/src/@types/pdf.type.ts` (`L1-16`): interface nunca importada (com `Circulo?: true | false`).
  - `server/src/Shared/utils/cnpj.ts` (`L5-31`): função `isValidCnpj` nunca importada (o `app.ts` importa `isValidCNPJ` de `verificarCnpj.ts`).
  - `src/App.css` (`L1-6`): arquivo apenas com comentário, importado sem uso em `src/App.tsx:4`.
  - `public/models/ocr/det.onnx` (0 bytes): sobra de teste sem uso.
  - `supabase/seed.sql` (0 bytes) e `supabase/config.toml` (apenas comentário `# Configuração do Supabase`).
  - `src/utils/pdfConversor/pdfConvert.ts`: funções `extrairTextoNativoPagina` (`L160`), `detectarPaginasComDescricao` (`L312`) e `extrairTextoNativoCompleto` (`L367`) nunca são importadas.
  - Camada `CONFRONTACOES` criada em `drawDXF.ts:52` e opção `incluirConfrontacoes` passada em `enviar_arquivos.tsx:97`, mas sem nenhuma rotina desenhando confrontações.

---

## 2. UI (Interface do Usuário) e Front-end

### 2.1 Semântica HTML5

**O que está bem feito:**
- `index.html:2` define corretamente `lang="pt-br"` e `viewport` responsivo.
- As páginas principais utilizam `<main>`, `<header>`, `<nav>`, `<aside>`, `<footer>` e `<address>` (`footer.tsx:6-28`), além de `<dialog>` nativo em `Profile` e `AdminCheckUser`.
- `src/container/About/about.tsx:107-196` apresenta ótima estrutura semântica com `<main>`, `<h1>`, `<section aria-labelledby>`, `<h2>` e `<h3>`.

**Problemas encontrados:**
- **`<h1>` oculto para leitores de tela (`src/container/Services/services.tsx:296-300`):** O `<div className="services-title-divider" aria-hidden="true">` envolve o `<h1>Serviços</h1>` na linha 298, escondendo o título principal da página para tecnologias assistivas.
- **Tag `<head>` dentro do `<body>` (`src/components/Pop-Up/NoticeModal/noticeModal.tsx:42-48`):** Renderiza `<head><title>...</title><meta .../></head>` dentro do JSX. No React 19, `<title>` e `<meta>` soltos já são elevados ao `<head>` real (como feito em `Home` e `Login`), enquanto renderizar `<head>` gera HTML inválido dentro da `#root`.
- **`<div>` dentro de `<button>` (`src/container/Services/services.tsx:221-280`):** `<button className="service-card">` contém múltiplos `<div>`s internos, violando a especificação HTML5 de conteúdo fraseado para botões.
- **`<label>` envolvendo dois inputs (`src/container/Enviar-arquivos/enviar_arquivos.tsx:768-853`):** Um único `<label>` envolve o `<input type="radio">` (`L789`) e um `<input type="number">` (`L831`), gerando ambiguidade semântica.
- **Rotas sem landmark `<main>`:** `AppLayout.tsx:62-64` usa `<div className="app-layout__body">`, deixando `/pagamento` (`pagamento.tsx:27`), `RouteGuards` (telas de loading/403, `RouteGuards.tsx:6-8, 55-74`), `/teste` (`enviar_arquivos.tsx:300`) e `NoticeModal` (`L50`) sem `<main>`.
- **Saltos na hierarquia de títulos:** `Sidebar` (`sidebar.tsx:161, 224`) usa `<h2>` antes do `<h1>` e pula direto para `<h4>`; `enviar_arquivos.tsx:317, 365` salta de `<h1>` para `<h3>`.
- **Título padrão de repositório:** `index.html:11` mantém `<title>lifetopografia-tcc</title>`, visível em `/sobre` (`about.tsx` não define `<title>`).

### 2.2 Estilização e Responsividade

**O que está bem feito:**
- Uso de **Flexbox e CSS Grid** com `100dvh` e fonte `Poppins` auto-hospedada em `src/index.css:5-150`.
- Disciplina exemplar evitando `!important` (usado apenas no bloco de `prefers-reduced-motion` em `src/index.css:226-228` e na alternância mobile de `.chat-card`).
- Excelente cuidado visual e responsivo em telas recentes como `Chat` (Master-Detail mobile e header em duas linhas), `AdminCheckUser` (tabela que vira cards em `<= 899px`) e `Profile`.

**Problemas encontrados:**
- **Colisão de classes CSS globais entre rotas:** Como os CSSs são importados globalmente sem CSS Modules nem prefixos únicos:
  - `src/container/Auth/cadastrar.css:189` define `.form-group { align-items: flex-start; }` enquanto `login.css:186` define `.form-group { align-items: flex-end; }`. Navegar entre `/login` e `/cadastrar` faz uma tela alterar o layout da outra.
  - `.title-divider` colide entre `faq.css:74`, `login.css:65` e `cadastrar.css:64`.
  - `src/components/Pop-Up/Pagamento/pagamento.css:1-5` define `.card` globalmente com `color: #a100a1; background-color: aliceblue;`, fora da paleta do site.
- **Ausência de Design Tokens (`:root`) globais em `src/index.css`:** Cada tela reinventa sua cor primária (`#0b50bd`, `#1558b6`, `#007bff`, `#2563eb`) e seu verde (`#00c724`, `#00ff00`, `#22ad50`, `#10b981`, `#059669`).
- **Bug de cascata em media queries (`src/components/Topbar/topbar.css:106-134`):** `@media (max-width: 380px)` (linha 126) aparece depois de `@media (max-width: 639px)` (linha 106), fazendo o logo crescer de `132px` para `145px` em telas muito estreitas.
- **Quebras de layout no mobile:**
  - `src/container/Enviar-arquivos/enviar_arquivos.tsx:471`: usa `grid-template-columns: repeat(auto-fit, minmax(420px, 1fr))` em estilo inline, causando estouro horizontal abaixo de `460px`.
  - `src/container/FAQ/faq.css:113, 420`: `min-width: 280px` estoura containers com padding em telas de `320px`–`360px`.
  - `src/container/Services/services.css:109, 129, 514`: alturas fixas (`124px`, `145px`, `165px`) com `overflow: hidden` podem cortar textos com zoom de acessibilidade.
- **Animação quebrada e CSS redundante:**
  - `enviar_arquivos.tsx:936` aplica `animation: "spin 1s linear infinite"`, porém `@keyframes spin` não existe nesse escopo (depende de `chat.css:56` ter sido carregado antes).
  - `about.css`, `services.css`, `faq.css`, `login.css` e `cadastrar.css` repetem `min-height: 100dvh` dentro do `AppLayout` que já tem `100dvh`, gerando scroll vertical extra mesmo em páginas curtas.
  - `ChangePasswordForm.tsx` depende de classes definidas em `profile.css` (`.profile-card`, `.profile-field`), quebrando encapsulamento caso usado em outro local.

### 2.3 Componentização e Código Limpo

- **Rota `/pagamento` inacabada (`src/components/Pop-Up/Pagamento/pagamento.tsx:17-33`):** Possui placeholders de teste (`placeholder="sdadsada"` nas linhas 28–29), sem botão de envio, sem CVV/parcelas e chama `initMercadoPago(apiKey)` diretamente durante o render.
- **Botão "Cancelar" inoperante em `definirSenha.tsx:231-237`:** Não possui atributo `onClick`. Além disso, as linhas `24-26` redirecionam usuários com `user.status === "PENDENTE"` para `"/"`, o que impede justamente quem acabou de aceitar um convite de acessar `/definir-senha` se já estiver autenticado pelo link de convite.
- **Bug de URL em `NoticeModal` (`noticeModal.tsx:66`):** Usa `to={\`/${NoticeModalProps.buttonLink}\`}` — se `buttonLink` for omitido, o link aponta para `"/undefined"`. Na linha `21`, busca `document.getElementById("initial-card")` hardcoded e fecha sempre para `"/"` (`L28`), ignorando quando é usado sobre `/cadastrar`.
- **Duplicação das regras de senha em 4 componentes:** `ChangePasswordForm.tsx:34-60`, `cadastrar.tsx:54-80`, `definirSenha.tsx:28-54` e `login.tsx:348-374` replicam exatamente o mesmo array de validação de senha, além de carregarem `PasswordInput` (um componente leve de 60 linhas) via `React.lazy()` com `<Suspense fallback={null}>`, causando salto visual (*layout shift*) na montagem.

---

## 3. UX (Experiência do Usuário) e Usabilidade

### 3.1 Fluxo de Navegação

**Acertos:**
- Guardas de rota bem estruturadas (`GuestRoute`, `ProtectedRoute`, `AdminRoute` em `RouteGuards.tsx`) protegem áreas logadas e administrativas com tela de 403 amigável.
- No `Chat` mobile (`<= 768px`), a transição Master-Detail (`Lista de Clientes` → `Conversa` com botão `← Clientes`) resolve com elegância a limitação de espaço.

**Pontos de atenção:**
- Visitantes deslogados que clicam em **"SOLICITE UM ORÇAMENTO"** (`home.tsx:104`) ou **"CONTATO"** (`sidebar.tsx:15`) são enviados para `/chat`, que exige login e os redireciona silenciosamente para `/login` — vale avisar ou direcionar ao `/servicos`/`/faq` quando deslogado.
- A `Sidebar` (`sidebar.tsx:10-16`) não exibe atalhos para `/admin/usuarios` nem `/teste` quando o usuário logado é `ADMIN` (o admin só encontra `/admin/usuarios` entrando no `/perfil`).
- A rota principal da ferramenta de conversão se chama `/teste` (`App.tsx:84`), nomenclatura interna de desenvolvimento.

### 3.2 Feedbacks Visuais

**Acertos:**
- `AdminCheckUser` implementa *skeleton loading* estruturado, estados vazios com botão *"Limpar filtros"* e alertas claros para 401/403/erro de rede.
- `ChangePasswordForm` (`ChangePasswordForm.tsx`) é o padrão ouro do projeto: checklist em tempo real, `"SALVANDO…"` durante envio e mensagens traduzidas amigáveis.

**Pontos de atenção:**
- **Falta de proteção contra duplo envio:** `cadastrar.tsx:124-176` (que sequer dá `await` em `SignUp`) e `login.tsx:229-346` (nos passos de Login, E-mail de recuperação e Código OTP) não possuem estado `isSubmitting` para desabilitar o botão e mostrar feedback de carregamento.
- **Bug de UX silencioso no DXF Convencional (`src/utils/pdfConversor/drawDXF.ts:669`):** `gerarDXF()` chama a função assíncrona `gerarDXFConvencional(...)` **sem `await`**. Ao baixar um lote convencional individualmente na interface, `dxf.stringify()` roda antes do desenho, entregando um arquivo `.dxf` vazio ao usuário sem erro aparente!
- **Modal bloqueado em `login.tsx:917-948`:** O modal do Turnstile (`inviCaptcha`) não tem botão fechar nem atalho `Escape` — se o widget falhar ou demorar, o usuário fica preso na tela.
- **Uso de `alert()` nativo em `enviar_arquivos.tsx:103, 148, 175`:** Interrompe o fluxo com pop-ups do navegador em vez de mensagens inline; além disso, `useOcrPipeline.ts:242` descarta `error.message` real ao exibir erro genérico.
- **Falta de `:hover`:** `.route-guard-btn` (`AppLayout.css:64-84`) e `.topbar__menu-button` (`topbar.css:34-50`) não têm feedback visual ao passar o mouse.

### 3.3 Acessibilidade Básica (`a11y`)

**Acertos:**
- `Sidebar.tsx:40-99` implementa *focus trap* com `Tab`, fechamento por `Escape` e devolução do foco ao botão gatilho.
- `PasswordInput.tsx:24-27` oculta a senha automaticamente no `onBlur` e utiliza `aria-controls` e `aria-pressed` corretamente.
- `Home.tsx:33-35, 125-132` desativa o autoplay do carrossel quando `prefers-reduced-motion: reduce` está ativo e marca imagens decorativas com `alt=""`.

**Problemas prioritários:**
- **Contraste insuficiente (WCAG AA exige >= 4.5:1 para texto normal):**
  - `faq.css:444-445`: texto branco `#ffffff` sobre botão verde `#00c724` (`.btn-faq-chat`) = **2.22:1** (reprovado).
  - `about.css:100`: subtítulo `#22ad50` sobre card `#e5e5e5` = **2.31:1** (reprovado).
  - `cadastrar.css:349-355`, `login.css:333-339`, `definirSenha.css:208-214`: cores `#d32f2f` (3.60:1) e `#16803c` (3.76:1) em texto pequeno (`0.78rem`) sobre fundo `#dcdcdc` ficam abaixo de 4.5:1.
  - `faq.css:146-148`: placeholder `#94a3b8` sobre `#ffffff` = **2.56:1**.
- **Leitores de tela:**
  - `Services` oculta `<h1>` com `aria-hidden="true"` (`services.tsx:296-300`), e `aria-label` no `<button className="service-card">` (`L221`) impede o leitor de tela de ler as descrições internas do card.
  - `FAQ` aplica `aria-live="polite"` na lista inteira de perguntas (`faq.tsx:177`) em vez de apenas no contador `.faq-card-count` (`L171`).
  - `enviar_arquivos.tsx` possui inputs numéricos e `<textarea>` sem `<label htmlFor>`/`aria-label` associados (`L604, L629, L831, L1974`).
  - Inputs em `login.css`, `cadastrar.css`, `definirSenha.css` e `faq.css` usam `outline: none` sem fallback, prejudicando usuários em modo de Alto Contraste do Windows.

---

## 4. Banco de Dados e Persistência

### 4.1 Modelagem (`supabase/migrations/`)

O banco PostgreSQL no Supabase possui **5 ENUMs** (`status_perfil_enum`, `status_projeto_enum`, `tipo_arquivo_enum`, `tipo_mensagem_enum`, `tipo_perfil_enum`) e **7 tabelas** em `public`:

1. **`perfis`** (`id` PK/FK → `auth.users(id)`, `tipo_perfil`, `nome_ou_razao`, `email` UNIQUE, `cnpj` UNIQUE, `foto_url`, `status`, `created_at`)
2. **`membros_empresa`** (`id` PK, `empresa_id` FK → `perfis`, `funcionario_id` FK → `perfis`, `created_at`, constraint UNIQUE `(empresa_id, funcionario_id)` na migration `20261125170500`)
3. **`conversas`** (`id` PK, `remetente_id` FK → `perfis`, `destinatario_id` FK → `perfis`, `status_projeto`, `created_at`)
4. **`mensagens`** (`id` PK, `conversa_id` FK → `conversas`, `remetente_id` FK → `perfis`, `tipo_mensagem`, `conteudo`, `lida`, `created_at`)
5. **`arquivos_chat`** (`id` PK, `conversa_id` FK → `conversas ON DELETE CASCADE`, `remetente_id` FK → `perfis`, `tipo_arquivo`, `nome_arquivo`, `url_arquivo`, `created_at`)
6. **`avaliacoes`** (`id` PK, `conversa_id` FK → `conversas ON DELETE CASCADE`, `avaliador_id` FK → `perfis`, `nota` `CHECK (1..5)`, `comentario`, `created_at`)
7. **`servicos`** (`id` PK, `categoria`, `titulo`, `descricao_curta`, `descricao_longa`, `imagem_url`, `created_at`)

**Pontos positivos da modelagem:**
- Atinge um bom nível de **3ª Forma Normal (3FN)**: atributos atômicos, relacionamento N:N empresa-funcionário isolado em `membros_empresa`, uso de `uuid` e `timestamptz` em UTC, uso de ENUMs e `CHECK (nota >= 1 AND nota <= 5)`.
- Triggers inteligentes para fluxo de cadastro (`handle_new_user`), anonimização LGPD (`trg_anonimizar_perfil`) e blindagem de colunas sensíveis (`trg_protect_perfis_sensitive_columns`).

**Problemas estruturais encontrados:**
1. **[CRÍTICO] Cronologia das migrations quebrada:** Os timestamps das 3 migrations incrementais (`20261125103000`, `20261125165500`, `20261125170500`) são **anteriores** ao dump do esquema base (`20261125202417_remote_schema.sql`). Em um `supabase db reset` do zero, o banco falha antes mesmo de criar as tabelas.
2. **[CRÍTICO] 3 bugs fatais no trigger `handle_company_soft_delete` (`20261125202417_remote_schema.sql:167-191`):** Por causa de `SET local check_function_bodies = off` na linha 1, o Postgres deixou gravar a função com erros que explodem na hora de excluir uma conta:
   - Linha `177` testa `'PESSOA_JURIDICA'`, valor que **não existe** em `tipo_perfil_enum` (gera erro de cast no enum).
   - Linha `181` faz `SELECT membro_id FROM public.membros_empresa`, mas a coluna na tabela (`L41`) se chama **`funcionario_id`**.
   - Linha `177` verifica `OR NEW.cnpj IS NOT NULL`, porém o trigger `BEFORE UPDATE` (`trigger_anonimizar_perfil`, `L266`) já zerou `NEW.cnpj := NULL`.
3. **Desalinhamento do enum `tipo_perfil_enum` entre Banco, Back-end e Front-end:** O trigger `handle_new_user` (`L212`) grava `'MEMBRO_EMPRESA'`, mas `src/types/auth.types.ts:1-6, 38-60` não reconhece `'MEMBRO_EMPRESA'` (rebaixando funcionários para `'PESSOA_FISICA'`) e referencia `'PESSOA_JURIDICA'`, que não existe no enum do Postgres.
4. **Ausência de índices secundários e constraints:** Não há **nenhum índice explícito** nas 10 colunas de FK nem em `perfis(status)`, `perfis(tipo_perfil)` ou `mensagens(created_at)`. Faltam `NOT NULL` nas FKs de `membros_empresa`, `ON DELETE CASCADE` em `mensagens.conversa_id` e `UNIQUE (conversa_id, avaliador_id)` em `avaliacoes`.
5. **Tabelas ainda não integradas:** Apenas `perfis` e `membros_empresa` são consultadas pelo sistema; `conversas`, `mensagens`, `arquivos_chat`, `avaliacoes` e `servicos` não têm uso no código atual, e faltam tabelas futuras para `orcamentos`/`pagamentos`. Além disso, a migration cria política de Storage para bucket `foto_usuario` no Supabase (`L491-505`), enquanto o projeto armazena avatares no Cloudflare R2 (`src/utils/users/urlConversor.ts:3-8`).

### 4.2 Consultas (CRUD)

**Pontos positivos:**
- Consultas limpas via PostgREST sem N+1, usando joins relacionais (`searchMembers.ts:27-33`, `listUsers.ts:188-194`) e carregamento em lote com `.in()` (`listUsers.ts:135-138`), além de tratamento explícito de duplicidade `23505` em `memberSignup.ts:82`.

**Bugs encontrados em operações CRUD:**
- **[CRÍTICO] Alteração de status de membro quebrada (`server/src/app.ts:418`):** `PATCH /api/members/:id/status` chama `CheckPassword(userEmail, parsedBody.data.password)`, porém `CheckPassword` (`deleteAccount.ts:46-57`) espera `userId` (UUID) para o RPC `verify_user_password`. O banco retorna erro de UUID inválido em toda tentativa de afastar/ativar um funcionário.
- **[ALTO] Login por CNPJ falha com pontuação (`server/src/modules/auth/userSingin.ts:27`):** O cadastro grava o CNPJ limpo sem máscara via `normalizeCnpj`, mas o login consulta `.eq('cnpj', `${valor}`)` sem normalizar a entrada. Além disso, `verificarCnpj.ts:10` aceita CNPJ alfanumérico (novo padrão da Receita), mas `normalizeCnpj` (`Shared/utils/cnpj.ts:2`) remove letras com `\D`.
- **Mutações multi-etapa sem rollback compensatório:** Em `userUpdate.ts:47-92` (atualiza Auth antes de `perfis`), `deleteAccount.ts:7-42` (marca `EXCLUIDO` antes de banir no Auth) e `memberSignup.ts:27-90`, uma falha intermediária deixa Auth e `perfis` dessincronizados. Em `listUsers.ts:134-148`, a contagem de membros inclui funcionários `EXCLUIDO` (diferente de `searchMembers.ts:33`) e é limitada ao teto padrão de 1.000 linhas do PostgREST.

---

## 5. Segurança da Informação (Foco Web/Aplicação)

| Severidade | Achado | Localização | Risco / Impacto |
| :--- | :--- | :--- | :--- |
| **CRÍTICA** | Senha do usuário logada em texto puro no terminal | `server/src/app.ts:584` | Exposição direta de credenciais em logs do servidor (CWE-532) |
| **CRÍTICA** | `GRANT TRUNCATE` para `anon` e `authenticated` nas 7 tabelas | `supabase/migrations/20261125202417_remote_schema.sql:576-642` | RLS **não bloqueia `TRUNCATE`** no PostgreSQL; risco extremo de perda de dados caso alguém chame via API/SQL |
| **ALTA** | Rota `/api/send-email` sem checagem de papel + HTML Injection no corpo | `server/src/app.ts:743-785`, `sendEmail.ts:39` | Qualquer usuário comum autenticado pode usar o Resend do projeto para enviar phishing com HTML arbitrário |
| **ALTA** | Validação de CNPJ ignorada por falta de `await` e `.valid` | `server/src/app.ts:132`, `verificarCnpj.ts:5-29` | Qualquer string passa pela validação no cadastro e dispara `fetch` sem timeout |
| **ALTA** | `POST /api/save-member` não valida se o chamador é `EMPRESA` | `server/src/app.ts:293-339` | Usuário `PESSOA_FISICA` pode disparar convites e criar vínculos na tabela `membros_empresa` |
| **ALTA** | Cliente Supabase singleton compartilhado mutado por `signIn`/`signUp` | `server/src/Shared/database/banco.ts:8-9`, `userSingin.ts:41` | Sem `persistSession: false`, logins simultâneos contaminam o estado de sessão em memória do servidor |
| **ALTA** | Policy de `INSERT` em `mensagens` e `perfis` incompletas | `remote_schema.sql:449-452, 463-466` | `mensagens` não checa se o remetente participa da conversa; `perfis` no `INSERT` não trava `tipo_perfil`/`status` |
| **MÉDIA** | Troca de e-mail via Admin API sem verificação nem senha atual | `server/src/modules/auth/userUpdate.ts:47-61` | Se um JWT vazar, o atacante troca o e-mail da conta instantaneamente sem confirmação |
| **MÉDIA** | CORS aberto com `origin: true` e falta de `rate-limit`/`helmet` | `server/src/app.ts:39-42` | Ignora `env.FRONTEND_URL`; sem proteção contra força bruta em rotas de login/e-mail |
| **MÉDIA** | Vazamento de `error.message` bruto do Supabase/Postgres ao cliente | `app.ts:161`, `searchMembers.ts:40`, `userUpdate.ts:72,90`, `memberSignup.ts:39` | Expõe nomes internos e facilita enumeração de e-mails já cadastrados |
| **MÉDIA** | Upload ao R2 não assina `ContentLength` na URL pré-assinada | `server/src/Shared/storage/r2.ts:85-93` | Usuário pode burlar a checagem JSON e enviar arquivo maior que 5 MB ao bucket |

### 5.1 Análise por Pilar de Segurança

- **Injeção de SQL:** **Excelente base.** Todas as queries usam o query builder parametrizado do Supabase (`eq`, `in`, `rpc`). O único filtro com interpolação de string (`listUsers.ts:102-104`) usa `sanitizePostgrestSearch` (`L61-63`) para remover `,()\`, impedindo injeção de cláusulas no `.or()`. *(Sugestão de refino: escapar também `%`, `_` e `*` no `ilike`.)*
- **Validação, Sanitização e XSS:** No front-end não há `dangerouslySetInnerHTML`, `innerHTML` ou `eval`, aproveitando o auto-escaping do React. No back-end, a maior parte das rotas valida tipos e limites com **Zod**, mas é urgente escapar o campo `nome` antes de montar o HTML em `sendEmail.ts:39` e corrigir o `await` da validação de CNPJ.
- **Autenticação, Senhas e Sessões:** As senhas são tratadas pelo Supabase Auth (bcrypt) e verificadas via função `verify_user_password` (`SECURITY DEFINER`, restrita ao `service_role`). O middleware `getUserFromRequest` (`server/src/Shared/middleware/getUser.ts:13`) valida o JWT no servidor e a checagem de `ADMIN` (`listUsers.ts:65-77`) consulta a tabela `perfis`, nunca confiando em `user_metadata` editável pelo cliente. Atenção apenas para bloquear usuários com `status IN ('AFASTADO', 'EXCLUIDO')` no middleware e ao desabilitar `persistSession` no `banco.ts`.
- **Exposição de Dados:** A chave secreta `SUPABASE_SECRET_KEY` está corretamente isolada no servidor (`server/src/config/env.ts:30`) e validada no boot com Zod; `.env` está no `.gitignore`; o `vercel.json` configura `Content-Security-Policy`; e não há Swagger/OpenAPI exposto em produção. Os únicos pontos pendentes são a remoção do `console.log` de senha (`app.ts:584`), restrição do CORS e substituição das mensagens `error.message` brutas por mensagens amigáveis. *(Nota sobre Pagamentos: ainda não há rotas reais de pagamento; ao implementá-las, nunca confiem no preço enviado pelo front-end e validem webhooks no servidor.)*

---

## 6. Parecer Pedagógico e Feedback Final (Mentoria)

### 🌟 Pontos Fortes

Meus parabéns sinceros ao grupo! Dá para notar nitidamente a evolução técnica e o cuidado que vocês colocaram neste TCC. Alguns trechos estão em nível de desenvolvedor júnior/pleno de mercado:

1. **Engenharia aplicada no Pipeline PDF/OCR/DXF (`src/utils/pdfConversor/` e `src/hook/useOcrPipeline.ts`):** A estratégia híbrida (ler texto nativo do PDF primeiro, validar se realmente há coordenadas/medidas antes de aceitar e só então acionar o PaddleOCR ONNX em **Web Worker** para não travar a interface) mostra raciocínio arquitetural maduro. A validação geométrica não destrutiva (`validarGeometria.ts`), a reconstrução bidirecional de poligonal com cálculo de arcos (`textSanitizer.ts`, `drawDXF.ts`) e a suíte com 8 cenários reais em `matricula.test.ts` são dignas de aplausos.
2. **Defesa em Profundidade na Segurança:** Vocês isolaram corretamente a `SUPABASE_SECRET_KEY` no back-end, criaram validação `fail-fast` de variáveis de ambiente com Zod (`server/src/config/env.ts` e `src/lib/env.ts`), construíram a trigger `trg_protect_perfis_sensitive_columns` no Postgres para impedir escalação de privilégio via API pública e protegeram a consulta `.or()` com `sanitizePostgrestSearch` (`listUsers.ts:61-63`).
3. **Capricho em Acessibilidade e UX nos Fluxos Críticos:** `PasswordInput.tsx` (ocultar senha ao perder o foco e `aria-pressed`), `ChangePasswordForm.tsx` (checklist em tempo real e mapeamento de erros amigáveis), `Sidebar.tsx` (focus trap com `Tab`/`Escape`) e `Chat` (navegação Master-Detail mobile e máscara de centavos estilo caixa eletrônico) mostram respeito real pelo usuário final.
4. **Cultura de Engenharia:** Uso de TypeScript estrito (`verbatimModuleSyntax`, `noUnusedLocals`), CI automatizado no GitHub Actions com `oxlint --deny-warnings` (`.github/workflows/lint.yml`) e `codeSplitting` estratégico no `vite.config.ts`.

---

### 🚀 Oportunidades de Melhoria (Quick Wins — Plano de Ação Pré-Banca)

Organizei os ajustes por prioridade para vocês resolverem com rapidez e segurança antes da apresentação final:

#### 🔴 P0 — Críticos (Segurança e Bugs de Demonstração — Façam Hoje!)

**1. Remover log de senha em texto puro e ativar logger do Fastify (`server/src/app.ts:33, 584`)**
*Por quê:* Senhas jamais podem ir para logs do terminal ou nuvem. E habilitar `logger: true` faz os `request.log.error` funcionarem de verdade.
```ts
// Antes (server/src/app.ts)
const app = fastify().withTypeProvider<ZodTypeProvider>(); // linha 33
console.log('CheckPassword called with email:', userEmail, 'and password:', parsedBody.data.password); // linha 584

// Depois
const app = fastify({ logger: true }).withTypeProvider<ZodTypeProvider>();
// (remova completamente o console.log da linha 584)
```

**2. Corrigir `await` na validação de CNPJ e parâmetro do `CheckPassword` (`server/src/app.ts:132, 418`)**
*Por quê:* Sem `await` e `.valid`, toda `Promise` é avaliada como verdadeira e CNPJs inválidos passam; já na linha `418`, passar `userEmail` onde a função SQL espera `uuid` faz a alteração de status do membro quebrar.
```ts
// Antes (app.ts:132)
if (!isValidCNPJ(cnpj)) { ... }
// Depois
const cnpjResult = await isValidCNPJ(cnpj);
if (!cnpjResult.valid) {
  return reply.status(400).send({ ok: false, message: cnpjResult.message });
}

// Antes (app.ts:418)
const isValidPassword = await CheckPassword(userEmail, parsedBody.data.password);
// Depois
const isValidPassword = await CheckPassword(request.user.id, parsedBody.data.password);
```

**3. Corrigir `await` faltante na geração de DXF Convencional (`src/utils/pdfConversor/drawDXF.ts:669`)**
*Por quê:* Se a banca pedir para baixar o DXF de um terreno convencional individual durante a demonstração, hoje o arquivo sairá vazio porque `dxf.stringify()` roda antes do término da função `async`.
```ts
// Antes (drawDXF.ts:669)
gerarDXFConvencional(dxf, dados, opcoesCompletas, avisos);

// Depois
await gerarDXFConvencional(dxf, dados, opcoesCompletas, avisos);
```

**4. Proteger `/api/send-email` e escapar HTML no template (`server/src/app.ts:743-785`, `sendEmail.ts:39`)**
*Por quê:* Evita que qualquer usuário cadastrado use o servidor da empresa para disparar spam ou e-mails falsificados com tags HTML injetadas no campo `nome`.
```ts
// Em app.ts (dentro do handler de /api/send-email, após getUserFromRequest)
if (!(await isAdminUser(request.user.id))) {
  return reply.status(403).send({ ok: false, message: "Acesso restrito a administradores." });
}

// Em sendEmail.ts — escape simples para texto interpolado em HTML
function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch] ?? ch
  );
}
// E na linha 39:
<p ...>Olá, ${escapeHtml(nome)}</p>
```

**5. Corrigir SQL de segurança e trigger no Supabase (nova migration corretiva)**
*Por quê:* `TRUNCATE` não é bloqueado por RLS, e o trigger `handle_company_soft_delete` falha em runtime ao excluir empresa.
```sql
-- 1. Remover privilégios perigosos de anon/authenticated
REVOKE TRUNCATE, MAINTAIN, TRIGGER, REFERENCES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- 2. Corrigir o trigger handle_company_soft_delete (funcionario_id, sem PESSOA_JURIDICA, checar OLD.cnpj)
IF NEW.status = 'EXCLUIDO'
   AND OLD.status IS DISTINCT FROM 'EXCLUIDO'
   AND (NEW.tipo_perfil = 'EMPRESA' OR OLD.cnpj IS NOT NULL) THEN
  UPDATE public.perfis
     SET status = 'EXCLUIDO'
   WHERE id IN (
     SELECT funcionario_id FROM public.membros_empresa WHERE empresa_id = NEW.id
   );
END IF;

-- 3. Criar índices nas chaves estrangeiras principais
CREATE INDEX IF NOT EXISTS idx_membros_empresa_empresa_id ON public.membros_empresa(empresa_id);
CREATE INDEX IF NOT EXISTS idx_membros_empresa_funcionario_id ON public.membros_empresa(funcionario_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_conversa_created ON public.mensagens(conversa_id, created_at);
```

---

#### 🟠 P1 — Altos (Estabilidade, Autorização e Dados)

**6. Impedir contaminação de sessão no singleton do Supabase e restringir CORS (`server/src/Shared/database/banco.ts:8-9`, `app.ts:39-42`)**
*Por quê:* No Node.js, um cliente singleton sem `persistSession: false` mistura sessões entre requisições simultâneas de usuários diferentes.
```ts
// Em banco.ts
export function createAnonSupabaseClient() {
  return createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
export const supabaseAdmin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

// Em app.ts:40 — usar a origem configurada no .env
await app.register(cors, {
  origin: [env.FRONTEND_URL],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
});
```

**7. Validar tipo `EMPRESA` em `POST /api/save-member`, normalizar CNPJ no login e ocultar `error.message` bruto**
*Por quê:* Garante que apenas contas empresariais convidem funcionários (`app.ts:314`), permite login com CNPJ pontuado (`userSingin.ts:27` usando `normalizeCnpj`) e evita expor detalhes do Postgres ao usuário.

**8. Corrigir fluxo de `PENDENTE` e botão Cancelar em `src/container/Auth/definirSenha.tsx:24-26, 231-237`**
*Por quê:* Conectar `onClick={() => navigate("/login")}` no botão Cancelar e revisar a linha `24` (`if (user.status === "PENDENTE") navigate("/")`), pois se o funcionário aceitou o convite ele precisa justamente conseguir permanecer na tela para definir a senha.

**9. Alinhar `tipo_perfil_enum` (`MEMBRO_EMPRESA`) entre banco e `src/types/auth.types.ts`**
*Por quê:* Hoje quem entra pelo trigger `handle_new_user` como `'MEMBRO_EMPRESA'` cai no fallback `'PESSOA_FISICA'` no front-end (`auth.types.ts:38-60`).

---

#### 🟡 P2 — Médios (UI/UX, Acessibilidade e Manutenção)

**10. Destravar `<h1>` e botão acessível em `src/container/Services/services.tsx:221, 296-300`**
*Por quê:* Leitores de tela atualmente não encontram o título principal `<h1>Serviços</h1>` porque o container pai tem `aria-hidden="true"`.
```tsx
// Antes
<div className="services-title-divider" aria-hidden="true">
  <span />
  <h1>Serviços</h1>
  <span />
</div>

// Depois
<div className="services-title-divider">
  <span aria-hidden="true" />
  <h1>Serviços</h1>
  <span aria-hidden="true" />
</div>
```

**11. Corrigir contraste WCAG AA e `<head>` inválido**
- Escurecer verde dos botões/títulos onde há texto branco ou fundo cinza: em `src/container/FAQ/faq.css:444` (`.btn-faq-chat`) trocar `#00c724` por `#15803d`, e em `src/container/About/about.css:6` usar `#157347`.
- Remover a tag `<head>` dentro do JSX em `src/components/Pop-Up/NoticeModal/noticeModal.tsx:42-48` e garantir fallback `NoticeModalProps.buttonLink ?? ""`.
- Adicionar estado `isSubmitting` em `cadastrar.tsx` e `login.tsx`, e botão de fechar no modal do Turnstile (`login.tsx:917-948`).
- Escopar classes conflitantes (`.form-group`, `.title-divider`) entre `login.css`, `cadastrar.css` e `faq.css`.

---

#### 🟢 P3 — Estético & Polimento para a Banca

**12. Profissionalizar detalhes visíveis na apresentação:**
- Trocar `<title>lifetopografia-tcc</title>` em `index.html:11` para `<title>Life Topografia</title>` e adicionar `<title>` em `about.tsx`.
- Na tela `/pagamento` (`src/components/Pop-Up/Pagamento/pagamento.tsx`), substituir os placeholders `"sdadsada"` e o fundo `aliceblue`/roxo por um aviso elegante de *"Módulo de pagamento em integração"* alinhado à identidade azul/verde do projeto.
- Adicionar `"test": "tsx src/utils/pdfConversor/matricula.test.ts"` no `package.json`, remover arquivos vazios (`autocad/manter.ts`, `chat/manter.ts`, `det.onnx`, `pagamento/payment.ts`) e atualizar o `README.md` com o estado real das rotas.

---

### 🎓 Mensagem de Encerramento

Parabéns por chegarem até aqui! Construir um sistema Full Stack completo — integrando React, Fastify, Supabase com RLS, armazenamento em nuvem, e ainda encarando o desafio real de processar matrículas imobiliárias em PDF com OCR local e gerar arquivos AutoCAD DXF — exige muita dedicação, noites de estudo e coragem técnica.

Os pontos listados acima **não diminuem** o valor do que vocês construíram; pelo contrário, mostram que o projeto já atingiu um nível de maturidade em que podemos aplicar critérios reais de engenharia de software e segurança usados no mercado. Façam esses ajustes do plano P0/P1 com calma, rodem os testes do conversor DXF antes da apresentação e subam para a banca com confiança: vocês têm um projeto excelente nas mãos e estão prontos para dar os primeiros passos sólidos no mercado de desenvolvimento. **Sucesso na formatura e na carreira!**
