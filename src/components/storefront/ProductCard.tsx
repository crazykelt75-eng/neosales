'use client';

import React, { useState } from 'react';
import { Sparkles, AlertTriangle, Plus, Eye } from 'lucide-react';
import { Product } from '@/types';
import { useStore } from '@/context/StoreContext';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { getOptimizedImageUrl } from '@/lib/imageUtils';

interface Props {
  product: Product;
  priority?: boolean;
}

export function ProductCard({ product, priority = false }: Props) {
  const { setSelectedProductForModal } = useStore();
  const [imageLoaded, setImageLoaded] = useState(false);

  // Total stock across all options
  const totalStock = product.variants.reduce((acc, v) => acc + v.stockQuantity, 0);
  const isSoldOut = totalStock === 0;
  const isLowStock = !isSoldOut && totalStock <= 3;

  // Price calculations
  const prices = product.variants.map((v) => v.priceBWP);
  const minPrice = Math.min(...prices, product.basePriceBWP);
  const maxPrice = Math.max(...prices, product.basePriceBWP);

  const handleOpen = () => {
    setSelectedProductForModal(product);
  };

  const optimizedSrc = getOptimizedImageUrl(product.imageUrls[0], 500);

  return (
    <article className="group relative flex flex-col bg-[#0e1118] rounded-2xl sm:rounded-3xl overflow-hidden border border-white/10 hover:border-orangeMoney/40 shadow-soft hover:shadow-[0_12px_35px_-8px_rgba(255,102,0,0.18)] hover:-translate-y-1 transition-all duration-300 active:scale-[0.985]">
      {/* Native Accessible Action Button (stretched full card overlay) */}
      <button
        type="button"
        onClick={handleOpen}
        aria-label={`View ${product.title}, priced from P${minPrice}. ${
          isSoldOut ? 'Sold out' : isLowStock ? `Only ${totalStock} left` : 'In stock'
        }`}
        className="absolute inset-0 z-10 w-full h-full cursor-pointer rounded-2xl sm:rounded-3xl focus-visible:outline-2 focus-visible:outline-orangeMoney focus-visible:outline-offset-2"
      />

      {/* Product Image Stage */}
      <div className="relative w-full aspect-[4/5] bg-[#08090f] overflow-hidden">
        {!imageLoaded && <Skeleton className="absolute inset-0 z-0 pointer-events-none" />}

        {optimizedSrc ? (
          <img
            src={optimizedSrc}
            alt={product.title}
            width="400"
            height="500"
            decoding="async"
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            onLoad={() => setImageLoaded(true)}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out relative z-[1]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-400 text-xs">
            No image available
          </div>
        )}

        {/* Priority Badge (single clean badge) */}
        <div className="absolute top-2.5 left-2.5 z-20 pointer-events-none">
          {isSoldOut ? (
            <Badge variant="soldOut">Sold Out</Badge>
          ) : isLowStock ? (
            <Badge variant="lowStock" pulse>
              Only {totalStock} Left
            </Badge>
          ) : product.isNewArrival ? (
            <Badge variant="new">NEW</Badge>
          ) : product.featuredTag ? (
            <span className="bg-amber-500/20 backdrop-blur-md text-amber-200 border border-amber-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
              {product.featuredTag}
            </span>
          ) : null}
        </div>
      </div>

      {/* Product Information */}
      <div className="p-3.5 sm:p-4 flex flex-col flex-1 justify-between gap-2.5">
        <div>
          <h3 className="font-bold text-white text-sm sm:text-base leading-snug line-clamp-2 group-hover:text-amber-400 transition-colors">
            {product.title}
          </h3>
          <p className="text-xs text-neutral-400 line-clamp-1 mt-1 font-normal leading-relaxed">
            {product.description}
          </p>
        </div>

        {/* Price & Action Row */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
          <div className="text-base sm:text-lg font-black text-white tracking-tight font-mono">
            P{minPrice}
            {maxPrice > minPrice && (
              <span className="text-xs font-semibold text-neutral-400"> - P{maxPrice}</span>
            )}
          </div>

          <span
            aria-hidden="true"
            className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs ${
              isSoldOut
                ? 'bg-white/[0.04] text-neutral-400 border border-white/5 cursor-not-allowed'
                : 'bg-white/[0.08] hover:bg-orangeMoney text-white border border-white/15 group-hover:bg-gradient-to-r group-hover:from-orangeMoney group-hover:to-orangeMoney-dark group-hover:border-orangeMoney group-hover:shadow-glow-orange'
            }`}
          >
            <Plus size={14} aria-hidden="true" />
            <span>Select</span>
          </span>
        </div>
      </div>
    </article>
  );
}
