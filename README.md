# NeoSales — Botswana E-Commerce Storefront & Seller Operations Hub 🇧🇼

A production-grade, dark-luxury storefront for a boutique selling **authentic extrait perfumes
and curated summer apparel** out of Francistown, Botswana — plus a PIN-gated operations hub for
the seller. Built to kill chaotic DM selling: a self-service catalog, Botswana mobile-money
checkout (Orange Money / FNB Pay2Cell / cash on pickup), and a one-tap WhatsApp order dispatch.

Everything is priced in **Botswana Pula (BWP)** and rendered as `P280`, `P460`, `P690`.

---

## ✨ What is included

### Storefront
| Feature | Detail |
| --- | --- |
| Hero spotlight carousel | Highlights the best-reviewed new arrivals, auto-advances every 6s with a gradient progress bar, and ships an explicit **Pause/Play** toggle (`aria-pressed`) for WCAG 2.2.2. Pauses on hover, focus, hidden tab and `prefers-reduced-motion`. |
| Trust bar | *Free Francistown Pickups · Nationwide Sprint Couriers · Authentic Guarantee*. |
| Catalog | 4:5 (400 × 500) photography with hover zoom, one clean status badge (`Only 2 left`, `Sold out`, `New`), one-line fragrance/material teaser, bold Pula price and a `Select` affordance on a fully clickable, screen-reader-labelled card. |
| Search & filters | Category tabs (All Items / Niche Perfumes / Summer Apparel / Accessories) plus keyword search across titles, scent profiles (`Oud`, `Amber`, `Vanilla`), colours, sizes and SKUs — with a friendly empty state and **Reset filters**. |
| Variant modal | Volume (`30ml`/`50ml`/`100ml`), colourway and size pills with live price updates, low-stock warning banner at ≤3 units, stock-ceiling quantity stepper, gallery thumbnails and a tactile "added to bag" confirmation. Keyboard focus stays trapped inside, Escape/backdrop closes, focus returns to the triggering card. |
| Bag drawer | Slide-over from the right, focus-trapped, inline quantity modifiers, delete, line subtotals and a live order summary. |
| Checkout | Zero-friction guest checkout: name, `+267` validated WhatsApp number, delivery preference, then payment rail. Validates inline with friendly copy and never loses your input (draft persisted per tab). |
| 1-tap WhatsApp dispatch | Generates an `ORD-8421` reference, records the order, formats a full human-readable receipt and opens `wa.me/267…` with the receipt pre-filled so the customer only has to send it. |
| Botswana policy layer | Privacy (Data Protection Act), terms of sale and 48-hour exchange policy in a tabbed dialog. |

### Delivery & payment rails (exactly as quoted at checkout)
| Delivery preference | Fee | Coverage |
| --- | --- | --- |
| Francistown Free Pickup | **P0** | G-North · Galo Mall · Nswazwi Mall |
| Local Courier / Cab | **P45** | Gaborone & Francistown central |
| Nationwide Sprint Couriers / PostNet | **P80** | Maun · Kasane · Palapye · Mahalapye & all towns |

| Payment rail | Detail |
| --- | --- |
| Orange Money | Merchant/agent number, account name and `*145#` instructions with copy-to-clipboard |
| FNB Pay2Cell | Recipient cell number and app/USSD steps with copy-to-clipboard |
| Cash on Pickup | Available **only** for Francistown pickups |

### Data safety & order corrections (Tier 0)

- **Export & backup** — an orders ledger CSV (totals in Pula, payment rail + transaction reference) and a stock sheet CSV for Excel, plus a full restorable `neosales-backup-*.json` covering the catalog and every order. A reminder banner tracks when you last exported and nudges you weekly.
- **Restore with validation** — uploaded backups are structurally checked (app tag, version, product/order shape) before anything is replaced, and the panel previews exactly what will be restored, with warnings for any rows that had to be skipped.
- **Cancel with automatic stock return** — cancelling an order releases every reserved unit back to the shelf, records a reason and moves the order to a cancelled ledger beneath the board. **Reopen order** reverses an accidental cancellation and re-reserves the stock, warning you if inventory is now short.
- **Payment reference capture** — the mobile money transaction ID can be pasted by the customer on the order-confirmation screen or typed by the seller on the order card. It is stored on the order, included in the WhatsApp receipt and exported in the ledger for reconciliation.

### Seller operations hub (`/admin`)
- **PIN gate** (`AdminAuthGate`): 4–6 digit PIN (default `2670`, override with `NEXT_PUBLIC_ADMIN_PIN`), session stored in `sessionStorage` so it clears when the tab closes, on-screen keypad for phone-first sellers, and rate limiting — 5 wrong attempts triggers a 60 second lockout with a live countdown.
- **KPI cards**: Total revenue (Pula), pending payment orders, total stock on hand, low-stock alerts, plus a best-sellers strip.
- **Order kanban**: columns for *Pending Verification → Payment Confirmed → Dispatched → Completed* with status filters, one-click transitions, a "move back" correction path, a per-order **WhatsApp the customer** link with status-appropriate copy (including a cancellation notice), and a cancelled ledger that shows exactly how many units were returned.
- **Live inventory manager**: search by SKU/title/size/colour, filter by stock level or category, inline `+ / − / +10` adjusters with direct numeric entry, and an instant published/hidden switch per product.
- **Quick add product**: validated modal that publishes a new catalog item with its opening variant immediately.
- **Data & backup tab**: export/restore tooling, local-storage footprint, cloud-mirror status, and the reset action (now behind an explicit confirmation).

---

## 🧱 Tech stack

- **Next.js 14 (App Router)** with **TypeScript in strict mode** — static export (`output: 'export'`) so it can be hosted on Cloudflare Pages, S3 or any CDN.
- **Tailwind CSS** with custom tokens: `midnight #07080c`, `surface #0e1118`, `orangeMoney #ff6600`, amber gold `#f59e0b`, emerald `#10b981`.
- **lucide-react** icons.
- **React Context (`StoreContext`)** as the single source of truth with **dual-layer persistence**: `localStorage` first (instant, offline-capable) then **live Supabase** when `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` exist.
- **No runtime UI dependencies** beyond React + lucide — nothing to hydrate slowly on Botswana mobile data.

---

## 🚀 Quick start

```bash
npm install
npm run dev          # http://localhost:3000  ·  dashboard at /admin (PIN 2670)
```

Production verification:

```bash
npm run lint         # next lint (core-web-vitals)
npm run type-check   # tsc --noEmit, strict
npm run build        # static export into ./out
npm run start        # serve the exported build (after a build)
```

### Why native `<img>` instead of `next/image`
The storefront ships as a **static export** (`output: 'export'`), where `next/image` cannot
optimise anything at build or request time and still adds client-side JavaScript to every card.
Instead the catalog uses native `<img>` with the exact 4:5 viewport (`width`/`height` = 400 × 500),
`decoding="async"`, `loading="lazy"` below the fold, `loading="eager"` + `fetchPriority="high"` for
the first four cards and the hero, plus an inline shimmer placeholder so nothing shifts while the
image decodes. See `.eslintrc.json` for the documented rule exceptions.

---

## 🔧 Environment variables

Copy `.env.example` → `.env.local`. Every value is optional; the app runs with bundled defaults.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_STORE_NAME` | Brand name used in metadata, receipts and headers |
| `NEXT_PUBLIC_SELLER_WHATSAPP` | WhatsApp handset that receives orders (`+267…`) |
| `NEXT_PUBLIC_ORANGE_MONEY_NUMBER` | Orange Money merchant/agent number |
| `NEXT_PUBLIC_FNB_PAY2CELL_NUMBER` | FNB Pay2Cell recipient number |
| `NEXT_PUBLIC_FNB_ACCOUNT_NAME` | Account name shown beside both mobile money numbers |
| `NEXT_PUBLIC_ADMIN_PIN` | PIN protecting `/admin` (default `2670`) |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL for metadata, Open Graph, JSON-LD and the sitemap |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Enable live cloud persistence |

> **Security note:** the admin PIN is a client-side convenience gate, not an auth boundary. Keep
> order mutations server-side (Supabase service role or an Edge Function) as described in
> [`supabase/schema.sql`](supabase/schema.sql).

---

## 🗄️ Supabase (optional live mode)

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, paste the whole of [`supabase/schema.sql`](supabase/schema.sql) and run it.
   It creates the enums, `products`, `product_variants`, `customer_reviews`, `orders`, `order_items`,
   the `ORD-####` sequence, verification triggers, RLS policies and seed data matching the demo catalog.
3. Copy **Project URL** and the **anon** key into `.env.local`.

With those set, the storefront hydrates from Supabase after the cached first paint, order
submissions are mirrored to the cloud, and the dashboard shows a **Supabase live** badge
(otherwise it shows **Local mode**). Stock is reserved locally the moment an order is created and
pushed to `product_variants.stock_quantity`, so the cloud schema intentionally has no
payment-triggered stock decrement (that would double-count).

---

## ☁️ Deployment (Cloudflare Pages)

```bash
npm run build
npx wrangler pages deploy out --project-name neosales
```

`wrangler.toml` already points at `./out` with SPA fallback handling, and
`.github/workflows/deploy.yml` type-checks, builds and deploys `main` to Cloudflare Pages when
`CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` are configured.

---

## 📁 Project structure

```
src/
├── app/
│   ├── layout.tsx            # Metadata, preconnects, toast + store providers
│   ├── page.tsx              # Server page: OnlineStore JSON-LD (BWP) + storefront
│   ├── admin/page.tsx        # PIN-gated seller workspace (noindex)
│   └── globals.css           # Dark-luxury tokens, focus rings, reduced motion
├── components/
│   ├── storefront/           # Header, HeroSpotlight, ProductCard, VariantModal, CartDrawer,
│   │                         # StorefrontHome, Footer, LegalModal
│   ├── checkout/             # CheckoutModal (3-step flow), PaymentInstructions
│   ├── admin/                # AdminAuthGate, AdminDashboard, SalesMetrics, OrderKanban,
│   │                         # InventoryManager, AddProductModal
│   └── ui/                   # Button, Badge, Modal, Toast, Skeleton, StarRating, FontLoader
├── context/StoreContext.tsx  # Catalog, bag, orders, inventory, admin session, KPIs
├── hooks/useFocusTrap.ts     # WCAG dialog focus trap + scroll lock
├── lib/                      # constants, format (BWP), product, whatsapp, storage,
│                             # imageUtils, supabaseClient, mockData
└── types/index.ts            # Domain model (Product, ProductVariant, CartItem, Order, …)
```

---

## ♿ Accessibility (WCAG 2.2 AA)

- **2.2.2 Pause, Stop, Hide** — the hero carousel has a persistent Pause/Play control.
- **2.1.2 No Keyboard Trap** — modals and the bag drawer trap focus *by design* but always release it: Escape closes, and focus is restored to the exact element that opened the dialog.
- **2.4.7 / 2.4.11 Focus** — a single high-contrast orange focus ring on every interactive element, with offset so it never blends into borders.
- **1.4.3 Contrast** — helper and tertiary text never drops below `text-neutral-400` (≈7.8:1 on the midnight canvas); placeholders were lifted to the same floor.
- **4.1.2 Name, Role, Value** — `aria-pressed` on toggles, `role="switch"` for publish states, `role="status"`/`aria-live` for toasts and filter results, labelled dialogs and descriptive `aria-label`s on every icon-only control.
- **2.3.3 Animation from Interactions** — full `prefers-reduced-motion` support, and the carousel disables autoplay when it is set.
- Skip link to the catalog, `sr-only` `<h1>`, semantic landmarks and 44px minimum touch targets.

---

## 🔍 SEO

- Botswana-targeted metadata, Open Graph and Twitter cards (`Botswana perfumes`, `Francistown fashion`, `Orange Money online shopping`).
- **Schema.org `OnlineStore`** JSON-LD with an `OfferCatalog`: every product carries `priceCurrency: "BWP"`, availability, aggregate rating and shipping rates for pickup (P0), local courier (P45) and nationwide (P80), with `areaServed` covering Francistown, Gaborone, Maun, Kasane, Palapye and Mahalapye.
- `public/robots.txt` disallows `/admin`; `public/sitemap.xml` lists the storefront, catalog and delivery anchors.
- Catalog cards are server-rendered, so product names and Pula prices appear in the initial HTML.

---

## 🧪 Verified locally

```bash
npm run lint         # ✅ no ESLint warnings or errors
npm run type-check   # ✅ no errors (strict mode)
npm run build        # ✅ compiled + statically exported, no warnings
```

Pure helpers (Pula formatting, `+267` phone validation/normalisation, receipt generation, stock
summaries) were additionally exercised with an ad-hoc `tsx` script during development and all
assertions passed.

Demo PIN for `/admin` is **2670** (or whatever `NEXT_PUBLIC_ADMIN_PIN` is set to).

> The admin dashboard starts with four demo orders covering every pipeline stage so the kanban,
> KPIs and WhatsApp actions can be exercised immediately. **Reset data** in the dashboard header
> restores that demo state at any time.
