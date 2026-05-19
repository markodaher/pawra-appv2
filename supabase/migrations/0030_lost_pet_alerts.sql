-- Lost Pet Alerts — community broadcast when an owner marks a pet as lost.
-- Visible to ALL authenticated users (RLS allows read for everyone) so the
-- alert spreads across the network. Only the owner can create/update/delete.

CREATE TABLE IF NOT EXISTS lost_pet_alerts (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id          uuid        NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  owner_id        uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  owner_name      text        NOT NULL,
  owner_phone     text,
  pet_name        text        NOT NULL,
  pet_species     text        NOT NULL,
  pet_breed       text,
  pet_image_url   text,
  last_seen_label text        NOT NULL,                       -- e.g. "Achrafieh, Beirut"
  last_seen_coords jsonb,                                     -- {lat, lng}
  notes           text,
  status          text        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'found', 'closed')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  resolved_at     timestamptz
);

ALTER TABLE lost_pet_alerts ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can READ active alerts — that's the whole point.
DROP POLICY IF EXISTS "anyone_reads_lost_alerts" ON lost_pet_alerts;
CREATE POLICY "anyone_reads_lost_alerts" ON lost_pet_alerts
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only the owner can create, update, or delete their own alerts.
DROP POLICY IF EXISTS "owners_manage_own_alerts" ON lost_pet_alerts;
CREATE POLICY "owners_manage_own_alerts" ON lost_pet_alerts
  FOR ALL
  USING  (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE INDEX IF NOT EXISTS lost_pet_alerts_status_idx     ON lost_pet_alerts(status);
CREATE INDEX IF NOT EXISTS lost_pet_alerts_owner_id_idx   ON lost_pet_alerts(owner_id);
CREATE INDEX IF NOT EXISTS lost_pet_alerts_created_at_idx ON lost_pet_alerts(created_at DESC);
