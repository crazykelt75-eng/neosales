'use client';

import React, { useRef, useState } from 'react';
import { AlertCircle, ClipboardPaste, ImagePlus, PackagePlus, X } from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { Product, ProductCategory } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { CATEGORY_LABELS, LOW_STOCK_WARNING_CEILING } from '@/lib/constants';
import { FALLBACK_PRODUCT_IMAGE, getOptimizedImageUrl } from '@/lib/imageUtils';
import { uploadProductImage } from '@/lib/supabaseClient';

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
  const [pastedImage, setPastedImage] = useState<File | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const setImageFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setImageError('Paste or choose an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageError('Keep images under 5 MB.');
      return;
    }
    setPastedImage(file);
    setImageError(null);
    update('imageUrl', '');
  };

  const handleImagePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const image = Array.from(event.clipboardData.files).find((file) => file.type.startsWith('image/'));
    if (!image) return;
    event.preventDefault();
    setImageFile(image);
  };

  const handleSubmit = async (event: React.FormEvent) => {
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

    setIsUploadingImage(true);
    try {
      const imageUrl = pastedImage
        ? await uploadProductImage(pastedImage, productId)
        : getOptimizedImageUrl(form.imageUrl.trim() || FALLBACK_PRODUCT_IMAGE);

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
      imageUrls: [imageUrl],
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
      setPastedImage(null);
      setErrors({});
      onClose();
    } catch (error) {
      setImageError(error instanceof Error ? error.message : 'Unable to upload the image.');
    } finally {
      setIsUploadingImage(false);
    }
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

          <div onPaste={handleImagePaste}>
            <label className="mb-1.5 block text-xs font-semibold text-neutral-200">
              Product image
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              onChange={(event) => setImageFile(event.target.files?.[0])}
            />
            <div
              tabIndex={0}
              role="button"
              aria-label="Paste a product image here"
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') fileInputRef.current?.click();
              }}
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-orangeMoney/50 bg-orangeMoney/5 px-3.5 py-3 text-sm text-neutral-200 transition hover:border-orangeMoney hover:bg-orangeMoney/10 focus:outline-none focus:ring-2 focus:ring-orangeMoney/40"
            >
              <ClipboardPaste size={18} className="shrink-0 text-orangeMoney" aria-hidden="true" />
              <span>
                <span className="block font-semibold">Paste an image here</span>
                <span className="block text-xs text-neutral-400">Use Ctrl+V, or click to choose a file (max 5 MB).</span>
              </span>
            </div>
            {pastedImage && (
              <div className="mt-2 flex items-center justify-between rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                <span className="flex min-w-0 items-center gap-2"><ImagePlus size={14} aria-hidden="true" /> <span className="truncate">{pastedImage.name || 'Pasted image'} ready to upload</span></span>
                <button type="button" onClick={() => setPastedImage(null)} className="rounded p-1 hover:bg-white/10" aria-label="Remove pasted image"><X size={14} /></button>
              </div>
            )}
            {imageError && <p role="alert" className="mt-1.5 text-2xs font-semibold text-red-300">{imageError}</p>}
            <p className="mb-1.5 mt-3 text-xs font-semibold text-neutral-300">Or use an existing image URL</p>
            <input
              id="product-image"
              value={form.imageUrl}
              onChange={(event) => update('imageUrl', event.target.value)}
              placeholder="/products/oud-1.jpg or an https:// Unsplash link"
              className="w-full rounded-xl border border-white/12 bg-black/30 px-3.5 py-3 text-sm text-white placeholder:text-neutral-400 focus:border-orangeMoney focus:outline-none focus:ring-2 focus:ring-orangeMoney/40"
            />
            <p className="mt-1.5 text-2xs text-neutral-400">
              Pasted images are stored in your product library. Leave both blank to use the catalog placeholder.
            </p>
          </div>
        </div>

        <footer className="flex flex-col gap-2 border-t border-white/10 bg-[#0a0c13]/95 px-5 py-4 sm:flex-row">
          <Button variant="secondary" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="lg" fullWidth disabled={isUploadingImage} leftIcon={<PackagePlus size={16} />}>
            {isUploadingImage ? 'Uploading image…' : 'Publish product'}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}
