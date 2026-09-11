'use client';

import React, { useState } from 'react';
import {
  Copy,
  CheckCircle,
  Smartphone,
  CreditCard,
  ExternalLink,
  Upload,
  Check,
  Info,
  ShieldCheck,
} from 'lucide-react';
import { Order } from '@/types';
import { useStore } from '@/context/StoreContext';
import { useToast } from '@/components/ui/Toast';
import { generateWhatsAppOrderLink } from '@/lib/whatsapp';
import { Button } from '@/components/ui/Button';

interface Props {
  order: Order;
  onDone: () => void;
}

export function PaymentInstructions({ order, onDone }: Props) {
  const { sellerConfig, updateOrderStatus } = useStore();
  const { showToast } = useToast();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(order.paymentProofUrl || null);
  const [isUploading, setIsUploading] = useState(false);

  const copyToClipboard = (text: string, key: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast({
      type: 'info',
      title: 'Copied to Clipboard',
      description: `${label}: ${text} has been copied.`,
    });
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      setProofPreview(dataUrl);
      setIsUploading(false);
      updateOrderStatus(order.id, 'pending_verification', 'Customer attached transfer screenshot.');
      showToast({
        type: 'success',
        title: 'Proof Uploaded',
        description: 'Your payment slip preview has been attached to this order.',
      });
    };
    reader.readAsDataURL(file);
  };

  const whatsappUrl = generateWhatsAppOrderLink(
    {
      ...order,
      paymentProofUrl: proofPreview || undefined,
    },
    sellerConfig.sellerWhatsApp
  );

  return (
    <div className="space-y-4 text-left">
      {/* Reference Alert Banner */}
      <div className="bg-amber-500/15 border border-amber-500/30 rounded-2xl p-4 text-center shadow-xs">
        <span className="text-[10px] font-black text-amber-300 uppercase tracking-widest block">
          Unique Payment Reference Code
        </span>
        <div className="flex items-center justify-center gap-2 mt-1">
          <span className="text-2xl sm:text-3xl font-black text-white tracking-tight font-mono">
            {order.orderNumber}
          </span>
          <button
            onClick={() => copyToClipboard(order.orderNumber, 'ref', 'Order Reference')}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center p-1.5 text-amber-300 hover:text-white rounded-xl hover:bg-amber-500/20 transition-colors focus-visible:outline-2 focus-visible:outline-amber-400"
            title="Copy Reference"
            aria-label="Copy Order Reference Code"
          >
            {copiedKey === 'ref' ? (
              <CheckCircle size={20} className="text-emerald-400" />
            ) : (
              <Copy size={18} />
            )}
          </button>
        </div>
        <p className="text-xs text-amber-200/90 mt-1.5 font-medium leading-relaxed">
          Important: Use <strong className="font-extrabold text-white">{order.orderNumber}</strong> as your transaction reference so we can instantly verify your payment.
        </p>
      </div>

      {/* Payment Instruction Cards */}
      <div className="space-y-3">
        {/* Orange Money Card */}
        <div
          className={`p-4 rounded-2xl border transition-all ${
            order.paymentMethod === 'orange_money'
              ? 'border-orangeMoney bg-orangeMoney/15 shadow-glow-orange ring-1 ring-orangeMoney/40 text-white'
              : 'border-white/10 bg-white/[0.04] text-neutral-300 opacity-85'
          }`}
        >
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-orangeMoney/20 flex items-center justify-center text-orangeMoney font-bold">
                <Smartphone size={18} aria-hidden="true" />
              </div>
              <div>
                <h4 className="font-bold text-xs sm:text-sm text-white">Orange Money</h4>
                <p className="text-[10px] text-neutral-400 font-medium">Dial *145# or use Orange Money App</p>
              </div>
            </div>
            <span className="text-[10px] bg-orangeMoney/20 text-orange-200 font-bold px-2 py-0.5 rounded-md border border-orangeMoney/30">
              USSD *145#
            </span>
          </div>

          <div className="bg-[#0a0c12] border border-white/10 rounded-xl p-3 flex items-center justify-between shadow-xs">
            <div>
              <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                Recipient Cellphone
              </p>
              <p className="font-mono text-sm sm:text-base font-extrabold text-white">
                {sellerConfig.orangeMoneyNumber}
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => copyToClipboard(sellerConfig.orangeMoneyNumber, 'om', 'Orange Money Number')}
              className="min-h-[38px] bg-white/10 hover:bg-white/20 text-white border-white/10"
              aria-label="Copy Orange Money number"
              leftIcon={
                copiedKey === 'om' ? (
                  <Check size={14} className="text-emerald-400" />
                ) : (
                  <Copy size={14} />
                )
              }
            >
              {copiedKey === 'om' ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </div>

        {/* FNB Pay2Cell Card */}
        <div
          className={`p-4 rounded-2xl border transition-all ${
            order.paymentMethod === 'fnb_pay2cell'
              ? 'border-fnb bg-fnb/15 shadow-glow-fnb ring-1 ring-fnb/40 text-white'
              : 'border-white/10 bg-white/[0.04] text-neutral-300 opacity-85'
          }`}
        >
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-fnb/20 flex items-center justify-center text-fnb font-bold">
                <CreditCard size={18} aria-hidden="true" />
              </div>
              <div>
                <h4 className="font-bold text-xs sm:text-sm text-white">FNB Pay2Cell</h4>
                <p className="text-[10px] text-neutral-400 font-medium">
                  FNB Banking App or Cellphone Banking
                </p>
              </div>
            </div>
            <span className="text-[10px] bg-fnb/20 text-cyan-200 font-bold px-2 py-0.5 rounded-md border border-fnb/30">
              FNB Banking App
            </span>
          </div>

          <div className="bg-[#0a0c12] border border-white/10 rounded-xl p-3 flex items-center justify-between shadow-xs">
            <div>
              <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                Recipient Cell ({sellerConfig.fnbAccountName})
              </p>
              <p className="font-mono text-sm sm:text-base font-extrabold text-white">
                {sellerConfig.fnbPay2CellNumber}
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => copyToClipboard(sellerConfig.fnbPay2CellNumber, 'fnb', 'FNB Pay2Cell Number')}
              className="min-h-[38px] bg-white/10 hover:bg-white/20 text-white border-white/10"
              aria-label="Copy FNB Pay2Cell number"
              leftIcon={
                copiedKey === 'fnb' ? (
                  <Check size={14} className="text-emerald-400" />
                ) : (
                  <Copy size={14} />
                )
              }
            >
              {copiedKey === 'fnb' ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </div>
      </div>

      {/* Proof of Payment Screenshot Upload */}
      <div className="border border-dashed border-white/20 rounded-2xl p-4 bg-white/[0.02] text-center">
        {proofPreview ? (
          <div className="flex items-center gap-3 bg-[#0a0c12] p-2.5 rounded-xl border border-emerald-500/40 shadow-xs">
            <img
              src={proofPreview}
              alt="Payment Slip Preview"
              className="w-12 h-12 object-cover rounded-lg border border-white/10"
            />
            <div className="text-left flex-1">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle size={14} className="text-emerald-400" /> Receipt Screenshot Attached
              </span>
              <p className="text-[11px] text-neutral-400">Saved and ready to verify.</p>
            </div>
            <label
              htmlFor="proof-upload-input"
              className="text-xs text-orangeMoney hover:text-amber-300 underline cursor-pointer font-bold px-2 py-1"
            >
              Change
            </label>
          </div>
        ) : (
          <div>
            <p className="text-xs font-bold text-white mb-0.5">
              Attach Payment SMS or Bank Transfer Screenshot (Optional)
            </p>
            <p className="text-[11px] text-neutral-400 mb-3">
              Enables priority dispatch before courier cutoff.
            </p>
            <input
              type="file"
              id="proof-upload-input"
              accept="image/*"
              onChange={handleProofUpload}
              className="hidden"
            />
            <label
              htmlFor="proof-upload-input"
              className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2.5 bg-white/10 hover:bg-white/15 border border-white/15 rounded-xl text-xs font-bold text-white cursor-pointer shadow-xs active:scale-95 transition-all"
            >
              <Upload size={15} aria-hidden="true" />
              <span>{isUploading ? 'Uploading...' : 'Select Screenshot'}</span>
            </label>
          </div>
        )}
      </div>

      {/* Final WhatsApp Order Push CTA */}
      <div className="pt-2 pb-safe">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onDone}
          className="w-full flex items-center justify-center gap-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white font-black py-4 px-5 rounded-2xl text-center shadow-glow-whatsapp active:scale-[0.98] transition-all text-sm sm:text-base min-h-[48px]"
        >
          <span>Confirm Order via WhatsApp</span>
          <ExternalLink size={18} aria-hidden="true" />
        </a>
        <p className="text-[11px] text-neutral-500 text-center mt-2 leading-relaxed">
          Opens WhatsApp with your pre-formatted order receipt and itemized breakdown ready to send to our sales team.
        </p>
      </div>
    </div>
  );
}
