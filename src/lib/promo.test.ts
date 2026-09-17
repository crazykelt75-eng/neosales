import { describe, expect, it } from 'vitest';
import { getAutomaticBundleDiscount, validatePromoCode } from './promo';
import type { CartItem, Product, ProductVariant } from '@/types';

function line(category: Product['category'], price: number, quantity: number): CartItem {
  const product: Product = {
    id: crypto.randomUUID(),
    title: 'Test product',
    slug: crypto.randomUUID(),
    category,
    description: '',
    basePriceBWP: price,
    isActive: true,
    isNewArrival: false,
    imageUrls: [],
    variants: [],
  };
  const variant: ProductVariant = {
    id: crypto.randomUUID(),
    productId: product.id,
    sku: crypto.randomUUID(),
    priceBWP: price,
    stockQuantity: 20,
    lowStockThreshold: 3,
  };
  product.variants = [variant];
  return { product, variantId: variant.id, variantLabel: 'Test', unitPriceBWP: price, quantity };
}

describe('automatic bundle discount', () => {
  it('applies only when at least two perfume units are present', () => {
    expect(getAutomaticBundleDiscount([line('perfumes', 300, 1)])).toBeNull();
    expect(getAutomaticBundleDiscount([line('perfumes', 300, 2)])?.amountBWP).toBe(60);
  });

  it('does not discount apparel and caps the saving at P200', () => {
    const result = getAutomaticBundleDiscount([
      line('perfumes', 1500, 2),
      line('clothes', 1000, 1),
    ]);
    expect(result?.amountBWP).toBe(200);
  });
});

describe('promo validation', () => {
  const promo = {
    id: crypto.randomUUID(),
    code: 'SAVE10',
    percentOff: 10,
    minSubtotalBWP: 300,
    maxDiscountBWP: 50,
    isActive: true,
    description: 'Test',
  };

  it('enforces minimum spend and the discount cap', () => {
    expect(validatePromoCode('SAVE10', 299, [promo]).ok).toBe(false);
    const result = validatePromoCode('save10', 1000, [promo]);
    expect(result.ok && result.discountBWP).toBe(50);
  });
});
