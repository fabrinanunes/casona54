# Publicação gratuita do Casona54

Este guia usa Cloudflare Pages para o React, Render Free para a API Go e Neon Free para o PostgreSQL. A Cloudflare Function faz o proxy de `/api/*` para a API, mantendo as chamadas e o cookie de sessão na origem do frontend. Isso evita depender de cookies de terceiros.

## Limites dos planos gratuitos

- O serviço Go gratuito do Render entra em repouso após 15 minutos sem tráfego. A primeira requisição depois disso pode levar cerca de um minuto para acordá-lo. O Render diz que esses recursos são para projetos de hobby e testes, não para aplicações de produção.
- O Neon Free limita computação, armazenamento e transferência, e suspende o banco ao atingir os limites do plano. O projeto oferece 1 GB de armazenamento por banco, 100 CU-horas e 5 GB de transferência por mês; a computação suspende após 5 minutos sem atividade.
- A Cloudflare Pages Functions tem uma cota gratuita de 100 mil requisições por dia; os arquivos estáticos são servidos sem consumir essa cota.
- Não crie o PostgreSQL no plano gratuito do Render: esses bancos expiram 30 dias após a criação.
- Mantenha cópias independentes dos dados. O plano gratuito não substitui uma rotina própria de backup.

Os limites podem mudar. Confira as páginas dos provedores antes de criar os serviços: [Render Free](https://render.com/docs/free), [Neon Plans](https://neon.com/docs/introduction/plans) e [Cloudflare Pages Functions Pricing](https://developers.cloudflare.com/pages/functions/pricing/).

## 1. Criar o PostgreSQL no Neon

1. Crie uma conta e um projeto no Neon usando o plano Free.
2. Crie ou selecione o banco `casona54_app`.
3. Copie a connection string PostgreSQL. Guarde-a como segredo; ela será informada ao Render e não deve ser adicionada ao Git.

O backend aplica as migrations automaticamente na primeira inicialização.

## 2. Criar o frontend no Cloudflare Pages

1. No painel do Cloudflare, crie um projeto Pages conectado ao repositório GitHub `fabrinanunes/casona54`.
2. Configure a branch de produção como `main`.
3. Configure o diretório raiz como `frontend`.
4. Configure o comando de build como `npm run build` e o diretório de saída como `dist`.
5. O projeto já inclui `.nvmrc` com Node 22, a versão usada para compilar o frontend.
6. Faça o deploy inicial e anote a origem atribuída, por exemplo `https://casona54.pages.dev`.

O frontend usa `/api` por padrão em produção. O arquivo `frontend/functions/api/[[path]].ts` encaminha essas chamadas à API. O arquivo `frontend/public/_routes.json` limita a Function às rotas da API, preservando a entrega direta dos arquivos estáticos.

## 3. Criar a API no Render

1. No painel do Render, crie um Blueprint conectado ao mesmo repositório GitHub.
2. O Render encontrará `render.yaml` na raiz e configurará o serviço gratuito `casona54-api` com o backend Go e o health check `/health`.
3. Quando o Render solicitar as variáveis sem valor no Blueprint, informe:
   - `DATABASE_URL`: a connection string do Neon.
   - `FRONTEND_ORIGIN`: a origem do Cloudflare Pages anotada na etapa anterior, sem caminho adicional, por exemplo `https://casona54.pages.dev`.
4. Aguarde o deploy terminar e copie a URL pública da API, por exemplo `https://casona54-api.onrender.com`.

O Render fornece `PORT` automaticamente. O Blueprint define `APP_ENV=production`, que ativa o atributo `Secure` no cookie de sessão.

## 4. Conectar o proxy à API

1. No painel do Cloudflare Pages, abra as variáveis de ambiente do projeto.
2. Crie `API_ORIGIN` com a origem pública do Render, por exemplo `https://casona54-api.onrender.com`. Não inclua caminho nem barra final.
3. Faça um novo deploy do Pages para aplicar a variável.

O navegador chamará `https://casona54.pages.dev/api/...`; a Function encaminhará para `https://casona54-api.onrender.com/...`. As respostas de login e logout passam pela mesma origem do frontend, então o navegador pode armazenar e enviar o cookie de sessão.

## 5. Criar os usuários

Depois que a API iniciar e aplicar as migrations, crie cada usuário localmente usando a connection string do Neon. Execute a partir da pasta `backend`:

```sh
DATABASE_URL='COLE_A_CONNECTION_STRING_DO_NEON' go run ./cmd/create-admin
```

O comando solicita e-mail e senha. Repita para o segundo usuário. Não salve a connection string em arquivos versionados nem compartilhe os valores nos chats.

## 6. Conferir a publicação

1. Abra `https://casona54.pages.dev/api/health`; a resposta esperada é `{"status":"ok"}`. A URL correta usa o endereço Pages criado na sua conta.
2. Faça login pelo frontend e confira `/me`, a listagem de pagamentos, criação, edição e exclusão.
3. Confira o login e a sessão nos dois celulares.
4. Teste novamente depois de 15 minutos sem acessar a aplicação; a primeira chamada pode esperar o serviço do Render acordar.
5. Configure uma rotina para exportar o banco com `pg_dump` e guarde as cópias fora do repositório.

## O que continua manual

É necessário entrar nas contas de Cloudflare, Render e Neon, conectar cada provedor ao GitHub, criar o banco e inserir as URLs/credenciais nos painéis. Não coloque senhas, connection strings ou chaves de API no repositório. A criação dos usuários também exige executar o comando local com acesso ao banco hospedado.
