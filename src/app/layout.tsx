import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { StoreProvider } from '@/context/StoreContext';
import { ToastProvider } from '@/components/ui/Toast';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://neosales-bw.vercel.app'),
  title: {
    default: 'NeoSales | Curated Fashion & Niche Perfumes Botswana',
    template: '%s | NeoSales',
  },
  description:
    'Shop authentic niche extrait perfumes, luxury summer linen shirts, and curated fashion in Botswana from NeoSales. Direct Orange Money & FNB Pay2Cell payment with zero-delay WhatsApp order confirmation.',
  keywords: [
    'NeoSales Botswana',
    'Botswana perfumes',
    'Francistown perfumes',
    'Tati Siding shopping',
    'Niche fragrances Francistown & Gaborone',
    'Linen shirts Botswana',
    'Orange Money shopping Botswana',
    'FNB Pay2Cell shopping Francistown',
    'Botswana online boutique',
    'Francistown fashion delivery',
  ],
  authors: [{ name: 'NeoSales Team' }],
  creator: 'NeoSales',
  publisher: 'NeoSales Botswana',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_BW',
    url: 'https://neosales-bw.vercel.app',
    siteName: 'NeoSales',
    title: 'NeoSales | Curated Fashion & Niche Perfumes Botswana',
    description:
      'Zero-friction Botswana e-commerce by NeoSales with Orange Money & FNB Pay2Cell support. 1-tap WhatsApp checkout and nationwide delivery.',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=1200&auto=format&fit=crop&q=85',
        width: 1200,
        height: 630,
        alt: 'NeoSales Niche Perfumes & Apparel Collection',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NeoSales | Curated Fashion & Niche Perfumes Botswana',
    description:
      'Shop premium perfumes and linen shirts in Botswana with instant Orange Money & FNB Pay2Cell checkout.',
    images: [
      'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=1200&auto=format&fit=crop&q=85',
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f172a',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body className="antialiased min-h-screen flex flex-col bg-neutral-50 text-neutral-900 font-sans selection:bg-orangeMoney/20 selection:text-orangeMoney-dark">
        <ToastProvider>
          <StoreProvider>
            {children}
          </StoreProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
