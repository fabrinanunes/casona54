ALTER TABLE payment_recurrence_rules
ADD COLUMN duration_months INTEGER
CHECK (duration_months IS NULL OR duration_months > 0);