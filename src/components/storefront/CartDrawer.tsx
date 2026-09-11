'use client';

import React, { useState, useEffect } from 'react';
import { X, Trash2, ArrowRight, ShoppingBag, Truck, ShieldCheck } from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { CheckoutModal } from '@/components/checkout/CheckoutModal';
import { Button } from '@/components/ui/Button';

export function CartDrawer() {
  const { cart, removeFromCart, updateCartQuantity, cartSubtotal, isCartOpen, setIsCartOpen } =
    useStore();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Close on Escape key and prevent background body scroll
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCartOpen(false);
      }
    };

    if (isCartOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isCartOpen, setIsCartOpen]);

  if (!isCartOpen) return null;

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Shopping Bag"
        className="fixed inset-0 z-50 overflow-hidden animate-fadeIn"
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity cursor-pointer"
          onClick={() => setIsCartOpen(false)}
          aria-hidden="true"
        />

        <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
          <div className="w-screen max-w-md bg-[#0c0e16] text-white border-l border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.95)] flex flex-col animate-slideUp sm:animate-none">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#08090f]/90 backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orangeMoney/20 border border-orangeMoney/40 text-orangeMoney flex items-center justify-center shadow-glow-orange">
                  <ShoppingBag size={16} aria-hidden="true" />
                </div>
                <div>
                  <h2 className="font-extrabold text-white text-base sm:text-lg tracking-tight">
                    Your Shopping Bag
                  </h2>
                  <p className="text-[11px] text-neutral-400 font-medium">
                    {cart.reduce((s, i) => s + i.quantity, 0)} items selected
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsCartOpen(false)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-neutral-400 hover:text-white rounded-full hover:bg-white/10 transition-colors focus-visible:outline-2 focus-visible:outline-orangeMoney"
                aria-label="Close Shopping Bag"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 divide-y divide-white/10">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-neutral-400 my-auto">
                  <div className="w-20 h-20 bg-white/[0.04] border border-white/10 rounded-3xl flex items-center justify-center mb-4 text-neutral-400">
                    <ShoppingBag size={32} aria-hidden="true" />
                  </div>
                  <h3 className="font-extrabold text-white text-lg mb-1">
                    Your bag is empty
                  </h3>
                  <p className="text-xs text-neutral-400 mb-6 max-w-xs leading-relaxed">
                    Browse our niche extrait fragrances or relaxed linen shirts to create your order.
                  </p>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => setIsCartOpen(false)}
                  >
                    Explore Products
                  </Button>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.variantId} className="pt-3.5 first:pt-0 flex gap-3.5 items-center">
                    <div className="w-20 h-20 bg-[#08090f] rounded-2xl overflow-hidden flex-shrink-0 border border-white/10">
                      <img
                        src={item.product.imageUrls[0]}
                        alt={item.product.title}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                            {item.product.title}
                          </h4>
                          <p className="text-[11px] text-neutral-400 font-semibold mt-0.5">
                            {item.variantLabel}
                          </p>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.variantId)}
                          className="min-w-[36px] min-h-[36px] text-neutral-400 hover:text-red-400 rounded-lg flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-red-400"
                          aria-label={`Remove ${item.product.title} from bag`}
                          title="Remove item"
                        >
                          <Trash2 size={16} aria-hidden="true" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between mt-2.5">
                        {/* Touch-optimized quantity stepper */}
                        <div className="flex items-center border border-white/15 rounded-xl overflow-hidden bg-white/[0.04]">
                          <button
                            type="button"
                            aria-label={`Decrease quantity of ${item.product.title}`}
                            onClick={() => updateCartQuantity(item.variantId, -1)}
                            className="w-8 h-8 font-bold text-neutral-300 hover:bg-white/10 active:bg-white/20 flex items-center justify-center transition-colors"
                          >
                            -
                          </button>
                          <span className="w-7 text-center text-xs font-black text-white font-mono">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            aria-label={`Increase quantity of ${item.product.title}`}
                            onClick={() => updateCartQuantity(item.variantId, 1)}
                            className="w-8 h-8 font-bold text-neutral-300 hover:bg-white/10 active:bg-white/20 flex items-center justify-center transition-colors"
                          >
                            +
                          </button>
                        </div>

                        <span className="font-black text-sm text-white font-mono">
                          P{(item.variant.priceBWP * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer Summary & Checkout CTA */}
            {cart.length > 0 && (
              <div className="p-4 sm:p-5 bg-[#08090f] border-t border-white/10 space-y-3 pb-safe">
                {/* Local fulfillment pill */}
                <div className="flex items-center gap-2.5 text-[11px] text-neutral-300 bg-white/[0.04] border border-white/10 p-2.5 rounded-xl shadow-xs">
                  <Truck size={16} className="text-orangeMoney flex-shrink-0" aria-hidden="true" />
                  <span>
                    Pick up in Francistown or Tati Siding for <strong className="text-emerald-400">Free</strong> or dispatch nationwide with Sprint Couriers.
                  </span>
                </div>

                <div className="space-y-1.5 pt-1 text-xs">
                  <div className="flex justify-between text-neutral-400">
                    <span>Subtotal</span>
                    <span className="font-bold text-white font-mono">P{cartSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-neutral-400">
                    <span>Delivery Fee</span>
                    <span className="text-neutral-400 font-medium">Selected at next step</span>
                  </div>
                  <div className="flex justify-between text-base font-black text-white pt-2 border-t border-white/10">
                    <span>Total Due</span>
                    <span className="text-lg text-orangeMoney font-mono">P{cartSubtotal.toFixed(2)}</span>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => setIsCheckoutOpen(true)}
                  className="w-full py-4 text-sm sm:text-base font-extrabold shadow-glow-orange"
                  rightIcon={<ArrowRight size={18} aria-hidden="true" />}
                >
                  Proceed to Checkout
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <CheckoutModal
          onClose={() => setIsCheckoutOpen(false)}
          onOrderComplete={() => {
            setIsCheckoutOpen(false);
            setIsCartOpen(false);
          }}
        />
      )}
    </>
  );
}
