'use client';

import React, { useMemo } from 'react';
import { History } from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { formatBWP } from '@/lib/format';
import { getOptimizedImageUrl } from '@/lib/imageUtils';
import { getProductStatusSummary, getProductTeaser } from '@/lib/product';

/**
 * Horizontal strip of pieces this customer has already opened, so they can pick
 * up where they left off without hunting through the catalog again.
 */
export function RecentlyViewed() {
  const { products, recentlyViewedIds, openProduct, hasHydrated } = useStore();

  const viewed = useMemo(
    () =>
      recentlyViewedIds
        .map((id) => products.find((product) => product.id === id))
        .filter((product): product is NonNullable<typeof product> => Boolean(product?.isActive)),
    [products, recentlyViewedIds]
  );

  // Nothing to show on a first visit — stay out of the way.
  if (!hasHydrated || viewed.length < 2) return null;

  return (
    <section aria-labelledby="recently-viewed-heading" className="space-y-3">
      <h2
        id="recently-viewed-heading"
        className="flex items-center gap-2 text-sm font-extrabold tracking-tight text-white sm:text-base"
      >
        <History size={16} className="text-neutral-400" aria-hidden="true" />
        Recently viewed
      </h2>

      <ul className="scrollbar-none -mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1">
        {viewed.slice(0, 6).map((product) => {
          const summary = getProductStatusSummary(product);

          return (
            <li key={product.id} className="w-[132px] flex-shrink-0 snap-start">
              <button
                type="button"
                onClick={() => openProduct(product)}
                className="group w-full overflow-hidden rounded-2xl border border-white/10 bg-surface/70 text-left transition-all hover:-translate-y-0.5 hover:border-orangeMoney/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orangeMoney"
              >
                <span className="relative block aspect-[4/5] w-full overflow-hidden bg-[#080a10]">
                  <img
                    src={getOptimizedImageUrl(product.imageUrls[0], 200)}
                    alt=""
                    width={132}
                    height={165}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-500 ease-luxe group-hover:scale-105"
                  />
                </span>

                <span className="block space-y-1 p-2.5">
                  <span className="line-clamp-2 block text-2xs font-bold leading-snug text-white">
                    {product.title}
                  </span>
                  <span className="line-clamp-1 block text-[10px] text-neutral-400">
                    {getProductTeaser(product)}
                  </span>
                  <span className="block font-mono text-xs font-black text-white" data-price>
                    {formatBWP(summary.minPriceBWP)}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
