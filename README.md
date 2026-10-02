# LifeTopografia — TCC

O LifeTopografia é um projeto de apoio à leitura de memoriais descritivos em PDF. O objetivo é extrair informações topográficas, como azimutes, distâncias e coordenadas UTM, e preparar esses dados para as próximas etapas da aplicação.

## Estado do projeto

O projeto está em desenvolvimento. A conversão da primeira página de um PDF em imagem já foi implementada. A integração do OCR para reconhecer texto em páginas digitalizadas ainda está sendo ajustada e não deve ser considerada concluída.

As próximas etapas são processar todas as páginas, aproveitar o texto já presente em PDFs digitais, aplicar OCR quando a página for digitalizada e identificar os dados topográficos no texto extraído.

## Como o processamento deverá funcionar

1. O usuário seleciona um PDF.
2. A aplicação verifica se cada página contém texto aproveitável.
3. Páginas digitalizadas são convertidas em imagem e enviadas ao OCR.
4. O texto obtido é analisado para localizar as informações topográficas.

O processamento de OCR foi planejado para ocorrer no navegador, em uma thread separada, para manter a interface responsiva. O projeto não exige uma forma específica de transferência de memória entre threads.

## Estrutura do repositório

- `src/` e `public/`: interface em React e TypeScript, conversão de PDF e integração do OCR.
- `server/src/`: aplicação Fastify para as funcionalidades do servidor.
- `package.json` e `package-lock.json` na raiz: dependências e scripts do frontend e do servidor.
- `supabase/`: configuração relacionada ao Supabase.

## Executar localmente

Na raiz do projeto, instale as dependências com `npm install`. Use `npm run dev` para iniciar o frontend. O servidor usa `npm run dev:server` e lê um arquivo `.env` na raiz com as variáveis descritas em `server/src/config/env.ts`.

Para compilar, use `npm run build` para o frontend e `npm run build:server` para o servidor.

## Limitações atuais

- O teste de OCR ainda está em desenvolvimento.
- O fluxo atual usa apenas a primeira página do PDF.
- A extração de azimutes, distâncias e coordenadas UTM ainda não está concluída.
