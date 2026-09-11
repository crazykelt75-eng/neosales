'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  BadgeCheck,
  Lock,
  MapPin,
  MessageCircle,
  RefreshCw,
  ScrollText,
  ShieldCheck,
  Smartphone,
  Truck,
} from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { DELIVERY_OPTIONS, PAYMENT_OPTIONS, SELLER_CONFIG } from '@/lib/constants';
import { formatBWP } from '@/lib/format';
import { buildSupportLink } from '@/lib/whatsapp';
import { Badge } from '@/components/ui/Badge';
import { LegalModal, LegalTab } from '@/components/storefront/LegalModal';

/**
 * Storefront footer that also serves as the `#delivery-info` anchor: delivery
 * tiers, pickup points and the official payment rails all live here so the
 * header link has a real destination.
 */
export function Footer() {
  const { isCloudSync } = useStore();
  const [legalTab, setLegalTab] = useState<LegalTab | null>(null);

  return (
    <footer className="mt-16 border-t border-white/10 bg-[#05060a]">
      {/* Delivery & payment information */}
      <section id="delivery-info" aria-labelledby="delivery-info-heading" className="scroll-mt-28 border-b border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
          <div className="mb-6 max-w-2xl">
            <h2 id="delivery-info-heading" className="text-lg font-extrabold tracking-tight text-white sm:text-xl">
              Delivery, pickup &amp; payment
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-neutral-300 sm:text-sm">
              Choose the rail that suits you at checkout. Free collection around Francistown, or countrywide dispatch
              from P80.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {/* Delivery rails */}
            <div className="rounded-3xl border border-white/10 bg-surface/70 p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                <Truck size={16} className="text-orangeMoney" aria-hidden="true" />
                Delivery options
              </h3>

              <ul className="mt-3.5 space-y-3">
                {DELIVERY_OPTIONS.map((option) => (
                  <li key={option.id} className="border-b border-white/[0.07] pb-3 last:border-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-xs font-bold text-neutral-100">{option.label}</span>
                      <span
                        className={`flex-shrink-0 font-mono text-2xs font-bold ${
                          option.feeBWP === 0 ? 'text-emerald-300' : 'text-amber-200'
                        }`}
                        data-price
                      >
                        {option.feeBWP === 0 ? 'FREE' : formatBWP(option.feeBWP)}
                      </span>
                    </div>
                    <p className="mt-1 text-2xs leading-relaxed text-neutral-400">{option.description}</p>
                  </li>
                ))}
              </ul>
            </div>

            {/* Pickup points */}
            <div className="rounded-3xl border border-white/10 bg-surface/70 p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                <MapPin size={16} className="text-amber-300" aria-hidden="true" />
                Francistown pickup points
              </h3>

              <ul className="mt-3.5 space-y-2">
                {SELLER_CONFIG.pickupPoints.map((point) => (
                  <li key={point} className="flex items-center gap-2 text-xs text-neutral-200">
                    <BadgeCheck size={14} className="text-emerald-400" aria-hidden="true" />
                    {point}
                  </li>
                ))}
              </ul>

              <p className="mt-3.5 text-2xs leading-relaxed text-neutral-400">
                We confirm your exact point and a one-hour collection window on WhatsApp as soon as your order is packed.
                Cash on pickup is available for these points only.
              </p>
            </div>

            {/* Payment rails */}
            <div className="rounded-3xl border border-white/10 bg-surface/70 p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                <Smartphone size={16} className="text-emerald-300" aria-hidden="true" />
                Payment rails
              </h3>

              <ul className="mt-3.5 space-y-3">
                {PAYMENT_OPTIONS.map((option) => (
                  <li key={option.id} className="rounded-2xl border border-white/10 bg-black/30 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-neutral-100">{option.label}</span>
                      {option.pickupOnly && (
                        <Badge variant="amber" icon={null} className="text-[10px]">
                          Pickup only
                        </Badge>
                      )}
                    </div>
                    {option.recipientNumber && (
                      <p className="mt-1 font-mono text-xs font-bold text-white" data-price>
                        {option.recipientNumber}
                        <span className="ml-1.5 font-sans text-2xs font-medium text-neutral-400">
                          {option.recipientName}
                        </span>
                      </p>
                    )}
                    <p className="mt-1 text-2xs leading-relaxed text-neutral-400">{option.description}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* WhatsApp CTA */}
          <div className="mt-6 flex flex-col items-start justify-between gap-4 rounded-3xl border border-whatsapp/25 bg-whatsapp/[0.07] p-5 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-whatsapp/40 bg-whatsapp/15 text-whatsapp">
                <MessageCircle size={19} aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-bold text-white">Questions before you order?</p>
                <p className="mt-0.5 text-xs leading-relaxed text-neutral-300">
                  Message us on WhatsApp for sizing advice, fragrance recommendations or courier quotes.
                </p>
              </div>
            </div>

            <a
              href={buildSupportLink('I have a question before ordering.')}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] flex-shrink-0 items-center gap-2 rounded-xl bg-whatsapp px-4 text-sm font-bold text-neutral-950 transition-colors hover:bg-whatsapp-dark hover:text-white focus-visible:outline-2 focus-visible:outline-whatsapp"
            >
              <MessageCircle size={16} aria-hidden="true" />
              Chat with us
            </a>
          </div>
        </div>
      </section>

      {/* Brand + legal */}
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr_1fr]">
          <div className="space-y-3">
            <p className="text-xl font-extrabold tracking-tight text-white">
              NeoSales
              <span aria-hidden="true" className="ml-0.5 inline-block h-2 w-2 rounded-full bg-orangeMoney align-super" />
            </p>
            <p className="max-w-sm text-xs leading-relaxed text-neutral-400">
              Authentic luxury extrait perfumes and curated summer apparel, shipped from Francistown to every town in
              Botswana. Pay with Orange Money, FNB Pay2Cell or cash on pickup.
            </p>
            <p className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-emerald-300">
              <ShieldCheck size={13} aria-hidden="true" />
              {isCloudSync ? 'Live catalog sync active' : 'Offline-ready local catalog'}
            </p>
          </div>

          <nav aria-label="Shop" className="space-y-2.5">
            <h3 className="text-2xs font-bold uppercase tracking-[0.16em] text-neutral-400">Shop</h3>
            <a href="#catalog" className="block text-xs text-neutral-200 transition-colors hover:text-orangeMoney">
              Shop collection
            </a>
            <a
              href="#delivery-info"
              className="block text-xs text-neutral-200 transition-colors hover:text-orangeMoney"
            >
              Delivery &amp; pickup
            </a>
            <a
              href={buildSupportLink('I would like a fragrance recommendation.')}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-xs text-neutral-200 transition-colors hover:text-orangeMoney"
            >
              Fragrance advice
            </a>
            <Link href="/admin" className="block text-xs text-neutral-400 transition-colors hover:text-orangeMoney">
              Seller dashboard
            </Link>
          </nav>

          <div className="space-y-2.5">
            <h3 className="text-2xs font-bold uppercase tracking-[0.16em] text-neutral-400">Policies</h3>
            <button
              type="button"
              onClick={() => setLegalTab('privacy')}
              className="flex items-center gap-2 text-xs text-neutral-200 transition-colors hover:text-orangeMoney"
            >
              <Lock size={13} aria-hidden="true" />
              Privacy policy
            </button>
            <button
              type="button"
              onClick={() => setLegalTab('terms')}
              className="flex items-center gap-2 text-xs text-neutral-200 transition-colors hover:text-orangeMoney"
            >
              <ScrollText size={13} aria-hidden="true" />
              Terms of sale
            </button>
            <button
              type="button"
              onClick={() => setLegalTab('returns')}
              className="flex items-center gap-2 text-xs text-neutral-200 transition-colors hover:text-orangeMoney"
            >
              <RefreshCw size={13} aria-hidden="true" />
              Returns &amp; exchanges
            </button>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-start justify-between gap-2 border-t border-white/10 pt-5 text-2xs text-neutral-400 sm:flex-row sm:items-center">
          <p>
            © {new Date().getFullYear()} {SELLER_CONFIG.storeName}. All prices in Botswana Pula (BWP).
          </p>
          <p>Francistown · Gaborone · Nationwide delivery 🇧🇼</p>
        </div>
      </div>

      <LegalModal isOpen={legalTab !== null} initialTab={legalTab ?? 'privacy'} onClose={() => setLegalTab(null)} />
    </footer>
  );
}
