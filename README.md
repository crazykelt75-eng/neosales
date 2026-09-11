# NeoSales - Mobile-First E-Commerce & WhatsApp Order Engine 🇧🇼

A modern, high-converting retail storefront and seller operations portal tailored specifically for the Botswana commerce landscape, based in Francistown & Tati Siding with nationwide delivery. Built to eliminate chaotic DM selling across WhatsApp Status, Facebook Marketplace, and TikTok by introducing a frictionless, self-service catalog, 1-tap mobile payment transfers, and an automated order management pipeline.

---

## 🌟 Key Features

### 🛍️ Customer Storefront (Mobile-First)
- **Zero-Friction Checkout:** No mandatory account creation or password friction. Buyers supply only their Name, WhatsApp Number (`+267`), Delivery Town, and delivery preference.
- **Dynamic Variant Selector:**
  - **Perfumes:** Select bottle volume (`30ml`, `50ml`, `100ml`) with real-time price updates and scent profile notes.
  - **Apparel:** Choose sizes (`S`, `M`, `L`, `XL`) and curated colorways.
- **Stock Transparency:** Live badges for "New Arrival", "Low Stock (e.g. 2 left)", and "Sold Out".
- **Botswana Payment Instructions:**
  - Dedicated cards for **Orange Money** (`*145#`) and **FNB Pay2Cell** with instant 1-click number copying.
  - Unique payment reference code generated per order (e.g. `ORD-8421`).
  - Optional payment slip / SMS screenshot upload.
- **WhatsApp Order Push:** 1-tap "Confirm Order via WhatsApp" CTA that deep-links directly into WhatsApp with a pre-filled itemized receipt string ready for the seller.

### 💼 Seller Admin Portal (`/admin`)
- **Order Pipeline Kanban:** Track orders across 5 stages:
  1. *Pending Payment Verification*
  2. *Payment Confirmed*
  3. *Ready for Pickup*
  4. *Out for Delivery*
  5. *Completed*
- **Automated Stock Synchronization:** Verifying payment automatically decrements physical inventory from the corresponding variant.
- **1-Tap WhatsApp Customer Alerts:** Instant status notification buttons on each order card (e.g. "Payment Received", "Ready for Pickup at Main Mall", "Out for Delivery").
- **Live Sales Metrics:** Total BWP revenue, active deliveries, top-selling perfume scents, and fast-moving apparel sizes.
- **Inventory Quick-Add:** Easily publish new arrivals, set variant pricing in BWP, and adjust stock counts on the fly.

---

## 🚀 Quick Start (Local Development)

```bash
# 1. Navigate to the project
cd C:\Users\thale\.gemini\antigravity-ide\scratch\botswana-storefront

# 2. Install dependencies (already completed)
npm install

# 3. Start development server
npm run dev
```

Visit:
- **Storefront:** [http://localhost:3000](http://localhost:3000)
- **Seller Operations Hub:** [http://localhost:3000/admin](http://localhost:3000/admin)

---

## 🏗️ Production Build & Verification

```bash
# Type check
npm run type-check

# Production build
npm run build

# Start production server
npm run start
```

---

## 🗄️ Supabase PostgreSQL Setup

The complete database schema and seed data is located in [`supabase/schema.sql`](supabase/schema.sql).
It includes:
- Tables: `products`, `product_variants`, `customer_reviews`, `seller_configs`, `customers`, `orders`, `order_items`.
- Custom sequence `order_ref_seq` producing human-friendly reference codes (`ORD-XXXX`).
- PostgreSQL Trigger `handle_order_status_stock_sync` that automatically decrements physical variant stock upon payment verification and restores stock if cancelled.
- Full Row Level Security (RLS) policies allowing public browsing of active catalog & customer reviews and guest order submission, while protecting seller operations.
- Initial seed data for authentic Botswana extrait fragrances, linen apparel, and verified Francistown/Tati Siding customer reviews.

**Setup Instructions:**
1. Create a free project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase dashboard.
3. Open [`supabase/schema.sql`](supabase/schema.sql), paste the entire contents into the SQL Editor, and click **Run**.
4. Go to **Project Settings > API** and copy:
   - `Project URL`
   - `anon` `public` key
5. Add them to your environment variables (`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`).

---

## ☁️ Deployment Guide

### 1. Push to GitHub
```bash
# 1. Initialize Git and set main branch (if not already done)
git init
git branch -M main

# 2. Stage files and commit
git add .
git commit -m "feat: NeoSales Botswana storefront & seller operations hub"

# 3. Add your remote GitHub repository and push
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git push -u origin main
```

### 2. Deploy to Cloudflare Workers / Pages (Edge Network)

#### Option A: Automated Git CI/CD via Cloudflare Pages (Recommended)
1. In your [Cloudflare Dashboard](https://dash.cloudflare.com/), navigate to **Workers & Pages > Create application > Pages > Connect to Git**.
2. Select your GitHub repository (`neosales`).
3. Set the build configuration:
   - **Framework preset:** `Next.js (Static HTML Export)`
   - **Build command:** `npm run build`
   - **Build output directory:** `out`
4. Add Environment Variables in the Cloudflare Pages settings:
   - `NEXT_PUBLIC_STORE_NAME`: `NeoSales`
   - `NEXT_PUBLIC_SELLER_WHATSAPP`: `+26772123456`
   - `NEXT_PUBLIC_ORANGE_MONEY_NUMBER`: `72123456`
   - `NEXT_PUBLIC_FNB_PAY2CELL_NUMBER`: `74123456`
   - `NEXT_PUBLIC_FNB_ACCOUNT_NAME`: `NeoSales Retail`
   - `NEXT_PUBLIC_SUPABASE_URL`: (Your Supabase Project URL)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: (Your Supabase Anon Key)
5. Click **Save and Deploy**. Cloudflare will automatically build and distribute NeoSales globally across 300+ edge data centers.

#### Option B: Terminal Deployment via Wrangler CLI
```bash
# 1. Authenticate Wrangler with your Cloudflare account
npx wrangler login

# 2. Build the static production bundle
npm run build

# 3. Deploy the output directly to Cloudflare Pages
npx wrangler pages deploy out --project-name neosales
```
