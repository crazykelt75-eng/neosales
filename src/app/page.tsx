import type { Metadata } from 'next';
import { StorefrontHome } from '@/components/storefront/StorefrontHome';
import { INITIAL_PRODUCTS, CUSTOMER_REVIEWS } from '@/lib/mockData';
import { DELIVERY_OPTIONS, PAYMENT_OPTIONS, SITE_URL } from '@/lib/constants';
import { getProductStatusSummary } from '@/lib/product';

export const metadata: Metadata = {
  title: 'NeoSales | Authentic Perfumes, Summer Apparel & Accessories Botswana',
  description:
    'Buy authentic extrait perfumes from P260 and curated summer linen apparel in Botswana. Free Francistown pickups (G-North, Galo Mall, Nswazwi Mall), P45 local courier, P80 nationwide Sprint Couriers. Pay with Orange Money or FNB Pay2Cell.',
  alternates: { canonical: '/' },
};

/**
 * Schema.org structured data for the storefront: an OnlineStore with a full
 * offer catalog in Botswana Pula, plus the delivery coverage the seller commits
 * to. Rendered on the server so crawlers see it in the initial HTML.
 */
function buildStoreSchema() {
  const offerCatalog = INITIAL_PRODUCTS.filter((product) => product.isActive).map((product) => {
    const summary = getProductStatusSummary(product);

    return {
      '@type': 'Offer',
      priceCurrency: 'BWP',
      price: summary.minPriceBWP,
      priceValidUntil: '2027-12-31',
      availability: summary.isSoldOut ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      url: `${SITE_URL}/#catalog`,
      sku: product.variants[0]?.sku,
      priceSpecification: {
        '@type': 'PriceSpecification',
        priceCurrency: 'BWP',
        minPrice: summary.minPriceBWP,
        maxPrice: summary.maxPriceBWP,
      },
      itemOffered: {
        '@type': 'Product',
        name: product.title,
        description: product.description,
        category: product.category,
        image: `${SITE_URL}${product.imageUrls[0]}`,
        brand: { '@type': 'Brand', name: 'NeoSales' },
        aggregateRating: (() => {
          const reviews = CUSTOMER_REVIEWS.filter((review) => review.productId === product.id);
          if (!reviews.length) return undefined;

          return {
            '@type': 'AggregateRating',
            ratingValue: (
              reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
            ).toFixed(1),
            reviewCount: reviews.length,
            bestRating: 5,
            worstRating: 1,
          };
        })(),
      },
      shippingDetails: DELIVERY_OPTIONS.map((option) => ({
        '@type': 'OfferShippingDetails',
        shippingRate: {
          '@type': 'MonetaryAmount',
          value: option.feeBWP,
          currency: 'BWP',
        },
        shippingDestination: {
          '@type': 'DefinedRegion',
          addressCountry: 'BW',
        },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 1, unitCode: 'DAY' },
          transitTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 3, unitCode: 'DAY' },
        },
      })),
    };
  });

  return {
    '@context': 'https://schema.org',
    '@type': 'OnlineStore',
    name: 'NeoSales',
    alternateName: 'NeoSales Botswana',
    url: SITE_URL,
    logo: `${SITE_URL}/products/rouge-1.jpg`,
    image: `${SITE_URL}/products/rouge-1.jpg`,
    description:
      'Botswana boutique for authentic niche extrait perfumes, breathable summer linen apparel and accessories, with free Francistown pickups and nationwide courier delivery.',
    slogan: 'Authentic extraits and curated summer wear, delivered across Botswana.',
    currenciesAccepted: 'BWP',
    paymentAccepted: PAYMENT_OPTIONS.map((option) => option.label).join(', '),
    priceRange: 'P260 – P750',
    telephone: '+26771550200',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Francistown',
      addressRegion: 'North East District',
      addressCountry: 'BW',
    },
    areaServed: [
      { '@type': 'City', name: 'Francistown' },
      { '@type': 'City', name: 'Gaborone' },
      { '@type': 'City', name: 'Maun' },
      { '@type': 'City', name: 'Kasane' },
      { '@type': 'City', name: 'Palapye' },
      { '@type': 'City', name: 'Mahalapye' },
      { '@type': 'Country', name: 'Botswana' },
    ],
    hasMerchantReturnPolicy: {
      '@type': 'MerchantReturnPolicy',
      applicableCountry: 'BW',
      returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
      merchantReturnDays: 2,
      returnMethod: 'https://schema.org/ReturnInStore',
      returnFees: 'https://schema.org/FreeReturn',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+26771550200',
      contactType: 'customer service',
      areaServed: 'BW',
      availableLanguage: ['en', 'tn'],
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'NeoSales catalog',
      itemListElement: offerCatalog,
    },
  };
}

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        // The payload is generated from typed local data, not user input.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildStoreSchema()) }}
      />
      <StorefrontHome />
    </>
  );
}
