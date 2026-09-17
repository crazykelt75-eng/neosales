'use client';

import React, { useState } from 'react';
import { AlertCircle, PackagePlus } from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { Product, ProductCategory } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { CATEGORY_LABELS, LOW_STOCK_WARNING_CEILING } from '@/lib/constants';
import { FALLBACK_PRODUCT_IMAGE, getOptimizedImageUrl } from '@/lib/imageUtils';

const TITLE_ID = 'add-product-title';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FormState {
  title: string;
  category: ProductCategory;
  description: string;
  basePrice: string;
  /** Perfume volume or garment size, depending on category. */
  optionLabel: string;
  colour: string;
  stock: string;
  imageUrl: string;
}

const EMPTY_FORM: FormState = {
  title: '',
  category: 'perfumes',
  description: '',
  basePrice: '',
  optionLabel: '',
  colour: '',
  stock: '5',
  imageUrl: '',
};

type Errors = Partial<Record<'title' | 'price' | 'option' | 'stock', string>>;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/**
 * Quick-add form for new catalog items. Creates one initial variant — the full
 * variant matrix can then be extended directly in Supabase once the product is
 * published. Validated inline, no placeholder states.
 */
export function AddProductModal({ isOpen, onClose }: AddProductModalProps) {
  const { addProduct } = useStore();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Errors>({});

  const isPerfume = form.category === 'perfumes';

  const FIELD_ERROR_KEYS: Partial<Record<keyof FormState, keyof Errors>> = {
    title: 'title',
    basePrice: 'price',
    optionLabel: 'option',
    stock: 'stock',
  };

  const update = <Key extends keyof FormState>(key: Key, value: FormState[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));

    const errorKey = FIELD_ERROR_KEYS[key];
    if (errorKey) setErrors((current) => ({ ...current, [errorKey]: undefined }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const nextErrors: Errors = {};
    const price = Number(form.basePrice);
    const stock = Number(form.stock);

    if (form.title.trim().length < 3) nextErrors.title = 'Give the product a recognisable title.';
    if (!Number.isFinite(price) || price <= 0) nextErrors.price = 'Enter a selling price in Pula.';
    if (!form.optionLabel.trim())
      nextErrors.option = isPerfume ? 'Add a bottle volume, e.g. 50ml.' : 'Add a size, e.g. M.';
    if (!Number.isFinite(stock) || stock < 0) nextErrors.stock = 'Enter the opening stock quantity.';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const productId = crypto.randomUUID();
    const volumeMl = isPerfume ? Number(form.optionLabel.replace(/[^\d]/g, '')) || undefined : undefined;

    const product: Product = {
      id: productId,
      title: form.title.trim(),
      slug: slugify(form.title) || productId,
      category: form.category,
      description:
        form.description.trim() ||
        `${CATEGORY_LABELS[form.category]} added from the seller dashboard.`,
      basePriceBWP: price,
      isActive: true,
      isNewArrival: true,
      imageUrls: [getOptimizedImageUrl(form.imageUrl.trim() || FALLBACK_PRODUCT_IMAGE)],
      variants: [
        {
          id: crypto.randomUUID(),
          productId,
          sku: `${slugify(form.title).slice(0, 10).toUpperCase() || 'ITEM'}-${(form.optionLabel || 'STD')
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '')}`,
          size: isPerfume ? undefined : form.optionLabel.trim().toUpperCase(),
          color: form.colour.trim() || undefined,
          volumeMl,
          scentProfile: isPerfume ? form.description.trim().slice(0, 48) || undefined : undefined,
          priceBWP: price,
          stockQuantity: stock,
          lowStockThreshold: LOW_STOCK_WARNING_CEILING,
        },
      ],
    };

    addProduct(product);
    setForm(EMPTY_FORM);
    setErrors({});
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} labelledBy={TITLE_ID} maxWidth="md" presentation="sheet">
      <form onSubmit={handleSubmit} className="flex max-h-[88vh] flex-col">
        <header className="border-b border-white/10 bg-[#0a0c13]/90 px-5 py-4">
          <h2 id={TITLE_ID} className="flex items-center gap-2 pr-10 text-base font-extrabold text-white">
            <PackagePlus size={18} className="text-orangeMoney" aria-hidden="true" />
            Quick add product
          </h2>
          <p className="mt-0.5 text-xs text-neutral-400">
            Publishes immediately to the storefront with one opening variant.
          </p>
        </header>

        <div className="space-y-4 overflow-y-auto px-5 py-5">
          <div>
            <label htmlFor="product-title" className="mb-1.5 block text-xs font-semibold text-neutral-200">
              Product title
            </label>
            <input
              id="product-title"
              value={form.title}
              onChange={(event) => update('title', event.target.value)}
              aria-invalid={Boolean(errors.title)}
              placeholder="e.g. Velvet Oud Extrait de Parfum"
              className={`w-full rounded-xl border bg-black/30 px-3.5 py-3 text-sm text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-orangeMoney/40 ${
                errors.title ? 'border-red-500/60' : 'border-white/12 focus:border-orangeMoney'
              }`}
            />
            {errors.title && (
              <p role="alert" className="mt-1.5 flex items-center gap-1.5 text-2xs font-semibold text-red-300">
                <AlertCircle size={12} aria-hidden="true" />
                {errors.title}
              </p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="product-category" className="mb-1.5 block text-xs font-semibold text-neutral-200">
                Category
              </label>
              <select
                id="product-category"
                value={form.category}
                onChange={(event) => update('category', event.target.value as ProductCategory)}
                className="w-full rounded-xl border border-white/12 bg-black/30 px-3.5 py-3 text-sm text-white focus:border-orangeMoney focus:outline-none focus:ring-2 focus:ring-orangeMoney/40"
              >
                <option value="perfumes">Niche perfumes</option>
                <option value="clothes">Summer apparel</option>
                <option value="accessories">Accessories</option>
              </select>
            </div>

            <div>
              <label htmlFor="product-price" className="mb-1.5 block text-xs font-semibold text-neutral-200">
                Price (BWP)
              </label>
              <input
                id="product-price"
                type="number"
                min={1}
                step="1"
                value={form.basePrice}
                onChange={(event) => update('basePrice', event.target.value)}
                aria-invalid={Boolean(errors.price)}
                placeholder="280"
                className={`w-full rounded-xl border bg-black/30 px-3.5 py-3 font-mono text-sm text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-orangeMoney/40 ${
                  errors.price ? 'border-red-500/60' : 'border-white/12 focus:border-orangeMoney'
                }`}
              />
              {errors.price && (
                <p role="alert" className="mt-1.5 flex items-center gap-1.5 text-2xs font-semibold text-red-300">
                  <AlertCircle size={12} aria-hidden="true" />
                  {errors.price}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="product-option" className="mb-1.5 block text-xs font-semibold text-neutral-200">
                {isPerfume ? 'Volume' : 'Size'}
              </label>
              <input
                id="product-option"
                value={form.optionLabel}
                onChange={(event) => update('optionLabel', event.target.value)}
                aria-invalid={Boolean(errors.option)}
                placeholder={isPerfume ? '50ml' : 'M'}
                className={`w-full rounded-xl border bg-black/30 px-3.5 py-3 text-sm text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-orangeMoney/40 ${
                  errors.option ? 'border-red-500/60' : 'border-white/12 focus:border-orangeMoney'
                }`}
              />
              {errors.option && (
                <p role="alert" className="mt-1.5 text-2xs font-semibold text-red-300">
                  {errors.option}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="product-colour" className="mb-1.5 block text-xs font-semibold text-neutral-200">
                Colour (optional)
              </label>
              <input
                id="product-colour"
                value={form.colour}
                onChange={(event) => update('colour', event.target.value)}
                placeholder={isPerfume ? '—' : 'Natural Cream'}
                disabled={isPerfume}
                className="w-full rounded-xl border border-white/12 bg-black/30 px-3.5 py-3 text-sm text-white placeholder:text-neutral-400 focus:border-orangeMoney focus:outline-none focus:ring-2 focus:ring-orangeMoney/40 disabled:opacity-40"
              />
            </div>

            <div>
              <label htmlFor="product-stock" className="mb-1.5 block text-xs font-semibold text-neutral-200">
                Opening stock
              </label>
              <input
                id="product-stock"
                type="number"
                min={0}
                value={form.stock}
                onChange={(event) => update('stock', event.target.value)}
                aria-invalid={Boolean(errors.stock)}
                className={`w-full rounded-xl border bg-black/30 px-3.5 py-3 font-mono text-sm text-white focus:outline-none focus:ring-2 focus:ring-orangeMoney/40 ${
                  errors.stock ? 'border-red-500/60' : 'border-white/12 focus:border-orangeMoney'
                }`}
              />
              {errors.stock && (
                <p role="alert" className="mt-1.5 text-2xs font-semibold text-red-300">
                  {errors.stock}
                </p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="product-description" className="mb-1.5 block text-xs font-semibold text-neutral-200">
              Notes / description
            </label>
            <textarea
              id="product-description"
              rows={3}
              value={form.description}
              onChange={(event) => update('description', event.target.value)}
              placeholder="Amber floral with saffron and cedarwood, high oil concentration."
              className="w-full resize-y rounded-xl border border-white/12 bg-black/30 px-3.5 py-3 text-sm leading-relaxed text-white placeholder:text-neutral-400 focus:border-orangeMoney focus:outline-none focus:ring-2 focus:ring-orangeMoney/40"
            />
          </div>

          <div>
            <label htmlFor="product-image" className="mb-1.5 block text-xs font-semibold text-neutral-200">
              Image URL (optional)
            </label>
            <input
              id="product-image"
              value={form.imageUrl}
              onChange={(event) => update('imageUrl', event.target.value)}
              placeholder="/products/oud-1.jpg or an https:// Unsplash link"
              className="w-full rounded-xl border border-white/12 bg-black/30 px-3.5 py-3 text-sm text-white placeholder:text-neutral-400 focus:border-orangeMoney focus:outline-none focus:ring-2 focus:ring-orangeMoney/40"
            />
            <p className="mt-1.5 text-2xs text-neutral-400">
              Leave blank to use the bundled catalog placeholder until photography is ready.
            </p>
          </div>
        </div>

        <footer className="flex flex-col gap-2 border-t border-white/10 bg-[#0a0c13]/95 px-5 py-4 sm:flex-row">
          <Button variant="secondary" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="lg" fullWidth leftIcon={<PackagePlus size={16} />}>
            Publish product
          </Button>
        </footer>
      </form>
    </Modal>
  );
}
