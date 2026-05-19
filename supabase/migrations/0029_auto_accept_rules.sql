-- Auto-accept rules — provider-level config to auto-confirm low-risk bookings.
-- Stored on the providers row so it survives across devices.

ALTER TABLE providers ADD COLUMN IF NOT EXISTS auto_accept_enabled        boolean NOT NULL DEFAULT false;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS auto_accept_max_amount     numeric(10, 2);
ALTER TABLE providers ADD COLUMN IF NOT EXISTS auto_accept_min_hours_ahead integer;
