'use client';

import React from 'react';
import Link from 'next/link';
import { ShoppingBag, ShieldCheck, Sparkles, MapPin } from 'lucide-react';
import { useStore } from '@/context/StoreContext';

export function Header() {
  const { cartCount, cartSubtotal, setIsCartOpen } = useStore();

  return (
    <header className="sticky top-0 z-30 bg-[#07080c]/85 backdrop-blur-xl border-b border-white/10 transition-all">
      {/* Botswana Local Context Trust Banner */}
      <aside
        aria-label="Regional delivery and payment notice"
        className="bg-[#040507] text-white text-[11px] sm:text-xs py-2 px-4 text-center flex items-center justify-center gap-1.5 font-medium tracking-wide border-b border-white/[0.06] shadow-xs"
      >
        <span className="text-sm" aria-hidden="true">🇧🇼</span>
        <span className="text-neutral-200">Free Francistown & Tati Siding Pickups • Nationwide Courier Delivery</span>
        <span className="text-neutral-600 hidden xs:inline" aria-hidden="true">•</span>
        <span className="hidden xs:inline text-neutral-300">
          Pay via <strong className="text-orange-400 font-bold">Orange Money</strong> or <strong className="text-cyan-400 font-bold">FNB Pay2Cell</strong>
        </span>
      </aside>

      {/* Main Navigation Bar */}
      <nav
        aria-label="Store header navigation"
        className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-3"
      >
        {/* Brand */}
        <Link
          href="/"
          className="group flex flex-col focus-visible:outline-2 focus-visible:outline-orangeMoney rounded-lg p-1 -m-1 transition-transform active:scale-[0.99]"
          aria-label="NeoSales Homepage"
        >
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="font-extrabold text-xl sm:text-2xl tracking-tight text-white">
              NEO<span className="text-orangeMoney group-hover:text-amber-400 transition-colors">SALES</span>
            </span>
            <span className="text-[10px] uppercase font-bold bg-white/[0.07] text-neutral-300 border border-white/10 px-2 py-0.5 rounded-full tracking-wider flex items-center gap-1">
              <MapPin size={10} className="text-orangeMoney" />
              Francistown & Tati Siding
            </span>
          </div>
          <span className="text-[10px] sm:text-[11px] text-neutral-400 font-medium tracking-wider uppercase">
            Curated Fragrances & Fashion
          </span>
        </Link>

        {/* Navigation Links for Shoppers */}
        <div className="hidden md:flex items-center gap-6">
          <a
            href="#catalog"
            className="text-xs font-bold text-neutral-300 hover:text-orangeMoney transition-colors tracking-wide"
          >
            Curated Catalog
          </a>
          <a
            href="#delivery-info"
            className="text-xs font-bold text-neutral-300 hover:text-orangeMoney transition-colors tracking-wide"
          >
            Pickups & Delivery
          </a>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">

          {/* Cart Trigger Button */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="min-h-[44px] px-3.5 sm:px-4 py-2.5 bg-gradient-to-r from-orangeMoney to-orangeMoney-dark hover:from-orangeMoney-dark hover:to-orange-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-glow-orange hover:shadow-elevated active:scale-[0.97] transition-all focus-visible:outline-2 focus-visible:outline-white"
            aria-label={`Shopping cart with ${cartCount} items totaling P${cartSubtotal.toFixed(2)}`}
          >
            <div className="relative">
              <ShoppingBag size={17} aria-hidden="true" />
              {cartCount > 0 && (
                <span className="sm:hidden absolute -top-2 -right-2 bg-white text-neutral-950 text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </div>
            <span className="hidden sm:inline">Bag</span>
            {cartCount > 0 && (
              <span className="hidden sm:inline-flex bg-white/20 backdrop-blur-xs text-white text-[11px] font-extrabold px-1.5 py-0.5 rounded-full min-w-[20px] text-center justify-center items-center">
                {cartCount}
              </span>
            )}
            {cartSubtotal > 0 && (
              <span className="text-white/90 font-extrabold border-l border-white/20 pl-2 text-xs">
                P{cartSubtotal.toFixed(0)}
              </span>
            )}
          </button>
        </div>
      </nav>
    </header>
  );
}
