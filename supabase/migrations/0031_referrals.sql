-- Referral program — owners and providers share a unique code; when a new user
-- signs up via that code AND completes their first booking, both sides earn credit.

-- Each user gets exactly one referral code (a short, human-friendly string).
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by_code text;

-- Auto-generate a code for any profile that doesn't have one.
-- 8 chars, alphanumeric, upper-case — reads like "PWRA-A4B8".
CREATE OR REPLACE FUNCTION generate_referral_code() RETURNS text AS $$
DECLARE
  candidate text;
  collision integer;
BEGIN
  LOOP
    candidate := 'PWRA-' || upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 4));
    SELECT count(*) INTO collision FROM profiles WHERE referral_code = candidate;
    EXIT WHEN collision = 0;
  END LOOP;
  RETURN candidate;
END;
$$ LANGUAGE plpgsql;

-- Backfill existing profiles missing a code.
UPDATE profiles SET referral_code = generate_referral_code() WHERE referral_code IS NULL;

-- Trigger to assign one automatically for any new profile.
CREATE OR REPLACE FUNCTION set_referral_code_default() RETURNS trigger AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_set_referral_code ON profiles;
CREATE TRIGGER profiles_set_referral_code
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_referral_code_default();

-- Referral events — each successful referral generates two rows (one per side).
CREATE TABLE IF NOT EXISTS referral_events (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind         text        NOT NULL CHECK (kind IN ('signup', 'first_booking', 'reward_credit')),
  referral_code text       NOT NULL,
  referred_user_id uuid    REFERENCES profiles(id) ON DELETE SET NULL,
  amount_credit numeric(10, 2),
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE referral_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_read_own_referral_events" ON referral_events;
CREATE POLICY "users_read_own_referral_events" ON referral_events
  FOR SELECT
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS referral_events_user_id_idx       ON referral_events(user_id);
CREATE INDEX IF NOT EXISTS referral_events_referred_user_idx ON referral_events(referred_user_id);
