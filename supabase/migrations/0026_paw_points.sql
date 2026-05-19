-- Paw Points loyalty ledger — each row is an earn or redeem event.
CREATE TABLE IF NOT EXISTS paw_points_ledger (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type         text        NOT NULL CHECK (type IN ('earn', 'redeem')),
  points       int         NOT NULL,   -- positive = earn, negative = redeem
  description  text        NOT NULL,
  reference_id text,                   -- booking_id or order_id
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE paw_points_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owners_own_points" ON paw_points_ledger;
CREATE POLICY "owners_own_points" ON paw_points_ledger
  FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE INDEX IF NOT EXISTS paw_points_owner_idx ON paw_points_ledger(owner_id);

-- Track how many points were redeemed per booking/order so we can refund on decline.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS points_redeemed int NOT NULL DEFAULT 0;
ALTER TABLE orders   ADD COLUMN IF NOT EXISTS points_redeemed int NOT NULL DEFAULT 0;
