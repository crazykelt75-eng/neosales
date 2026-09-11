'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Check, ShoppingBag, AlertCircle, Sparkles, ShieldCheck } from 'lucide-react';
import { Product, ProductVariant } from '@/types';
import { useStore } from '@/context/StoreContext';
import { useToast } from '@/components/ui/Toast';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { getOptimizedImageUrl } from '@/lib/imageUtils';

export function VariantModal() {
  const { selectedProductForModal, setSelectedProductForModal, addToCart } = useStore();
  const { showToast } = useToast();

  const product = selectedProductForModal;
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [addedAnimation, setAddedAnimation] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Initialize selected variant on product open and handle focus
  useEffect(() => {
    if (product && product.variants.length > 0) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      const inStock = product.variants.find((v) => v.stockQuantity > 0);
      setSelectedVariant(inStock || product.variants[0]);
      setQuantity(1);
      setActiveImageIdx(0);
      setAddedAnimation(false);

      // Focus first interactive element inside dialog after render
      setTimeout(() => {
        const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
        );
        if (focusable && focusable.length > 0) {
          focusable[0].focus();
        }
      }, 50);
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
    }
  }, [product]);

  // Handle Tab focus trapping and Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedProductForModal(null);
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
        );
        if (focusable.length === 0) return;

        const firstEl = focusable[0];
        const lastEl = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstEl) {
            e.preventDefault();
            lastEl.focus();
          }
        } else {
          if (document.activeElement === lastEl) {
            e.preventDefault();
            firstEl.focus();
          }
        }
      }
    };
    if (product) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [product, setSelectedProductForModal]);

  if (!product || !selectedVariant) return null;

  const isPerfume = product.category === 'perfumes';
  const isClothing = product.category === 'clothes';
  const isVariantSoldOut = selectedVariant.stockQuantity === 0;

  const handleAddToCart = () => {
    if (isVariantSoldOut) return;
    addToCart(product, selectedVariant, quantity);
    setAddedAnimation(true);

    showToast({
      type: 'success',
      title: 'Added to Bag',
      description: `${quantity}x ${product.title} (${
        selectedVariant.volumeMl
          ? `${selectedVariant.volumeMl}ml`
          : selectedVariant.size
          ? `Size ${selectedVariant.size}`
          : 'Selected'
      }) added to your shopping bag.`,
    });

    setTimeout(() => {
      setAddedAnimation(false);
      setSelectedProductForModal(null);
    }, 500);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-product-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm transition-all animate-fadeIn"
    >
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 cursor-pointer"
        onClick={() => setSelectedProductForModal(null)}
        aria-hidden="true"
      />

      {/* Modal Dialog Content */}
      <div
        ref={modalRef}
        className="relative w-full max-w-lg bg-[#0e1118] text-white rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_30px_rgba(255,102,0,0.15)] border border-white/10 z-10 max-h-[92vh] flex flex-col animate-scaleIn"
      >
        {/* Close Button */}
        <button
          onClick={() => setSelectedProductForModal(null)}
          className="absolute top-3.5 right-3.5 z-20 min-w-[44px] min-h-[44px] bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-colors focus-visible:outline-2 focus-visible:outline-orangeMoney"
          aria-label="Close product modal"
        >
          <X size={20} aria-hidden="true" />
        </button>

        <div className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-5">
          {/* Gallery / Image Display */}
          <div className="relative aspect-[16/10] sm:aspect-[16/9] rounded-2xl overflow-hidden bg-[#08090f] border border-white/10">
            <img
              src={getOptimizedImageUrl(product.imageUrls[activeImageIdx] || product.imageUrls[0], 800)}
              alt={product.title}
              decoding="async"
              className="w-full h-full object-cover object-center"
            />
            {product.imageUrls.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 bg-black/60 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-white/10">
                {product.imageUrls.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImageIdx(i)}
                    aria-label={`View image ${i + 1}`}
                    className={`h-2 rounded-full transition-all ${
                      activeImageIdx === i ? 'bg-orangeMoney w-5' : 'bg-white/40 w-2'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Title & Price Section */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant="orangeMoney">{product.category}</Badge>
              {product.isNewArrival && <Badge variant="new">New Arrival</Badge>}
            </div>
            <h2 id="modal-product-title" className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {product.title}
            </h2>
            <p className="text-xs sm:text-sm text-neutral-300 mt-1 leading-relaxed">
              {product.description}
            </p>

            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-white font-mono">
                P{selectedVariant.priceBWP.toFixed(2)}
              </span>
              <span className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">
                BWP (All Taxes Included)
              </span>
            </div>
          </div>

          {/* Variant Selection */}
          <div className="space-y-4 pt-3 border-t border-white/10">
            {/* Perfume Volume Variant Selector */}
            {isPerfume && (
              <div>
                <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider block mb-2">
                  Select Bottle Volume & Concentration:
                </label>
                <div className="grid grid-cols-3 gap-2 sm:gap-2.5" role="radiogroup">
                  {product.variants.map((variant) => {
                    const isSelected = selectedVariant.id === variant.id;
                    const isSoldOut = variant.stockQuantity === 0;

                    return (
                      <button
                        key={variant.id}
                        role="radio"
                        aria-checked={isSelected}
                        disabled={isSoldOut}
                        onClick={() => setSelectedVariant(variant)}
                        className={`min-h-[64px] p-2.5 rounded-2xl border text-center transition-all relative flex flex-col justify-center items-center ${
                          isSelected
                            ? 'border-orangeMoney bg-orangeMoney/20 text-white shadow-glow-orange ring-1 ring-orangeMoney/50'
                            : isSoldOut
                            ? 'border-white/5 bg-white/[0.02] text-neutral-600 cursor-not-allowed line-through opacity-50'
                            : 'border-white/10 hover:border-white/25 text-neutral-300 bg-white/[0.04] hover:bg-white/[0.08]'
                        }`}
                      >
                        <span className="text-sm font-extrabold">{variant.volumeMl}ml</span>
                        <span
                          className={`text-[11px] font-bold mt-0.5 ${
                            isSelected ? 'text-orange-200' : 'text-neutral-400'
                          }`}
                        >
                          P{variant.priceBWP}
                        </span>
                        {variant.stockQuantity > 0 && variant.stockQuantity <= 3 && (
                          <span
                            className={`text-[10px] font-bold mt-0.5 ${
                              isSelected ? 'text-amber-300' : 'text-amber-400'
                            }`}
                          >
                            {variant.stockQuantity} left
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {selectedVariant.scentProfile && (
                  <div className="text-xs text-neutral-300 mt-2.5 bg-white/[0.04] p-3 rounded-xl border border-white/10 flex items-start gap-2">
                    <Sparkles size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
                    <span>
                      <strong className="text-white font-bold">Fragrance Notes:</strong>{' '}
                      {selectedVariant.scentProfile}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Apparel Variant Selector (Size & Color) */}
            {isClothing && (
              <div className="space-y-3">
                <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider block">
                  Select Size & Colorway:
                </label>
                <div className="flex flex-wrap gap-2" role="radiogroup">
                  {product.variants.map((variant) => {
                    const isSelected = selectedVariant.id === variant.id;
                    const isSoldOut = variant.stockQuantity === 0;

                    return (
                      <button
                        key={variant.id}
                        role="radio"
                        aria-checked={isSelected}
                        disabled={isSoldOut}
                        onClick={() => setSelectedVariant(variant)}
                        className={`min-h-[44px] px-4 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                          isSelected
                            ? 'border-orangeMoney bg-orangeMoney/20 text-white shadow-glow-orange ring-1 ring-orangeMoney/50'
                            : isSoldOut
                            ? 'border-white/5 bg-white/[0.02] text-neutral-600 cursor-not-allowed line-through opacity-50'
                            : 'border-white/10 hover:border-white/25 text-neutral-300 bg-white/[0.04] hover:bg-white/[0.08]'
                        }`}
                      >
                        <span>Size {variant.size}</span>
                        {variant.color && <span className="opacity-75 font-normal">({variant.color})</span>}
                        {isSelected && <Check size={14} className="text-orangeMoney" aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity Stepper (44px min touch target) */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                Quantity
              </span>
              <div className="flex items-center border border-white/15 rounded-xl overflow-hidden bg-white/[0.04] shadow-xs">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-11 h-11 text-base font-bold text-neutral-300 hover:bg-white/10 active:bg-white/20 flex items-center justify-center transition-colors"
                >
                  -
                </button>
                <span className="w-10 text-center text-xs sm:text-sm font-extrabold text-white font-mono">
                  {quantity}
                </span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  disabled={quantity >= selectedVariant.stockQuantity}
                  onClick={() =>
                    setQuantity((q) => Math.min(selectedVariant.stockQuantity || 1, q + 1))
                  }
                  className="w-11 h-11 text-base font-bold text-neutral-300 hover:bg-white/10 active:bg-white/20 disabled:opacity-30 disabled:hover:bg-transparent flex items-center justify-center transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            {/* Stock status indicator */}
            <div className="flex items-center gap-2 pt-1 text-xs">
              {isVariantSoldOut ? (
                <span className="text-red-400 font-bold flex items-center gap-1.5">
                  <AlertCircle size={15} aria-hidden="true" />
                  This option is currently out of stock.
                </span>
              ) : selectedVariant.stockQuantity <= 3 ? (
                <span className="bg-amber-400/15 border border-amber-400/30 text-amber-300 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" aria-hidden="true" />
                  ⚡ Only {selectedVariant.stockQuantity} units left in Francistown storage — order now
                </span>
              ) : (
                <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <Check size={15} aria-hidden="true" />
                  In Stock • Dispatches within 24 hours.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Modal Action CTA with Safe Area Bottom */}
        <div className="p-4 sm:p-5 bg-[#0a0c12] border-t border-white/10 pb-safe">
          <Button
            size="lg"
            variant={isVariantSoldOut ? 'outline' : 'primary'}
            disabled={isVariantSoldOut}
            onClick={handleAddToCart}
            className={`w-full py-4 text-sm sm:text-base font-extrabold transition-all duration-200 ${
              addedAnimation ? 'bg-emerald-600 hover:bg-emerald-600 text-white' : ''
            }`}
            leftIcon={
              addedAnimation ? (
                <Check size={18} aria-hidden="true" />
              ) : (
                <ShoppingBag size={18} aria-hidden="true" />
              )
            }
          >
            {addedAnimation
              ? 'Added to Bag!'
              : isVariantSoldOut
              ? 'Option Sold Out'
              : `Add to Bag • P${(selectedVariant.priceBWP * quantity).toFixed(2)}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
