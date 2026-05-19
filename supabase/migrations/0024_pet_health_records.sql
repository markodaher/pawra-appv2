CREATE TABLE IF NOT EXISTS pet_health_records (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id      uuid        NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  owner_id    uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        text        NOT NULL CHECK (type IN ('vaccination','medication','vet_visit','deworming','weight','allergy')),
  title       text        NOT NULL,
  date        date,
  notes       text,
  next_due    date,
  dosage      text,
  frequency   text,
  weight_kg   numeric(5,2),
  severity    text        CHECK (severity IN ('mild','moderate','severe') OR severity IS NULL),
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE pet_health_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_manage_pet_health" ON pet_health_records
  FOR ALL
  USING  (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE INDEX IF NOT EXISTS pet_health_records_pet_id_idx ON pet_health_records(pet_id);
CREATE INDEX IF NOT EXISTS pet_health_records_owner_id_idx ON pet_health_records(owner_id);
