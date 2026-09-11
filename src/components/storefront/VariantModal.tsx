'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  Minus,
  MessageCircle,
  Plus,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from 'lucide-react';
import Link from 'next/link';
import { useStore } from '@/context/StoreContext';
import { ProductVariant } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { StarRating } from '@/components/ui/StarRating';
import { LOW_STOCK_WARNING_CEILING } from '@/lib/constants';
import { formatBWP } from '@/lib/format';
import { getGalleryImages } from '@/lib/imageUtils';
import { getProductTeaser, getVariantLabel } from '@/lib/product';
import { buildProductEnquiryLink } from '@/lib/whatsapp';
import { SizeGuideModal } from '@/components/storefront/SavedItemsDrawer';

const TITLE_ID = 'variant-modal-title';

/**
 * Product detail / variant selection dialog.
 *
 * Keyboard behaviour (WCAG 2.1.2, 2.2.2): Tab and Shift+Tab stay inside the
 * dialog, Escape and backdrop clicks close it, and focus returns to whichever
 * catalog card opened it.
 */
export function VariantModal() {
  const {
    activeProduct: product,
    closeProduct,
    addToCart,
    openCart,
    getProductReviews,
    getProductRating,
  } = useStore();

  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const [shareNote, setShareNote] = useState('');
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);

  const gallery = useMemo(() => getGalleryImages(product?.imageUrls), [product]);
  const [activeImage, setActiveImage] = useState(0);

  const variants = useMemo(() => product?.variants ?? [], [product]);
  const colors = useMemo(
    () => Array.from(new Set(variants.map((variant) => variant.color).filter(Boolean))) as string[],
    [variants]
  );

  // Default the selection to the first purchasable option whenever the product changes.
  useEffect(() => {
    if (!product) return;

    const firstInStock = product.variants.find((variant) => variant.stockQuantity > 0) ?? product.variants[0];
    setSelectedVariantId(firstInStock?.id ?? '');
    setSelectedColor(firstInStock?.color ?? '');
    setQuantity(1);
    setActiveImage(0);
    setJustAdded(false);
  }, [product]);

  const selectedVariant: ProductVariant | undefined =
    variants.find((variant) => variant.id === selectedVariantId) ?? variants[0];

  /** Variants still reachable once a colourway is chosen. */
  const variantsForColor = useMemo(
    () => (selectedColor ? variants.filter((variant) => variant.color === selectedColor) : variants),
    [selectedColor, variants]
  );

  const volumes = useMemo(
    () => variants.filter((variant) => typeof variant.volumeMl === 'number'),
    [variants]
  );
  const sizesInColor = useMemo(
    () => variantsForColor.filter((variant) => Boolean(variant.size)),
    [variantsForColor]
  );

  const reviews = getProductReviews(product?.id ?? '');
  const { average, count } = getProductRating(product?.id ?? '');

  if (!product) return null;

  const isSoldOut = product.variants.every((variant) => variant.stockQuantity === 0);
  const variantStock = selectedVariant?.stockQuantity ?? 0;
  const isVariantSoldOut = variantStock === 0;
  const isLowStock = !isVariantSoldOut && variantStock <= LOW_STOCK_WARNING_CEILING;
  const quantityCeiling = Math.max(1, variantStock);

  const handleColorChange = (color: string) => {
    setSelectedColor(color);

    const nextVariant =
      variants.find((variant) => variant.color === color && variant.stockQuantity > 0) ??
      variants.find((variant) => variant.color === color);

    if (nextVariant) setSelectedVariantId(nextVariant.id);
    setQuantity(1);
  };

  const handleVariantChange = (variant: ProductVariant) => {
    setSelectedVariantId(variant.id);
    if (variant.color) setSelectedColor(variant.color);
    setQuantity(1);
  };

  const handleAddToBag = () => {
    if (!selectedVariant || isVariantSoldOut) return;

    addToCart(product, selectedVariant, quantity);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1200);
    closeProduct();
    openCart();
  };

  return (
    <Modal
      isOpen={Boolean(product)}
      onClose={closeProduct}
      labelledBy={TITLE_ID}
      maxWidth="lg"
      presentation="sheet"
      closeLabel="Close product options"
    >
      <div className="grid max-h-[92vh] grid-cols-1 overflow-y-auto md:grid-cols-2 md:overflow-hidden">
        {/* Gallery */}
        <div className="relative bg-[#080a10]">
          <div className="relative aspect-[4/5] w-full overflow-hidden">
            <img
              src={gallery[activeImage] ?? gallery[0]}
              alt={`${product.title} view ${activeImage + 1}`}
              width={600}
              height={750}
              loading="eager"
              decoding="async"
              className="h-full w-full object-cover object-center"
            />
            {isSoldOut && (
              <div className="absolute left-4 top-4">
                <Badge variant="soldOut" icon={null}>
                  Sold out
                </Badge>
              </div>
            )}
          </div>

          {gallery.length > 1 && (
            <div className="flex gap-2 p-3" role="group" aria-label="Product images">
              {gallery.map((image, index) => (
                <button
                  key={image}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  aria-label={`Show image ${index + 1} of ${gallery.length}`}
                  aria-pressed={index === activeImage}
                  className={`h-16 w-14 overflow-hidden rounded-xl border transition-all ${
                    index === activeImage
                      ? 'border-orangeMoney opacity-100'
                      : 'border-white/10 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={image} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details + variant picker */}
        <div className="flex flex-col gap-4 overflow-y-auto p-5 sm:p-6">
          <div className="space-y-2">
            <h2 id={TITLE_ID} className="pr-10 text-lg font-extrabold leading-tight text-white sm:text-xl">
              {product.title}
            </h2>
            <p className="text-xs leading-relaxed text-neutral-300">{getProductTeaser(product)}</p>

            {count > 0 && (
              <div className="flex items-center gap-2">
                <StarRating rating={average} size={13} withLabel label={`Rated ${average} out of 5 from ${count} reviews`} />
                <span className="text-xs font-semibold text-neutral-300">
                  {average.toFixed(1)} · {count} review{count === 1 ? '' : 's'}
                </span>
              </div>
            )}
          </div>

          <p className="text-xs leading-relaxed text-neutral-400">{product.description}</p>

          {/* Volume / size / colour pills */}
          <div className="space-y-4">
            {volumes.length > 0 && (
              <fieldset>
                <legend className="mb-2 text-2xs font-bold uppercase tracking-[0.14em] text-neutral-400">
                  Volume
                </legend>
                <div className="flex flex-wrap gap-2">
                  {volumes.map((variant) => {
                    const isActive = variant.id === selectedVariant?.id;
                    return (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => handleVariantChange(variant)}
                        aria-pressed={isActive}
                        disabled={variant.stockQuantity === 0}
                        className={`min-h-[42px] rounded-xl border px-3.5 text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                          isActive
                            ? 'border-orangeMoney bg-orangeMoney/15 text-white shadow-[0_0_20px_-10px_rgba(255,102,0,1)]'
                            : 'border-white/12 bg-white/[0.04] text-neutral-200 hover:border-white/25 hover:text-white'
                        }`}
                      >
                        {variant.volumeMl}ml
                        <span className="ml-2 font-mono text-2xs text-neutral-400" data-price>
                          {formatBWP(variant.priceBWP)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}

            {colors.length > 0 && (
              <fieldset>
                <legend className="mb-2 text-2xs font-bold uppercase tracking-[0.14em] text-neutral-400">
                  Colour
                </legend>
                <div className="flex flex-wrap gap-2">
                  {colors.map((color) => {
                    const isActive = color === selectedColor;
                    const colorSoldOut = variants
                      .filter((variant) => variant.color === color)
                      .every((variant) => variant.stockQuantity === 0);

                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => handleColorChange(color)}
                        aria-pressed={isActive}
                        disabled={colorSoldOut}
                        className={`min-h-[42px] rounded-xl border px-3.5 text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                          isActive
                            ? 'border-orangeMoney bg-orangeMoney/15 text-white shadow-[0_0_20px_-10px_rgba(255,102,0,1)]'
                            : 'border-white/12 bg-white/[0.04] text-neutral-200 hover:border-white/25 hover:text-white'
                        }`}
                      >
                        {color}
                        {colorSoldOut && <span className="ml-1.5 text-2xs font-semibold text-neutral-400">sold out</span>}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}

            {sizesInColor.length > 0 && (
              <fieldset>
                <legend className="mb-2 flex w-full items-center justify-between gap-2 text-2xs font-bold uppercase tracking-[0.14em] text-neutral-400">
                  <span>Size</span>
                  <button
                    type="button"
                    onClick={() => setIsSizeGuideOpen(true)}
                    className="rounded-lg border border-white/12 bg-white/[0.05] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-neutral-200 transition-colors hover:border-amber-500/50 hover:text-white"
                  >
                    Size guide
                  </button>
                </legend>
                <div className="flex flex-wrap gap-2">
                  {sizesInColor.map((variant) => {
                    const isActive = variant.id === selectedVariant?.id;
                    return (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => handleVariantChange(variant)}
                        aria-pressed={isActive}
                        disabled={variant.stockQuantity === 0}
                        className={`min-h-[42px] min-w-[52px] rounded-xl border px-3.5 text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                          isActive
                            ? 'border-orangeMoney bg-orangeMoney/15 text-white shadow-[0_0_20px_-10px_rgba(255,102,0,1)]'
                            : 'border-white/12 bg-white/[0.04] text-neutral-200 hover:border-white/25 hover:text-white'
                        }`}
                      >
                        {variant.size}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}
          </div>

          {/* Selected option summary */}
          <div className="rounded-2xl border border-white/10 bg-black/35 p-3.5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-2xs font-bold uppercase tracking-[0.14em] text-neutral-400">Your selection</p>
                <p className="mt-0.5 text-xs font-semibold text-neutral-200">
                  {selectedVariant ? getVariantLabel(selectedVariant) : 'Unavailable'}
                </p>
              </div>
              <p className="font-mono text-xl font-black text-white" data-price>
                {formatBWP(selectedVariant?.priceBWP ?? product.basePriceBWP)}
              </p>
            </div>

            {selectedVariant && (
              <p className="mt-2 text-2xs font-semibold text-neutral-400">
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
          </div>

          {/* Low stock warning */}
          {isLowStock && (
            <div
              role="status"
              className="flex items-start gap-2.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3"
            >
              <AlertTriangle size={16} className="mt-0.5 flex-shrink-0 text-amber-300" aria-hidden="true" />
              <p className="text-xs leading-relaxed text-amber-100">
                Almost gone — only <strong>{variantStock}</strong> left of this option. Add it to your bag before
                someone else does.
              </p>
            </div>
          )}

          {/* Quantity */}
          <div className="flex items-center justify-between gap-3">
            <span id="quantity-label" className="text-xs font-bold uppercase tracking-[0.14em] text-neutral-400">
              Quantity
            </span>

            <div
              role="group"
              aria-labelledby="quantity-label"
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
                onClick={() => setQuantity((current) => Math.min(quantityCeiling, current + 1))}
                disabled={quantity >= quantityCeiling}
                aria-label="Increase quantity"
                className="rounded-lg p-2 text-neutral-200 transition-colors hover:bg-white/10 disabled:opacity-30"
              >
                <Plus size={14} aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2.5">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              disabled={isVariantSoldOut}
              onClick={handleAddToBag}
              className={justAdded ? 'animate-confirmed' : ''}
              leftIcon={justAdded ? <Check size={17} /> : <ShoppingBag size={17} />}
            >
              {isVariantSoldOut ? 'Sold out' : justAdded ? 'Added to bag' : 'Add to bag'}
            </Button>

            <a
              href={buildProductEnquiryLink(product, selectedVariant)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-whatsapp/40 bg-whatsapp/10 text-xs font-bold text-whatsapp transition-colors hover:bg-whatsapp/20 focus-visible:outline-2 focus-visible:outline-whatsapp"
            >
              <MessageCircle size={16} aria-hidden="true" />
              Ask about this piece on WhatsApp
            </a>

            <div className="grid grid-cols-2 gap-2">
              <Link
                href={`/p/${product.slug}`}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.05] text-xs font-bold text-neutral-200 transition-colors hover:bg-white/[0.12] hover:text-white focus-visible:outline-2 focus-visible:outline-orangeMoney"
              >
                <ArrowUpRight size={15} aria-hidden="true" />
                Full page
              </Link>

              <button
                type="button"
                onClick={async () => {
                  const url = `${window.location.origin}/p/${product.slug}`;
                  try {
                    if (navigator.share) {
                      await navigator.share({
                        title: product.title,
                        text: `${product.title} — ${formatBWP(selectedVariant?.priceBWP ?? product.basePriceBWP)} at NeoSales`,
                        url,
                      });
                      return;
                    }
                    await navigator.clipboard.writeText(url);
                    setShareNote('Link copied — paste it into WhatsApp.');
                    window.setTimeout(() => setShareNote(''), 2500);
                  } catch {
                    setShareNote('Copy the link from the address bar to share.');
                    window.setTimeout(() => setShareNote(''), 2500);
                  }
                }}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.05] text-xs font-bold text-neutral-200 transition-colors hover:bg-white/[0.12] hover:text-white focus-visible:outline-2 focus-visible:outline-orangeMoney"
              >
                <Share2 size={15} aria-hidden="true" />
                Share
              </button>
            </div>

            {shareNote && (
              <p role="status" className="text-center text-2xs font-semibold text-emerald-300">
                {shareNote}
              </p>
            )}
          </div>

          <ul className="space-y-1.5 border-t border-white/10 pt-3 text-2xs text-neutral-300">
            <li className="flex items-center gap-2">
              <ShieldCheck size={13} className="text-emerald-400" aria-hidden="true" />
              Authenticity guaranteed — sourced directly, never diluted.
            </li>
            <li className="flex items-center gap-2">
              <Truck size={13} className="text-amber-400" aria-hidden="true" />
              Free Francistown pickup · Nationwide courier from P80.
            </li>
          </ul>

          {reviews.length > 0 && (
            <div className="border-t border-white/10 pt-3">
              <h3 className="text-2xs font-bold uppercase tracking-[0.14em] text-neutral-400">
                What buyers in Botswana say
              </h3>
              <ul className="mt-2 space-y-2">
                {reviews.slice(0, 2).map((review) => (
                  <li key={review.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <StarRating rating={review.rating} size={12} />
                      <span className="text-2xs font-semibold uppercase tracking-wide text-neutral-400">
                        {review.customerName} · {review.town}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-neutral-300">{review.comment}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <SizeGuideModal isOpen={isSizeGuideOpen} onClose={() => setIsSizeGuideOpen(false)} />
    </Modal>
  );
}
