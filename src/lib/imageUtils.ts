/**
 * Image optimization utilities for NeoSales Botswana Storefront
 * Resolves local high-speed static assets and formats external CDN URLs.
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

/**
 * Returns an optimized image URL.
 * Automatically intercepts known Unsplash IDs and redirects them to local static assets,
 * cutting latency from ~2000ms down to ~15ms.
 */
export function getOptimizedImageUrl(url: string | undefined | null, width = 600): string {
  if (!url) return '';

  // Check if this matches one of our local catalog assets
  for (const [id, localPath] of Object.entries(UNSPLASH_TO_LOCAL_MAP)) {
    if (url.includes(id)) {
      return localPath;
    }
  }

  // Already local
  if (url.startsWith('/')) {
    return url;
  }

  // External Unsplash image (e.g. newly added by seller/admin)
  if (url.includes('images.unsplash.com')) {
    const cleanUrl = url.split('?')[0];
    return `${cleanUrl}?auto=format&fit=crop&w=${width}&q=75`;
  }

  return url;
}
