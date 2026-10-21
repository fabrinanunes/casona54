# Casona54

Aplicação de controle financeiro da casa, organizada como monorepo.

## Estrutura

- `frontend/`: interface React + TypeScript + Vite.
- `backend/`: API em Go, migrations SQL e configuração local do PostgreSQL.

## Requisitos

- Docker com Docker Compose.
- Go.
- Node.js e npm. Use a versão indicada em `frontend/.nvmrc`; as dependências atuais exigem Node 20.19+, 22.13+ ou 24+.

## Rodar localmente

### 1. Iniciar o banco e o backend

Inicie o PostgreSQL na raiz do repositório:

```sh
docker compose -f backend/docker-compose.yml up -d postgres
```

Em outro terminal, inicie o backend. Na primeira execução em um banco vazio, ele aplica automaticamente as migrations:

```sh
cd backend
DATABASE_URL='postgres://postgres:postgres@localhost:5432/casona54_app?sslmode=disable' go run .
```

### 2. Criar o usuário administrador

Depois que o backend aplicar as migrations, abra outro terminal:

```sh
cd backend
DATABASE_URL='postgres://postgres:postgres@localhost:5432/casona54_app?sslmode=disable' go run ./cmd/create-admin
```

O comando solicita e-mail e senha. Não existe cadastro de usuário pela interface.

### 3. Iniciar o frontend

Na raiz do repositório, copie o arquivo de ambiente de exemplo e inicie o Vite:

```sh
cp frontend/.env.example frontend/.env
cd frontend
npm install
npm run dev
```

O frontend usa `http://localhost:8080` como API e fica disponível no endereço mostrado pelo Vite (normalmente `http://localhost:5173`).

Para rotas, campos da API, autenticação, recorrências e detalhes das migrations, consulte [`backend/README.md`](backend/README.md).

## Hospedagem gratuita

O projeto está preparado para Cloudflare Pages (frontend), Render Free (API Go) e Neon Free (PostgreSQL). Consulte [`DEPLOYMENT.md`](DEPLOYMENT.md) para configurar os serviços, variáveis e usuário inicial. Os planos gratuitos têm limites de disponibilidade e uso.

## Histórico Git

Os históricos dos repositórios anteriores estão preservados nas branches locais
`frontend-history` e `backend-history`. Os remotes `frontend-origin` e
`backend-origin` apontam para os repositórios separados anteriores.
