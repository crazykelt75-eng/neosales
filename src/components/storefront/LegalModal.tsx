'use client';

import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, FileText, RefreshCw, Lock, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export type LegalTab = 'privacy' | 'terms' | 'exchanges';

interface Props {
  isOpen: boolean;
  initialTab?: LegalTab;
  onClose: () => void;
}

export function LegalModal({ isOpen, initialTab = 'privacy', onClose }: Props) {
  const [activeTab, setActiveTab] = useState<LegalTab>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn"
    >
      <div className="fixed inset-0 cursor-pointer" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full max-w-2xl bg-[#0e1118] text-white rounded-3xl border border-white/10 shadow-[0_25px_70px_rgba(0,0,0,0.9)] overflow-hidden z-10 max-h-[90vh] flex flex-col animate-scaleIn">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between bg-[#0a0c13]/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orangeMoney/20 border border-orangeMoney/30 text-orangeMoney flex items-center justify-center shadow-xs">
              <ShieldCheck size={18} aria-hidden="true" />
            </div>
            <div>
              <h2 id="legal-modal-title" className="text-base sm:text-lg font-black text-white tracking-tight">
                Trust, Privacy & Store Policies
              </h2>
              <p className="text-xs text-neutral-400">Botswana Local Commerce Standards 🇧🇼</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] rounded-full hover:bg-white/10 text-neutral-400 hover:text-white flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-orangeMoney"
            aria-label="Close legal terms dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 bg-white/[0.02] px-4 overflow-x-auto" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'privacy'}
            onClick={() => setActiveTab('privacy')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'privacy'
                ? 'border-orangeMoney text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Lock size={14} />
            <span>Privacy Policy (DPA)</span>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'exchanges'}
            onClick={() => setActiveTab('exchanges')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'exchanges'
                ? 'border-orangeMoney text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <RefreshCw size={14} />
            <span>Sizing & Exchanges</span>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'terms'}
            onClick={() => setActiveTab('terms')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'terms'
                ? 'border-orangeMoney text-white'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <FileText size={14} />
            <span>Terms of Service</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-neutral-300 leading-relaxed">
          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <h3 className="text-base font-extrabold text-white">
                Customer Privacy & Botswana Data Protection
              </h3>
              <p>
                NeoSales respects your privacy and complies with the principles of the Botswana Data Protection Act (DPA). We operate a zero-friction store without requiring you to register a permanent account or password.
              </p>
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 space-y-2">
                <h4 className="font-bold text-white text-xs uppercase tracking-wider">What We Collect:</h4>
                <ul className="list-disc list-inside space-y-1 text-neutral-300 text-xs">
                  <li><strong>Full Name & Phone Number:</strong> Used solely to contact you on WhatsApp and verify payment confirmation.</li>
                  <li><strong>Town & Delivery Address:</strong> Used strictly for Sprint Courier delivery or local pickup coordination at Galo Mall, Nswazii Mall, or Tati Siding.</li>
                  <li><strong>Order Items:</strong> Used to assemble and reserve your inventory.</li>
                </ul>
              </div>
              <p>
                We do not sell, rent, or distribute your telephone number or personal information to any third-party advertisers. Payment slips uploaded or sent via WhatsApp are accessible exclusively by NeoSales authorized fulfillment staff.
              </p>
            </div>
          )}

          {activeTab === 'exchanges' && (
            <div className="space-y-4">
              <h3 className="text-base font-extrabold text-white">
                Sizing Guarantee & 48-Hour Exchange Policy
              </h3>
              <p>
                We understand that buying apparel online requires confidence in size and fit. NeoSales provides a customer-first exchange guarantee for all apparel pieces (linen shirts and palazzo trousers).
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 space-y-1.5">
                  <h4 className="font-bold text-orangeMoney text-xs">Francistown & Tati Siding</h4>
                  <p className="text-xs text-neutral-300">
                    Free size exchange within 48 hours of collection at Galo Mall or Nswazii Mall. Bring the garment unworn with tags attached.
                  </p>
                </div>
                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 space-y-1.5">
                  <h4 className="font-bold text-sky-400 text-xs">Nationwide Courier Orders</h4>
                  <p className="text-xs text-neutral-300">
                    If an item does not fit, contact us on WhatsApp within 48 hours. Return shipping via Sprint Couriers is arranged smoothly.
                  </p>
                </div>
              </div>
              <p className="text-xs text-neutral-400 italic">
                *Note: Extrait perfume oils cannot be returned once the bottle seal has been opened, due to health and cosmetic hygiene regulations.
              </p>
            </div>
          )}

          {activeTab === 'terms' && (
            <div className="space-y-4">
              <h3 className="text-base font-extrabold text-white">Terms of Sale & Fulfillment</h3>
              <p>
                By placing an order on NeoSales, you agree to the following terms:
              </p>
              <ul className="space-y-2 text-xs">
                <li className="flex items-start gap-2">
                  <span className="text-orangeMoney font-bold">1.</span>
                  <span><strong>Payment Verification:</strong> Orders are placed in a pending verification queue and fulfilled upon confirmation of Orange Money or FNB Pay2Cell transfer matching your order reference number (ORD-XXXX).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orangeMoney font-bold">2.</span>
                  <span><strong>Collection Deadlines:</strong> Local pickup orders at Francistown or Tati Siding are held for up to 5 business days after notification.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orangeMoney font-bold">3.</span>
                  <span><strong>Courier Dispatch:</strong> Sprint Courier nationwide dispatches depart Mondays through Fridays, with typical transit times of 24–48 hours across Botswana.</span>
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-[#0a0c13] flex justify-end">
          <Button variant="primary" size="md" onClick={onClose}>
            Understood & Close
          </Button>
        </div>
      </div>
    </div>
  );
}
