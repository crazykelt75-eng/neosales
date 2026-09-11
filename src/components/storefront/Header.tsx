'use client';

import React from 'react';
import Link from 'next/link';
import { Menu, MessageCircle, ShoppingBag, Truck, X } from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { SELLER_CONFIG } from '@/lib/constants';
import { formatBWPCompact } from '@/lib/format';
import { buildSupportLink } from '@/lib/whatsapp';

const NAV_LINKS = [
  { href: '#catalog', label: 'Shop Collection' },
  { href: '#delivery-info', label: 'Delivery & Pickup' },
];

/** Sticky storefront navigation with live bag counter. */
export function Header() {
  const { cartCount, cartSubtotal, openCart } = useStore();
  const [isMobileNavOpen, setIsMobileNavOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#07080c]/85 backdrop-blur-xl">
      {/* Botswana fulfilment trust strip */}
      <div className="border-b border-white/[0.06] bg-black/40">
        <p className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-4 py-1.5 text-center text-2xs font-medium text-neutral-300 sm:text-xs">
          <Truck size={13} className="text-orangeMoney" aria-hidden="true" />
          <span>Free Francistown pickups · Nationwide Sprint Couriers · Authentic guarantee</span>
        </p>
      </div>

      <nav aria-label="Main" className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:h-18 sm:px-6">
        {/* Brand */}
        <Link
          href="/"
          className="group flex items-center gap-2 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orangeMoney"
          aria-label={`${SELLER_CONFIG.storeName} home`}
        >
          <span className="text-xl font-extrabold tracking-tight text-white sm:text-2xl">
            NeoSales
            <span
              aria-hidden="true"
              className="ml-0.5 inline-block h-2 w-2 rounded-full bg-orangeMoney align-super transition-transform duration-300 group-hover:scale-125"
            />
          </span>
          <span className="hidden text-2xs font-semibold uppercase tracking-[0.18em] text-neutral-400 lg:inline">
            Francistown · Botswana
          </span>
        </Link>

        {/* Desktop navigation */}
        <div className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-xl px-3.5 py-2 text-sm font-semibold text-neutral-300 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-2 focus-visible:outline-orangeMoney"
            >
              {link.label}
            </a>
          ))}
          <a
            href={buildSupportLink('I would like to ask about your collection.')}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl px-3.5 py-2 text-sm font-semibold text-neutral-300 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-2 focus-visible:outline-orangeMoney"
          >
            Chat to us
          </a>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsMobileNavOpen((open) => !open)}
            aria-expanded={isMobileNavOpen}
            aria-controls="mobile-nav"
            aria-label={isMobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-neutral-200 transition-colors hover:bg-white/[0.09] focus-visible:outline-2 focus-visible:outline-orangeMoney md:hidden"
          >
            {isMobileNavOpen ? <X size={17} aria-hidden="true" /> : <Menu size={17} aria-hidden="true" />}
          </button>

          {/* Bag */}
          <button
            type="button"
            onClick={openCart}
            aria-label={
              cartCount > 0
                ? `Open shopping bag, ${cartCount} item${cartCount === 1 ? '' : 's'}, subtotal ${formatBWPCompact(
                    cartSubtotal
                  )}`
                : 'Open shopping bag, empty'
            }
            className="relative inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-orangeMoney/40 bg-gradient-to-r from-orangeMoney to-orangeMoney-dark px-3.5 py-2.5 text-sm font-bold text-white shadow-[0_10px_30px_-14px_rgba(255,102,0,1)] transition-transform duration-150 ease-luxe hover:scale-[1.02] active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orangeMoney"
          >
            <ShoppingBag size={17} aria-hidden="true" />
            <span className="hidden sm:inline">Bag</span>

            {cartCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full border border-midnight bg-white px-1 text-2xs font-black text-neutral-950"
              >
                {cartCount}
              </span>
            )}

            {cartSubtotal > 0 && (
              <span
                aria-hidden="true"
                className="hidden border-l border-white/25 pl-2 font-mono text-xs font-bold sm:inline"
                data-price
              >
                {formatBWPCompact(cartSubtotal)}
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile navigation drawer (inline disclosure, no focus trap needed) */}
      {isMobileNavOpen && (
        <div id="mobile-nav" className="animate-slideUp border-t border-white/10 bg-surface/95 px-4 py-3 md:hidden">
          <ul className="space-y-1">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={() => setIsMobileNavOpen(false)}
                  className="block rounded-xl px-3 py-3 text-sm font-semibold text-neutral-200 transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <a
                href={buildSupportLink('I would like to ask about your collection.')}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold text-whatsapp transition-colors hover:bg-whatsapp/10"
              >
                <MessageCircle size={16} aria-hidden="true" />
                Chat to us on WhatsApp
              </a>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
