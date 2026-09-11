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
| Order tracking | `/track` looks an order up with its `ORD-…` reference **and** the last 4 digits of the phone number, then shows a 5-step progress rail with a live "Current" marker, itemised totals, your saved transaction reference, pickup points and a one-tap "ask a question on WhatsApp" link. |
| Product pages & sharing | Every active product has a static, shareable page at `/p/<slug>` with its own OG/Twitter preview, `Product` JSON-LD (BWP pricing + rating) and the full variant picker — ideal for WhatsApp Status drops. |
| Saved items | A bookmark on every card and product page, a counter in the header and a slide-over drawer with "add all to bag" and per-item WhatsApp enquiry. Saved products are remembered on the device. |
| Recently viewed | A horizontal strip under the catalog that resurfaces the last products you opened. |
| Bag to WhatsApp | Besides checkout, the bag can be sent straight to the seller as a pre-written WhatsApp message when the customer would rather chat first. |
| Size guide | Measurement tables for shirts, trousers and footwear (in cm, with the "when in doubt, size up" note) reachable from the variant picker. |
| Offers & promo codes | Live promo field in checkout with validation messages, an "offer" list of the running campaigns, and an automatic **10% bundle discount** when two or more perfumes are in the bag (capped at P200). |
| Back-in-stock alerts | A sold-out product lets the customer leave their WhatsApp number; the seller gets the request in the admin Growth tab and can notify them in one tap. |
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

### Customer self-service

- **Track without an account** — guests checkout, guests track. Customers only ever need the order number we already send them plus the last 4 digits of the phone number they typed.
- **Shareable product pages** — `/p/<slug>` is a real page, not a modal: it can be pasted into WhatsApp Status, indexed by Google and previewed with a photo, price and rating.
- **Saved items and recently viewed** — the "think about it" path, kept on the device (no accounts, no passwords to forget).
- **Back-in-stock requests** — the most-asked WhatsApp question ("is the 100ml back?") becomes a queue the seller can work through in seconds.

### Growth tooling (admin **Growth** tab)

| Panel | What it does |
| --- | --- |
| Promo codes | Create percentage codes with a minimum spend, a Pula cap, an optional expiry date and a note (`SUMMER10`, `FIRSTORDER`, `FRANCISTOWN` are seeded). Pause or reactivate a campaign without deleting it, and see usage counts at a glance. |
| Stock alerts | Every back-in-stock request with the customer's number, the variant they want and age; a "Ready to notify" count and one-tap WhatsApp messages (including a follow-up nudge if the item is still out). |
| Reviews | Live rating average, reviews collected and customers served, plus the incoming buyer feedback feed. |

Discounts are computed in one place (`src/lib/promo.ts`), stored on the order (`discountBWP`, `bundleDiscountBWP`, `promoDiscountBWP`, `promoCode`), shown on the receipt, exported in the ledger CSV and mirrored to Supabase — so the cash-up tally always matches what the customer paid.

### Seller operations hub (`/admin`)
- **PIN gate** (`AdminAuthGate`): 4–6 digit PIN (default `2670`, override with `NEXT_PUBLIC_ADMIN_PIN`), session stored in `sessionStorage` so it clears when the tab closes, on-screen keypad for phone-first sellers, and rate limiting — 5 wrong attempts triggers a 60 second lockout with a live countdown.
- **KPI cards**: Total revenue (Pula), pending payment orders, total stock on hand, low-stock alerts, plus a best-sellers strip.
- **Tabs**: *Order pipeline* · *Cash-up* · *Live inventory* · *Growth* · *Data & backup*, with **Record sale**, **Add product** and **Backup** always one tap from the header.
- **Order kanban**: columns for *Pending Verification → Payment Confirmed → Dispatched → Completed* with one-click transitions, a "move back" correction path, a per-order **WhatsApp the customer** link with status-appropriate copy (including a cancellation notice), and a cancelled ledger that shows exactly how many units were returned.
- **Find any order fast**: free-text search across order number, customer name, town, phone digits, **mobile-money transaction reference** and item names, plus status, channel and date-range filters with an active-filter indicator.
- **Per-order workbench**: an activity timeline (who did what, when), seller notes, a pickup-slot editor (date, one-hour window, collection point), a **transaction reference** field, an A5 **packing slip** built for printing, and the cancel/reopen corrections.
- **Offline & DM sales**: "Record sale" logs a sale that closed on WhatsApp or in person — it decrements stock, respects the same discount rules and appears in cash-up under the right rail, so the books match reality.
- **Cash-up & reconciliation**: a 14-day ledger by day and by rail (Orange Money / FNB Pay2Cell / Cash on pickup) separating *collected*, *pending verification* and *cash still to collect*, a chase list of anything older than 24 hours, and one-tap customer follow-ups.
- **Reorder suggestions**: analytics that rank what to restock using units sold against remaining stock and propose a quantity to order.
- **Live inventory manager**: search by SKU/title/size/colour, filter by stock level or category, inline `+ / − / +10` adjusters with direct numeric entry, and an instant published/hidden switch per product.
- **Reconciliation tab**: the cash-up ledger, per-day drill-down, uncollected cash call-outs and the >24h chase queue.
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
│   ├── track/page.tsx        # Guest order tracking (reference + last-4 phone)
│   ├── p/[slug]/page.tsx     # Static shareable product pages (OG + Product JSON-LD)
│   └── globals.css           # Dark-luxury tokens, focus rings, reduced motion, print styles
├── components/
│   ├── storefront/           # Header, HeroSpotlight, ProductCard, VariantModal, CartDrawer,
│   │                         # StorefrontHome, Footer, LegalModal, OrderTracker, ProductDetail,
│   │                         # SavedItemsDrawer (+ SizeGuideModal), RecentlyViewed
│   ├── checkout/             # CheckoutModal (promo codes, 3-step flow), PaymentInstructions
│   ├── admin/                # AdminAuthGate, AdminDashboard, SalesMetrics, OrderKanban,
│   │                         # InventoryManager, AddProductModal, ReconciliationPanel,
│   │                         # OfflineSaleModal, PackingSlip, DataBackupPanel, GrowthPanel,
│   │                         # CancelOrderDialog
│   └── ui/                   # Button, Badge, Modal, Toast, Skeleton, StarRating, FontLoader,
│                             # ServiceWorkerRegistrar
├── context/StoreContext.tsx  # Catalog, bag, orders, reviews, promos, alerts, saved items, KPIs
├── hooks/useFocusTrap.ts     # WCAG dialog focus trap + scroll lock
├── lib/                      # constants, format (BWP), product, whatsapp, storage, analytics,
│                             # promo, export, imageUtils, supabaseClient, mockData
└── types/index.ts            # Domain model (Product, ProductVariant, CartItem, Order, …)
public/
├── manifest.webmanifest      # Installable PWA (standalone, midnight theme, Track shortcut)
└── sw.js                     # Offline shell: network-first pages, cache-first assets
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
- Every product also emits its own `Product` JSON-LD (BWP price range, availability, rating) on its `/p/<slug>` page, with canonical URLs and `en_BW` Open Graph previews sized for WhatsApp.
- `public/robots.txt` disallows `/admin` and `/track`; `public/sitemap.xml` lists the storefront, catalog, delivery anchors, the tracking page and all six product pages.
- **Installable PWA** — `manifest.webmanifest` plus a service worker give the storefront an app icon and an offline shell, so the catalog still opens on patchy mobile data.
- Catalog cards are server-rendered, so product names and Pula prices appear in the initial HTML.

---

## 🧪 Verified locally

```bash
npm run lint         # ✅ no ESLint warnings or errors
npm run type-check   # ✅ no errors (strict mode)
npm run build        # ✅ compiled + statically exported (12 pages), no warnings
npm run preview      # serves out/ with Cloudflare-Pages routing on :3000
```

`npm run build` statically exports **12 pages**: the storefront, `/admin`, `/track` and one page per
active product.

Pure logic is covered by ad-hoc `tsx` scripts (`/tmp/tier0-check.ts`, `/tmp/phase234-check.ts`) —
Pula formatting, `+267` validation/normalisation, receipt generation, stock summaries, cancellation
stock return, backup round-trips, the cash-up ledger by rail, order search/filters, reorder
suggestions, customer LTV grouping, bundle maths and promo-code validation — **73 assertions, all
passing**.

> Browser automation was not available in this environment, so interaction flows were verified through
> static analysis, type checking, production builds and direct HTTP smoke tests of the exported
> routes rather than scripted clicks.

Demo PIN for `/admin` is **2670** (or whatever `NEXT_PUBLIC_ADMIN_PIN` is set to).

> The admin dashboard starts with four demo orders covering every pipeline stage so the kanban,
> KPIs and WhatsApp actions can be exercised immediately. **Reset data** in the dashboard header
> restores that demo state at any time.
