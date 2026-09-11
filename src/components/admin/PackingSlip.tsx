'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Printer } from 'lucide-react';
import { Order } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { DELIVERY_OPTIONS_BY_ID, PAYMENT_OPTIONS_BY_ID, SELLER_CONFIG } from '@/lib/constants';
import { formatBWP, formatDateTime } from '@/lib/format';

const TITLE_ID = 'packing-slip-title';

interface PackingSlipProps {
  order: Order | null;
  onClose: () => void;
}

/**
 * Printable A5 packing slip / waybill.
 *
 * The slip itself is a separate DOM subtree (`#packing-slip`) so the print
 * stylesheet can hide the entire application and print only the slip, in black
 * on white for a thermal or office printer.
 */
export function PackingSlip({ order, onClose }: PackingSlipProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => setIsMounted(true), []);

  if (!isMounted || !order) return null;

  const delivery = DELIVERY_OPTIONS_BY_ID[order.customer.deliveryPreference];
  const payment = PAYMENT_OPTIONS_BY_ID[order.paymentMethod];
  const units = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const isPickup = order.customer.deliveryPreference === 'francistown_pickup';

  const slip = (
    <div id="packing-slip" className="packing-slip">
      <header className="packing-slip__header">
        <div>
          <p className="packing-slip__brand">
            NeoSales<span className="packing-slip__dot">.</span>
          </p>
          <p className="packing-slip__muted">Francistown, Botswana · {SELLER_CONFIG.sellerWhatsApp}</p>
        </div>
        <div className="packing-slip__meta">
          <p className="packing-slip__label">{isPickup ? 'Collection slip' : 'Packing slip / waybill'}</p>
          <p className="packing-slip__order">{order.orderNumber}</p>
          <p className="packing-slip__muted">{formatDateTime(order.createdAt)}</p>
        </div>
      </header>

      <section className="packing-slip__grid">
        <div>
          <p className="packing-slip__label">Deliver to / collect by</p>
          <p className="packing-slip__strong">{order.customer.name}</p>
          <p>{order.customer.phone}</p>
          <p>
            {order.customer.town}
            {order.customer.address ? ` · ${order.customer.address}` : ''}
          </p>
        </div>
        <div>
          <p className="packing-slip__label">Fulfilment</p>
          <p className="packing-slip__strong">{delivery?.label ?? order.customer.deliveryPreference}</p>
          {order.pickupSlot ? (
            <p>
              {order.pickupSlot.date} · {order.pickupSlot.window} · {order.pickupSlot.point}
            </p>
          ) : (
            <p>{isPickup ? 'Pickup window to be confirmed' : 'Courier collection from Francistown'}</p>
          )}
          <p>
            Channel: {order.channel === 'walk_in' ? 'In person' : order.channel === 'whatsapp' ? 'WhatsApp / DM' : 'Website'}
          </p>
        </div>
      </section>

      <table className="packing-slip__table">
        <thead>
          <tr>
            <th scope="col" className="packing-slip__qty">Qty</th>
            <th scope="col">Item</th>
            <th scope="col" className="packing-slip__sku">SKU / option</th>
            <th scope="col" className="packing-slip__amount">Line</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id}>
              <td className="packing-slip__qty">{item.quantity}</td>
              <td>{item.productTitle}</td>
              <td className="packing-slip__sku">{item.variantLabel}</td>
              <td className="packing-slip__amount">{formatBWP(item.lineTotalBWP)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="packing-slip__totals">
        <p>
          <span>Units</span>
          <span>{units}</span>
        </p>
        <p>
          <span>Subtotal</span>
          <span>{formatBWP(order.subtotalBWP)}</span>
        </p>
        {(order.discountBWP ?? 0) > 0 && (
          <p>
            <span>Discount{order.promoCode ? ` (${order.promoCode})` : ''}</span>
            <span>-{formatBWP(order.discountBWP ?? 0)}</span>
          </p>
        )}
        <p>
          <span>Delivery</span>
          <span>{order.deliveryFeeBWP > 0 ? formatBWP(order.deliveryFeeBWP) : 'FREE'}</span>
        </p>
        <p className="packing-slip__total">
          <span>Total</span>
          <span>{formatBWP(order.totalAmountBWP)}</span>
        </p>
      </section>

      <section className="packing-slip__grid">
        <div>
          <p className="packing-slip__label">Payment</p>
          <p className="packing-slip__strong">{payment?.label ?? order.paymentMethod}</p>
          {order.paymentReference ? (
            <p>Transaction ID: {order.paymentReference}</p>
          ) : (
            <p>Transaction ID: ______________________</p>
          )}
          <p>Reference used: {order.orderNumber}</p>
        </div>
        <div>
          <p className="packing-slip__label">Courier / handover</p>
          <p>Waybill no: ______________________</p>
          <p>Handed over: ______________________</p>
          <p>Received by: ______________________</p>
        </div>
      </section>

      <footer className="packing-slip__footer">
        <p>
          {isPickup
            ? 'Please bring this slip (or quote the order number) when collecting. Cash on pickup is paid at handover.'
            : 'Sprint Couriers / PostNet · quote the order number on any query.'}
        </p>
        <p className="packing-slip__muted">
          Ke a leboga for shopping local with {SELLER_CONFIG.storeName} 🇧🇼 · Keep this slip for the 48-hour exchange
          guarantee.
        </p>
      </footer>
    </div>
  );

  return (
    <>
      <Modal isOpen={Boolean(order)} onClose={onClose} labelledBy={TITLE_ID} maxWidth="md">
        <div className="flex max-h-[90vh] flex-col">
          <header className="flex items-start justify-between gap-3 border-b border-white/10 bg-[#0a0c13]/90 px-5 py-4">
            <div>
              <h2 id={TITLE_ID} className="pr-10 text-base font-extrabold text-white">
                Packing slip · {order.orderNumber}
              </h2>
              <p className="mt-0.5 text-xs text-neutral-400">
                {units} unit{units === 1 ? '' : 's'} · {formatBWP(order.totalAmountBWP)} ·{' '}
                {isPickup ? 'pickup' : 'courier'}
              </p>
            </div>
          </header>

          <div className="overflow-y-auto bg-white/[0.03] p-4">
            <div className="slip-preview rounded-2xl bg-white p-4 text-neutral-900 shadow-elevated">{slip}</div>
          </div>

          <footer className="flex flex-col gap-2 border-t border-white/10 bg-[#0a0c13]/95 px-5 py-4 sm:flex-row">
            <Button variant="secondary" size="lg" onClick={onClose}>
              Close
            </Button>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => window.print()}
              leftIcon={<Printer size={16} />}
            >
              Print slip
            </Button>
            <p className="flex items-center gap-1.5 text-2xs text-neutral-400 sm:hidden">
              <CheckCircle2 size={12} className="text-emerald-400" aria-hidden="true" />
              Only the slip is sent to the printer.
            </p>
          </footer>
        </div>
      </Modal>

      {/* Slip rendered outside the modal so print CSS can target it directly. */}
      {createPortal(<div className="packing-slip-portal">{slip}</div>, document.body)}
    </>
  );
}
