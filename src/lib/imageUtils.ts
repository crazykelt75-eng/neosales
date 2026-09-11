/**
 * Image helpers for the NeoSales catalog.
 *
 * The catalog is served from local static assets so the storefront renders in
 * well under a second on Botswana mobile data. Seller-added remote images
 * (Unsplash / Supabase storage) are normalised to a 4:5 crop with sane
 * compression so cards stay crisp without shipping megabyte originals.
 */

const UNSPLASH_TO_LOCAL_MAP: Record<string, string> = {
  'photo-1594035910387-fea47794261f': '/products/rouge-1.jpg',
  'photo-1547887537-6158d64c35b3': '/products/rouge-2.jpg',
  'photo-1523293182086-7651a899d37f': '/products/oud-1.jpg',
  'photo-1592945403244-b3fbafd7f539': '/products/vanilla-1.jpg',
  'photo-1596755094514-f87e34085b2c': '/products/shirt-1.jpg',
  'photo-1602810318383-e386cc2a3ccf': '/products/shirt-2.jpg',
  'photo-1624378439575-d8705ad7ae80': '/products/palazzo-1.jpg',
  'photo-1584917865442-de89df76afd3': '/products/bag-1.jpg',
};

/** Catalog cards are authored at a strict 4:5 ratio (400 × 500). */
export const CATALOG_IMAGE_WIDTH = 400;
export const CATALOG_IMAGE_HEIGHT = 500;

/** Placeholder shown when a product has no usable photography. */
export const FALLBACK_PRODUCT_IMAGE = '/products/rouge-1.jpg';

/**
 * Resolves a stored image reference to an optimised, browser-ready URL.
 * Known CDN IDs are swapped for the bundled static asset; remote URLs get
 * Unsplash's on-the-fly transform; local paths pass straight through.
 */
export function getOptimizedImageUrl(url: string | undefined | null, width = 600): string {
  if (!url) return FALLBACK_PRODUCT_IMAGE;

  for (const [remoteId, localPath] of Object.entries(UNSPLASH_TO_LOCAL_MAP)) {
    if (url.includes(remoteId)) return localPath;
  }

  if (url.startsWith('/')) return url;

  if (url.includes('images.unsplash.com') || url.includes('plus.unsplash.com')) {
    const [base] = url.split('?');
    return `${base}?auto=format&fit=crop&w=${width}&h=${Math.round(
      (width * CATALOG_IMAGE_HEIGHT) / CATALOG_IMAGE_WIDTH
    )}&q=75`;
  }

  return url;
}

/** Deduplicated gallery for the product detail modal. */
export function getGalleryImages(imageUrls: string[] | undefined, width = 900): string[] {
  const gallery = (imageUrls ?? []).map((url) => getOptimizedImageUrl(url, width));
  return Array.from(new Set(gallery)).slice(0, 4);
}
