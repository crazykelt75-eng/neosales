'use client';

import React, { useState } from 'react';
import { Sparkles, AlertTriangle, Plus, Eye } from 'lucide-react';
import { Product } from '@/types';
import { useStore } from '@/context/StoreContext';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';

interface Props {
  product: Product;
}

export function ProductCard({ product }: Props) {
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleOpen();
    }
  };

  return (
    <article
      tabIndex={0}
      role="button"
      onClick={handleOpen}
      onKeyDown={handleKeyDown}
      aria-label={`View ${product.title}, priced from P${minPrice}. ${
        isSoldOut ? 'Sold out' : isLowStock ? `Only ${totalStock} left` : 'In stock'
      }`}
      className="group flex flex-col bg-[#0e1118] rounded-2xl sm:rounded-3xl overflow-hidden border border-white/10 hover:border-orangeMoney/40 shadow-soft hover:shadow-[0_12px_35px_-8px_rgba(255,102,0,0.18)] hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-orangeMoney transition-all duration-300 cursor-pointer active:scale-[0.985]"
    >
      {/* Product Image Stage */}
      <div className="relative w-full aspect-[4/5] bg-[#08090f] overflow-hidden">
        {!imageLoaded && <Skeleton className="absolute inset-0 z-0" />}

        {product.imageUrls[0] ? (
          <img
            src={product.imageUrls[0]}
            alt={product.title}
            onLoad={() => setImageLoaded(true)}
            className={`w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-500 text-xs">
            No image available
          </div>
        )}

        {/* Floating Top Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start z-10">
          {product.isNewArrival && (
            <Badge variant="new">NEW</Badge>
          )}
          {product.featuredTag && (
            <span className="bg-amber-500/20 backdrop-blur-md text-amber-200 border border-amber-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
              {product.featuredTag}
            </span>
          )}
        </div>

        {/* Stock Status Badge */}
        <div className="absolute top-2.5 right-2.5 z-10">
          {isSoldOut ? (
            <Badge variant="soldOut">Sold Out</Badge>
          ) : isLowStock ? (
            <Badge variant="lowStock" pulse>
              Only {totalStock} Left
            </Badge>
          ) : null}
        </div>

        {/* Floating Category Pill */}
        <div className="absolute bottom-2.5 left-2.5 right-2.5 bg-[#0a0c12]/85 backdrop-blur-md px-2.5 py-1 rounded-xl text-[11px] text-neutral-200 font-semibold flex items-center justify-between border border-white/10 shadow-xs">
          <span className="capitalize">{product.category}</span>
          <span className="text-neutral-400 font-normal">
            {product.variants.length} {product.category === 'perfumes' ? 'volumes' : 'options'}
          </span>
        </div>
      </div>

      {/* Product Information */}
      <div className="p-3.5 sm:p-4 flex flex-col flex-1 justify-between gap-3">
        <div>
          <h3 className="font-bold text-white text-sm sm:text-base leading-snug line-clamp-2 group-hover:text-amber-400 transition-colors">
            {product.title}
          </h3>
          <p className="text-xs text-neutral-400 line-clamp-1 mt-1 font-normal leading-relaxed">
            {product.description}
          </p>
        </div>

        {/* Price & Action Row */}
        <div className="pt-2.5 border-t border-white/10 flex items-center justify-between gap-2">
          <div>
            <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">
              Botswana Pula
            </span>
            <span className="text-base sm:text-lg font-black text-white tracking-tight font-mono">
              P{minPrice}
              {maxPrice > minPrice && (
                <span className="text-xs font-semibold text-neutral-400"> - P{maxPrice}</span>
              )}
            </span>
          </div>

          <span
            className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs ${
              isSoldOut
                ? 'bg-white/[0.04] text-neutral-500 border border-white/5 cursor-not-allowed'
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
