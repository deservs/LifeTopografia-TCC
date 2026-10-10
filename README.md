# LifeTopografia — TCC

O LifeTopografia é um site em desenvolvimento para apoiar o atendimento de uma empresa de topografia. O visitante poderá conhecer a LifeTopografia e suas áreas de atuação. O cliente poderá conversar com a empresa, enviar documentos como a matrícula de um imóvel em PDF, realizar o pagamento e avaliar o serviço.

A leitura da matrícula também deverá ajudar a empresa a localizar as informações necessárias no documento, como medidas, azimutes e coordenadas. Essa análise é uma parte do projeto, não o produto inteiro.

## Experiência planejada

1. O visitante conhece a empresa e os serviços oferecidos pelo site.
2. O cliente cria uma conta e inicia uma conversa com a LifeTopografia.
3. Na conversa, envia a matrícula do imóvel em PDF para a empresa analisar.
4. O sistema auxilia na leitura do documento, inclusive quando ele contém páginas digitalizadas.
5. Cliente e empresa conversam sobre o atendimento. O cliente poderá pagar pelo serviço e, depois, avaliá-lo.

Esse é o objetivo do TCC. As etapas acima ainda não formam um fluxo completo na aplicação atual.

## O que existe hoje

- Interface em React e TypeScript, com páginas inicial, cadastro, login, serviços e teste de PDF.
- Cadastro de usuário integrado ao Supabase Auth.
- Envio de email, verificação de código e alteração de senha no fluxo de recuperação de acesso.
- Um teste de OCR na rota `/teste`: o usuário escolhe um PDF, a primeira página é convertida em imagem e enviada ao PaddleOCR no navegador. O texto reconhecido é mostrado no console do navegador.
- Estrutura inicial de servidor em Fastify, ainda sem rotas de negócio registradas.

O projeto ainda não oferece o fluxo completo de atendimento, chat, pagamento e avaliação. A leitura de PDF também está em teste: processa apenas a primeira página e não apresenta o texto extraído na interface.

## Como o teste de PDF funciona

1. O usuário abre `/teste` e seleciona um PDF.
2. `src/utils/pdfConvert.ts` usa o PDF.js para transformar a primeira página em imagem.
3. `src/hook/useOcrPipeline.ts` carrega os modelos locais do PaddleOCR e reconhece o texto da imagem em um worker (uma tarefa separada da interface).
4. O resultado aparece no console do navegador. Ao terminar, o motor de OCR é descartado para liberar recursos.

Os modelos de OCR estão em `public/models/ocr/`, e os arquivos usados pelo ONNX Runtime estão em `public/wasm/`. O processamento ocorre no navegador do usuário.

## Cadastro, sessão e menu lateral

`src/lib/supabase/supabaseClient.ts` cria a conexão com o Supabase. A biblioteca está configurada para guardar a sessão no navegador e renovar automaticamente a credencial de acesso quando necessário. `src/lib/supabase/auth.ts` reúne as chamadas de cadastro, login e recuperação de senha.

A `Sidebar` recebe a propriedade `user`:

- Se `user` tiver os dados de uma pessoa, mostra nome, foto quando disponível e acesso à conta.
- Se `user` for `null`, mostra os botões **CADASTRAR** e **ENTRAR**.

**Estado atual:** as páginas ainda passam `null` para a `Sidebar`, então ela mostra sempre a versão de visitante. A função de login com senha existe em `auth.ts`, mas o formulário da página de login ainda não a chama. As rotas também ainda não verificam a sessão antes de abrir páginas. A `Sidebar` deve exibir o estado do usuário; a consulta à sessão precisa fornecer esses dados às páginas.

## Estrutura principal

| Caminho | Papel |
| --- | --- |
| `src/container/` | Páginas da interface. |
| `src/components/` | Partes reutilizáveis da interface, como a `Sidebar`. |
| `src/lib/supabase/` | Cliente do Supabase e funções de autenticação. |
| `src/hook/` | Lógica de OCR usada pela página de teste. |
| `src/utils/` | Funções auxiliares, incluindo a conversão de PDF. |
| `public/` | Arquivos públicos, modelos de OCR e WASM. |
| `server/src/` | Estrutura inicial do servidor Fastify. |
| `supabase/config.toml` | Arquivo reservado para configuração local do Supabase; atualmente contém apenas um comentário. |
| `vercel.json` | Configuração de publicação do frontend e do serviço backend na Vercel. |

## Executar localmente

É necessário ter Node.js e npm instalados. Na raiz do projeto:

```bash
npm install
npm run dev
```

Para iniciar o servidor separadamente:

```bash
npm run dev:server
```

O frontend lê `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` do arquivo `.env` na raiz. O servidor lê `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` e `SUPABASE_JWKS_URL` do mesmo ambiente; `NODE_ENV`, `PORT`, `DATABASE_URL` e `JWT_SECRET` também estão previstos na sua configuração. Consulte `src/lib/env.ts` e `server/src/config/env.ts` para ver a validação dessas variáveis. O arquivo `.env` está ignorado pelo Git e não deve conter chaves reais em commits.

Para conferir a compilação:

```bash
npm run build
npm run build:server
```

## Próximas etapas

- Completar as páginas que apresentam a LifeTopografia e suas áreas de atuação.
- Conectar o formulário de login à função de autenticação e refletir a sessão na `Sidebar`.
- Definir quais páginas exigem login e proteger também as operações e dados no servidor/Supabase.
- Criar o chat entre cliente e empresa, incluindo o envio da matrícula em PDF.
- Ler todas as páginas do PDF e aproveitar o texto já existente antes de recorrer ao OCR em páginas digitalizadas.
- Mostrar o texto extraído na interface e identificar nele as informações topográficas necessárias.
- Integrar o pagamento do serviço e permitir que o cliente avalie o atendimento.
- Implementar as rotas de negócio do servidor conforme as funcionalidades forem desenvolvidas.
