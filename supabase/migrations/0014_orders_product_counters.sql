-- Pawra v2 — keep products.sales / products.stockCount in sync with orders.
-- Run after 0013. Idempotent.
--
-- Why a trigger: products RLS only lets the vendor update their own rows.
-- When an OWNER places an order, the client-side update bounced off RLS and
-- the counters never moved — provider's "Items sold" stayed frozen.
-- The trigger function is SECURITY DEFINER so it can update products on
-- behalf of either party regardless of who owns the order row.
--
-- Behaviour:
--   INSERT order with status='placed' → decrement stockCount per item.qty
--   UPDATE order → 'completed'        → increment sales per item.qty
--   UPDATE order → 'cancelled'|'declined' from anything-but-final
--                                      → restore stockCount per item.qty
--
-- Items live in orders.items as a jsonb array of {id, qty, ...}; we use
-- jsonb_array_elements to fan that out into per-row operations.

create or replace function public.orders_apply_product_counters()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  qty_int int;
begin
  if (tg_op = 'INSERT') then
    -- Stock comes off as soon as the order is placed so two buyers can't
    -- claim the last unit between placement and fulfilment.
    if new.items is not null then
      for rec in
        select (elem->>'id')::uuid as product_id,
               coalesce((elem->>'qty')::int, 0) as qty
        from jsonb_array_elements(new.items) elem
      loop
        if rec.product_id is not null and rec.qty > 0 then
          update public.products
             set stock_count = greatest(0, stock_count - rec.qty)
           where id = rec.product_id;
        end if;
      end loop;
    end if;
    return new;
  end if;

  if (tg_op = 'UPDATE') then
    -- Sales bump only on the placed/confirmed/shipped → completed transition.
    if new.status = 'completed' and old.status is distinct from 'completed' then
      if new.items is not null then
        for rec in
          select (elem->>'id')::uuid as product_id,
                 coalesce((elem->>'qty')::int, 0) as qty
          from jsonb_array_elements(new.items) elem
        loop
          if rec.product_id is not null and rec.qty > 0 then
            update public.products
               set sales = sales + rec.qty
             where id = rec.product_id;
          end if;
        end loop;
      end if;
    end if;

    -- Refund stock when an order is cancelled/declined and it wasn't already
    -- in a final state (avoids double-refund on idempotent updates).
    if new.status in ('cancelled', 'declined')
       and old.status not in ('cancelled', 'declined', 'completed') then
      if new.items is not null then
        for rec in
          select (elem->>'id')::uuid as product_id,
                 coalesce((elem->>'qty')::int, 0) as qty
          from jsonb_array_elements(new.items) elem
        loop
          if rec.product_id is not null and rec.qty > 0 then
            update public.products
               set stock_count = stock_count + rec.qty
             where id = rec.product_id;
          end if;
        end loop;
      end if;
    end if;

    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists orders_apply_product_counters_ins on public.orders;
create trigger orders_apply_product_counters_ins
  after insert on public.orders
  for each row execute function public.orders_apply_product_counters();

drop trigger if exists orders_apply_product_counters_upd on public.orders;
create trigger orders_apply_product_counters_upd
  after update on public.orders
  for each row execute function public.orders_apply_product_counters();
