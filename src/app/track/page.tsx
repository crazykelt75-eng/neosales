import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Headphones, ShieldCheck, Truck } from 'lucide-react';
import { OrderTracker } from '@/components/storefront/OrderTracker';
import { Footer } from '@/components/storefront/Footer';

export const metadata: Metadata = {
  title: 'Track your order',
  description:
    'Track your NeoSales order in Botswana with your order number — see whether your payment is verified, your parcel is packed, dispatched or ready for collection in Francistown.',
  alternates: { canonical: '/track' },
  robots: { index: true, follow: true },
};

export default function TrackOrderPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#07080c]/85 backdrop-blur-xl">
        <nav aria-label="Track order navigation" className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl text-sm font-bold text-neutral-200 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-orangeMoney"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Back to shop
          </Link>

          <span className="text-lg font-extrabold tracking-tight text-white">
            NeoSales
            <span aria-hidden="true" className="ml-0.5 inline-block h-2 w-2 rounded-full bg-orangeMoney align-super" />
          </span>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <h1 className="sr-only">Track your NeoSales order in Botswana</h1>

        {/* Trust strip reiterating fulfilment expectations */}
        <ul className="mb-6 grid gap-2 sm:grid-cols-3">
          {[
            { icon: <ShieldCheck size={15} aria-hidden="true" />, label: 'Verified payments only' },
            { icon: <Truck size={15} aria-hidden="true" />, label: 'Same-day dispatch before 15:00' },
            { icon: <Headphones size={15} aria-hidden="true" />, label: 'WhatsApp support 7 days' },
          ].map((item) => (
            <li
              key={item.label}
              className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-surface/70 px-3.5 py-3"
            >
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300">
                {item.icon}
              </span>
              <span className="text-xs font-semibold text-neutral-200">{item.label}</span>
            </li>
          ))}
        </ul>

        <OrderTracker />
      </main>

      <Footer />
    </div>
  );
}
