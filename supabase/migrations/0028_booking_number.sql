-- Stable, human-readable sequential booking number.
-- Same pattern as order_number: Postgres sequences never repeat.
-- Starts at 1001 to match orders for visual consistency.

CREATE SEQUENCE IF NOT EXISTS pawra_booking_number_seq START 1001 INCREMENT 1;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS booking_number integer
  DEFAULT nextval('pawra_booking_number_seq');

-- Back-fill any existing rows that have no number yet.
UPDATE bookings
SET booking_number = nextval('pawra_booking_number_seq')
WHERE booking_number IS NULL;

-- Lock it down: every row must have a number and no two rows can share one.
ALTER TABLE bookings ALTER COLUMN booking_number SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS bookings_booking_number_idx ON bookings(booking_number);
