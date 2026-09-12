'use client';

import React, { useState } from 'react';
import { Check, Copy, Smartphone, Wallet } from 'lucide-react';
import { PaymentMethod } from '@/types';
import { SELLER_CONFIG } from '@/lib/constants';
import { formatBWP } from '@/lib/format';

interface PaymentInstructionsProps {
  paymentMethod: PaymentMethod;
  /** Order reference used as the payment remark, e.g. `ORD-8421`. */
  reference: string;
  amountBWP: number;
}

/** Copy-to-clipboard field for a mobile money recipient number. */
function CopyableValue({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (insecure context) — the value stays visible to copy manually.
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-2xs font-bold uppercase tracking-[0.14em] text-neutral-400">{label}</p>
        <p className="truncate font-mono text-sm font-bold text-white">{value}</p>
      </div>

      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? `${label} copied` : `Copy ${label}`}
        className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-white/12 bg-white/[0.06] px-2.5 py-1.5 text-2xs font-bold uppercase tracking-wide text-neutral-200 transition-colors hover:bg-white/[0.14] hover:text-white focus-visible:outline-2 focus-visible:outline-orangeMoney"
      >
        {copied ? (
          <>
            <Check size={12} aria-hidden="true" /> Copied
          </>
        ) : (
          <>
            <Copy size={12} aria-hidden="true" /> Copy
          </>
        )}
      </button>
    </div>
  );
}

/**
 * Step-by-step Botswana payment instructions for the chosen rail, including the
 * exact amount and the order number to use as the payment reference.
 */
export function PaymentInstructions({ paymentMethod, reference, amountBWP }: PaymentInstructionsProps) {
  if (paymentMethod === 'cash_on_pickup') {
    return (
      <div className="space-y-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-amber-200">
          <Wallet size={16} aria-hidden="true" />
          Cash on pickup — Francistown
        </div>

        <ul className="space-y-1.5 text-xs leading-relaxed text-neutral-200">
          <li>1. We will confirm your pickup point and a collection window on WhatsApp.</li>
          <li>
            2. Bring the exact amount of <strong className="text-white">{formatBWP(amountBWP)}</strong> in Pula.
          </li>
          <li>
            3. Quote <strong className="text-white">{reference}</strong> at collection — a digital receipt is issued on
            the spot.
          </li>
        </ul>

        <p className="text-2xs leading-relaxed text-neutral-400">
          Pickup points: {SELLER_CONFIG.pickupPoints.join(' · ')}
        </p>
      </div>
    );
  }

  const isOrangeMoney = paymentMethod === 'orange_money';
  const recipient = isOrangeMoney ? SELLER_CONFIG.orangeMoneyNumber : SELLER_CONFIG.fnbPay2CellNumber;

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center gap-2 text-sm font-bold text-white">
        <Smartphone size={16} className={isOrangeMoney ? 'text-orangeMoney' : 'text-fnb'} aria-hidden="true" />
        {isOrangeMoney ? 'Orange Money transfer' : 'FNB Pay2Cell transfer'}
      </div>

      <CopyableValue label={isOrangeMoney ? 'Orange Money number' : 'Pay2Cell number'} value={recipient} />
      <CopyableValue label="Account name" value={SELLER_CONFIG.accountName} />
      <CopyableValue label="Amount to send" value={formatBWP(amountBWP, { forceDecimals: true })} />
      <CopyableValue label="Payment reference" value={reference} />

      <ol className="space-y-1.5 text-xs leading-relaxed text-neutral-300">
        {isOrangeMoney ? (
          <>
            <li>1. Dial <strong className="text-white">*145#</strong> or open the Orange Money app.</li>
            <li>2. Choose Send Money and enter {SELLER_CONFIG.orangeMoneyNumber}.</li>
            <li>
              3. Send {formatBWP(amountBWP)} and use <strong className="text-white">{reference}</strong> as the
              reference.
            </li>
            <li>4. Screenshot the confirmation SMS and send it to us on WhatsApp.</li>
          </>
        ) : (
          <>
            <li>1. Open the FNB app or dial <strong className="text-white">*130#</strong> and pick Pay2Cell.</li>
            <li>2. Send to cell number {SELLER_CONFIG.fnbPay2CellNumber}.</li>
            <li>
              3. Send {formatBWP(amountBWP)} and use <strong className="text-white">{reference}</strong> as the
              reference.
            </li>
            <li>4. Forward the confirmation SMS to us on WhatsApp for same-day verification.</li>
          </>
        )}
      </ol>
    </div>
  );
}
