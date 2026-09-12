'use client';

import React, { useEffect, useState } from 'react';
import { Lock, RefreshCw, ScrollText } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { SELLER_CONFIG } from '@/lib/constants';

export type LegalTab = 'privacy' | 'terms' | 'returns';

interface LegalModalProps {
  isOpen: boolean;
  initialTab?: LegalTab;
  onClose: () => void;
}

const TAB_TITLES: Record<LegalTab, { label: string; icon: React.ReactNode }> = {
  privacy: { label: 'Privacy', icon: <Lock size={14} aria-hidden="true" /> },
  terms: { label: 'Terms of sale', icon: <ScrollText size={14} aria-hidden="true" /> },
  returns: { label: 'Returns & exchanges', icon: <RefreshCw size={14} aria-hidden="true" /> },
};

const TITLE_ID = 'legal-modal-title';

/** Botswana-flavoured store policies (Data Protection Act aligned). */
export function LegalModal({ isOpen, initialTab = 'privacy', onClose }: LegalModalProps) {
  const [activeTab, setActiveTab] = useState<LegalTab>(initialTab);

  useEffect(() => {
    if (isOpen) setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} labelledBy={TITLE_ID} maxWidth="md" closeLabel="Close policies">
      <div className="flex max-h-[88vh] flex-col">
        <header className="border-b border-white/10 bg-[#0a0c13]/90 px-5 py-4">
          <h2 id={TITLE_ID} className="pr-10 text-base font-extrabold text-white">
            Store policies
          </h2>
          <p className="mt-0.5 text-xs text-neutral-400">
            {SELLER_CONFIG.storeName} · Francistown, Botswana 🇧🇼
          </p>

          <div role="tablist" aria-label="Policy sections" className="mt-3 flex flex-wrap gap-1.5">
            {(Object.keys(TAB_TITLES) as LegalTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                aria-controls="legal-panel"
                id={`legal-tab-${tab}`}
                onClick={() => setActiveTab(tab)}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-2xs font-bold uppercase tracking-wide transition-colors ${
                  activeTab === tab
                    ? 'border-orangeMoney/50 bg-orangeMoney/15 text-white'
                    : 'border-white/10 bg-white/[0.04] text-neutral-300 hover:text-white'
                }`}
              >
                {TAB_TITLES[tab].icon}
                {TAB_TITLES[tab].label}
              </button>
            ))}
          </div>
        </header>

        <div
          id="legal-panel"
          role="tabpanel"
          aria-labelledby={`legal-tab-${activeTab}`}
          tabIndex={0}
          className="space-y-3 overflow-y-auto px-5 py-5 text-xs leading-relaxed text-neutral-300"
        >
          {activeTab === 'privacy' && (
            <>
              <p>
                We collect only what is needed to fulfil your order: your name, WhatsApp number, delivery town and
                address, and the payment reference you send us. This information is used solely to verify payment,
                package your parcel and arrange delivery or collection.
              </p>
              <p>
                Your details are stored on our own order system and are never sold, rented or shared with third parties,
                except the courier handling your delivery (name, phone and destination town).
              </p>
              <p>
                Under the Botswana Data Protection Act (2018) you may request a copy of the personal data we hold about
                you, or ask us to delete it, by messaging {SELLER_CONFIG.sellerWhatsApp} on WhatsApp. We action such
                requests within 30 days.
              </p>
              <p>We keep order records for 24 months for warranty and tax purposes, then delete them.</p>
            </>
          )}

          {activeTab === 'terms' && (
            <>
              <p>
                Prices are quoted in Botswana Pula (BWP) and include VAT where applicable. Delivery fees are shown
                separately before you confirm an order: free pickup in Francistown, P45 local courier, or P80 nationwide
                Sprint Couriers / PostNet.
              </p>
              <p>
                An order is only confirmed once payment reflects on our Orange Money or FNB Pay2Cell account, or once you
                collect and pay in cash at a Francistown pickup point. Orders are held for 48 hours awaiting payment;
                after that we may release the reserved stock.
              </p>
              <p>
                Fragrance stock is limited and sold on a first-paid, first-served basis. If an item sells out before
                verification we will contact you immediately and offer a full refund, an alternative size, or a
                comparable extrait.
              </p>
              <p>
                Dispatch happens the same working day for payments verified before 15:00. Nationwide courier delivery
                typically takes 1–3 working days from Francistown.
              </p>
            </>
          )}

          {activeTab === 'returns' && (
            <>
              <p>
                Apparel can be exchanged within 48 hours of collection or delivery, provided the item is unworn, unwashed
                and still has its original tags. Contact us on WhatsApp first so we can reserve your replacement size.
              </p>
              <p>
                For hygiene reasons, opened perfume bottles cannot be returned. If a fragrance arrives damaged, leaking or
                not as described, send us a photo within 48 hours and we will replace it or refund you in full.
              </p>
              <p>
                Exchanges outside Francistown are couriered at the customer&apos;s cost; defective items are always our
                cost. Wrong-size exchanges at a Francistown pickup point are free.
              </p>
              <p>
                Refunds are processed back through Orange Money or FNB Pay2Cell — the same rail you paid with — within 3
                working days of approval.
              </p>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
