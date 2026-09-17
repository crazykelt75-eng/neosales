-- The original live schema deducted stock when payment was confirmed. The
-- hardened checkout reserves stock atomically when the order is created, so
-- leaving this trigger active would deduct a second time.
drop trigger if exists trg_order_status_stock_sync on public.orders;
drop function if exists public.handle_order_status_stock_sync();
