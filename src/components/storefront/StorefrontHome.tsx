'use client';

import React, { useMemo, useState } from 'react';
import { ArrowRight, Droplets, Search, Shirt, ShoppingBag, Sparkles, X } from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { ProductCategory } from '@/types';
import { Header } from '@/components/storefront/Header';
import { HeroSpotlight } from '@/components/storefront/HeroSpotlight';
import { ProductCard } from '@/components/storefront/ProductCard';
import { VariantModal } from '@/components/storefront/VariantModal';
import { CartDrawer } from '@/components/storefront/CartDrawer';
import { Footer } from '@/components/storefront/Footer';
import { CheckoutModal } from '@/components/checkout/CheckoutModal';
import { Button } from '@/components/ui/Button';
import { CATEGORY_TABS } from '@/lib/constants';
import { formatBWP } from '@/lib/format';

type CategoryFilter = ProductCategory | 'all';

const CATEGORY_ICONS: Record<CategoryFilter, React.ReactNode> = {
  all: <Sparkles size={14} aria-hidden="true" />,
  perfumes: <Droplets size={14} aria-hidden="true" />,
  clothes: <Shirt size={14} aria-hidden="true" />,
  accessories: <ShoppingBag size={14} aria-hidden="true" />,
};

const CATALOG_HEADINGS: Record<CategoryFilter, string> = {
  all: 'Curated catalog',
  perfumes: 'Extrait fragrances',
  clothes: 'Summer apparel',
  accessories: 'Everyday accessories',
};

/** Client-side storefront: hero spotlight, filtered catalog, bag and checkout. */
export function StorefrontHome() {
  const { products, cartCount, cartSubtotal, openCart, hasHydrated } = useStore();

  const [category, setCategory] = useState<CategoryFilter>('all');
  const [query, setQuery] = useState('');

  const visibleProducts = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return products.filter((product) => {
      if (!product.isActive) return false;
      if (category !== 'all' && product.category !== category) return false;
      if (!needle) return true;

      return (
        product.title.toLowerCase().includes(needle) ||
        product.description.toLowerCase().includes(needle) ||
        product.featuredTag?.toLowerCase().includes(needle) ||
        product.variants.some((variant) =>
          [variant.scentProfile, variant.size, variant.color, variant.sku]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(needle))
        )
      );
    });
  }, [category, products, query]);

  const activeProductCount = products.filter((product) => product.isActive).length;
  const hasActiveFilters = query.trim().length > 0 || category !== 'all';

  const resetFilters = () => {
    setQuery('');
    setCategory('all');
  };

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#catalog"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[90] focus:rounded-xl focus:bg-surface focus:px-4 focus:py-2.5 focus:text-sm focus:font-bold focus:text-white focus:ring-2 focus:ring-orangeMoney"
      >
        Skip to catalog
      </a>

      <Header />

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-8 px-4 py-6 sm:px-6 sm:py-8">
        {/* Semantic page heading for SEO hierarchy (visually represented by the hero) */}
        <h1 className="sr-only">
          NeoSales Botswana — authentic extrait perfumes, summer apparel and accessories with Orange Money and FNB
          Pay2Cell checkout
        </h1>

        <HeroSpotlight />

        {/* Search + category filters */}
        <section aria-label="Catalog filters" className="space-y-3.5">
          <div className="relative">
            <Search
              size={17}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search scents (oud, amber, vanilla), linen shirts, sizes…"
              aria-label="Search the catalog"
              className="w-full rounded-2xl border border-white/12 bg-surface/80 py-3.5 pl-11 pr-11 text-sm text-white placeholder:text-neutral-400 backdrop-blur focus:border-orangeMoney focus:outline-none focus:ring-2 focus:ring-orangeMoney/40"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-neutral-400 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-orangeMoney"
              >
                <X size={16} aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="relative">
            <div role="tablist" aria-label="Product categories" className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
              {CATEGORY_TABS.map((tab) => {
                const isActive = category === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setCategory(tab.id)}
                    className={`inline-flex min-h-[42px] flex-shrink-0 items-center gap-1.5 rounded-xl border px-4 text-xs font-bold transition-all ${
                      isActive
                        ? 'border-orangeMoney/50 bg-gradient-to-r from-orangeMoney to-orangeMoney-dark text-white shadow-[0_10px_30px_-16px_rgba(255,102,0,1)]'
                        : 'border-white/10 bg-white/[0.04] text-neutral-300 hover:border-white/25 hover:text-white'
                    }`}
                  >
                    {CATEGORY_ICONS[tab.id]}
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute bottom-1 right-0 top-0 w-8 bg-gradient-to-l from-midnight to-transparent sm:hidden"
            />
          </div>
        </section>

        {/* Catalog */}
        <section id="catalog" aria-labelledby="catalog-heading" className="scroll-mt-28 space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 id="catalog-heading" className="text-base font-extrabold tracking-tight text-white sm:text-lg">
                {CATALOG_HEADINGS[category]}
              </h2>
              <p className="mt-0.5 text-xs text-neutral-400" aria-live="polite">
                Showing {visibleProducts.length} of {activeProductCount} pieces
                {!hasHydrated ? ' · loading your saved bag…' : ''}
              </p>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 text-2xs font-bold uppercase tracking-wide text-neutral-300 transition-colors hover:border-white/25 hover:text-white"
              >
                <X size={12} aria-hidden="true" />
                Reset filters
              </button>
            )}
          </div>

          {visibleProducts.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-surface/80 px-6 py-14 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-neutral-400">
                <Search size={24} aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-base font-bold text-white">Nothing matches that search</h3>
              <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-neutral-400">
                Try a different scent profile such as &ldquo;Amber&rdquo;, &ldquo;Oud&rdquo; or
                &ldquo;Vanilla&rdquo;, or browse everything we have in stock.
              </p>
              <Button variant="primary" size="md" className="mt-5" onClick={resetFilters}>
                Reset filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
              {visibleProducts.map((product, index) => (
                <ProductCard key={product.id} product={product} priority={index < 4} />
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />

      {/* Floating bag bar for mobile shoppers */}
      {cartCount > 0 && (
        <aside aria-label="Bag summary" className="fixed bottom-safe left-4 right-4 z-40 mx-auto max-w-md animate-slideUp">
          <button
            type="button"
            onClick={openCart}
            className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/15 bg-surface/95 p-3.5 text-left shadow-elevated backdrop-blur-xl transition-transform active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orangeMoney sm:hidden"
            aria-label={`Open bag: ${cartCount} item${cartCount === 1 ? '' : 's'}, subtotal ${formatBWP(
              cartSubtotal
            )}`}
          >
            <span className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orangeMoney font-mono text-xs font-black text-white">
                {cartCount}
              </span>
              <span>
                <span className="block text-xs font-extrabold text-white">View your bag</span>
                <span className="block text-2xs text-neutral-400">Checkout with Orange Money</span>
              </span>
            </span>

            <span className="flex items-center gap-2">
              <span className="font-mono text-sm font-black text-orangeMoney" data-price>
                {formatBWP(cartSubtotal)}
              </span>
              <ArrowRight size={16} className="text-neutral-300" aria-hidden="true" />
            </span>
          </button>
        </aside>
      )}

      <VariantModal />
      <CartDrawer />
      <CheckoutModal />
    </div>
  );
}
