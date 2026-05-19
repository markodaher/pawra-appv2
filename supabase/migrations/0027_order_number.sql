-- Stable, human-readable sequential order number.
-- Postgres sequences never repeat, even on transaction rollback.
-- Starts at 1001 so it looks professional from day one.

CREATE SEQUENCE IF NOT EXISTS pawra_order_number_seq START 1001 INCREMENT 1;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS order_number integer
  DEFAULT nextval('pawra_order_number_seq');

-- Back-fill any existing rows that have no number yet.
UPDATE orders
SET order_number = nextval('pawra_order_number_seq')
WHERE order_number IS NULL;

-- Lock it down: every row must have a number and no two rows can share one.
ALTER TABLE orders ALTER COLUMN order_number SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS orders_order_number_idx ON orders(order_number);
