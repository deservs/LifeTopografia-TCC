# LifeTopografia — TCC

O LifeTopografia é um site em desenvolvimento para apresentar uma empresa de topografia e apoiar seu atendimento. A proposta é permitir que o cliente converse com a empresa, envie documentos como a matrícula de um imóvel em PDF, pague pelo serviço e avalie o atendimento. A leitura do PDF deverá ajudar a localizar medidas e outras informações topográficas.

Essas etapas descrevem o objetivo do TCC. Elas ainda não formam um fluxo completo na aplicação.

## Estado atual

| Parte | O que funciona ou existe hoje | Limite atual |
| --- | --- | --- |
| Site | Páginas inicial, serviços, cadastro e login em React e TypeScript. Há uma página de erro para rotas desconhecidas. | Algumas páginas e links do menu ainda não têm rota. |
| Cadastro | Formulário para pessoa física ou empresa integrado ao Supabase Auth, com Cloudflare Turnstile. O cadastro de empresa consulta o CNPJ na BrasilAPI antes de enviar os dados. | O fluxo ainda precisa de testes completos para respostas do Supabase e falhas de serviços externos. |
| Login | O formulário envia e-mail ou CNPJ e senha para `POST /api/login` no servidor Fastify. O servidor consulta o e-mail do perfil quando recebe um CNPJ e usa o Supabase Auth para autenticar. O frontend instala a sessão retornada. | A chamada relativa `/api/login` ainda não é encaminhada pelo Vite ao Fastify no desenvolvimento local. |
| Recuperação de senha | Solicitação de e-mail, verificação do código, definição da nova senha e encerramento da sessão usam o Supabase Auth. | O fluxo ainda precisa de testes completos, incluindo cancelamento, reenvio e falhas de rede. |
| Sessão, Sidebar e perfil | O cliente Supabase mantém a sessão no navegador. A Sidebar busca dados básicos do perfil quando é montada. `/perfil` mostra uma interface de conta e membros. | A Sidebar não acompanha continuamente mudanças de autenticação. As ações de gravação, gestão de membros e exclusão de conta no perfil dependem de serviços ainda não conectados. |
| PDF e OCR | A rota `/teste` recebe um PDF, renderiza a primeira página com PDF.js e executa PaddleOCR no navegador. | O texto aparece apenas no console. Ainda não há leitura de todas as páginas, aproveitamento do texto já presente no PDF nem extração das informações topográficas. |
| Atendimento | Existem arquivos iniciais para chat, e-mail, AutoCAD e SumUp. | Chat, envio de arquivos ao atendimento, pagamento e avaliação ainda não estão integrados. |
| Pagamento | Existe uma tela visual em `/pagamento`. | **Nenhum pagamento é processado.** A mensagem de sucesso mostrada nessa tela é demonstrativa e não confirma uma transação. |

## Rotas atuais

| Rota | Resultado atual |
| --- | --- |
| `/` | Página inicial. |
| `/servicos` | Serviços. |
| `/cadastrar` | Cadastro. Um usuário com sessão é redirecionado para a página inicial. |
| `/login` | Login e recuperação de senha. Um usuário com sessão é redirecionado para a página inicial. |
| `/teste` | Teste de OCR com a primeira página de um PDF. |
| `/perfil` | Interface de perfil. As ações de gravação ainda dependem de serviços não conectados. |
| `/logout` | Encerra a sessão local e volta à página inicial. |
| `/pagamento` | Tela demonstrativa, sem transação real. |
| Outras rotas | Página inicial com o aviso de erro 404. |

As rotas são registradas em `src/App.tsx`. A presença de um link ou de uma tela não significa que o respectivo serviço de atendimento já esteja implementado.

## Como o teste de PDF funciona

1. Em `/teste`, o usuário escolhe um PDF.
2. `src/utils/pdfConvert.ts` usa PDF.js para renderizar a primeira página em uma imagem.
3. `src/hook/useOcrPipeline.ts` carrega os modelos locais do PaddleOCR e reconhece o texto em um worker.
4. O texto é escrito no console do navegador. Ao terminar, o motor de OCR é descartado para liberar recursos.

Os modelos estão em `public/models/ocr/`, e os arquivos usados pelo ONNX Runtime estão em `public/wasm/`. O OCR ocorre no navegador do usuário.

## Organização das pastas

| Caminho | Responsabilidade |
| --- | --- |
| `src/container/` | Telas do site, como Home, Login, Serviços e Perfil. |
| `src/components/` | Elementos reutilizáveis, como Sidebar e aviso 404. |
| `src/lib/supabase/` | Cliente Supabase e funções de autenticação. |
| `src/hook/` | Estado e ciclo de vida do pipeline de OCR. |
| `src/lib/sumup/` | Arquivo inicial da futura integração de pagamento; sem operação ativa. |
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

O Vite usa normalmente a porta `5173`, e o servidor usa a porta `3001` por padrão. **Apenas iniciar os dois processos não faz o login funcionar localmente:** o frontend chama `/api/login` na origem do Vite, e `vite.config.ts` ainda não define um proxy para o Fastify. Na Vercel, `vercel.json` contém uma regra para encaminhar `/api/*` ao backend; esse comportamento precisa ser verificado no deploy.

Crie um `.env` local usando os nomes mostrados em `.env.example` e forneça valores reais. O frontend exige `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`. O servidor também exige `SUPABASE_SECRET_KEY`; aceita `NODE_ENV` e `PORT`, enquanto `DATABASE_URL` e `JWT_SECRET` são opcionais no esquema atual. Consulte `src/lib/env.ts` e `server/src/config/env.ts`. Variáveis com prefixo `VITE_` são usadas no navegador; mantenha a chave secreta somente no servidor e fora do Git.

Para conferir o código:

```bash
npm run lint
npm run build
npm run build:server
```

Ainda não há testes automatizados no repositório. Passar nos comandos acima não confirma que os fluxos funcionem de ponta a ponta.

## Pendências prioritárias

1. Testar cadastro, login, recuperação e logout; configurar o encaminhamento local de `/api/login` e atualizar a Sidebar quando a sessão mudar.
2. Conectar as ações do perfil a serviços reais e proteger as rotas e operações que exigem autenticação.
3. Ler o texto incorporado ao PDF antes de usar OCR, percorrer as páginas necessárias e apresentar o resultado na interface.
4. Integrar chat, envio de arquivos, pagamento e avaliação ao atendimento. Antes de expor `/pagamento` como funcional, remover a confirmação demonstrativa ou vinculá-la a uma transação confirmada pelo servidor.
5. Versionar o esquema e as políticas de acesso do Supabase e criar testes para os fluxos mais importantes.

O esquema da tabela `perfis`, os triggers e as políticas de acesso do banco não estão versionados neste repositório. Por isso, este README descreve o código disponível, sem afirmar que regras como unicidade de e-mail/CNPJ ou RLS já estejam configuradas no Supabase.
