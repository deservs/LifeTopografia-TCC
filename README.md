# LifeTopografia — TCC

O LifeTopografia é um site em desenvolvimento para apresentar uma empresa de topografia e apoiar seu atendimento. A proposta é permitir que o cliente converse com a empresa, envie documentos como a matrícula de um imóvel em PDF, pague pelo serviço e avalie o atendimento. A leitura do PDF deverá ajudar a localizar medidas e outras informações topográficas.

Essas etapas descrevem o objetivo do TCC. Elas ainda não formam um fluxo completo na aplicação.

## Estado atual

| Parte | O que funciona ou existe hoje | Limite atual |
| --- | --- | --- |
| Site | Páginas inicial, serviços, cadastro e login em React e TypeScript. Há uma página de erro para rotas desconhecidas. | Algumas páginas e links do menu ainda não têm rota. |
| Cadastro | Formulário integrado ao Supabase Auth, com hCaptcha. O cadastro de empresa consulta o CNPJ na BrasilAPI antes de enviar os dados. | A resposta do cadastro ainda não distingue todos os casos, como um e-mail já existente com confirmação ativada. |
| Login | O formulário envia e-mail ou CNPJ e senha para `POST /api/login` no servidor Fastify. O servidor consulta o perfil quando recebe um CNPJ e usa o Supabase Auth para autenticar. O frontend tenta guardar a sessão retornada. | O tratamento das respostas sem sessão precisa ser corrigido. A opção de login por nome ainda não foi implementada. |
| Recuperação de senha | Solicitação de e-mail, verificação do código e definição da nova senha usam o Supabase Auth. | O fluxo ainda precisa de testes completos e de ajustes nas mensagens. |
| Sessão e Sidebar | O cliente Supabase mantém a sessão no navegador. Na abertura do aplicativo, os dados do perfil são consultados e disponibilizados à Sidebar por contexto React. | O contexto não acompanha automaticamente mudanças de autenticação enquanto a página continua aberta. |
| PDF e OCR | A rota `/teste` recebe um PDF, renderiza a primeira página com PDF.js e executa PaddleOCR no navegador. | O texto aparece apenas no console. Ainda não há leitura de todas as páginas, aproveitamento do texto já presente no PDF nem extração das informações topográficas. |
| Atendimento | Existem pastas e arquivos iniciais para chat, perfil, e-mail e AutoCAD. | Chat, envio de arquivos ao atendimento, pagamento e avaliação ainda não estão integrados. |

## Rotas atuais

| Rota | Resultado atual |
| --- | --- |
| `/` | Página inicial. |
| `/servicos` | Serviços. |
| `/cadastrar` | Cadastro. Um usuário com sessão é redirecionado para a página inicial. |
| `/login` | Login e recuperação de senha. Um usuário com sessão é redirecionado para a página inicial. |
| `/teste` | Teste de OCR com a primeira página de um PDF. |
| `/perfil` | **Atenção:** no momento, essa rota executa logout; a página de perfil ainda não está pronta. |
| Outras rotas | Página inicial com o aviso de erro 404. |

O menu contém links como `/sobre`, `/faq` e `/contato`, mas essas rotas ainda não foram registradas em `src/App.tsx`.

## Como o teste de PDF funciona

1. Em `/teste`, o usuário escolhe um PDF.
2. `src/utils/pdfConvert.ts` usa PDF.js para renderizar a primeira página em uma imagem.
3. `src/hook/useOcrPipeline.ts` carrega os modelos locais do PaddleOCR e reconhece o texto em um worker.
4. O texto é escrito no console do navegador. Ao terminar, o motor de OCR é descartado para liberar recursos.

Os modelos estão em `public/models/ocr/`, e os arquivos usados pelo ONNX Runtime estão em `public/wasm/`. O OCR ocorre no navegador do usuário.

## Organização das pastas

| Caminho | Responsabilidade |
| --- | --- |
| `src/container/` | Telas do site, como Home, Login e Serviços. |
| `src/components/` | Elementos reutilizáveis, como Sidebar e aviso 404. |
| `src/lib/supabase/` | Cliente Supabase e funções de autenticação. |
| `src/hook/` | Estado e lógica reutilizável do OCR e dos dados iniciais do usuário. |
| `src/utils/` | Funções auxiliares, como a conversão de PDF. |
| `server/src/` | Servidor Fastify, configuração e módulos do backend. |
| `public/` | Arquivos servidos diretamente, incluindo modelos de OCR e WASM. |
| `supabase/config.toml` | Arquivo reservado para configuração local do Supabase; ainda contém apenas um comentário. |
| `vercel.json` | Configuração dos serviços frontend e backend e do encaminhamento das rotas na Vercel. |

## Executar localmente

É necessário ter Node.js e npm instalados. Na raiz do projeto:

```bash
npm install
npm run dev
```

Em outro terminal, inicie o servidor:

```bash
npm run dev:server
```

O Vite usa normalmente a porta `5173`, e o servidor usa a porta `3001` por padrão. O login atual chama `http://localhost:3001/api/login`, portanto precisa do servidor local em execução.

O frontend exige `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`. O servidor exige essas mesmas variáveis e `SUPABASE_SECRET_KEY`. As configurações do servidor também aceitam `NODE_ENV`, `PORT`, `DATABASE_URL` e `JWT_SECRET`; as duas últimas são opcionais no esquema atual. Consulte `src/lib/env.ts` e `server/src/config/env.ts`. Guarde os valores no ambiente local ou nas configurações do serviço de hospedagem; não publique a chave secreta no frontend nem no Git.

Para conferir o código:

```bash
npm run lint
npm run build
npm run build:server
```

## Pendências prioritárias

1. Fazer o backend devolver um erro HTTP coerente quando as credenciais forem inválidas ou o CNPJ não for encontrado. No frontend, interromper sempre o login quando não houver sessão, inclusive no build de produção.
2. Separar a página de perfil da ação de logout: hoje o link **Acessar perfil** abre `/perfil`, que encerra a sessão.
3. Definir como tratar o login por nome ou retirar essa opção até existir uma busca própria. Padronizar o formato do CNPJ no cadastro e na consulta.
4. Atualizar o contexto do usuário quando a sessão mudar e definir quais páginas exigem autenticação. A proteção dos dados também deve existir no servidor e nas políticas do Supabase.
5. Ler o texto incorporado ao PDF antes de usar OCR, percorrer as páginas necessárias e apresentar o resultado na interface.
6. Integrar chat, envio de arquivos, pagamento e avaliação ao fluxo de atendimento.

O esquema da tabela `perfis`, os triggers e as políticas de acesso do banco não estão versionados neste repositório. Por isso, este README descreve o código disponível, sem afirmar que regras como unicidade de e-mail/CNPJ ou RLS já estejam configuradas no Supabase.
