import type { Metadata, Viewport } from 'next';
import './globals.css';
import { StoreProvider } from '@/context/StoreContext';
import { ToastProvider } from '@/components/ui/Toast';
import { FontLoader } from '@/components/ui/FontLoader';
import { SITE_URL } from '@/lib/constants';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'NeoSales | Authentic Perfumes, Summer Apparel & Accessories Botswana',
    template: '%s | NeoSales Botswana',
  },
  description:
    'Shop authentic extrait perfumes, linen summer apparel and accessories in Botswana. Free Francistown pickups, nationwide Sprint Couriers, and instant checkout with Orange Money, FNB Pay2Cell or cash on pickup.',
  applicationName: 'NeoSales',
  keywords: [
    'Botswana perfumes',
    'Francistown fashion',
    'Orange Money online shopping',
    'FNB Pay2Cell shop Botswana',
    'buy perfume Francistown',
    'niche extrait perfume Botswana',
    'linen shirts Botswana',
    'Gaborone online boutique',
    'Nswazwi Mall pickup',
    'nationwide courier Botswana',
  ],
  authors: [{ name: 'NeoSales Botswana' }],
  creator: 'NeoSales',
  publisher: 'NeoSales Botswana',
  category: 'shopping',
  formatDetection: { email: false, address: false, telephone: false },
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'en_BW',
    url: SITE_URL,
    siteName: 'NeoSales Botswana',
    title: 'NeoSales | Authentic Extrait Perfumes & Summer Apparel in Botswana',
    description:
      'Curated extrait fragrances and breathable summer wear delivered nationwide. Pay with Orange Money or FNB Pay2Cell and confirm your order on WhatsApp in one tap.',
    images: [
      {
        url: '/products/rouge-1.jpg',
        width: 600,
        height: 900,
        alt: 'NeoSales Rouge Seduction extrait de parfum with red blooms',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NeoSales | Extrait Perfumes & Summer Apparel Botswana',
    description:
      'Free Francistown pickups and nationwide courier delivery. Orange Money & FNB Pay2Cell accepted.',
    images: ['/products/rouge-1.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#07080c',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-BW" className="scroll-smooth">
      <head>
        {/* Local catalog imagery is served from the same origin; remote CDNs are pre-warmed. */}
        <link rel="preconnect" href="https://images.unsplash.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        {/* The webfont stylesheet itself is injected after hydration by <FontLoader />. */}
      </head>

      <body className="min-h-screen bg-midnight font-sans text-white antialiased selection:bg-orangeMoney/30 selection:text-orangeMoney-light">
        <FontLoader />
        <ToastProvider>
          <StoreProvider>{children}</StoreProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
