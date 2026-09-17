-- Bring the original live NeoSales tables forward to the canonical schema
-- expected by the production-hardening migration. All operations are additive
-- or data-preserving; unrelated schemas in this shared project are untouched.

do $$ begin
  create type public.payment_method as enum ('orange_money', 'fnb_pay2cell', 'cash_on_pickup');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.delivery_preference as enum (
    'francistown_pickup', 'local_courier', 'nationwide_courier'
  );
exception when duplicate_object then null;
end $$;

alter type public.order_status add value if not exists 'dispatched' before 'completed';

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'customer_reviews' and column_name = 'verified'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'customer_reviews' and column_name = 'is_verified'
  ) then
    alter table public.customer_reviews rename column verified to is_verified;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'customer_reviews' and column_name = 'review_date'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'customer_reviews' and column_name = 'reviewed_on'
  ) then
    alter table public.customer_reviews rename column review_date to reviewed_on;
  end if;
end $$;

alter table public.products alter column description set default '';
update public.products set description = '' where description is null;
alter table public.products alter column description set not null;
update public.products set image_urls = '{}' where image_urls is null;
alter table public.products alter column image_urls set default '{}';
alter table public.products alter column image_urls set not null;

alter table public.orders
  add column if not exists customer_town varchar(80),
  add column if not exists customer_address varchar(255) not null default '',
  add column if not exists discount_bwp numeric(10,2) not null default 0,
  add column if not exists bundle_discount_bwp numeric(10,2) not null default 0,
  add column if not exists promo_code varchar(32),
  add column if not exists promo_discount_bwp numeric(10,2) not null default 0,
  add column if not exists payment_reference varchar(64),
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancel_reason varchar(160),
  add column if not exists channel varchar(16) not null default 'website',
  add column if not exists pickup_date date,
  add column if not exists pickup_window varchar(24),
  add column if not exists pickup_point varchar(96);

update public.orders
set customer_town = coalesce(nullif(btrim(customer_town), ''), nullif(btrim(delivery_location), ''), 'Botswana')
where customer_town is null or btrim(customer_town) = '';
alter table public.orders alter column customer_town set not null;

alter table public.orders alter column delivery_preference drop default;
alter table public.orders alter column delivery_preference type public.delivery_preference
using (
  case delivery_preference::text
    when 'collection' then 'francistown_pickup'
    when 'local_courier' then 'local_courier'
    when 'in_person_meetup' then 'francistown_pickup'
    else 'nationwide_courier'
  end
)::public.delivery_preference;
alter table public.orders alter column delivery_preference set default 'francistown_pickup';

alter table public.orders alter column payment_method type public.payment_method
using payment_method::text::public.payment_method;

alter table public.orders alter column delivery_location set default '';
