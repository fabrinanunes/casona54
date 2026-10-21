# AGENTS.md

Guidance for Codex and other coding agents working in this repository.

## Project overview

Casona54 is a household finance application in a monorepo, with a React + TypeScript frontend, a Go HTTP API, and PostgreSQL.

## Development commands

### Frontend

Use Node.js 20.19+, 22.13+, or 24+, as specified by `frontend/.nvmrc` and `frontend/package.json`.

Run from `frontend/`:

```sh
npm install
npm run dev
npm run lint
npm run build
```

Create `frontend/.env` from `.env.example`; local development uses `VITE_API_URL=http://localhost:8080`.

### Backend and database

Run from the repository root to start local PostgreSQL:

```sh
docker compose -f backend/docker-compose.yml up -d postgres
```

Run the API from `backend/`:

```sh
DATABASE_URL='postgres://postgres:postgres@localhost:5432/casona54_app?sslmode=disable' go run .
```

The API automatically applies pending migrations at startup. After the first successful startup, create an admin from `backend/` with:

```sh
DATABASE_URL='postgres://postgres:postgres@localhost:5432/casona54_app?sslmode=disable' go run ./cmd/create-admin
```

There is no automated test suite currently configured. `npm run lint`, `npm run build`, `go vet ./...`, and `go build ./...` are available for static checks and builds.

## Architecture

```text
casona54/
├── frontend/src/
│   ├── components/     # React UI
│   ├── constants/      # Shared labels and values
│   ├── hooks/           # UI state and effects
│   ├── services/        # API client and domain requests
│   ├── types/           # TypeScript data types
│   └── utils/           # Formatting, filtering, and calculations
└── backend/
    ├── main.go          # Server startup and route registration
    ├── auth.go          # Authentication and password handlers
    ├── payments.go      # Payment HTTP handlers and validation
    ├── recurrence.go    # Recurring payment generation
    ├── database.go      # PostgreSQL connection pool
    ├── migrations.go    # Automatic migration runner
    ├── middleware.go    # Cookie session authentication
    ├── migrations/      # Embedded SQL migrations, applied at startup
    └── cmd/              # Backend command-line tools
```

The official development roadmap is `TODO.md`; consult it before proposing the next implementation step.

## API routes

| Method | Path | Authentication |
| --- | --- | --- |
| `GET` | `/health` | No |
| `POST` | `/login` | No |
| `POST` | `/logout` | No; uses the session cookie when present |
| `GET` | `/me` | Yes |
| `PUT` | `/me/password` | Yes |
| `GET` | `/payments` | Yes |
| `POST` | `/payments` | Yes |
| `GET` | `/payments/{id}` | Yes |
| `PUT` | `/payments/{id}` | Yes |
| `DELETE` | `/payments/{id}` | Yes |
| `PATCH` | `/payments/{id}/pay` | Yes |
