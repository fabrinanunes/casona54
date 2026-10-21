# Backend do Casona54

API em Go para autenticação e gerenciamento dos pagamentos da casa. O banco local usa PostgreSQL; o backend aplica automaticamente as migrations pendentes quando inicia.

## Requisitos

- Go instalado.
- Docker com Docker Compose, para iniciar o PostgreSQL local.
- PostgreSQL acessível pela URL configurada em `DATABASE_URL`.

## Rodar localmente

Execute os comandos a partir da raiz do repositório, exceto quando indicado.

### 1. Iniciar o PostgreSQL

```sh
docker compose -f backend/docker-compose.yml up -d postgres
```

O serviço local usa estes dados de desenvolvimento, definidos em `backend/docker-compose.yml`:

- Banco: `casona54_app`
- Usuário: `postgres`
- Senha: `postgres`
- Porta: `5432`

Essas credenciais são apenas para desenvolvimento local.

### 2. Iniciar o backend

```sh
cd backend
DATABASE_URL='postgres://postgres:postgres@localhost:5432/casona54_app?sslmode=disable' go run .
```

Na primeira inicialização de um banco vazio, o backend cria `schema_migrations` e aplica os arquivos de `backend/migrations/` em ordem. Migrations aplicadas são registradas pelo nome do arquivo e não são executadas novamente. Se uma migration falhar, o backend informa o arquivo no log e não inicia o servidor.

O servidor local escuta em `http://localhost:8080`. Para interrompê-lo, use `Ctrl+C`; o servidor encerra as requisições em andamento e o agendador de recorrências também para.

### 3. Criar o usuário administrador

Depois que o backend tiver iniciado ao menos uma vez e aplicado as migrations, abra outro terminal:

```sh
cd backend
DATABASE_URL='postgres://postgres:postgres@localhost:5432/casona54_app?sslmode=disable' go run ./cmd/create-admin
```

O comando solicita e-mail e senha no terminal e salva o hash da senha no banco. Não há rota pública para criar usuários. Execute o comando novamente apenas para cadastrar outro usuário; o e-mail precisa ser único.

### 4. Iniciar o frontend

Em outro terminal, a partir da raiz:

```sh
cp frontend/.env.example frontend/.env
cd frontend
npm install
npm run dev
```

O arquivo de exemplo configura `VITE_API_URL=http://localhost:8080`. O backend local permite requisições do frontend em `http://localhost:5173` e usa cookies para a sessão.

## Contratos da API

### Pagamento

Os objetos de pagamento usam estes campos JSON:

| Campo | Tipo | Significado |
| --- | --- | --- |
| `id` | número inteiro | Identificador do pagamento. |
| `description` | string | Descrição obrigatória. |
| `amount` | número | Valor em reais, por exemplo `12.34` para R$ 12,34. |
| `due_date` | string `YYYY-MM-DD` | Data de vencimento. |
| `category` | string | Categoria do pagamento. |
| `responsible` | string | Responsável informado no pagamento. Aceita somente as opções Fabrina ou Eduardo |
| `status` | string | `pending` ou `paid`. |
| `paid_at` | string `YYYY-MM-DD` ou vazia | Data do pagamento; vazia quando pendente. |
| `frequency` | string | `once`, `weekly`, `monthly` ou `yearly`. |
| `duration_count` | integer | Enviado na criação; obrigatório para frequência recorrente. A unidade depende da frequência: semanas, meses ou anos. Inclui o primeiro período. |
| `is_recurring` | boolean | Campo devolvido pela listagem para identificar pagamentos ligados a uma regra recorrente. |

Criação e edição validam os campos no backend. Pagamentos pendentes não podem ter `paid_at`; pagamentos pagos precisam ter uma data válida.

### Sessão

O login recebe `email` e `password`. Em caso de sucesso, a API define o cookie `session_token` como `HttpOnly`, com validade de 24 horas. As rotas protegidas exigem esse cookie. O logout remove a sessão.

## Rotas

| Método | Rota | Sessão | Uso |
| --- | --- | --- | --- |
| `GET` | `/health` | Não | Verificar se a API responde. |
| `POST` | `/login` | Não | Autenticar com e-mail e senha. |
| `POST` | `/logout` | Não | Encerrar a sessão atual. |
| `GET` | `/me` | Sim | Consultar o usuário da sessão atual. |
| `PUT` | `/me/password` | Sim | Alterar a senha autenticada. |
| `GET` | `/payments` | Sim | Listar pagamentos. |
| `POST` | `/payments` | Sim | Criar pagamento. |
| `GET` | `/payments/{id}` | Sim | Consultar um pagamento. |
| `PUT` | `/payments/{id}` | Sim | Editar um pagamento. |
| `DELETE` | `/payments/{id}` | Sim | Excluir um pagamento avulso; em uma recorrência, excluir o selecionado e os posteriores, mantendo os anteriores. |
| `PATCH` | `/payments/{id}/pay` | Sim | Marcar como pago; usa a data atual de São Paulo se ainda não houver data de pagamento. |

## Pagamentos recorrentes

Frequências `weekly`, `monthly` e `yearly` criam uma regra de recorrência junto com o primeiro pagamento. A frequência `once` não cria uma regra. Novas recorrências exigem `duration_count` maior que zero; sua unidade segue a frequência (por exemplo, 3 semanas, 3 meses ou 3 anos). O primeiro vencimento conta como o início da duração, e a data final é exclusiva: uma recorrência mensal de 3 meses com início em 31 de janeiro inclui 31 de janeiro, fevereiro e março, mas não inclui abril. O backend gera as ocorrências dentro da duração e de uma janela móvel de 12 meses; recorrências mais longas são completadas pelo agendador diário. Regras criadas antes da migration 008 continuam usando `duration_months` e preservam o limite que já tinham.

O gerador trata meses mais curtos, mantendo o dia dentro do limite do mês (por exemplo, vencimento no dia 31 passa para o último dia de fevereiro). Editar uma ocorrência altera somente aquele pagamento; não altera os dados da regra nem os demais pagamentos da série. Excluir uma ocorrência remove ela e todas as posteriores e desativa a regra de recorrência numa transação.

## Migrations

Os arquivos SQL ficam em `backend/migrations/`. Migrations aplicadas e seus registros em `schema_migrations` são gravados na mesma transação. Para conferir o histórico no banco local:

```sh
docker compose -f backend/docker-compose.yml exec -T postgres \
  psql -U postgres -d casona54_app \
  -c "SELECT version, applied_at FROM schema_migrations ORDER BY version;"
```

### Banco local existente sem histórico de migrations

Use este procedimento somente se as migrations correspondentes já foram aplicadas manualmente e as tabelas/colunas já existem. Ele registra o histórico sem executar novamente os arquivos:

```sh
docker compose -f backend/docker-compose.yml exec -T postgres \
  psql -U postgres -d casona54_app \
  -c "CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()); INSERT INTO schema_migrations (version) VALUES ('001_create_payments.sql'), ('002_create_users_and_sessions.sql'), ('003_add_paid_at_to_payments.sql'), ('004_amount_numeric.sql'), ('005_add_frequency_to_payments.sql'), ('006_create_payment_recurrence_rules.sql') ON CONFLICT (version) DO NOTHING;"
```

Não registre uma migration como aplicada se o SQL dela ainda não foi aplicado ao banco. Para um banco vazio, não crie registros manualmente: inicie o backend e deixe o runner aplicar as migrations.

### Adicionar uma migration

1. Crie um novo arquivo SQL em `backend/migrations/` com o próximo prefixo numérico, por exemplo `008_add_example_column.sql`.
2. Não altere migrations que já foram aplicadas em algum banco; crie um novo arquivo para cada mudança de schema.
3. Inicie o backend para aplicar e registrar a migration.
4. Consulte `schema_migrations` para confirmar o registro.

## Hospedagem

O CORS do backend está configurado para `http://localhost:5173`, e o cookie de sessão ainda não usa o atributo `Secure`. Antes de hospedar, será necessário configurar a origem real do frontend e cookies para HTTPS, além de usar credenciais e variáveis de ambiente próprias do ambiente publicado. A preparação da hospedagem está na etapa 17 do roteiro do projeto.
