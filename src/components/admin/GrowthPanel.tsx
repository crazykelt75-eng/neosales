'use client';

import React, { useMemo, useState } from 'react';
import {
  BellRing,
  CheckCircle2,
  MessageCircle,
  Percent,
  Plus,
  Star,
  Tag,
  Trash2,
  Users,
} from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { PromoCode } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { AUTOMATIC_BUNDLE, describePromo } from '@/lib/promo';
import { formatBWP, formatRelativeTime } from '@/lib/format';
import { buildWhatsAppLink, formatBotswanaPhone } from '@/lib/whatsapp';
import { SELLER_CONFIG } from '@/lib/constants';
import { CUSTOMER_REVIEWS } from '@/lib/mockData';

const SEEDED_REVIEW_IDS = new Set(CUSTOMER_REVIEWS.map((review) => review.id));

type GrowthTab = 'promos' | 'alerts' | 'reviews';

const TAB_LABELS: Record<GrowthTab, string> = {
  promos: 'Promo codes',
  alerts: 'Restock requests',
  reviews: 'Reviews',
};

/** Marketing and customer-engagement tooling: promos, restock alerts, reviews. */
export function GrowthPanel() {
  const [activeTab, setActiveTab] = useState<GrowthTab>('promos');

  const {
    promoCodes,
    savePromoCode,
    deletePromoCode,
    stockAlerts,
    markStockAlertNotified,
    removeStockAlert,
    products,
    reviews,
    metrics,
  } = useStore();

  // Anything that is not part of the seeded review set came from a buyer.
  const submittedReviews = useMemo(
    () => reviews.filter((review) => !SEEDED_REVIEW_IDS.has(review.id)),
    [reviews]
  );

  const pendingAlerts = stockAlerts.filter((alert) => !alert.notifiedAt);

  return (
    <section aria-label="Growth tools" className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Growth sections">
        {(Object.keys(TAB_LABELS) as GrowthTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            id={`growth-tab-${tab}`}
            aria-selected={activeTab === tab}
            aria-controls={`growth-panel-${tab}`}
            onClick={() => setActiveTab(tab)}
            className={`inline-flex min-h-[42px] items-center gap-2 rounded-xl border px-4 text-xs font-bold uppercase tracking-wide transition-colors ${
              activeTab === tab
                ? 'border-orangeMoney/50 bg-orangeMoney/15 text-white'
                : 'border-white/10 bg-white/[0.04] text-neutral-300 hover:text-white'
            }`}
          >
            {tab === 'promos' && <Percent size={15} aria-hidden="true" />}
            {tab === 'alerts' && <BellRing size={15} aria-hidden="true" />}
            {tab === 'reviews' && <Star size={15} aria-hidden="true" />}
            {TAB_LABELS[tab]}
            {tab === 'alerts' && pendingAlerts.length > 0 && (
              <span className="rounded-full bg-amber-400/90 px-1.5 font-mono text-2xs font-black text-neutral-950">
                {pendingAlerts.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`growth-panel-${activeTab}`} aria-labelledby={`growth-tab-${activeTab}`}>
        {activeTab === 'promos' && (
          <PromoManager promoCodes={promoCodes} onSave={savePromoCode} onDelete={deletePromoCode} />
        )}

        {activeTab === 'alerts' && (
          <StockAlertManager
            alerts={stockAlerts}
            products={products}
            onNotify={markStockAlertNotified}
            onRemove={removeStockAlert}
          />
        )}

        {activeTab === 'reviews' && (
          <ReviewManager reviews={submittedReviews} metrics={metrics} products={products} />
        )}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- *
 * Promo codes
 * -------------------------------------------------------------------------- */

function PromoManager({
  promoCodes,
  onSave,
  onDelete,
}: {
  promoCodes: PromoCode[];
  onSave: (promo: PromoCode) => void;
  onDelete: (id: string) => void;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [code, setCode] = useState('');
  const [percent, setPercent] = useState('10');
  const [minSubtotal, setMinSubtotal] = useState('300');
  const [maxDiscount, setMaxDiscount] = useState('200');
  const [expiresAt, setExpiresAt] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const handleCreate = () => {
    const cleanCode = code.trim().toUpperCase().replace(/\s/g, '');
    const percentValue = Number(percent);

    if (cleanCode.length < 3) {
      setError('Use at least 3 characters for the code.');
      return;
    }

    if (promoCodes.some((promo) => promo.code === cleanCode)) {
      setError('That code already exists.');
      return;
    }

    if (!Number.isFinite(percentValue) || percentValue <= 0 || percentValue > 90) {
      setError('Percentage off must be between 1 and 90.');
      return;
    }

    onSave({
      id: crypto.randomUUID(),
      code: cleanCode,
      percentOff: Math.round(percentValue),
      minSubtotalBWP: Math.max(0, Number(minSubtotal) || 0),
      maxDiscountBWP: Number(maxDiscount) > 0 ? Number(maxDiscount) : undefined,
      expiresAt: expiresAt || undefined,
      isActive: true,
      description: description.trim() || `${percentValue}% off promotion`,
    });

    setCode('');
    setPercent('10');
    setMinSubtotal('300');
    setMaxDiscount('200');
    setExpiresAt('');
    setDescription('');
    setError('');
    setIsCreating(false);
  };

  return (
    <div className="space-y-4">
      {/* Automatic bundle */}
      <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-4">
        <h3 className="flex items-center gap-2 text-sm font-bold text-white">
          <Tag size={16} className="text-amber-300" aria-hidden="true" />
          Automatic bundle (always on)
        </h3>
        <p className="mt-1.5 text-xs leading-relaxed text-neutral-300">
          {AUTOMATIC_BUNDLE.label} — applied automatically when {AUTOMATIC_BUNDLE.minPerfumeUnits}+ perfume units are in
          the bag, capped at {formatBWP(AUTOMATIC_BUNDLE.maxDiscountBWP)}. No code needed, which is why it converts
          well.
        </p>
      </div>

      {/* Existing codes */}
      <div className="rounded-2xl border border-white/10 bg-surface/70 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-sm font-bold text-white">
            <Percent size={16} className="text-orangeMoney" aria-hidden="true" />
            Promo codes ({promoCodes.length})
          </h3>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreating((open) => !open)}
            leftIcon={<Plus size={15} />}
          >
            {isCreating ? 'Cancel' : 'New code'}
          </Button>
        </div>

        {isCreating && (
          <div className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-black/25 p-3.5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="promo-new-code" className="mb-1.5 block text-2xs font-bold uppercase tracking-wide text-neutral-400">
                  Code
                </label>
                <input
                  id="promo-new-code"
                  value={code}
                  onChange={(event) => {
                    setCode(event.target.value.toUpperCase());
                    setError('');
                  }}
                  placeholder="e.g. PAYDAY15"
                  className="w-full rounded-xl border border-white/12 bg-black/40 px-3 py-2.5 font-mono text-sm uppercase text-white placeholder:text-neutral-400 focus:border-orangeMoney focus:outline-none focus:ring-2 focus:ring-orangeMoney/40"
                />
              </div>

              <div>
                <label htmlFor="promo-new-percent" className="mb-1.5 block text-2xs font-bold uppercase tracking-wide text-neutral-400">
                  Percent off
                </label>
                <input
                  id="promo-new-percent"
                  type="number"
                  min={1}
                  max={90}
                  value={percent}
                  onChange={(event) => setPercent(event.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-black/40 px-3 py-2.5 font-mono text-sm text-white focus:border-orangeMoney focus:outline-none focus:ring-2 focus:ring-orangeMoney/40"
                />
              </div>

              <div>
                <label htmlFor="promo-new-min" className="mb-1.5 block text-2xs font-bold uppercase tracking-wide text-neutral-400">
                  Minimum spend (P)
                </label>
                <input
                  id="promo-new-min"
                  type="number"
                  min={0}
                  value={minSubtotal}
                  onChange={(event) => setMinSubtotal(event.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-black/40 px-3 py-2.5 font-mono text-sm text-white focus:border-orangeMoney focus:outline-none focus:ring-2 focus:ring-orangeMoney/40"
                />
              </div>

              <div>
                <label htmlFor="promo-new-cap" className="mb-1.5 block text-2xs font-bold uppercase tracking-wide text-neutral-400">
                  Max discount (P)
                </label>
                <input
                  id="promo-new-cap"
                  type="number"
                  min={0}
                  value={maxDiscount}
                  onChange={(event) => setMaxDiscount(event.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-black/40 px-3 py-2.5 font-mono text-sm text-white focus:border-orangeMoney focus:outline-none focus:ring-2 focus:ring-orangeMoney/40"
                />
              </div>

              <div>
                <label htmlFor="promo-new-expiry" className="mb-1.5 block text-2xs font-bold uppercase tracking-wide text-neutral-400">
                  Expires (optional)
                </label>
                <input
                  id="promo-new-expiry"
                  type="date"
                  value={expiresAt}
                  onChange={(event) => setExpiresAt(event.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-black/40 px-3 py-2.5 text-sm text-white focus:border-orangeMoney focus:outline-none focus:ring-2 focus:ring-orangeMoney/40"
                />
              </div>

              <div>
                <label htmlFor="promo-new-desc" className="mb-1.5 block text-2xs font-bold uppercase tracking-wide text-neutral-400">
                  Customer-facing note
                </label>
                <input
                  id="promo-new-desc"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="e.g. Payday weekend special"
                  className="w-full rounded-xl border border-white/12 bg-black/40 px-3 py-2.5 text-sm text-white placeholder:text-neutral-400 focus:border-orangeMoney focus:outline-none focus:ring-2 focus:ring-orangeMoney/40"
                />
              </div>
            </div>

            {error && (
              <p role="alert" className="text-2xs font-semibold text-red-300">
                {error}
              </p>
            )}

            <Button variant="primary" size="md" fullWidth onClick={handleCreate} leftIcon={<Plus size={15} />}>
              Create promo code
            </Button>
          </div>
        )}

        <ul className="mt-4 space-y-2">
          {promoCodes.map((promo) => (
            <li
              key={promo.id}
              className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-black text-orangeMoney">{promo.code}</span>
                  <Badge variant={promo.isActive ? 'success' : 'soldOut'} icon={null} className="text-[10px]">
                    {promo.isActive ? 'Active' : 'Paused'}
                  </Badge>
                </p>
                <p className="mt-0.5 text-2xs text-neutral-400">{describePromo(promo)}</p>
                <p className="text-2xs text-neutral-400">{promo.description}</p>
              </div>

              <div className="flex flex-shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => onSave({ ...promo, isActive: !promo.isActive })}
                  className={`inline-flex min-h-[36px] items-center rounded-xl border px-2.5 text-2xs font-bold uppercase tracking-wide transition-colors ${
                    promo.isActive
                      ? 'border-white/12 bg-white/[0.05] text-neutral-200 hover:bg-white/[0.12]'
                      : 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
                  }`}
                >
                  {promo.isActive ? 'Pause' : 'Activate'}
                </button>

                <button
                  type="button"
                  onClick={() => onDelete(promo.id)}
                  aria-label={`Delete promo ${promo.code}`}
                  className="rounded-lg border border-red-500/25 p-2 text-red-300 transition-colors hover:bg-red-500/10"
                >
                  <Trash2 size={13} aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>

        <p className="mt-3 text-2xs leading-relaxed text-neutral-400">
          Share active codes on WhatsApp Status and the codes box in checkout picks them up automatically.
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- *
 * Back-in-stock alerts
 * -------------------------------------------------------------------------- */

function StockAlertManager({
  alerts,
  products,
  onNotify,
  onRemove,
}: {
  alerts: ReturnType<typeof useStore>['stockAlerts'];
  products: ReturnType<typeof useStore>['products'];
  onNotify: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const readyToNotify = alerts.filter((alert) => {
    const product = products.find((candidate) => candidate.id === alert.productId);
    const variant = product?.variants.find((candidate) => candidate.id === alert.variantId);
    return Boolean(variant && variant.stockQuantity > 0 && !alert.notifiedAt);
  });

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-4">
        <h3 className="flex items-center gap-2 text-sm font-bold text-white">
          <CheckCircle2 size={16} className="text-emerald-300" aria-hidden="true" />
          {readyToNotify.length} customer{readyToNotify.length === 1 ? '' : 's'} waiting for stock you now have
        </h3>
        <p className="mt-1.5 text-xs leading-relaxed text-neutral-300">
          These buyers asked to be told when a sold-out option came back. One WhatsApp message each converts them at
          almost no cost.
        </p>
      </div>

      {alerts.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-surface/70 p-6 text-center text-xs text-neutral-400">
          No restock requests yet. They appear here the moment a customer asks to be notified from a sold-out product
          page.
        </p>
      ) : (
        <ul className="space-y-2">
          {alerts.map((alert) => {
            const product = products.find((candidate) => candidate.id === alert.productId);
            const variant = product?.variants.find((candidate) => candidate.id === alert.variantId);
            const backInStock = (variant?.stockQuantity ?? 0) > 0;

            return (
              <li
                key={alert.id}
                className="flex flex-col gap-2 rounded-xl border border-white/10 bg-surface/70 px-3.5 py-2.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-xs font-semibold text-neutral-100">
                    {alert.productTitle}
                    {backInStock ? (
                      <Badge variant="success" icon={null} className="text-[10px]">
                        Back in stock
                      </Badge>
                    ) : (
                      <Badge variant="soldOut" icon={null} className="text-[10px]">
                        Still out
                      </Badge>
                    )}
                    {alert.notifiedAt && (
                      <Badge variant="neutral" icon={null} className="text-[10px]">
                        Notified
                      </Badge>
                    )}
                  </p>
                  <p className="mt-0.5 text-2xs text-neutral-400">
                    {alert.variantLabel} ·{' '}
                    <a href={`tel:${alert.phone}`} className="font-mono hover:text-white">
                      {formatBotswanaPhone(alert.phone)}
                    </a>{' '}
                    · asked {formatRelativeTime(alert.createdAt)}
                  </p>
                </div>

                <div className="flex flex-shrink-0 items-center gap-2">
                  <a
                    href={buildWhatsAppLink(
                      alert.phone,
                      [
                        `Dumelang! Good news from ${SELLER_CONFIG.storeName} 🌸`,
                        `${alert.productTitle} (${alert.variantLabel}) is back in stock.`,
                        'Would you like me to hold one for you?',
                      ].join('\n')
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onNotify(alert.id)}
                    className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border px-2.5 text-2xs font-bold uppercase tracking-wide transition-colors ${
                      backInStock
                        ? 'border-whatsapp/40 bg-whatsapp/10 text-whatsapp hover:bg-whatsapp/20'
                        : 'border-white/12 bg-white/[0.05] text-neutral-300 hover:bg-white/[0.12]'
                    }`}
                  >
                    <MessageCircle size={12} aria-hidden="true" />
                    {backInStock ? 'Notify' : 'Nudge'}
                  </a>

                  <button
                    type="button"
                    onClick={() => onRemove(alert.id)}
                    aria-label={`Remove restock request for ${alert.productTitle}`}
                    className="rounded-lg border border-white/12 p-2 text-neutral-400 transition-colors hover:border-red-500/40 hover:text-red-300"
                  >
                    <Trash2 size={13} aria-hidden="true" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- *
 * Reviews
 * -------------------------------------------------------------------------- */

function ReviewManager({
  reviews,
  metrics,
  products,
}: {
  reviews: ReturnType<typeof useStore>['reviews'];
  metrics: ReturnType<typeof useStore>['metrics'];
  products: ReturnType<typeof useStore>['products'];
}) {
  const averageRating =
    reviews.length > 0 ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-surface/80 p-4">
          <p className="text-2xs font-bold uppercase tracking-[0.14em] text-neutral-400">Reviews on file</p>
          <p className="mt-1.5 font-mono text-xl font-black text-white">{reviews.length}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-surface/80 p-4">
          <p className="text-2xs font-bold uppercase tracking-[0.14em] text-neutral-400">Average rating</p>
          <p className="mt-1.5 font-mono text-xl font-black text-amber-200">{averageRating.toFixed(1)} / 5</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-surface/80 p-4">
          <p className="text-2xs font-bold uppercase tracking-[0.14em] text-neutral-400">Customers served</p>
          <p className="mt-1.5 font-mono text-xl font-black text-white">{metrics.totalOrders}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-surface/70 p-5">
        <h3 className="flex items-center gap-2 text-sm font-bold text-white">
          <Star size={16} className="text-amber-300" aria-hidden="true" />
          Recent buyer feedback
        </h3>

        <ul className="mt-4 space-y-2">
          {reviews.slice(0, 12).map((review) => {
            const productTitle = products.find((item) => item.id === review.productId)?.title ?? review.productId;

            return (
              <li key={review.id} className="rounded-xl border border-white/10 bg-black/25 px-3.5 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="flex items-center gap-2 text-xs font-semibold text-neutral-100">
                    <span className="font-mono text-amber-300">{review.rating}★</span>
                    {review.customerName}
                    <span className="text-neutral-400">· {review.town}</span>
                  </p>
                  {review.verified && (
                    <Badge variant="success" icon={null} className="text-[10px]">
                      {review.orderNumber ? `Verified · ${review.orderNumber}` : 'Verified purchase'}
                    </Badge>
                  )}
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-neutral-300">{review.comment}</p>
                <p className="mt-1 text-2xs text-neutral-400">
                  {productTitle}
                  {review.orderNumber ? ` · ${review.orderNumber}` : ''}
                </p>
              </li>
            );
          })}
        </ul>

        <p className="mt-3 flex items-center gap-2 text-2xs leading-relaxed text-neutral-400">
          <Users size={12} aria-hidden="true" />
          Buyers leave reviews from any shareable product page. Adding their <span className="font-mono">ORD-…</span>{' '}
          reference earns the verified badge automatically — it is only granted when the order exists and contains that
          product.
        </p>
      </div>
    </div>
  );
}
