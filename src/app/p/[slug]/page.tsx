import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProductDetail } from '@/components/storefront/ProductDetail';
import { Footer } from '@/components/storefront/Footer';
import { ProductPageHeader } from '@/components/storefront/ProductPageHeader';
import { INITIAL_PRODUCTS, CUSTOMER_REVIEWS } from '@/lib/mockData';
import { CATEGORY_LABELS, SITE_URL } from '@/lib/constants';
import { formatBWP } from '@/lib/format';
import { getProductStatusSummary, getProductTeaser } from '@/lib/product';

interface ProductPageProps {
  params: { slug: string };
}

/**
 * Pre-renders one static page per catalog product, so every piece has a
 * shareable URL with a proper title, description and Open Graph image for
 * WhatsApp, Facebook and Google.
 */
export function generateStaticParams() {
  return INITIAL_PRODUCTS.filter((product) => product.isActive).map((product) => ({ slug: product.slug }));
}

export function generateMetadata({ params }: ProductPageProps): Metadata {
  const product = INITIAL_PRODUCTS.find((candidate) => candidate.slug === params.slug);

  if (!product) {
    return { title: 'Product not found' };
  }

  const summary = getProductStatusSummary(product);
  const priceLabel = summary.hasPriceRange
    ? `${formatBWP(summary.minPriceBWP)} – ${formatBWP(summary.maxPriceBWP)}`
    : formatBWP(summary.minPriceBWP);

  const description = `${getProductTeaser(product)}. ${priceLabel} with free Francistown pickup and nationwide delivery across Botswana. Pay with Orange Money, FNB Pay2Cell or cash on pickup.`;

  return {
    title: product.title,
    description,
    alternates: { canonical: `/p/${product.slug}` },
    openGraph: {
      type: 'website',
      locale: 'en_BW',
      url: `${SITE_URL}/p/${product.slug}`,
      siteName: 'NeoSales Botswana',
      title: `${product.title} · ${priceLabel} | NeoSales`,
      description,
      images: [
        {
          url: product.imageUrls[0],
          width: 600,
          height: 750,
          alt: `${product.title} — ${getProductTeaser(product)}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${product.title} | NeoSales Botswana`,
      description,
      images: [product.imageUrls[0]],
    },
  };
}

export default function ProductPage({ params }: ProductPageProps) {
  const product = INITIAL_PRODUCTS.find((candidate) => candidate.slug === params.slug);

  if (!product) notFound();

  const summary = getProductStatusSummary(product);
  const reviews = CUSTOMER_REVIEWS.filter((review) => review.productId === product.id);

  /** Rich product structured data, including Botswana delivery terms. */
  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description,
    image: product.imageUrls.map((url) => `${SITE_URL}${url}`),
    sku: product.variants[0]?.sku,
    category: CATEGORY_LABELS[product.category],
    brand: { '@type': 'Brand', name: 'NeoSales' },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'BWP',
      lowPrice: summary.minPriceBWP,
      highPrice: summary.maxPriceBWP,
      offerCount: product.variants.length,
      availability: summary.isSoldOut ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      seller: { '@type': 'Organization', name: 'NeoSales' },
      areaServed: { '@type': 'Country', name: 'Botswana' },
      priceValidUntil: '2027-12-31',
    },
    ...(reviews.length > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: (
              reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
            ).toFixed(1),
            reviewCount: reviews.length,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  };

  return (
    <div className="flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />

      <ProductPageHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <ProductDetail product={product} />
      </main>

      <Footer />
    </div>
  );
}
