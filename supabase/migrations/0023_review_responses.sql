-- Allow providers to publicly respond to reviews left on their profile.
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS response text;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS responded_at timestamptz;

-- Providers can update the response field on reviews that belong to them.
-- Owners can still only insert/delete their own reviews (existing policies unchanged).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'reviews' AND policyname = 'providers_respond_reviews'
  ) THEN
    CREATE POLICY "providers_respond_reviews" ON reviews
      FOR UPDATE
      USING  (provider_id = auth.uid())
      WITH CHECK (provider_id = auth.uid());
  END IF;
END $$;
