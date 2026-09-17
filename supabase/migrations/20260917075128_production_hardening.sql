-- NeoSales production hardening
--
-- This migration turns the original local-first demo into a database-backed
-- sales system. Public callers only receive narrow RPC access. Seller actions
-- require a Supabase Auth user listed in public.admin_users.

create extension if not exists pgcrypto;
create schema if not exists private;

-- ---------------------------------------------------------------------------
-- Seller authorization and operational data
-- ---------------------------------------------------------------------------

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'NeoSales seller',
  created_at timestamptz not null default now()
);

create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code) and code ~ '^[A-Z0-9_-]{3,32}$'),
  percent_off smallint not null check (percent_off between 1 and 100),
  min_subtotal_bwp numeric(10,2) not null default 0 check (min_subtotal_bwp >= 0),
  max_discount_bwp numeric(10,2) check (max_discount_bwp is null or max_discount_bwp > 0),
  is_active boolean not null default true,
  expires_at date,
  description text not null default '',
  usage_count integer not null default 0 check (usage_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  label text not null,
  detail text,
  actor text not null check (actor in ('customer', 'seller', 'system')),
  created_at timestamptz not null default now()
);

create index if not exists order_events_order_created_idx
  on public.order_events(order_id, created_at);

create table if not exists public.stock_alerts (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  customer_phone text not null check (customer_phone ~ '^\+267[0-9]{8}$'),
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (variant_id, customer_phone)
);

create index if not exists stock_alerts_pending_idx
  on public.stock_alerts(created_at) where notified_at is null;

alter table public.customer_reviews
  add column if not exists order_id uuid references public.orders(id) on delete set null;
alter table public.customer_reviews
  alter column is_verified set default false;

create index if not exists customer_reviews_order_idx
  on public.customer_reviews(order_id) where order_id is not null;

-- Older deployments used a four-digit sequence reference. New references carry
-- 40 bits of randomness and are no longer enumerable in practice.
alter table public.orders alter column order_number drop default;
alter table public.orders alter column order_number type varchar(20);

insert into public.promo_codes
  (code, percent_off, min_subtotal_bwp, max_discount_bwp, is_active, description)
values
  ('SUMMER10', 10, 300, 150, true, '10% off orders from P300 — summer campaign'),
  ('FIRSTORDER', 15, 250, 200, true, 'Welcome offer for first-time buyers'),
  ('FRANCISTOWN', 5, 0, null, true, 'Loyalty offer for Francistown customers')
on conflict (code) do nothing;

-- ---------------------------------------------------------------------------
-- Private helpers
-- ---------------------------------------------------------------------------

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

create or replace function private.new_order_number()
returns text
language sql
volatile
set search_path = ''
as $$
  select 'NS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
$$;

create or replace function private.variant_label(p_variant public.product_variants)
returns text
language sql
immutable
set search_path = ''
as $$
  select concat_ws(' · ',
    case when p_variant.volume_ml is not null then p_variant.volume_ml::text || 'ml' end,
    p_variant.size,
    p_variant.color,
    p_variant.scent_profile
  );
$$;

create or replace function private.order_json(p_order_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', o.id,
    'order_number', o.order_number,
    'customer_name', o.customer_name,
    'customer_phone', o.customer_phone,
    'customer_town', o.customer_town,
    'customer_address', o.customer_address,
    'delivery_preference', o.delivery_preference,
    'payment_method', o.payment_method,
    'subtotal_bwp', o.subtotal_bwp,
    'discount_bwp', o.discount_bwp,
    'bundle_discount_bwp', o.bundle_discount_bwp,
    'promo_code', o.promo_code,
    'promo_discount_bwp', o.promo_discount_bwp,
    'delivery_fee_bwp', o.delivery_fee_bwp,
    'total_amount_bwp', o.total_amount_bwp,
    'status', o.status,
    'channel', o.channel,
    'payment_reference', o.payment_reference,
    'verification_notes', o.verification_notes,
    'verified_at', o.verified_at,
    'cancelled_at', o.cancelled_at,
    'cancel_reason', o.cancel_reason,
    'pickup_date', o.pickup_date,
    'pickup_window', o.pickup_window,
    'pickup_point', o.pickup_point,
    'created_at', o.created_at,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', oi.id,
        'product_id', oi.product_id,
        'variant_id', oi.variant_id,
        'product_title', oi.product_title_snapshot,
        'variant_label', oi.variant_label_snapshot,
        'unit_price_bwp', oi.unit_price_bwp,
        'quantity', oi.quantity,
        'line_total_bwp', oi.line_total_bwp
      ) order by oi.id)
      from public.order_items oi
      where oi.order_id = o.id
    ), '[]'::jsonb),
    'timeline', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', oe.id,
        'at', oe.created_at,
        'label', oe.label,
        'detail', oe.detail,
        'actor', oe.actor
      ) order by oe.created_at)
      from public.order_events oe
      where oe.order_id = o.id
    ), '[]'::jsonb)
  )
  from public.orders o
  where o.id = p_order_id;
$$;

-- ---------------------------------------------------------------------------
-- Atomic public checkout
-- ---------------------------------------------------------------------------

create or replace function public.create_public_order(
  p_customer jsonb,
  p_payment_method text,
  p_items jsonb,
  p_promo_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := btrim(coalesce(p_customer->>'name', ''));
  v_phone text := regexp_replace(coalesce(p_customer->>'phone', ''), '[^0-9+]', '', 'g');
  v_town text := btrim(coalesce(p_customer->>'town', ''));
  v_address text := btrim(coalesce(p_customer->>'address', ''));
  v_delivery public.delivery_preference;
  v_payment public.payment_method;
  v_delivery_fee numeric(10,2);
  v_subtotal numeric(10,2) := 0;
  v_perfume_subtotal numeric(10,2) := 0;
  v_perfume_units integer := 0;
  v_bundle_discount numeric(10,2) := 0;
  v_promo_discount numeric(10,2) := 0;
  v_discount numeric(10,2) := 0;
  v_code text := nullif(upper(btrim(coalesce(p_promo_code, ''))), '');
  v_promo public.promo_codes%rowtype;
  v_order public.orders%rowtype;
  v_line record;
  v_variant public.product_variants%rowtype;
  v_product public.products%rowtype;
begin
  if jsonb_typeof(p_customer) <> 'object' then
    raise exception using message = 'Customer details are required', errcode = '22023';
  end if;
  if char_length(v_name) < 2 or char_length(v_name) > 160 then
    raise exception using message = 'Enter a valid customer name', errcode = '22023';
  end if;
  if v_phone !~ '^\+267[0-9]{8}$' then
    raise exception using message = 'Enter a valid Botswana mobile number', errcode = '22023';
  end if;
  if char_length(v_town) < 2 or char_length(v_town) > 80 then
    raise exception using message = 'Enter a valid town', errcode = '22023';
  end if;
  if char_length(v_address) > 255 then
    raise exception using message = 'Address is too long', errcode = '22023';
  end if;

  begin
    v_delivery := (p_customer->>'delivery_preference')::public.delivery_preference;
    v_payment := p_payment_method::public.payment_method;
  exception when invalid_text_representation then
    raise exception using message = 'Invalid delivery or payment method', errcode = '22023';
  end;

  if v_payment = 'cash_on_pickup' and v_delivery <> 'francistown_pickup' then
    raise exception using message = 'Cash payment is only available for Francistown pickup', errcode = '22023';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 20 then
    raise exception using message = 'Your bag must contain between 1 and 20 items', errcode = '22023';
  end if;

  -- Lock variants in a stable order to prevent overselling and deadlocks.
  for v_line in
    select x.variant_id, sum(x.quantity)::integer as quantity
    from jsonb_to_recordset(p_items) as x(variant_id uuid, quantity integer)
    group by x.variant_id
    order by x.variant_id
  loop
    if v_line.quantity < 1 or v_line.quantity > 10 then
      raise exception using message = 'Each item quantity must be between 1 and 10', errcode = '22023';
    end if;

    select pv, p
      into v_variant, v_product
    from public.product_variants pv
    join public.products p on p.id = pv.product_id
    where pv.id = v_line.variant_id and p.is_active = true
    for update of pv;

    if not found then
      raise exception using message = 'An item in your bag is no longer available', errcode = 'P0001';
    end if;
    if v_variant.stock_quantity < v_line.quantity then
      raise exception using message = format('%s only has %s left', v_product.title, v_variant.stock_quantity), errcode = 'P0001';
    end if;

    v_subtotal := v_subtotal + (v_variant.price_bwp * v_line.quantity);
    if v_product.category = 'perfumes' then
      v_perfume_units := v_perfume_units + v_line.quantity;
      v_perfume_subtotal := v_perfume_subtotal + (v_variant.price_bwp * v_line.quantity);
    end if;
  end loop;

  if v_perfume_units >= 2 then
    v_bundle_discount := least(round(v_perfume_subtotal * 0.10), 200);
  end if;

  if v_code is not null then
    select * into v_promo
    from public.promo_codes
    where code = v_code
      and is_active = true
      and (expires_at is null or expires_at >= current_date)
      and min_subtotal_bwp <= v_subtotal
    for update;

    if not found then
      raise exception using message = 'That promo code is invalid, expired, or below its minimum spend', errcode = '22023';
    end if;
    v_promo_discount := least(
      round(v_subtotal * v_promo.percent_off / 100.0),
      coalesce(v_promo.max_discount_bwp, 99999999)
    );
  end if;

  v_delivery_fee := case v_delivery
    when 'francistown_pickup' then 0
    when 'local_courier' then 45
    when 'nationwide_courier' then 80
  end;
  v_discount := v_bundle_discount + v_promo_discount;

  loop
    begin
      insert into public.orders (
        order_number, customer_name, customer_phone, customer_town, customer_address,
        delivery_preference, payment_method, subtotal_bwp, discount_bwp,
        bundle_discount_bwp, promo_code, promo_discount_bwp, delivery_fee_bwp,
        total_amount_bwp, status, channel
      ) values (
        private.new_order_number(), v_name, v_phone, v_town, v_address,
        v_delivery, v_payment, v_subtotal, v_discount,
        v_bundle_discount, v_code, v_promo_discount, v_delivery_fee,
        greatest(0, v_subtotal - v_discount + v_delivery_fee),
        'pending_verification', 'website'
      ) returning * into v_order;
      exit;
    exception when unique_violation then
      -- Extremely unlikely random collision; retry inside the same transaction.
    end;
  end loop;

  for v_line in
    select x.variant_id, sum(x.quantity)::integer as quantity
    from jsonb_to_recordset(p_items) as x(variant_id uuid, quantity integer)
    group by x.variant_id
    order by x.variant_id
  loop
    select pv, p
      into v_variant, v_product
    from public.product_variants pv
    join public.products p on p.id = pv.product_id
    where pv.id = v_line.variant_id;

    insert into public.order_items (
      order_id, product_id, variant_id, product_title_snapshot,
      variant_label_snapshot, unit_price_bwp, quantity, line_total_bwp
    ) values (
      v_order.id, v_product.id, v_variant.id, v_product.title,
      private.variant_label(v_variant), v_variant.price_bwp,
      v_line.quantity, v_variant.price_bwp * v_line.quantity
    );

    update public.product_variants
      set stock_quantity = stock_quantity - v_line.quantity
      where id = v_variant.id;
  end loop;

  insert into public.order_events(order_id, label, actor)
  values (v_order.id, 'Order placed on the website', 'customer');

  if v_code is not null then
    update public.promo_codes set usage_count = usage_count + 1, updated_at = now()
    where id = v_promo.id;
  end if;

  return private.order_json(v_order.id);
end;
$$;

create or replace function public.track_order(p_order_number text, p_phone_tail text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_reference text := upper(btrim(coalesce(p_order_number, '')));
  v_tail text := regexp_replace(coalesce(p_phone_tail, ''), '\D', '', 'g');
begin
  if v_reference !~ '^(NS-[A-F0-9]{10}|ORD-[0-9]{4,})$' or v_tail !~ '^[0-9]{4}$' then
    return null;
  end if;

  select id into v_order_id
  from public.orders
  where order_number = v_reference
    and right(regexp_replace(customer_phone, '\D', '', 'g'), 4) = v_tail
  limit 1;

  if v_order_id is null then return null; end if;
  return private.order_json(v_order_id);
end;
$$;

create or replace function public.create_admin_order(
  p_customer jsonb,
  p_payment_method text,
  p_items jsonb,
  p_channel text,
  p_is_fulfilled boolean,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payload jsonb;
  v_order_id uuid;
  v_channel text := lower(btrim(coalesce(p_channel, '')));
begin
  if not private.is_admin() then
    raise exception using message = 'Seller access required', errcode = '42501';
  end if;
  if v_channel not in ('whatsapp', 'walk_in') then
    raise exception using message = 'Invalid sales channel', errcode = '22023';
  end if;

  v_payload := public.create_public_order(p_customer, p_payment_method, p_items, null);
  v_order_id := (v_payload->>'id')::uuid;

  update public.orders
  set channel = v_channel,
      status = case when p_is_fulfilled then 'completed'::public.order_status else 'payment_confirmed'::public.order_status end,
      verification_notes = nullif(btrim(coalesce(p_note, '')), '')
  where id = v_order_id;

  insert into public.order_events(order_id, label, detail, actor)
  values (
    v_order_id,
    case when p_is_fulfilled then 'Offline sale completed' else 'Offline sale recorded' end,
    nullif(btrim(coalesce(p_note, '')), ''),
    'seller'
  );

  return private.order_json(v_order_id);
end;
$$;

create or replace function public.submit_payment_reference(
  p_order_number text,
  p_phone_tail text,
  p_payment_reference text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_reference text := upper(btrim(coalesce(p_order_number, '')));
  v_tail text := regexp_replace(coalesce(p_phone_tail, ''), '\D', '', 'g');
  v_payment_reference text := btrim(coalesce(p_payment_reference, ''));
begin
  if v_tail !~ '^[0-9]{4}$' or char_length(v_payment_reference) not between 3 and 64 then
    return false;
  end if;
  select id into v_order_id from public.orders
  where order_number = v_reference
    and right(regexp_replace(customer_phone, '\D', '', 'g'), 4) = v_tail
    and status = 'pending_verification'
  for update;
  if v_order_id is null then return false; end if;

  update public.orders set payment_reference = v_payment_reference where id = v_order_id;
  insert into public.order_events(order_id, label, detail, actor)
  values (v_order_id, 'Payment reference submitted', v_payment_reference, 'customer');
  return true;
end;
$$;

create or replace function public.subscribe_stock_alert(
  p_variant_id uuid,
  p_customer_phone text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_phone text := regexp_replace(coalesce(p_customer_phone, ''), '[^0-9+]', '', 'g');
  v_product_id uuid;
begin
  if v_phone !~ '^\+267[0-9]{8}$' then return false; end if;
  select product_id into v_product_id from public.product_variants where id = p_variant_id;
  if v_product_id is null then return false; end if;
  insert into public.stock_alerts(product_id, variant_id, customer_phone)
  values (v_product_id, p_variant_id, v_phone)
  on conflict (variant_id, customer_phone) do nothing;
  return true;
end;
$$;

create or replace function public.submit_review(
  p_product_id uuid,
  p_customer_name text,
  p_town text,
  p_rating integer,
  p_comment text,
  p_order_number text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := btrim(coalesce(p_customer_name, ''));
  v_town text := btrim(coalesce(p_town, ''));
  v_comment text := btrim(coalesce(p_comment, ''));
  v_reference text := nullif(upper(btrim(coalesce(p_order_number, ''))), '');
  v_order_id uuid;
  v_verified boolean := false;
  v_review public.customer_reviews%rowtype;
begin
  if char_length(v_name) not between 2 and 120
    or char_length(v_town) not between 2 and 80
    or char_length(v_comment) not between 10 and 1000
    or p_rating not between 1 and 5 then
    raise exception using message = 'Review details are invalid', errcode = '22023';
  end if;
  if not exists (select 1 from public.products where id = p_product_id and is_active = true) then
    raise exception using message = 'Product not found', errcode = '22023';
  end if;

  if v_reference is not null then
    select o.id into v_order_id
    from public.orders o
    where o.order_number = v_reference
      and o.status <> 'cancelled'
      and exists (
        select 1 from public.order_items oi
        where oi.order_id = o.id and oi.product_id = p_product_id
      )
    limit 1;
    v_verified := v_order_id is not null;
    if not v_verified then
      raise exception using message = 'That order does not match this product', errcode = '22023';
    end if;
  end if;

  insert into public.customer_reviews(
    product_id, customer_name, town, rating, comment, is_verified, order_id
  ) values (
    p_product_id, v_name, v_town, p_rating, v_comment, v_verified, v_order_id
  ) returning * into v_review;

  return jsonb_build_object(
    'id', v_review.id,
    'product_id', v_review.product_id,
    'customer_name', v_review.customer_name,
    'town', v_review.town,
    'rating', v_review.rating,
    'comment', v_review.comment,
    'is_verified', v_review.is_verified,
    'reviewed_on', v_review.reviewed_on,
    'order_number', v_reference
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Stock-safe order status changes
-- ---------------------------------------------------------------------------

create or replace function private.handle_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_line record;
  v_available integer;
begin
  if new.status is not distinct from old.status then return new; end if;

  if old.status <> 'cancelled' and new.status = 'cancelled' then
    for v_line in
      select variant_id, quantity from public.order_items
      where order_id = old.id and variant_id is not null
      order by variant_id
    loop
      update public.product_variants
      set stock_quantity = stock_quantity + v_line.quantity
      where id = v_line.variant_id;
    end loop;
    new.cancelled_at := coalesce(new.cancelled_at, now());
  elsif old.status = 'cancelled' and new.status <> 'cancelled' then
    for v_line in
      select variant_id, quantity from public.order_items
      where order_id = old.id and variant_id is not null
      order by variant_id
    loop
      select stock_quantity into v_available
      from public.product_variants where id = v_line.variant_id for update;
      if v_available < v_line.quantity then
        raise exception using message = 'Not enough stock to reopen this order', errcode = 'P0001';
      end if;
      update public.product_variants
      set stock_quantity = stock_quantity - v_line.quantity
      where id = v_line.variant_id;
    end loop;
    new.cancelled_at := null;
    new.cancel_reason := null;
  end if;

  if new.status = 'payment_confirmed' and old.status is distinct from new.status then
    new.verified_at := coalesce(new.verified_at, now());
  end if;
  return new;
end;
$$;

drop trigger if exists orders_stamp_verification on public.orders;
drop trigger if exists orders_status_stock_guard on public.orders;
create trigger orders_status_stock_guard
  before update of status on public.orders
  for each row execute function private.handle_order_status_change();

-- ---------------------------------------------------------------------------
-- RLS and privileges
-- ---------------------------------------------------------------------------

alter table public.admin_users enable row level security;
alter table public.promo_codes enable row level security;
alter table public.order_events enable row level security;
alter table public.stock_alerts enable row level security;

drop policy if exists "guests insert orders" on public.orders;
drop policy if exists "guests insert order items" on public.order_items;

drop policy if exists "admins manage products" on public.products;
create policy "admins manage products" on public.products for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
drop policy if exists "admins manage variants" on public.product_variants;
create policy "admins manage variants" on public.product_variants for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
drop policy if exists "admins manage orders" on public.orders;
create policy "admins manage orders" on public.orders for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
drop policy if exists "admins manage order items" on public.order_items;
create policy "admins manage order items" on public.order_items for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
drop policy if exists "admins manage reviews" on public.customer_reviews;
create policy "admins manage reviews" on public.customer_reviews for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "admins manage promos" on public.promo_codes for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "admins manage events" on public.order_events for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "admins manage stock alerts" on public.stock_alerts for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "admin sees own membership" on public.admin_users for select to authenticated
  using (user_id = (select auth.uid()));

-- Active promos may be shown in checkout; sensitive order/customer tables have
-- no public SELECT policy and are only exposed through the narrow tracking RPC.
create policy "public reads active promos" on public.promo_codes for select to anon, authenticated
  using (is_active = true and (expires_at is null or expires_at >= current_date));

revoke all on public.orders, public.order_items, public.order_events, public.admin_users, public.stock_alerts from anon;
revoke insert, update, delete on public.products, public.product_variants, public.customer_reviews, public.promo_codes from anon;

grant usage on schema public to anon, authenticated;
grant select on public.products, public.product_variants, public.customer_reviews, public.promo_codes to anon, authenticated;
grant select, insert, update, delete on public.products, public.product_variants, public.customer_reviews,
  public.orders, public.order_items, public.order_events, public.promo_codes, public.stock_alerts to authenticated;
grant select on public.admin_users to authenticated;

revoke execute on function public.create_public_order(jsonb,text,jsonb,text) from public, authenticated;
grant execute on function public.create_public_order(jsonb,text,jsonb,text) to anon;
revoke execute on function public.track_order(text,text) from public;
grant execute on function public.track_order(text,text) to anon, authenticated;
revoke execute on function public.create_admin_order(jsonb,text,jsonb,text,boolean,text) from public, anon;
grant execute on function public.create_admin_order(jsonb,text,jsonb,text,boolean,text) to authenticated;
revoke execute on function public.submit_payment_reference(text,text,text) from public;
grant execute on function public.submit_payment_reference(text,text,text) to anon;
revoke execute on function public.subscribe_stock_alert(uuid,text) from public;
grant execute on function public.subscribe_stock_alert(uuid,text) to anon;
revoke execute on function public.submit_review(uuid,text,text,integer,text,text) from public;
grant execute on function public.submit_review(uuid,text,text,integer,text,text) to anon;

grant usage on schema private to authenticated;
revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;
revoke all on function private.order_json(uuid), private.new_order_number(), private.variant_label(public.product_variants) from public, anon, authenticated;

-- Bootstrap the first seller after creating them in Authentication > Users:
-- insert into public.admin_users(user_id, display_name)
-- select id, 'Store owner' from auth.users where email = 'owner@example.com';
