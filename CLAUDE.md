# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Casona54** is a household financial management application — a monorepo with a React/TypeScript frontend and a Go backend, backed by PostgreSQL.

## Development Commands

### Frontend (`/frontend`)

```sh
npm install        # Install dependencies
npm run dev        # Start Vite dev server
npm run build      # TypeScript compile + production build
npm run lint       # ESLint
npm run preview    # Preview production build
```

Requires a `.env` file (copy from `.env.example`):
```
VITE_API_URL=http://localhost:8080
```

### Backend (`/backend`)

```sh
docker-compose up -d    # Start PostgreSQL (port 5432)
go run .                # Start API server on :8080
```

Database credentials: user `postgres`, password `postgres`, database `casona54_app`.

There is no test suite currently configured.

## Architecture

### Structure

```
casona54/
├── frontend/src/
│   ├── components/     # React UI components
│   ├── services/       # API client (api.ts, authService.ts, paymentsService.ts)
│   ├── hooks/
│   ├── types/
│   └── utils/
├── backend/
│   ├── main.go         # Server entry point, route registration
│   ├── auth.go         # Login/logout/password change handlers
│   ├── payments.go     # Payments CRUD handlers
│   ├── database.go     # pgx connection pool setup
│   ├── cors.go         # CORS middleware
│   ├── middleware.go   # Cookie-based auth middleware
│   ├── migrations/     # SQL migration files (applied manually)
│   └── cmd/            # CLI commands (e.g., admin bootstrap)
```

### Backend

- Go standard library `net/http` for the REST API; no framework
- pgx/v5 for PostgreSQL access
- Cookie-based session authentication with auth middleware protecting routes
- SQL migrations in `backend/migrations/` are applied manually

### Frontend

- React 19 + TypeScript (strict mode: `noUnusedLocals`, `noUnusedParameters`)
- Services in `src/services/` make all HTTP calls — components do not fetch directly
- ESLint flat config (v9+)

### API Endpoints

| Method | Path | Auth |
|--------|------|------|
| GET | `/health` | No |
| POST | `/login` | No |
| POST | `/logout` | Yes |
| GET | `/me` | Yes |
| PUT | `/me/password` | Yes |
| GET | `/payments` | Yes |
| POST | `/payments` | Yes |
| PUT | `/payments/{id}` | Yes |
| DELETE | `/payments/{id}` | Yes |
| PATCH | `/payments/{id}/pay` | Yes |

## Active Roadmap

Development priorities are tracked in `TODO.md`. Current focus areas include:

1. Implementing automatic payment generation for weekly, monthly, and annual rules; see `TODO.md` for remaining decisions and validation.
2. Backend input validation and monetary precision
3. Session hardening and migration automation
