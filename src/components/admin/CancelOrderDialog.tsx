'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, Undo2 } from 'lucide-react';
import { Order } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { CANCEL_REASONS } from '@/lib/constants';
import { formatBWP } from '@/lib/format';

const TITLE_ID = 'cancel-order-title';

interface CancelOrderDialogProps {
  order: Order | null;
  onClose: () => void;
  onConfirm: (orderId: string, reason: string) => void;
}

/**
 * Confirmation step for cancelling an order. Cancelling returns every reserved
 * unit to the catalog, so the seller gets one explicit warning first.
 */
export function CancelOrderDialog({ order, onClose, onConfirm }: CancelOrderDialogProps) {
  const [reason, setReason] = useState<string>(CANCEL_REASONS[0]);
  const [customReason, setCustomReason] = useState('');

  useEffect(() => {
    if (order) {
      setReason(CANCEL_REASONS[0]);
      setCustomReason('');
    }
  }, [order]);

  if (!order) return null;

  const units = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const finalReason = customReason.trim() ? customReason.trim() : reason;

  return (
    <Modal isOpen={Boolean(order)} onClose={onClose} labelledBy={TITLE_ID} maxWidth="sm">
      <div className="flex max-h-[88vh] flex-col">
        <header className="border-b border-white/10 bg-[#0a0c13]/90 px-5 py-4">
          <h2 id={TITLE_ID} className="flex items-center gap-2 pr-10 text-base font-extrabold text-white">
            <AlertTriangle size={18} className="text-amber-300" aria-hidden="true" />
            Cancel order {order.orderNumber}?
          </h2>
          <p className="mt-0.5 text-xs text-neutral-400">
            {order.customer.name} · {formatBWP(order.totalAmountBWP)}
          </p>
        </header>

        <div className="space-y-4 overflow-y-auto px-5 py-5">
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5">
            <p className="text-xs leading-relaxed text-amber-100">
              The {units} reserved unit{units === 1 ? '' : 's'} on this order will go straight back into sellable
              stock and the order will move out of the pipeline. This can be undone with{' '}
              <strong>Reopen order</strong>, which re-reserves the stock.
            </p>
          </div>

          <fieldset className="space-y-2">
            <legend className="mb-1 text-2xs font-bold uppercase tracking-[0.14em] text-neutral-400">
              Reason (kept on the order for your records)
            </legend>

            {CANCEL_REASONS.map((option) => (
              <label
                key={option}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 text-xs transition-colors ${
                  reason === option && !customReason.trim()
                    ? 'border-orangeMoney/50 bg-orangeMoney/10 text-white'
                    : 'border-white/10 bg-white/[0.03] text-neutral-200 hover:border-white/20'
                }`}
              >
                <input
                  type="radio"
                  name="cancelReason"
                  value={option}
                  checked={reason === option && !customReason.trim()}
                  onChange={() => {
                    setReason(option);
                    setCustomReason('');
                  }}
                  className="h-4 w-4 accent-orangeMoney"
                />
                {option}
              </label>
            ))}

            <div>
              <label htmlFor="cancel-custom-reason" className="mb-1.5 block text-2xs font-bold uppercase tracking-[0.14em] text-neutral-400">
                Or write your own
              </label>
              <input
                id="cancel-custom-reason"
                value={customReason}
                onChange={(event) => setCustomReason(event.target.value)}
                placeholder="e.g. Customer asked to swap for the 100ml bottle"
                className="w-full rounded-xl border border-white/12 bg-black/30 px-3.5 py-3 text-sm text-white placeholder:text-neutral-400 focus:border-orangeMoney focus:outline-none focus:ring-2 focus:ring-orangeMoney/40"
              />
            </div>
          </fieldset>

          <p className="text-2xs leading-relaxed text-neutral-400">
            If the customer already paid, refund through the same rail (Orange Money or FNB Pay2Cell) before
            cancelling here.
          </p>
        </div>

        <footer className="flex flex-col gap-2 border-t border-white/10 bg-[#0a0c13]/95 px-5 py-4 sm:flex-row">
          <Button variant="secondary" size="lg" onClick={onClose} leftIcon={<Undo2 size={16} />}>
            Keep order
          </Button>
          <Button
            variant="danger"
            size="lg"
            fullWidth
            onClick={() => {
              onConfirm(order.id, finalReason);
              onClose();
            }}
          >
            Cancel &amp; return stock
          </Button>
        </footer>
      </div>
    </Modal>
  );
}
