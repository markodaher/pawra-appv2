ALTER TABLE bookings ADD COLUMN IF NOT EXISTS recurring boolean NOT NULL DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS recurring_interval text CHECK (
  recurring_interval IN ('weekly', 'biweekly', 'monthly') OR recurring_interval IS NULL
);
