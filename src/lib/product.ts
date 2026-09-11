import { CartItem, Product, ProductStatusSummary, ProductVariant } from '@/types';
import { LOW_STOCK_WARNING_CEILING } from '@/lib/constants';

/** Aggregated stock & price information for a catalog card. */
export function getProductStatusSummary(product: Product): ProductStatusSummary {
  const prices = [product.basePriceBWP, ...product.variants.map((v) => v.priceBWP)];
  const totalStock = product.variants.reduce((sum, variant) => sum + variant.stockQuantity, 0);
  const minPriceBWP = Math.min(...prices);
  const maxPriceBWP = Math.max(...prices);

  return {
    totalStock,
    isSoldOut: totalStock === 0,
    isLowStock: totalStock > 0 && totalStock <= LOW_STOCK_WARNING_CEILING,
    minPriceBWP,
    maxPriceBWP,
    hasPriceRange: maxPriceBWP > minPriceBWP,
  };
}

/** Human readable variant label used on cards, in the bag and on receipts. */
export function getVariantLabel(variant: ProductVariant): string {
  const parts: string[] = [];

  if (variant.volumeMl) parts.push(`${variant.volumeMl}ml`);
  if (variant.size) parts.push(variant.size);
  if (variant.color) parts.push(variant.color);

  const descriptor = parts.join(' · ') || 'Standard';
  return variant.scentProfile ? `${descriptor} · ${variant.scentProfile}` : descriptor;
}

/**
 * One-line merchandising teaser: scent notes for perfume, fabric and
 * available sizes for apparel, material for accessories.
 */
export function getProductTeaser(product: Product): string {
  const scent = product.variants.find((v) => v.scentProfile)?.scentProfile;
  if (product.category === 'perfumes') {
    return scent ? `Extrait de Parfum · ${scent}` : 'Extrait de Parfum · Long-wear oil base';
  }

  const colors = unique(product.variants.map((v) => v.color)).filter(Boolean) as string[];
  if (product.category === 'clothes') {
    const colorText = colors.length ? colors.join(' / ') : 'Breathable summer weave';
    return `${colorText} · Sizes ${sizeRange(product)}`;
  }

  return colors.length ? colors.join(' / ') : 'Everyday luxury accessory';
}

/** Total units currently sitting in a bag. */
export function getCartCount(cart: CartItem[]): number {
  return cart.reduce((total, item) => total + item.quantity, 0);
}

/** Bag value before delivery fees. */
export function getCartSubtotal(cart: CartItem[]): number {
  return cart.reduce((total, item) => total + item.unitPriceBWP * item.quantity, 0);
}

/** Looks up the live variant record backing a bag line (stock may have changed). */
export function findVariant(product: Product, variantId: string): ProductVariant | undefined {
  return product.variants.find((variant) => variant.id === variantId);
}

function unique(values: (string | undefined)[]): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

/** Sorted, deduplicated list of garment sizes present in a product's variants. */
function getAvailableSizes(product: Product): string[] {
  const order = ['XS', 'S', 'M', 'L', 'XL', '2XL'];
  const sizes = unique(product.variants.map((v) => v.size)).filter(Boolean) as string[];
  return sizes.sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

function sizeRange(product: Product): string {
  const sizes = getAvailableSizes(product);
  if (!sizes.length) return 'One size';
  if (sizes.length === 1) return sizes[0];
  return `${sizes[0]}–${sizes[sizes.length - 1]}`;
}
