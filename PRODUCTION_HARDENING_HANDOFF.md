# NeoSales launch checklist

## Completed in the repository

- Replaced the public client-side admin PIN with Supabase Auth and `admin_users` authorization.
- Made checkout and offline sales server-authoritative and atomic.
- Added non-enumerable order references, protected tracking, payment-reference submission, promotions, reviews, restock alerts, stock-safe cancellation/reopening, RLS, and least-privilege grants.
- Removed committed Supabase connection values and added Cloudflare security headers.
- Upgraded to Next.js 16.3.3, React 19.3, and current compatible tooling.
- Added automated security-invariant and business-logic tests.
- Verified ESLint, strict TypeScript, all tests, the production static export, and `npm audit` (zero known vulnerabilities) on 17 September 2026.

## Required before accepting orders

- [x] Authenticate the Supabase CLI and link project `hqnwxckuptagvsizanho`.
- [x] Synchronize existing migration history, dry-run, and apply the live compatibility and hardening migrations.
- [x] Authorize the confirmed seller account `crazykelt75@gmail.com` in `public.admin_users`.
- [ ] Run Supabase Security Advisor and Performance Advisor; resolve material findings.
- [ ] Set all production `NEXT_PUBLIC_*` build variables in GitHub/Cloudflare and confirm the payment recipient details with the seller.
- [ ] Deploy a preview and complete the acceptance test below.
- [ ] Merge to `main`, confirm the Cloudflare deployment, and verify security headers on the public URL.
- [ ] Enable Supabase backups/PITR appropriate to the sales volume and configure uptime/error monitoring.

## Preview acceptance test

1. Place an order and confirm the database-calculated total matches the UI and WhatsApp receipt.
2. Attempt an invalid promo, excessive quantity, and an out-of-stock purchase; all must fail without partial records.
3. Track the order using the correct reference and phone tail; verify incorrect credentials reveal nothing.
4. Submit a payment reference and confirm it appears in the authenticated dashboard.
5. Move the order through payment confirmed, dispatched, and completed.
6. Cancel an order and verify stock returns exactly once; reopen it and verify stock is re-reserved.
7. Record a walk-in sale and verify stock and cash-up totals.
8. Add or edit inventory, a promotion, a review, and a stock alert while authenticated.
9. Test keyboard navigation and a narrow mobile viewport for catalog, bag, checkout, tracking, and admin.
10. Confirm `/admin` rejects non-admin Supabase accounts and anonymous API calls cannot read orders.

## Current external blockers

The database migration and seller authorization are live. Production deployment still requires verified GitHub/Cloudflare build variables, confirmation of the public payment recipient details, and a preview acceptance test. Supabase's leaked-password protection should also be enabled in Auth settings before launch.
