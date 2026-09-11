'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Minus, Plus, ShoppingBag, Trash2, Truck, X } from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { Button } from '@/components/ui/Button';
import { formatBWP } from '@/lib/format';
import { getOptimizedImageUrl } from '@/lib/imageUtils';
import { findVariant } from '@/lib/product';

const TITLE_ID = 'bag-drawer-title';

/**
 * Slide-over shopping bag.
 *
 * Focus is trapped inside the drawer, Escape closes it, the trigger regains
 * focus on close, and background scrolling is locked while it is open.
 */
export function CartDrawer() {
  const {
    cart,
    cartCount,
    cartSubtotal,
    isCartOpen,
    closeCart,
    incrementCartItem,
    decrementCartItem,
    removeFromCart,
    openCheckout,
  } = useStore();

  const [isMounted, setIsMounted] = useState(false);
  const containerRef = useFocusTrap<HTMLDivElement>(isCartOpen, closeCart);

  useEffect(() => setIsMounted(true), []);

  if (!isMounted || !isCartOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[75]">
      <div
        className="absolute inset-0 animate-fadeIn bg-black/75 backdrop-blur-md"
        onClick={closeCart}
        aria-hidden="true"
      />

      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        tabIndex={-1}
        className="absolute inset-y-0 right-0 flex w-full max-w-md animate-slideInRight flex-col border-l border-white/10 bg-surface shadow-elevated focus:outline-none"
      >
        {/* Header */}
        <header className="flex items-center justify-between gap-3 border-b border-white/10 bg-[#0a0c13]/90 px-4 py-4 backdrop-blur">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-orangeMoney/30 bg-orangeMoney/15 text-orangeMoney">
              <ShoppingBag size={17} aria-hidden="true" />
            </span>
            <div>
              <h2 id={TITLE_ID} className="text-sm font-extrabold text-white">
                Your bag
              </h2>
              <p className="text-2xs font-semibold text-neutral-400">
                {cartCount === 0 ? 'No items yet' : `${cartCount} item${cartCount === 1 ? '' : 's'}`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeCart}
            aria-label="Close bag"
            className="rounded-xl border border-white/10 bg-white/[0.05] p-2 text-neutral-300 transition-colors hover:bg-white/[0.12] hover:text-white focus-visible:outline-2 focus-visible:outline-orangeMoney"
          >
            <X size={17} aria-hidden="true" />
          </button>
        </header>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-neutral-400">
                <ShoppingBag size={24} aria-hidden="true" />
              </span>
              <p className="text-sm font-bold text-white">Your bag is empty</p>
              <p className="max-w-[260px] text-xs leading-relaxed text-neutral-400">
                Browse the catalog and add your favourite extraits or summer pieces.
              </p>
              <Button variant="secondary" size="md" onClick={closeCart}>
                Continue shopping
              </Button>
            </div>
          ) : (
            <ul className="space-y-3">
              {cart.map((item) => {
                const lineTotal = item.unitPriceBWP * item.quantity;
                const liveVariant = findVariant(item.product, item.variantId);
                const atCeiling = item.quantity >= (liveVariant?.stockQuantity ?? item.quantity);

                return (
                  <li
                    key={item.variantId}
                    className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3"
                  >
                    <img
                      src={getOptimizedImageUrl(item.product.imageUrls[0], 200)}
                      alt={item.product.title}
                      width={80}
                      height={100}
                      loading="lazy"
                      decoding="async"
                      className="h-[84px] w-[68px] flex-shrink-0 rounded-xl border border-white/10 object-cover"
                    />

                    <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="truncate text-xs font-bold text-white" title={item.product.title}>
                            {item.product.title}
                          </h3>
                          <p className="mt-0.5 truncate text-2xs font-semibold text-neutral-400">
                            {item.variantLabel}
                          </p>
                          <p className="mt-0.5 font-mono text-2xs text-neutral-400" data-price>
                            {formatBWP(item.unitPriceBWP)} each
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeFromCart(item.variantId)}
                          aria-label={`Remove ${item.product.title} from bag`}
                          className="-mr-1 -mt-1 rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-red-500/15 hover:text-red-300 focus-visible:outline-2 focus-visible:outline-red-400"
                        >
                          <Trash2 size={15} aria-hidden="true" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <div
                          role="group"
                          aria-label={`Quantity for ${item.product.title}`}
                          className="inline-flex items-center gap-1 rounded-xl border border-white/12 bg-black/30 p-1"
                        >
                          <button
                            type="button"
                            onClick={() => decrementCartItem(item.variantId)}
                            aria-label={`Decrease quantity of ${item.product.title}`}
                            className="rounded-lg p-1.5 text-neutral-200 transition-colors hover:bg-white/10"
                          >
                            <Minus size={13} aria-hidden="true" />
                          </button>

                          <span className="min-w-[26px] text-center font-mono text-xs font-bold text-white">
                            {item.quantity}
                          </span>

                          <button
                            type="button"
                            onClick={() => incrementCartItem(item.variantId)}
                            disabled={atCeiling}
                            aria-label={`Increase quantity of ${item.product.title}`}
                            className="rounded-lg p-1.5 text-neutral-200 transition-colors hover:bg-white/10 disabled:opacity-30"
                          >
                            <Plus size={13} aria-hidden="true" />
                          </button>
                        </div>

                        <span className="font-mono text-sm font-black text-white" data-price>
                          {formatBWP(lineTotal)}
                        </span>
                      </div>

                      {atCeiling && (
                        <p className="text-2xs font-semibold text-amber-300">
                          Max stock reached for this option
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Summary */}
        {cart.length > 0 && (
          <footer className="border-t border-white/10 bg-[#0a0c13]/95 px-4 pb-safe pt-4 backdrop-blur">
            <dl className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <dt className="font-semibold text-neutral-300">Subtotal</dt>
                <dd className="font-mono text-sm font-bold text-white" data-price>
                  {formatBWP(cartSubtotal)}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="flex items-center gap-1.5 font-semibold text-neutral-300">
                  <Truck size={13} className="text-emerald-400" aria-hidden="true" />
                  Delivery
                </dt>
                <dd className="text-2xs font-bold uppercase tracking-wide text-emerald-300">
                  Free Francistown pickup
                </dd>
              </div>
            </dl>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              className="mt-3.5"
              onClick={openCheckout}
              rightIcon={<span aria-hidden="true">→</span>}
            >
              Checkout · {formatBWP(cartSubtotal)}
            </Button>

            <p className="mt-2 text-center text-2xs leading-relaxed text-neutral-400">
              Pay with Orange Money or FNB Pay2Cell · Courier delivery quoted next step
            </p>
          </footer>
        )}
      </div>
    </div>,
    document.body
  );
}
