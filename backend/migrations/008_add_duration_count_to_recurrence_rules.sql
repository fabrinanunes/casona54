ALTER TABLE payment_recurrence_rules
ADD COLUMN duration_count INTEGER
CHECK (duration_count IS NULL OR duration_count > 0);
