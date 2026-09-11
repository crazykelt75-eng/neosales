'use client';

import React from 'react';
import Link from 'next/link';
import {
  MapPin,
  ShieldCheck,
  Truck,
  Smartphone,
  CreditCard,
  Sparkles,
  MessageCircle,
  ExternalLink,
  Store,
} from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { formatBotswanaPhone } from '@/lib/whatsapp';

export function Footer() {
  const { sellerConfig } = useStore();
  const whatsappNumber = formatBotswanaPhone(sellerConfig.sellerWhatsApp);

  return (
    <footer className="mt-16 bg-[#040507] text-neutral-300 border-t border-white/10 transition-all">
      {/* Value Pillars Banner */}
      <div className="border-b border-white/10 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Pillar 1: Francistown & Tati Siding */}
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-orangeMoney/15 border border-orangeMoney/30 flex items-center justify-center text-orangeMoney flex-shrink-0 shadow-xs">
              <MapPin size={20} aria-hidden="true" />
            </div>
            <div>
              <h4 className="font-extrabold text-white text-sm">Francistown & Tati Siding</h4>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                Free local pickup from Galo Mall, Nswazii Mall, or Tati Siding Central.
              </p>
            </div>
          </div>

          {/* Pillar 2: Nationwide Delivery */}
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 flex-shrink-0 shadow-xs">
              <Truck size={20} aria-hidden="true" />
            </div>
            <div>
              <h4 className="font-extrabold text-white text-sm">Nationwide Dispatch</h4>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                Sprint Couriers to Gaborone, Maun, Palapye, Kasane, and all Botswana villages.
              </p>
            </div>
          </div>

          {/* Pillar 3: Orange Money & FNB Pay2Cell */}
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0 shadow-xs">
              <Smartphone size={20} aria-hidden="true" />
            </div>
            <div>
              <h4 className="font-extrabold text-white text-sm">Instant Mobile Money</h4>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                Pay directly via Orange Money (USSD *145#) or FNB Pay2Cell with zero transaction stress.
              </p>
            </div>
          </div>

          {/* Pillar 4: Authentic Quality */}
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0 shadow-xs">
              <Sparkles size={20} aria-hidden="true" />
            </div>
            <div>
              <h4 className="font-extrabold text-white text-sm">Curated Authenticity</h4>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                High-concentration Extrait perfume oils & breathable premium summer linen wear.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links & Information */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12">
          {/* Brand Col */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-orangeMoney text-neutral-950 font-black text-sm flex items-center justify-center shadow-card">
                NS
              </div>
              <span className="font-black text-2xl tracking-tight text-white">
                NEO<span className="text-orangeMoney">SALES</span>
              </span>
            </div>

            <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed max-w-sm">
              Botswana&apos;s premier boutique for authentic niche extrait fragrances and curated summer linen apparel. Rooted in Francistown & Tati Siding, delivering luxury nationwide.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-2">
              <a
                href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent('Dumelang NeoSales! I have an inquiry about your in-stock pieces.')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-whatsapp hover:bg-whatsapp-dark text-white font-bold text-xs shadow-soft transition-all focus-visible:outline-2 focus-visible:outline-whatsapp"
                aria-label="Chat directly with NeoSales on WhatsApp"
              >
                <MessageCircle size={16} aria-hidden="true" />
                <span>Chat on WhatsApp</span>
              </a>

              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-neutral-300 hover:text-white border border-white/10 font-semibold text-xs transition-all focus-visible:outline-2 focus-visible:outline-orangeMoney"
              >
                <Store size={14} aria-hidden="true" />
                <span>Seller Operations</span>
              </Link>
            </div>
          </div>

          {/* Quick Collection Points */}
          <div className="md:col-span-4 space-y-3">
            <h5 className="font-black text-xs uppercase tracking-widest text-white">
              Fulfillment & Pickup Points
            </h5>
            <ul className="text-xs text-neutral-400 space-y-2.5 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-orangeMoney font-bold">•</span>
                <span>
                  <strong className="text-neutral-200">Francistown Collection:</strong> Nswazii Mall & Galo Shopping Centre (Arranged same-day)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orangeMoney font-bold">•</span>
                <span>
                  <strong className="text-neutral-200">Tati Siding Collection:</strong> Tati Siding Central & Shell Station pickup point
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-sky-400 font-bold">•</span>
                <span>
                  <strong className="text-neutral-200">Sprint Courier Services:</strong> Doorstep or counter delivery across Gaborone, Maun, Palapye, and nationwide
                </span>
              </li>
            </ul>
          </div>

          {/* Verified Payment Channels */}
          <div className="md:col-span-3 space-y-3">
            <h5 className="font-black text-xs uppercase tracking-widest text-white">
              Official Payment Rails
            </h5>
            <div className="space-y-2 text-xs">
              <div className="p-3 bg-white/[0.03] border border-white/10 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-orange-400">
                  <Smartphone size={13} aria-hidden="true" />
                  <span>Orange Money</span>
                </div>
                <p className="font-mono text-neutral-200 font-semibold">{sellerConfig.orangeMoneyNumber}</p>
                <p className="text-[10px] text-neutral-500">Dial *145# • Zero-delay verification</p>
              </div>

              <div className="p-3 bg-white/[0.03] border border-white/10 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-cyan-400">
                  <CreditCard size={13} aria-hidden="true" />
                  <span>FNB Pay2Cell</span>
                </div>
                <p className="font-mono text-neutral-200 font-semibold">{sellerConfig.fnbPay2CellNumber}</p>
                <p className="text-[10px] text-neutral-500">{sellerConfig.fnbAccountName}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <p>
            &copy; {new Date().getFullYear()} <strong className="text-neutral-300">NeoSales</strong>. Handcrafted for Botswana Local Commerce 🇧🇼.
          </p>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Francistown & Tati Siding, North-East District</span>
            <span aria-hidden="true">•</span>
            <span>Zero DM friction</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
