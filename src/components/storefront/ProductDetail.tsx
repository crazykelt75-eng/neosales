'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  BellRing,
  Check,
  CheckCircle2,
  Minus,
  MessageCircle,
  Plus,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { Product, ProductVariant } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { StarRating } from '@/components/ui/StarRating';
import { CATEGORY_LABELS, LOW_STOCK_WARNING_CEILING, SELLER_CONFIG } from '@/lib/constants';
import { formatBWP } from '@/lib/format';
import { getGalleryImages } from '@/lib/imageUtils';
import { getProductStatusSummary, getProductTeaser, getVariantLabel } from '@/lib/product';
import { buildProductEnquiryLink } from '@/lib/whatsapp';

interface ProductDetailProps {
  product: Product;
}

/**
 * Full-page product view used by the shareable `/p/[slug]` route so customers
 * can send a single link into WhatsApp, Facebook or a Status update with a
 * proper image preview.
 */
export function ProductDetail({ product }: ProductDetailProps) {
  const { addToCart, getProductReviews, getProductRating, markViewed, toggleSaved, isSaved, addReview } = useStore();

  const [selectedVariantId, setSelectedVariantId] = useState(product.variants[0]?.id ?? '');
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [reviewName, setReviewName] = useState('');
  const [reviewTown, setReviewTown] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewError, setReviewError] = useState('');

  const gallery = useMemo(() => getGalleryImages(product.imageUrls, 1200), [product.imageUrls]);
  const reviews = getProductReviews(product.id);
  const { average, count } = getProductRating(product.id);
  const summary = getProductStatusSummary(product);

  const selectedVariant = product.variants.find((variant) => variant.id === selectedVariantId) ?? product.variants[0];
  const volumes = product.variants.filter((variant) => typeof variant.volumeMl === 'number');
  const colourVariants = product.variants.filter((variant) => Boolean(variant.color));
  const colors = Array.from(new Set(colourVariants.map((variant) => variant.color as string)));

  const variantStock = selectedVariant?.stockQuantity ?? 0;
  const isVariantSoldOut = variantStock === 0;
  const isLowStock = !isVariantSoldOut && variantStock <= LOW_STOCK_WARNING_CEILING;
  const saved = isSaved(product.id);

  // Remember this visit so the storefront can offer a "recently viewed" row.
  useEffect(() => {
    markViewed(product.id);
  }, [markViewed, product.id]);

  const handleAddToBag = () => {
    if (!selectedVariant || isVariantSoldOut) return;

    addToCart(product, selectedVariant, quantity);
    setStatusMessage(`Added ${quantity} × ${getVariantLabel(selectedVariant)} to your bag.`);
    window.setTimeout(() => setStatusMessage(''), 2500);
  };

  const handleShare = async () => {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    const shareText = `${product.title} — ${formatBWP(selectedVariant?.priceBWP ?? summary.minPriceBWP)} at ${SELLER_CONFIG.storeName}`;

    try {
      if (navigator.share) {
        await navigator.share({ title: product.title, text: shareText, url: shareUrl });
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      setStatusMessage('Product link copied — paste it into WhatsApp or your Status.');
      window.setTimeout(() => setStatusMessage(''), 2500);
    } catch {
      setStatusMessage('Copy this page link from your browser address bar to share it.');
      window.setTimeout(() => setStatusMessage(''), 3000);
    }
  };

  const handleReviewSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (reviewName.trim().length < 2) {
      setReviewError('Please add your name so other buyers know who wrote this.');
      return;
    }

    if (reviewComment.trim().length < 12) {
      setReviewError('Tell us a little more — at least a sentence.');
      return;
    }

    addReview({
      productId: product.id,
      customerName: reviewName.trim(),
      town: reviewTown.trim() || 'Botswana',
      rating: reviewRating as 1 | 2 | 3 | 4 | 5,
      comment: reviewComment.trim(),
      verified: false,
    });

    setReviewName('');
    setReviewTown('');
    setReviewRating(5);
    setReviewComment('');
    setReviewError('');
    setStatusMessage('Thank you — your review is published.');
    window.setTimeout(() => setStatusMessage(''), 2500);
  };

  return (
    <div className="space-y-8">
      <Link
        href="/#catalog"
        className="inline-flex items-center gap-2 text-xs font-bold text-neutral-300 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-orangeMoney"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        Back to the collection
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        {/* Gallery */}
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#080a10]">
            <div className="relative w-full" style={{ aspectRatio: '4 / 5' }}>
              <img
                src={gallery[activeImage] ?? gallery[0]}
                alt={`${product.title} — view ${activeImage + 1}`}
                width={800}
                height={1000}
                loading="eager"
                decoding="async"
                fetchPriority="high"
                className="h-full w-full object-cover object-center"
              />
            </div>

            <div className="absolute left-4 top-4 flex flex-wrap gap-2">
              {summary.isSoldOut ? (
                <Badge variant="soldOut" icon={null}>
                  Sold out
                </Badge>
              ) : summary.isLowStock ? (
                <Badge variant="lowStock">Only {summary.totalStock} left</Badge>
              ) : product.isNewArrival ? (
                <Badge variant="new">New arrival</Badge>
              ) : null}
              {product.featuredTag && (
                <Badge variant="amber" icon={null}>
                  {product.featuredTag}
                </Badge>
              )}
            </div>
          </div>

          {gallery.length > 1 && (
            <div className="flex gap-2" role="group" aria-label="Product images">
              {gallery.map((image, index) => (
                <button
                  key={image}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  aria-label={`Show image ${index + 1} of ${gallery.length}`}
                  aria-pressed={index === activeImage}
                  className={`h-20 w-16 overflow-hidden rounded-xl border transition-all ${
                    index === activeImage ? 'border-orangeMoney' : 'border-white/10 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={image} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Buy column */}
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-2xs font-bold uppercase tracking-[0.16em] text-neutral-400">
              {CATEGORY_LABELS[product.category]}
            </p>
            <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-3xl">
              {product.title}
            </h1>
            <p className="text-xs font-semibold text-neutral-300">{getProductTeaser(product)}</p>

            {count > 0 && (
              <div className="flex items-center gap-2">
                <StarRating
                  rating={average}
                  size={15}
                  withLabel
                  label={`Rated ${average} out of 5 from ${count} reviews`}
                />
                <span className="text-xs font-semibold text-neutral-300">
                  {average.toFixed(1)} · {count} review{count === 1 ? '' : 's'}
                </span>
              </div>
            )}
          </div>

          <p className="font-mono text-2xl font-black text-white sm:text-3xl" data-price>
            {formatBWP(selectedVariant?.priceBWP ?? summary.minPriceBWP)}
            {summary.hasPriceRange && (
              <span className="ml-2 text-sm font-semibold text-neutral-400">
                range {formatBWP(summary.minPriceBWP)}–{formatBWP(summary.maxPriceBWP)}
              </span>
            )}
          </p>

          <p className="text-xs leading-relaxed text-neutral-300">{product.description}</p>

          {/* Variant selection */}
          {volumes.length > 0 && (
            <fieldset>
              <legend className="mb-2 text-2xs font-bold uppercase tracking-[0.14em] text-neutral-400">Volume</legend>
              <div className="flex flex-wrap gap-2">
                {volumes.map((variant) => (
                  <VariantPill
                    key={variant.id}
                    variant={variant}
                    isActive={variant.id === selectedVariant?.id}
                    onSelect={() => {
                      setSelectedVariantId(variant.id);
                      setQuantity(1);
                    }}
                  />
                ))}
              </div>
            </fieldset>
          )}

          {colors.length > 0 && (
            <fieldset>
              <legend className="mb-2 text-2xs font-bold uppercase tracking-[0.14em] text-neutral-400">Colour</legend>
              <div className="flex flex-wrap gap-2">
                {colors.map((color) => {
                  const isActive = selectedVariant?.color === color;
                  const colorSoldOut = colourVariants
                    .filter((variant) => variant.color === color)
                    .every((variant) => variant.stockQuantity === 0);

                  return (
                    <button
                      key={color}
                      type="button"
                      disabled={colorSoldOut}
                      aria-pressed={isActive}
                      onClick={() => {
                        const next =
                          colourVariants.find((variant) => variant.color === color && variant.stockQuantity > 0) ??
                          colourVariants.find((variant) => variant.color === color);
                        if (next) {
                          setSelectedVariantId(next.id);
                          setQuantity(1);
                        }
                      }}
                      className={`min-h-[42px] rounded-xl border px-3.5 text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                        isActive
                          ? 'border-orangeMoney bg-orangeMoney/15 text-white'
                          : 'border-white/12 bg-white/[0.04] text-neutral-200 hover:border-white/25 hover:text-white'
                      }`}
                    >
                      {color}
                      {colorSoldOut && (
                        <span className="ml-1.5 text-2xs font-semibold text-neutral-400">sold out</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          {product.variants.some((variant) => variant.size) && (
            <fieldset>
              <legend className="mb-2 text-2xs font-bold uppercase tracking-[0.14em] text-neutral-400">Size</legend>
              <div className="flex flex-wrap gap-2">
                {product.variants
                  .filter(
                    (variant) =>
                      Boolean(variant.size) &&
                      (!selectedVariant?.color || variant.color === selectedVariant.color)
                  )
                  .map((variant) => (
                    <VariantPill
                      key={variant.id}
                      variant={variant}
                      isActive={variant.id === selectedVariant?.id}
                      onSelect={() => {
                        setSelectedVariantId(variant.id);
                        setQuantity(1);
                      }}
                    />
                  ))}
              </div>
            </fieldset>
          )}

          {/* Stock state */}
          {selectedVariant && (
            <p className="text-2xs font-semibold text-neutral-400">
              SKU {selectedVariant.sku} ·{' '}
              {isVariantSoldOut ? (
                <span className="text-red-300">Out of stock</span>
              ) : (
                <span className={isLowStock ? 'text-amber-300' : 'text-emerald-300'}>
                  {isLowStock ? `Only ${variantStock} left` : `${variantStock} in stock`}
                </span>
              )}
            </p>
          )}

          {isLowStock && (
            <div
              role="status"
              className="flex items-start gap-2.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3"
            >
              <AlertTriangle size={16} className="mt-0.5 flex-shrink-0 text-amber-300" aria-hidden="true" />
              <p className="text-xs leading-relaxed text-amber-100">
                Almost gone — only <strong>{variantStock}</strong> left of this option.
              </p>
            </div>
          )}

          {/* Quantity + add */}
          {!isVariantSoldOut ? (
            <div className="flex items-center justify-between gap-3">
              <span id="detail-qty-label" className="text-2xs font-bold uppercase tracking-[0.14em] text-neutral-400">
                Quantity
              </span>

              <div
                role="group"
                aria-labelledby="detail-qty-label"
                className="inline-flex items-center gap-1 rounded-xl border border-white/12 bg-white/[0.04] p-1"
              >
                <button
                  type="button"
                  onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                  disabled={quantity <= 1}
                  aria-label="Decrease quantity"
                  className="rounded-lg p-2 text-neutral-200 transition-colors hover:bg-white/10 disabled:opacity-30"
                >
                  <Minus size={14} aria-hidden="true" />
                </button>
                <span className="min-w-[36px] text-center font-mono text-sm font-bold text-white" aria-live="polite">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((current) => Math.min(variantStock, current + 1))}
                  disabled={quantity >= variantStock}
                  aria-label="Increase quantity"
                  className="rounded-lg p-2 text-neutral-200 transition-colors hover:bg-white/10 disabled:opacity-30"
                >
                  <Plus size={14} aria-hidden="true" />
                </button>
              </div>
            </div>
          ) : (
            <BackInStockForm productId={product.id} variantId={selectedVariant?.id ?? ''} />
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              disabled={isVariantSoldOut}
              onClick={handleAddToBag}
              leftIcon={<ShoppingBag size={17} />}
            >
              {isVariantSoldOut ? 'Sold out' : `Add to bag · ${formatBWP((selectedVariant?.priceBWP ?? 0) * quantity)}`}
            </Button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleShare}
                aria-label="Share this product"
                className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.05] px-4 text-sm font-bold text-neutral-200 transition-colors hover:bg-white/[0.12] hover:text-white"
              >
                <Share2 size={16} aria-hidden="true" />
                Share
              </button>

              <button
                type="button"
                onClick={() => toggleSaved(product.id)}
                aria-pressed={saved}
                className={`inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border px-4 text-sm font-bold transition-colors ${
                  saved
                    ? 'border-orangeMoney/50 bg-orangeMoney/15 text-white'
                    : 'border-white/12 bg-white/[0.05] text-neutral-200 hover:bg-white/[0.12] hover:text-white'
                }`}
              >
                {saved ? <Check size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
                {saved ? 'Saved' : 'Save'}
              </button>
            </div>
          </div>

          <a
            href={buildProductEnquiryLink(product, selectedVariant)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-whatsapp/40 bg-whatsapp/10 text-xs font-bold text-whatsapp transition-colors hover:bg-whatsapp/20 focus-visible:outline-2 focus-visible:outline-whatsapp"
          >
            <MessageCircle size={16} aria-hidden="true" />
            Ask about this piece on WhatsApp
          </a>

          {statusMessage && (
            <p role="status" className="flex items-center gap-2 text-2xs font-semibold text-emerald-300">
              <CheckCircle2 size={13} aria-hidden="true" />
              {statusMessage}
            </p>
          )}

          <ul className="space-y-2 border-t border-white/10 pt-4 text-2xs text-neutral-300">
            <li className="flex items-center gap-2">
              <ShieldCheck size={13} className="text-emerald-400" aria-hidden="true" />
              Authenticity guaranteed — sourced directly, never diluted.
            </li>
            <li className="flex items-center gap-2">
              <Truck size={13} className="text-amber-400" aria-hidden="true" />
              Free Francistown pickup · P45 local courier · P80 nationwide.
            </li>
          </ul>
        </div>
      </div>

      {/* Reviews */}
      <section aria-labelledby="reviews-heading" className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-white/10 bg-surface/70 p-5">
          <h2 id="reviews-heading" className="text-sm font-bold text-white">
            Buyer reviews ({reviews.length})
          </h2>

          {reviews.length === 0 ? (
            <p className="mt-2 text-xs leading-relaxed text-neutral-400">
              No reviews for this piece yet. If you own it, be the first to tell other buyers what you think.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {reviews.map((review) => (
                <li key={review.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <StarRating rating={review.rating} size={13} withLabel label={`${review.rating} out of 5`} />
                    <span className="text-2xs font-semibold uppercase tracking-wide text-neutral-400">
                      {review.customerName} · {review.town}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-neutral-200">{review.comment}</p>
                  {review.verified && (
                    <p className="mt-1.5 flex items-center gap-1.5 text-2xs font-bold uppercase tracking-wide text-emerald-300">
                      <CheckCircle2 size={12} aria-hidden="true" />
                      Verified purchase
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Review submission */}
        <form onSubmit={handleReviewSubmit} className="rounded-3xl border border-white/10 bg-surface/70 p-5">
          <h2 className="text-sm font-bold text-white">Write a review</h2>
          <p className="mt-1 text-2xs leading-relaxed text-neutral-400">
            Bought this from us? Share your experience — it helps other buyers in Botswana decide.
          </p>

          <div className="mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="review-name" className="mb-1.5 block text-xs font-semibold text-neutral-200">
                  Your name
                </label>
                <input
                  id="review-name"
                  value={reviewName}
                  onChange={(event) => setReviewName(event.target.value)}
                  placeholder="e.g. Naledi K."
                  className="w-full rounded-xl border border-white/12 bg-black/30 px-3.5 py-2.5 text-sm text-white placeholder:text-neutral-400 focus:border-orangeMoney focus:outline-none focus:ring-2 focus:ring-orangeMoney/40"
                />
              </div>

              <div>
                <label htmlFor="review-town" className="mb-1.5 block text-xs font-semibold text-neutral-200">
                  Town
                </label>
                <input
                  id="review-town"
                  value={reviewTown}
                  onChange={(event) => setReviewTown(event.target.value)}
                  placeholder="e.g. Francistown"
                  className="w-full rounded-xl border border-white/12 bg-black/30 px-3.5 py-2.5 text-sm text-white placeholder:text-neutral-400 focus:border-orangeMoney focus:outline-none focus:ring-2 focus:ring-orangeMoney/40"
                />
              </div>
            </div>

            <fieldset>
              <legend className="mb-1.5 text-xs font-semibold text-neutral-200">Rating</legend>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setReviewRating(value)}
                    aria-pressed={reviewRating === value}
                    aria-label={`${value} star${value === 1 ? '' : 's'}`}
                    className={`min-h-[40px] min-w-[40px] rounded-xl border text-sm font-bold transition-colors ${
                      reviewRating >= value
                        ? 'border-amber-500/50 bg-amber-500/15 text-amber-200'
                        : 'border-white/12 bg-white/[0.04] text-neutral-400 hover:text-white'
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </fieldset>

            <div>
              <label htmlFor="review-comment" className="mb-1.5 block text-xs font-semibold text-neutral-200">
                Your review
              </label>
              <textarea
                id="review-comment"
                rows={3}
                value={reviewComment}
                onChange={(event) => setReviewComment(event.target.value)}
                placeholder="How does it wear? How is the fit? Would you buy again?"
                className="w-full resize-y rounded-xl border border-white/12 bg-black/30 px-3.5 py-2.5 text-sm leading-relaxed text-white placeholder:text-neutral-400 focus:border-orangeMoney focus:outline-none focus:ring-2 focus:ring-orangeMoney/40"
              />
            </div>

            {reviewError && (
              <p role="alert" className="flex items-center gap-1.5 text-2xs font-semibold text-red-300">
                <AlertTriangle size={12} aria-hidden="true" />
                {reviewError}
              </p>
            )}

            <Button type="submit" variant="secondary" size="md" fullWidth>
              Publish review
            </Button>

            <p className="text-2xs leading-relaxed text-neutral-400">
              Reviews published from this page are marked as unverified. Bought from us? Send your order number on
              WhatsApp and we will add the verified badge.
            </p>
          </div>
        </form>
      </section>
    </div>
  );
}

interface VariantPillProps {
  variant: ProductVariant;
  isActive: boolean;
  onSelect: () => void;
}

function VariantPill({ variant, isActive, onSelect }: VariantPillProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={variant.stockQuantity === 0}
      aria-pressed={isActive}
      className={`min-h-[42px] rounded-xl border px-3.5 text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
        isActive
          ? 'border-orangeMoney bg-orangeMoney/15 text-white shadow-[0_0_20px_-10px_rgba(255,102,0,1)]'
          : 'border-white/12 bg-white/[0.04] text-neutral-200 hover:border-white/25 hover:text-white'
      }`}
    >
      {variant.volumeMl ? `${variant.volumeMl}ml` : variant.size}
      {variant.volumeMl && (
        <span className="ml-2 font-mono text-2xs text-neutral-400" data-price>
          {formatBWP(variant.priceBWP)}
        </span>
      )}
    </button>
  );
}

/**
 * Back-in-stock capture for sold-out variants. The seller sees these requests
 * in the dashboard and can WhatsApp everyone the moment stock lands.
 */
function BackInStockForm({ productId, variantId }: { productId: string; variantId: string }) {
  const { products, subscribeStockAlert, removeStockAlert, stockAlerts } = useStore();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const product = products.find((candidate) => candidate.id === productId);
  const variant = product?.variants.find((candidate) => candidate.id === variantId);

  const existing = stockAlerts.find((alert) => alert.variantId === variantId);

  if (!product || !variant) return null;

  if (submitted || existing) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
        <p className="flex items-center gap-2 text-sm font-bold text-emerald-100">
          <BellRing size={16} aria-hidden="true" />
          You are on the restock list
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-neutral-200">
          We will WhatsApp {existing?.phone ?? `+267 ${phone}`} the moment {getVariantLabel(variant)} is back in stock.
        </p>
        {existing && (
          <button
            type="button"
            onClick={() => {
              removeStockAlert(existing.id);
              setSubmitted(false);
              setPhone('');
            }}
            className="mt-2 text-2xs font-semibold text-neutral-300 underline-offset-2 hover:text-white hover:underline"
          >
            Remove me from the list
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.07] p-4">
      <p className="flex items-center gap-2 text-sm font-bold text-amber-100">
        <BellRing size={16} aria-hidden="true" />
        Sold out — want us to tell you when it is back?
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-neutral-200">
        Leave your WhatsApp number and we will message you as soon as {getVariantLabel(variant)} lands. No spam, one
        message.
      </p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="restock-phone">
          Your WhatsApp number for the restock alert
        </label>
        <div className="flex min-w-0 flex-1 items-center overflow-hidden rounded-xl border border-white/12 bg-black/30 focus-within:border-orangeMoney focus-within:ring-2 focus-within:ring-orangeMoney/40">
          <span className="border-r border-white/10 bg-white/[0.05] px-3 py-2.5 font-mono text-xs font-bold text-neutral-300">
            +267
          </span>
          <input
            id="restock-phone"
            value={phone}
            inputMode="numeric"
            onChange={(event) => {
              setPhone(event.target.value.replace(/[^\d\s]/g, ''));
              setError('');
            }}
            placeholder="71 550 200"
            className="w-full bg-transparent px-3 py-2.5 font-mono text-xs text-white placeholder:text-neutral-400 focus:outline-none"
          />
        </div>

        <Button
          variant="amber"
          size="md"
          onClick={() => {
            const ok = subscribeStockAlert(product, variant, phone);
            if (!ok) {
              setError('That number does not look right — enter a Botswana mobile number.');
              return;
            }
            setSubmitted(true);
          }}
        >
          Notify me
        </Button>
      </div>

      {error && (
        <p role="alert" className="mt-2 text-2xs font-semibold text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
