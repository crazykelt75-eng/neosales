'use client';

import React, { useState } from 'react';
import { Header } from '@/components/storefront/Header';
import { Footer } from '@/components/storefront/Footer';
import { HeroSpotlight } from '@/components/storefront/HeroSpotlight';
import { ProductCard } from '@/components/storefront/ProductCard';
import { VariantModal } from '@/components/storefront/VariantModal';
import { CartDrawer } from '@/components/storefront/CartDrawer';
import { useStore } from '@/context/StoreContext';
import { ProductCategory } from '@/types';
import {
  Sparkles,
  Shirt,
  Droplets,
  Search,
  ArrowRight,
  X,
  SlidersHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function StorefrontPage() {
  const { products, cartCount, cartSubtotal, setIsCartOpen } = useStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter products by category and query
  const filteredProducts = products.filter((product) => {
    if (!product.isActive) return false;

    const matchesSearch =
      product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.variants.some(
        (v) =>
          v.scentProfile?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.color?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.size?.toLowerCase().includes(searchQuery.toLowerCase())
      );

    if (!matchesSearch) return false;

    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'new_arrivals') return product.isNewArrival;
    return product.category === selectedCategory;
  });

  // Schema.org Structured Data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'OnlineStore',
    name: 'NeoSales',
    url: 'https://neosales.crazykelt75.workers.dev',
    description:
      'Boutique luxury niche extrait fragrances and curated summer linen apparel in Botswana with direct Orange Money and FNB Pay2Cell checkout.',
    currenciesAccepted: 'BWP',
    paymentAccepted: 'Orange Money, FNB Pay2Cell, Cash on Collection',
    telephone: '+26771550200',
    areaServed: [
      { '@type': 'City', name: 'Francistown' },
      { '@type': 'AdministrativeArea', name: 'Tati Siding' },
      { '@type': 'Country', name: 'Botswana' },
    ],
    hasMerchantReturnPolicy: {
      '@type': 'MerchantReturnPolicy',
      applicableCountry: 'BW',
      returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
      merchantReturnDays: 2,
      returnMethod: 'https://schema.org/ReturnInStore',
    },
    itemListElement: products.map((prod, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      item: {
        '@type': 'Product',
        name: prod.title,
        description: prod.description,
        image: prod.imageUrls[0],
        offers: {
          '@type': 'Offer',
          priceCurrency: 'BWP',
          price: prod.basePriceBWP,
          availability: prod.variants.some((v) => v.stockQuantity > 0)
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
        },
      },
    })),
  };

  return (
    <div className="min-h-screen flex flex-col bg-transparent pb-28 sm:pb-16 selection:bg-orangeMoney/30 selection:text-orangeMoney-light">
      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Accessible skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-neutral-900 focus:text-white focus:top-2 focus:left-2 rounded-xl ring-2 ring-orangeMoney"
      >
        Skip to main content
      </a>

      <Header />

      <main id="main-content" className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* Semantic H1 for WCAG 1.3.1 & Core Technical SEO */}
        <h1 className="sr-only">
          NeoSales Botswana — Curated Niche Extrait Fragrances & Summer Linen Apparel
        </h1>

        {/* Dynamic New Arrivals Spotlight with Customer Reviews */}
        <HeroSpotlight />

        {/* Filter Controls: Search & Category Filter Pills */}
        <section aria-label="Catalog search and category filters" className="space-y-3.5">
          {/* Search Input */}
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3.5 top-3.5 text-neutral-400 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              placeholder="Search scents (e.g. Oud, Saffron), linen shirts, sizes, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search catalog products"
              className="w-full pl-10 pr-10 py-3 bg-[#0d1017]/90 border border-white/10 rounded-2xl text-xs sm:text-sm text-white placeholder:text-neutral-400 shadow-elevated focus:outline-none focus:ring-2 focus:ring-orangeMoney/30 focus:border-orangeMoney transition-all backdrop-blur-md"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-3 text-neutral-400 hover:text-white p-1 transition-colors"
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Category Filter Pills (Mobile scrollable, tablet/desktop flex) */}
          <div className="relative">
            <div
              role="tablist"
              aria-label="Product categories"
              className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-none snap-x"
            >
              <button
                role="tab"
                aria-selected={selectedCategory === 'all'}
                onClick={() => setSelectedCategory('all')}
                className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 snap-start active:scale-95 ${
                  selectedCategory === 'all'
                    ? 'bg-gradient-to-r from-orangeMoney to-orangeMoney-dark text-white shadow-glow-orange border border-orangeMoney/40'
                    : 'bg-white/[0.05] border border-white/10 text-neutral-300 hover:border-white/20 hover:bg-white/[0.10] hover:text-white'
                }`}
              >
                <span>All Products</span>
                <span className="text-[10px] font-mono opacity-80">({products.length})</span>
              </button>

              <button
                role="tab"
                aria-selected={selectedCategory === 'perfumes'}
                onClick={() => setSelectedCategory('perfumes')}
                className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 snap-start active:scale-95 ${
                  selectedCategory === 'perfumes'
                    ? 'bg-gradient-to-r from-orangeMoney to-orangeMoney-dark text-white shadow-glow-orange border border-orangeMoney/40'
                    : 'bg-white/[0.05] border border-white/10 text-neutral-300 hover:border-white/20 hover:bg-white/[0.10] hover:text-white'
                }`}
              >
                <Droplets size={14} aria-hidden="true" />
                <span>Niche Perfumes</span>
              </button>

              <button
                role="tab"
                aria-selected={selectedCategory === 'clothes'}
                onClick={() => setSelectedCategory('clothes')}
                className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 snap-start active:scale-95 ${
                  selectedCategory === 'clothes'
                    ? 'bg-gradient-to-r from-orangeMoney to-orangeMoney-dark text-white shadow-glow-orange border border-orangeMoney/40'
                    : 'bg-white/[0.05] border border-white/10 text-neutral-300 hover:border-white/20 hover:bg-white/[0.10] hover:text-white'
                }`}
              >
                <Shirt size={14} aria-hidden="true" />
                <span>Linen Clothes</span>
              </button>

              <button
                role="tab"
                aria-selected={selectedCategory === 'new_arrivals'}
                onClick={() => setSelectedCategory('new_arrivals')}
                className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 snap-start active:scale-95 ${
                  selectedCategory === 'new_arrivals'
                    ? 'bg-gradient-to-r from-orangeMoney to-orangeMoney-dark text-white shadow-glow-orange border border-orangeMoney/40'
                    : 'bg-white/[0.05] border border-white/10 text-neutral-300 hover:border-white/20 hover:bg-white/[0.10] hover:text-white'
                }`}
              >
                <Sparkles size={14} className={selectedCategory === 'new_arrivals' ? 'text-amber-200' : 'text-amber-400'} aria-hidden="true" />
                <span>New Arrivals</span>
              </button>
            </div>
            {/* Subtle right-edge scroll cue on mobile */}
            <div className="sm:hidden absolute right-0 top-0 bottom-1.5 w-6 bg-gradient-to-l from-[#07080c] to-transparent pointer-events-none" />
          </div>
        </section>

        {/* Product Catalog Grid */}
        <section id="catalog" aria-label="Available products" className="scroll-mt-28">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
              {selectedCategory === 'all'
                ? 'Curated Catalog'
                : selectedCategory === 'perfumes'
                ? 'Extrait Fragrances'
                : selectedCategory === 'clothes'
                ? 'Linen Summer Wear'
                : 'New In-Stock Pieces'}
            </h2>
            <span className="text-xs text-neutral-400 font-semibold">
              Showing {filteredProducts.length} items
            </span>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="bg-[#0e1118] rounded-3xl p-10 sm:p-14 text-center border border-white/10 shadow-elevated space-y-3.5">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center mx-auto text-neutral-400">
                <Search size={26} aria-hidden="true" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                No items matched your search
              </h3>
              <p className="text-xs sm:text-sm text-neutral-400 max-w-sm mx-auto leading-relaxed">
                Try searching for other scent profiles like &quot;Amber&quot;, &quot;Vanilla&quot;, &quot;Linen&quot;, or clear your filter criteria.
              </p>
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
              >
                Reset Catalog Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Modern Storefront Footer */}
      <Footer />

      {/* Floating Bottom Cart Bar on Mobile (with safe area inset padding) */}
      {cartCount > 0 && (
        <aside
          aria-label="Floating bag checkout indicator"
          className="fixed bottom-safe left-4 right-4 z-40 max-w-md mx-auto animate-slideUp"
        >
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-[#0d1017]/95 backdrop-blur-xl text-white p-3.5 sm:p-4 rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.8),0_0_25px_rgba(255,102,0,0.2)] flex items-center justify-between border border-white/15 active:scale-[0.98] transition-all focus-visible:outline-2 focus-visible:outline-orangeMoney"
            aria-label={`View shopping bag: ${cartCount} items, total P${cartSubtotal.toFixed(2)}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-orangeMoney text-white font-black text-xs flex items-center justify-center shadow-xs">
                {cartCount}
              </div>
              <div className="text-left">
                <p className="text-xs sm:text-sm font-extrabold leading-tight">View Shopping Bag</p>
                <p className="text-[10px] sm:text-[11px] text-neutral-400">Proceed to mobile checkout</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-black text-sm sm:text-base font-mono text-orangeMoney">
                P{cartSubtotal.toFixed(2)}
              </span>
              <ArrowRight size={17} aria-hidden="true" />
            </div>
          </button>
        </aside>
      )}

      {/* Dynamic Modals */}
      <VariantModal />
      <CartDrawer />
    </div>
  );
}
