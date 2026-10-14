CREATE TABLE payment_recurrence_rules (
    id SERIAL PRIMARY KEY,
    description TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    frequency TEXT NOT NULL
        CHECK (frequency IN ('weekly', 'monthly', 'yearly')),
    first_due_date DATE NOT NULL,
    next_occurrence INTEGER NOT NULL DEFAULT 1
        CHECK (next_occurrence >= 1),
    category TEXT NOT NULL,
    responsible TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE payments
ADD COLUMN recurrence_rule_id INTEGER
REFERENCES payment_recurrence_rules(id)
ON DELETE SET NULL;

CREATE UNIQUE INDEX idx_payments_recurrence_due_date
ON payments (recurrence_rule_id, due_date)
WHERE recurrence_rule_id IS NOT NULL;