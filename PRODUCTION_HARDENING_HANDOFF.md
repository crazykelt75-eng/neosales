# NeoSales production-hardening handoff

## Checkpoint status

This branch is a work-in-progress production-hardening checkpoint. It preserves the current implementation but is not a claim that the application is ready to deploy. No live Supabase migration, Cloudflare deployment, or remote push is included in this checkpoint.

Branch: `codex/production-hardening`

## Work captured

- Reworked checkout and order handling around server-authoritative Supabase RPCs.
- Added a production-hardening Supabase migration covering admin authorization, atomic order creation, stock handling, promotions, order tracking, reviews, stock alerts, RLS, and grants.
- Replaced the client-side admin PIN flow with Supabase email/password authentication and an `admin_users` authorization model.
- Updated storefront order tracking, payment references, reviews, stock alerts, promotions, and offline sales to use cloud-backed operations.
- Removed committed Supabase configuration from Wrangler and updated deployment configuration to use environment-provided public credentials.
- Added browser security headers in `public/_headers`.
- Upgraded the Next.js/React/Supabase/ESLint/TypeScript/Vitest toolchain and added an ESLint flat configuration.
- Added initial tests for the production migration, promotion logic, and WhatsApp behavior.

## Verification still required

The framework upgrade and latest changes have not yet completed the full verification pipeline. Treat failures found during the following steps as checkpoint follow-up work.

1. Install the exact dependency tree with `npm ci`.
2. Run `npm run type-check`.
3. Run `npm run lint`.
4. Run `npm run test`.
5. Run `npm run build`.
6. Fix every failure and rerun `npm run verify` until it passes cleanly.
7. Review the generated static export and test responsive layouts, keyboard navigation, empty/error/loading states, and checkout recovery.

## Supabase rollout

1. Review `supabase/migrations/20260917075128_production_hardening.sql` against the target project schema.
2. Validate the migration in a disposable or staging Supabase project before production.
3. Run Supabase database/security advisors and resolve material findings.
4. Apply the migration to production only after application verification passes.
5. Create the seller's Supabase Auth account and insert its user ID into `admin_users`.
6. Confirm anonymous users cannot access admin data or mutate protected tables directly.
7. Exercise concurrent checkout, insufficient-stock, duplicate-submit, invalid-promo, cancellation, reopen, tracking, review, and stock-alert scenarios.

## Deployment rollout

1. Configure the production Supabase URL and publishable key in GitHub/Cloudflare; never commit service-role credentials.
2. Confirm the Cloudflare Pages project and deployment workflow use the intended production environment.
3. Deploy to a preview environment first and smoke-test storefront, checkout, tracking, admin login, inventory, promotions, offline sales, and mobile navigation.
4. Verify the response security headers and ensure no secrets or source maps expose sensitive information.
5. Add production monitoring, error reporting, database backups, and a rollback procedure before accepting real sales.

## Important release blockers

- Full lint, type-check, test, and production build results are not recorded for the upgraded dependency set.
- The SQL migration has not been confirmed against the live schema.
- Live authentication, environment variables, payment workflow, and deployment have not been validated.
- A final end-to-end sales-flow test with real production-like data is still required.
