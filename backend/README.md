# Contratos

## User
- login: string
- password: ??
- created_at: date

## Payment
- id: int64
- payee: string
- description: string
- amount: ???
- due_data: date
- frequency: string
- category: string
- responsible: string
- status: string
- paid_at: date
- created_at: date
- updated_at: date

# Endpoints

## User
- POST /api/auth/login --check
- POST /api/auth/logout --check
- GET /api/auth/me

## Payment
- GET /api/dashboard
- GET /api/payments --check
- POST /api/payments --check
- GET /api/payments/:id --check
- PUT /api/payments/:id --check
- DELETE /api/payments/:id --check
- PATCH /api/payments/:id/pay

## Database migrations

The backend applies pending SQL migrations automatically when it starts. Migration files live in `backend/migrations/` and are applied in filename order (`001_...sql`, `002_...sql`, and so on). Each successfully applied filename is recorded in the `schema_migrations` table. Every migration and its history record are committed in the same database transaction. If a migration fails, the backend logs the filename and stops starting up.

### Start the local database

From the repository root:

```sh
docker compose -f backend/docker-compose.yml up -d postgres
```

### Use an existing database

The local `casona54_app` database already has migrations `001` through `006` applied. If it does not yet have a migration history table, register that existing state once before starting the backend with the automatic migration runner:

```sh
docker compose -f backend/docker-compose.yml exec -T postgres \
  psql -U postgres -d casona54_app \
  -c "CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()); INSERT INTO schema_migrations (version) VALUES ('001_create_payments.sql'), ('002_create_users_and_sessions.sql'), ('003_add_paid_at_to_payments.sql'), ('004_amount_numeric.sql'), ('005_add_frequency_to_payments.sql'), ('006_create_payment_recurrence_rules.sql') ON CONFLICT (version) DO NOTHING;"
```

Only register a migration as applied if its SQL has already been successfully applied to that database. This one-time bootstrap prevents the runner from trying to recreate tables and columns that already exist.

### Use a new database

Create an empty database in PostgreSQL, then start the backend with its connection URL. Do not seed `schema_migrations` in a new database; the backend will create the table and apply all migrations from `001` onward.

For example, with the local Docker PostgreSQL service:

```sh
docker compose -f backend/docker-compose.yml exec -T postgres \
  psql -U postgres -d casona54_app \
  -c "CREATE DATABASE casona54_new;"

cd backend
DATABASE_URL='postgres://postgres:postgres@localhost:5432/casona54_new?sslmode=disable' go run .
```

The `DATABASE_URL` variable is read by the backend process. The example sets it for this command only.

### Check migration history

Run this from the repository root, replacing the database name if needed:

```sh
docker compose -f backend/docker-compose.yml exec -T postgres \
  psql -U postgres -d casona54_app \
  -c "SELECT version, applied_at FROM schema_migrations ORDER BY version;"
```

### Add a future migration

1. Add a new SQL file in `backend/migrations/` with the next numeric prefix, for example `007_add_example_column.sql`.
2. Do not edit migration files that have already been applied to a database. Add a new file for each schema change.
3. Start the backend. The runner applies the new file and records its filename in `schema_migrations`.
4. Check the history table to confirm the new filename was recorded.
