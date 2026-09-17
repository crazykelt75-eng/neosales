'use client';

import React, { useMemo, useState } from 'react';
import { AlertTriangle, Minus, Package, Pencil, Plus, Search, X } from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { Product, ProductCategory } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { AddProductModal } from '@/components/admin/AddProductModal';
import { formatBWP } from '@/lib/format';
import { getOptimizedImageUrl } from '@/lib/imageUtils';
import { getVariantLabel } from '@/lib/product';

type StockFilter = 'all' | 'low' | 'out';

/** Searchable inventory table with inline stock adjusters and publish toggles. */
export function InventoryManager() {
  const { products, adjustVariantStock, setVariantStock, toggleProductActive } = useStore();

  const [query, setQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<ProductCategory | 'all'>('all');
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

  const visibleProducts = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return products.filter((product) => {
      if (categoryFilter !== 'all' && product.category !== categoryFilter) return false;

      if (stockFilter !== 'all') {
        const flags = product.variants.map((variant) => ({
          low: variant.stockQuantity > 0 && variant.stockQuantity <= variant.lowStockThreshold,
          out: variant.stockQuantity === 0,
        }));

        if (stockFilter === 'low' && !flags.some((flag) => flag.low)) return false;
        if (stockFilter === 'out' && !flags.some((flag) => flag.out)) return false;
      }

      if (!needle) return true;

      return (
        product.title.toLowerCase().includes(needle) ||
        product.slug.toLowerCase().includes(needle) ||
        product.variants.some(
          (variant) =>
            variant.sku.toLowerCase().includes(needle) ||
            (variant.size ?? '').toLowerCase().includes(needle) ||
            (variant.color ?? '').toLowerCase().includes(needle) ||
            (variant.scentProfile ?? '').toLowerCase().includes(needle)
        )
      );
    });
  }, [categoryFilter, products, query, stockFilter]);

  const totalVariants = products.reduce((sum, product) => sum + product.variants.length, 0);

  return (
    <section aria-label="Inventory manager" className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-surface/70 p-3.5 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by SKU, product title, size or colour…"
            aria-label="Search inventory by SKU or product title"
            className="w-full rounded-xl border border-white/12 bg-black/30 py-2.5 pl-10 pr-10 text-sm text-white placeholder:text-neutral-400 focus:border-orangeMoney focus:outline-none focus:ring-2 focus:ring-orangeMoney/40"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear inventory search"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-neutral-400 transition-colors hover:text-white"
            >
              <X size={15} aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by stock level">
          {(
            [
              { id: 'all', label: `All (${totalVariants})` },
              { id: 'low', label: 'Low stock' },
              { id: 'out', label: 'Sold out' },
            ] as { id: StockFilter; label: string }[]
          ).map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setStockFilter(filter.id)}
              aria-pressed={stockFilter === filter.id}
              className={`rounded-xl border px-3 py-2 text-2xs font-bold uppercase tracking-wide transition-colors ${
                stockFilter === filter.id
                  ? 'border-orangeMoney/50 bg-orangeMoney/15 text-white'
                  : 'border-white/10 bg-white/[0.04] text-neutral-300 hover:text-white'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by category">
          {(
            [
              { id: 'all', label: 'All categories' },
              { id: 'perfumes', label: 'Perfumes' },
              { id: 'clothes', label: 'Apparel' },
              { id: 'accessories', label: 'Accessories' },
            ] as { id: ProductCategory | 'all'; label: string }[]
          ).map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setCategoryFilter(filter.id)}
              aria-pressed={categoryFilter === filter.id}
              className={`rounded-xl border px-3 py-2 text-2xs font-bold uppercase tracking-wide transition-colors ${
                categoryFilter === filter.id
                  ? 'border-orangeMoney/50 bg-orangeMoney/15 text-white'
                  : 'border-white/10 bg-white/[0.04] text-neutral-300 hover:text-white'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {visibleProducts.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-surface/70 p-6 text-center text-xs text-neutral-400">
          No products match this search. Try a different SKU or clear the filters.
        </p>
      ) : (
        <ul className="space-y-3">
          {visibleProducts.map((product) => {
            const productStock = product.variants.reduce((sum, variant) => sum + variant.stockQuantity, 0);

            return (
              <li key={product.id} className="rounded-2xl border border-white/10 bg-surface/70 p-3.5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <img
                    src={getOptimizedImageUrl(product.imageUrls[0], 160)}
                    alt=""
                    width={56}
                    height={70}
                    loading="lazy"
                    decoding="async"
                    className="h-[70px] w-[56px] flex-shrink-0 rounded-xl border border-white/10 object-cover"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-white">{product.title}</h3>
                      <Badge variant={product.isActive ? 'success' : 'soldOut'} icon={null} className="text-[10px]">
                        {product.isActive ? 'Live' : 'Hidden'}
                      </Badge>
                      <span className="font-mono text-2xs text-neutral-400">{productStock} units on hand</span>
                    </div>

                    <p className="mt-1 text-2xs uppercase tracking-wide text-neutral-400">
                      {product.category} · {formatBWP(product.basePriceBWP)} base
                    </p>
                  </div>

                  {/* Publish toggle (native switch semantics) */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={product.isActive}
                    onClick={() => toggleProductActive(product.id)}
                    aria-label={`${product.isActive ? 'Hide' : 'Publish'} ${product.title}`}
                    className={`inline-flex min-h-[40px] flex-shrink-0 items-center gap-2 rounded-xl border px-3 text-2xs font-bold uppercase tracking-wide transition-colors ${
                      product.isActive
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                        : 'border-white/12 bg-white/[0.04] text-neutral-300'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`relative h-4 w-8 rounded-full transition-colors ${
                        product.isActive ? 'bg-emerald-500/70' : 'bg-white/20'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${
                          product.isActive ? 'left-4' : 'left-0.5'
                        }`}
                      />
                    </span>
                    {product.isActive ? 'Published' : 'Hidden'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setProductToEdit(product)}
                    className="inline-flex min-h-[40px] flex-shrink-0 items-center gap-2 rounded-xl border border-white/12 bg-white/[0.05] px-3 text-2xs font-bold uppercase tracking-wide text-neutral-200 transition-colors hover:bg-white/[0.12] hover:text-white"
                  >
                    <Pencil size={13} aria-hidden="true" />
                    Edit details
                  </button>
                </div>

                {/* Variant stock rows */}
                <ul className="mt-3 space-y-2 border-t border-white/[0.07] pt-3">
                  {product.variants.map((variant) => {
                    const isOut = variant.stockQuantity === 0;
                    const isLow = !isOut && variant.stockQuantity <= variant.lowStockThreshold;

                    return (
                      <li
                        key={variant.id}
                        className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-center gap-2 text-xs font-semibold text-neutral-100">
                            {getVariantLabel(variant)}
                            {isOut && <Badge variant="soldOut" icon={null} className="text-[10px]">Sold out</Badge>}
                            {isLow && (
                              <Badge variant="lowStock" className="text-[10px]">
                                <AlertTriangle size={10} aria-hidden="true" />
                                Low
                              </Badge>
                            )}
                          </p>
                          <p className="mt-0.5 font-mono text-2xs text-neutral-400">
                            {variant.sku} · {formatBWP(variant.priceBWP)} · threshold {variant.lowStockThreshold}
                          </p>
                        </div>

                        <div
                          role="group"
                          aria-label={`Adjust stock for ${getVariantLabel(variant)}`}
                          className="flex flex-shrink-0 items-center gap-1.5"
                        >
                          <button
                            type="button"
                            onClick={() => adjustVariantStock(product.id, variant.id, -1)}
                            disabled={variant.stockQuantity === 0}
                            aria-label={`Decrease stock for ${getVariantLabel(variant)}`}
                            className="rounded-lg border border-white/12 bg-white/[0.05] p-2 text-neutral-200 transition-colors hover:bg-white/[0.12] disabled:opacity-30"
                          >
                            <Minus size={13} aria-hidden="true" />
                          </button>

                          <input
                            type="number"
                            min={0}
                            value={variant.stockQuantity}
                            onChange={(event) =>
                              setVariantStock(product.id, variant.id, Number(event.target.value))
                            }
                            aria-label={`Stock quantity for ${getVariantLabel(variant)}`}
                            className="w-16 rounded-lg border border-white/12 bg-black/40 px-2 py-2 text-center font-mono text-xs font-bold text-white focus:border-orangeMoney focus:outline-none focus:ring-2 focus:ring-orangeMoney/40"
                          />

                          <button
                            type="button"
                            onClick={() => adjustVariantStock(product.id, variant.id, 1)}
                            aria-label={`Increase stock for ${getVariantLabel(variant)}`}
                            className="rounded-lg border border-white/12 bg-white/[0.05] p-2 text-neutral-200 transition-colors hover:bg-white/[0.12]"
                          >
                            <Plus size={13} aria-hidden="true" />
                          </button>

                          <button
                            type="button"
                            onClick={() => adjustVariantStock(product.id, variant.id, 10)}
                            aria-label={`Add ten units to ${getVariantLabel(variant)}`}
                            className="hidden rounded-lg border border-white/12 bg-white/[0.05] px-2 py-2 font-mono text-2xs font-bold text-neutral-200 transition-colors hover:bg-white/[0.12] sm:inline-flex"
                          >
                            +10
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ul>
      )}

      <AddProductModal
        isOpen={Boolean(productToEdit)}
        product={productToEdit}
        onClose={() => setProductToEdit(null)}
      />

      <p className="flex items-center gap-2 text-2xs text-neutral-400">
        <Package size={13} aria-hidden="true" />
        Stock changes save instantly to local storage and sync to Supabase when cloud persistence is configured.
      </p>
    </section>
  );
}
