ALTER TABLE payments
ADD COLUMN frequency TEXT NOT NULL DEFAULT 'once';

ALTER TABLE payments
ADD CONSTRAINT payments_frequency_check
CHECK (frequency IN ('once', 'weekly', 'monthly', 'yearly'));