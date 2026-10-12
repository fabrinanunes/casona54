CREATE TABLE payments (
    id SERIAL PRIMARY KEY, -- SERIA faz o id ser gerado automaticamente
    description TEXT NOT NULL,
    amount BIGINT NOT NULL,
    due_date DATE NOT NULL,
    category TEXT NOT NULL,
    responsible TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
);