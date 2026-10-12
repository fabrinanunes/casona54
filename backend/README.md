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