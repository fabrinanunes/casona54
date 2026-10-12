# Casona54

Aplicação de controle financeiro da casa, organizada como monorepo.

## Estrutura

- `frontend/`: interface React + TypeScript + Vite.
- `backend/`: API em Go e configuração do PostgreSQL.

## Desenvolvimento

### Frontend

```sh
cd frontend
npm install
npm run dev
```

Copie `frontend/.env.example` para `frontend/.env` e configure `VITE_API_URL`.

### Backend

```sh
cd backend
go run .
```

O backend usa PostgreSQL; consulte `backend/docker-compose.yml` para iniciar o banco.

## Histórico Git

Os históricos dos repositórios anteriores estão preservados nas branches locais
`frontend-history` e `backend-history`. Os remotes `frontend-origin` e
`backend-origin` apontam para os repositórios separados anteriores.
