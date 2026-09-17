# NeoSales

NeoSales is a Botswana-focused commerce storefront and seller operations app for perfumes, apparel, and accessories. It combines a mobile-first catalog, server-authoritative checkout, order tracking, WhatsApp handoff, stock control, promotions, reviews, and a protected seller dashboard.

## Production architecture

- Next.js 16 App Router, React 19, TypeScript strict mode, and Tailwind CSS.
- Static export to `out/`, suitable for Cloudflare Pages.
- Supabase Postgres is the source of truth for products, inventory, orders, promotions, reviews, and restock alerts.
- Public sales operations use narrow `SECURITY DEFINER` RPCs. Prices, discounts, delivery fees, stock checks, and totals are calculated inside one database transaction.
- Seller access uses Supabase email/password authentication plus membership in `public.admin_users`. There is no browser-visible admin PIN.
- Row Level Security prevents anonymous access to customer and operational data.

Without Supabase variables, the app intentionally runs as a local demo. Do not accept real orders in demo mode.

## Local development

Requirements: Node.js 20.9 or later and npm.

```bash
npm ci
copy .env.example .env.local
npm run dev
```

Open `http://localhost:3000`; the seller workspace is at `/admin`.

## Environment

Set these values in `.env.local` and in the production build environment:

| Variable | Required for sales | Purpose |
| --- | ---: | --- |
| `NEXT_PUBLIC_STORE_NAME` | Yes | Store name |
| `NEXT_PUBLIC_SELLER_WHATSAPP` | Yes | WhatsApp number receiving order messages |
| `NEXT_PUBLIC_ORANGE_MONEY_NUMBER` | Yes | Orange Money recipient |
| `NEXT_PUBLIC_FNB_PAY2CELL_NUMBER` | Yes | FNB Pay2Cell recipient |
| `NEXT_PUBLIC_FNB_ACCOUNT_NAME` | Yes | Payment recipient name |
| `NEXT_PUBLIC_SITE_URL` | Yes | Canonical production URL |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Browser-safe Supabase publishable key |

Never expose a Supabase secret or service-role key through a `NEXT_PUBLIC_` variable.

## Database setup

The base schema is in `supabase/schema.sql`; production hardening is in `supabase/migrations/20260917075128_production_hardening.sql`.

For a new linked Supabase project:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push --dry-run
npx supabase db push
```

Then create the seller in Supabase Authentication and authorize that user in the SQL editor:

```sql
insert into public.admin_users (user_id, display_name)
select id, 'NeoSales seller'
from auth.users
where email = 'seller@example.com'
on conflict (user_id) do update
set display_name = excluded.display_name;
```

Use a strong, unique password and enable Supabase Auth rate limits. Run the Supabase security and performance advisors after applying the migration.

## Verification

```bash
npm run verify
npm audit
```

`verify` runs ESLint with zero warnings, strict TypeScript checks, Vitest, and a production static build. The tests cover promotion calculations, WhatsApp formatting, and critical production-migration security invariants.

## Deployment

The GitHub workflow builds pull requests and deploys `main` to Cloudflare Pages when the Cloudflare secrets are configured. Add these repository secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Add the public application settings above as GitHub Actions variables or secrets. A manual deployment is also available:

```bash
npm run deploy:pages
```

Before taking the first payment, complete the checklist in [PRODUCTION_HARDENING_HANDOFF.md](PRODUCTION_HARDENING_HANDOFF.md).

## Core customer flows

- Browse and search a responsive, accessible catalog.
- Select variants with live availability and low-stock warnings.
- Apply server-validated promotions and bundle discounts.
- Place a guest order with Orange Money, FNB Pay2Cell, or eligible cash pickup.
- Track an order using its non-enumerable `NS-…` reference and the phone number's last four digits.
- Submit payment references, reviews, and restock requests without exposing order records.
- Continue to WhatsApp with a complete pre-filled receipt after the order is safely stored.

## Seller flows

- Authenticate with Supabase Auth at `/admin`.
- Manage the order pipeline, payment references, pickup slots, cancellations, and reopenings.
- Record WhatsApp and walk-in sales through the same atomic inventory path as web orders.
- Manage inventory, products, promotions, reviews, and restock alerts.
- Export ledgers, stock sheets, and backups.

## Security notes

- The browser never decides final prices or stock deductions in live mode.
- Order creation and stock reservation are atomic and lock variants in a stable order.
- Cancelling returns stock once; reopening re-reserves stock and fails if inventory is insufficient.
- Anonymous users cannot select orders or mutate protected tables directly.
- The exported site includes CSP, HSTS, frame, referrer, and permissions-policy headers for Cloudflare Pages.
- Customer-facing order lookup requires both the order reference and phone tail.

## Project layout

```text
src/app/                 Routes and metadata
src/components/          Storefront, checkout, admin, and shared UI
src/context/             Store state and cloud orchestration
src/lib/                 Supabase client, pricing, exports, and utilities
supabase/schema.sql      Original/base schema
supabase/migrations/     Versioned production migrations
public/_headers          Cloudflare response-security policy
.github/workflows/       CI and Cloudflare deployment
```
