'use client';

import React, { useState } from 'react';
import { Plus, Star } from 'lucide-react';
import { Product } from '@/types';
import { useStore } from '@/context/StoreContext';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { CATALOG_IMAGE_HEIGHT, CATALOG_IMAGE_WIDTH, getOptimizedImageUrl } from '@/lib/imageUtils';
import { formatBWP } from '@/lib/format';
import { getProductStatusSummary, getProductTeaser } from '@/lib/product';

interface ProductCardProps {
  product: Product;
  /** Above-the-fold cards load eagerly to protect Largest Contentful Paint. */
  priority?: boolean;
}

/**
 * High-signal catalog card: one clean status badge, one-line fragrance or
 * material teaser, bold Pula price and a single stretched action that opens the
 * variant modal. The whole card is one native button — no nested controls.
 */
export function ProductCard({ product, priority = false }: ProductCardProps) {
  const { openProduct, getProductRating } = useStore();
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  const { totalStock, isSoldOut, isLowStock, minPriceBWP, maxPriceBWP, hasPriceRange } =
    getProductStatusSummary(product);
  const { average, count } = getProductRating(product.id);

  const statusBadge = isSoldOut ? (
    <Badge variant="soldOut" icon={null}>
      Sold out
    </Badge>
  ) : isLowStock ? (
    <Badge variant="lowStock">Only {totalStock} left</Badge>
  ) : product.isNewArrival ? (
    <Badge variant="new" icon={null}>
      New
    </Badge>
  ) : null;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-surface shadow-card transition-all duration-300 ease-luxe focus-within:border-orangeMoney/50 hover:-translate-y-1 hover:border-orangeMoney/40 hover:shadow-[0_24px_50px_-24px_rgba(255,102,0,0.55)]">
      {/* Whole-card action */}
      <button
        type="button"
        onClick={() => openProduct(product)}
        className="absolute inset-0 z-20 rounded-3xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orangeMoney"
        aria-label={`${product.title}. ${getProductTeaser(product)}. From ${formatBWP(
          minPriceBWP
        )}. ${isSoldOut ? 'Sold out.' : isLowStock ? `Only ${totalStock} left.` : 'In stock.'} Choose options`}
      >
        <span className="sr-only">Choose options</span>
      </button>

      {/* Image stage — catalog standard 4:5 (400 × 500) */}
      <div
        className="relative w-full overflow-hidden bg-[#080a10]"
        style={{ aspectRatio: `${CATALOG_IMAGE_WIDTH} / ${CATALOG_IMAGE_HEIGHT}` }}
      >
        {!isImageLoaded && <Skeleton className="absolute inset-0 z-0 rounded-none" />}

        <img
          src={getOptimizedImageUrl(product.imageUrls[0], CATALOG_IMAGE_WIDTH)}
          alt={`${product.title} — ${getProductTeaser(product)}`}
          width={CATALOG_IMAGE_WIDTH}
          height={CATALOG_IMAGE_HEIGHT}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          onLoad={() => setIsImageLoaded(true)}
          onError={() => setIsImageLoaded(true)}
          className={`relative z-10 h-full w-full object-cover object-center transition-transform duration-700 ease-luxe group-hover:scale-[1.06] group-focus-within:scale-[1.06] ${
            isImageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {statusBadge && <div className="absolute left-3 top-3 z-20 pointer-events-none">{statusBadge}</div>}

        {count > 0 && (
          <div className="pointer-events-none absolute right-3 top-3 z-20 inline-flex items-center gap-1 rounded-full border border-white/12 bg-black/60 px-2 py-1 text-2xs font-bold text-amber-200 backdrop-blur">
            <Star size={11} className="text-amber-400" fill="currentColor" aria-hidden="true" />
            {average.toFixed(1)}
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex flex-1 flex-col justify-between gap-3 p-3.5 sm:p-4">
        <div className="space-y-1.5">
          <h3 className="line-clamp-2 text-sm font-bold leading-snug text-white transition-colors group-hover:text-amber-200 sm:text-base">
            {product.title}
          </h3>
          <p className="line-clamp-1 text-xs text-neutral-400">{getProductTeaser(product)}</p>
        </div>

        <div className="flex items-end justify-between gap-2 border-t border-white/10 pt-3">
          <p className="font-mono text-base font-black leading-none text-white sm:text-lg" data-price>
            {formatBWP(minPriceBWP)}
            {hasPriceRange && (
              <span className="ml-1 text-xs font-semibold text-neutral-400">– {formatBWP(maxPriceBWP)}</span>
            )}
          </p>

          <span
            aria-hidden="true"
            className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition-all duration-300 ${
              isSoldOut
                ? 'border-white/10 bg-white/[0.03] text-neutral-400'
                : 'border-white/12 bg-white/[0.06] text-white group-hover:border-orangeMoney group-hover:bg-gradient-to-r group-hover:from-orangeMoney group-hover:to-orangeMoney-dark group-hover:shadow-[0_10px_25px_-12px_rgba(255,102,0,1)]'
            }`}
          >
            <Plus size={13} />
            <span>{isSoldOut ? 'Sold out' : 'Select'}</span>
          </span>
        </div>
      </div>
    </article>
  );
}
