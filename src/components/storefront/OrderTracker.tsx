'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  MessageCircle,
  PackageCheck,
  Search,
  Truck,
  Wallet,
  XCircle,
} from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { Order, OrderStatus } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DELIVERY_OPTIONS_BY_ID, ORDER_STATUS_META, PAYMENT_OPTIONS_BY_ID, SELLER_CONFIG } from '@/lib/constants';
import { formatBWP, formatDateTime } from '@/lib/format';
import { buildStatusUpdateLink } from '@/lib/whatsapp';
import { isSupabaseConfigured, trackCloudOrder } from '@/lib/supabaseClient';

type TrackStep = {
  status: OrderStatus | 'placed';
  label: string;
  description: string;
  icon: React.ReactNode;
};

const STEPS: TrackStep[] = [
  {
    status: 'placed',
    label: 'Order received',
    description: 'We have your order and are waiting for your payment to reflect.',
    icon: <ClipboardList size={16} aria-hidden="true" />,
  },
  {
    status: 'pending_verification',
    label: 'Checking your payment',
    description: 'We are matching your transfer reference against our account.',
    icon: <Wallet size={16} aria-hidden="true" />,
  },
  {
    status: 'payment_confirmed',
    label: 'Payment confirmed',
    description: 'Paid and packed — your parcel is being prepared.',
    icon: <CheckCircle2 size={16} aria-hidden="true" />,
  },
  {
    status: 'dispatched',
    label: 'On the way',
    description: 'Handed to the courier or ready for your collection window.',
    icon: <Truck size={16} aria-hidden="true" />,
  },
  {
    status: 'completed',
    label: 'Completed',
    description: 'Delivered or collected. Enjoy!',
    icon: <PackageCheck size={16} aria-hidden="true" />,
  },
];

/** Index of the active step for a given status. */
function getStepIndex(status: OrderStatus): number {
  switch (status) {
    case 'pending_verification':
      return 1;
    case 'payment_confirmed':
      return 2;
    case 'dispatched':
      return 3;
    case 'completed':
      return 4;
    default:
      return 0;
  }
}

/**
 * Customer self-service order lookup.
 *
 * Matches on the order reference plus the last 4 digits of the phone number, so
 * a customer never needs an account — and a stranger cannot enumerate orders
 * with just a guessable `ORD-####` reference.
 */
export function OrderTracker() {
  const { orders } = useStore();

  const [reference, setReference] = useState('');
  const [phoneTail, setPhoneTail] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<Order | null>(null);
  const [searched, setSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const referencePlaceholder = useMemo(() => 'NS-A1B2C3D4E5', []);

  const handleLookup = async (event: React.FormEvent) => {
    event.preventDefault();

    const cleanedReference = reference.trim().toUpperCase().replace(/\s/g, '');
    const cleanedTail = phoneTail.replace(/\D/g, '');

    if (!cleanedReference) {
      setError('Enter the order number from your confirmation message.');
      setResult(null);
      setSearched(true);
      return;
    }

    if (cleanedTail.length < 4) {
      setError('Enter the last 4 digits of the WhatsApp number you ordered with.');
      setResult(null);
      setSearched(true);
      return;
    }

    setIsSearching(true);
    try {
      const match = isSupabaseConfigured()
        ? await trackCloudOrder(cleanedReference, cleanedTail)
        : orders.find((order) => {
            const orderReference = order.orderNumber.toUpperCase();
            const matchesReference =
              orderReference === cleanedReference ||
              orderReference.replace('ORD-', '') === cleanedReference.replace('ORD-', '');
            return matchesReference && order.customer.phone.replace(/\D/g, '').endsWith(cleanedTail);
          }) ?? null;

      setSearched(true);
      if (!match) {
        setError(
          'We could not find an order with that number and phone. Check your confirmation message, or ask us on WhatsApp.'
        );
        setResult(null);
        return;
      }
      setError('');
      setResult(match);
    } catch {
      setSearched(true);
      setResult(null);
      setError('Order tracking is temporarily unavailable. Your order is safe—please try again or ask us on WhatsApp.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-5">
      <form
        onSubmit={handleLookup}
        className="rounded-3xl border border-white/10 bg-surface/80 p-5 shadow-card backdrop-blur sm:p-6"
      >
        <h2 className="text-base font-extrabold text-white sm:text-lg">Track your order</h2>
        <p className="mt-1 text-xs leading-relaxed text-neutral-300">
          Enter your order number and the last 4 digits of the WhatsApp number you used — no account needed.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-[1.1fr_0.9fr]">
          <div>
            <label htmlFor="track-reference" className="mb-1.5 block text-xs font-semibold text-neutral-200">
              Order number
            </label>
            <input
              id="track-reference"
              value={reference}
              onChange={(event) => {
                setReference(event.target.value);
                setError('');
              }}
              placeholder={referencePlaceholder}
              autoComplete="off"
              className="w-full rounded-xl border border-white/12 bg-black/30 px-3.5 py-3 font-mono text-sm uppercase text-white placeholder:text-neutral-400 focus:border-orangeMoney focus:outline-none focus:ring-2 focus:ring-orangeMoney/40"
            />
          </div>

          <div>
            <label htmlFor="track-phone" className="mb-1.5 block text-xs font-semibold text-neutral-200">
              Last 4 digits of your number
            </label>
            <input
              id="track-phone"
              value={phoneTail}
              onChange={(event) => {
                setPhoneTail(event.target.value.replace(/\D/g, '').slice(0, 4));
                setError('');
              }}
              inputMode="numeric"
              maxLength={4}
              placeholder="0200"
              autoComplete="off"
              className="w-full rounded-xl border border-white/12 bg-black/30 px-3.5 py-3 font-mono text-sm tracking-[0.3em] text-white placeholder:tracking-[0.3em] placeholder:text-neutral-400 focus:border-orangeMoney focus:outline-none focus:ring-2 focus:ring-orangeMoney/40"
            />
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-3 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-2xs font-semibold leading-relaxed text-red-200"
          >
            <AlertCircle size={13} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button type="submit" variant="primary" size="lg" fullWidth isLoading={isSearching} leftIcon={<Search size={16} />}>
            Find my order
          </Button>
          <a
            href={`https://wa.me/${SELLER_CONFIG.sellerWhatsApp.replace(/\D/g, '')}?text=${encodeURIComponent(
              'Dumelang NeoSales! Please help me check the status of my order.'
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-whatsapp/40 bg-whatsapp/10 px-5 text-sm font-bold text-whatsapp transition-colors hover:bg-whatsapp/20 focus-visible:outline-2 focus-visible:outline-whatsapp"
          >
            <MessageCircle size={16} aria-hidden="true" />
            Ask on WhatsApp
          </a>
        </div>
      </form>

      {searched && !result && !error && (
        <p className="text-center text-xs text-neutral-400">No order loaded yet.</p>
      )}

      {result && <OrderStatusCard order={result} />}
    </div>
  );
}

/** Status card with the five-step progress rail, totals and next actions. */
function OrderStatusCard({ order }: { order: Order }) {
  const delivery = DELIVERY_OPTIONS_BY_ID[order.customer.deliveryPreference];
  const payment = PAYMENT_OPTIONS_BY_ID[order.paymentMethod];
  const isCancelled = order.status === 'cancelled';
  const activeIndex = getStepIndex(order.status);

  return (
    <section aria-live="polite" aria-label={`Status of order ${order.orderNumber}`} className="space-y-4">
      <div className="rounded-3xl border border-white/10 bg-surface/80 p-5 shadow-card sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-lg font-black text-orangeMoney">{order.orderNumber}</p>
            <p className="mt-0.5 text-xs text-neutral-300">
              Placed {formatDateTime(order.createdAt)} · {delivery?.label ?? 'Delivery'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={isCancelled ? 'soldOut' : 'success'} icon={null}>
              {ORDER_STATUS_META[order.status].label}
            </Badge>
            <Badge variant="neutral" icon={null}>
              {payment?.label ?? order.paymentMethod}
            </Badge>
          </div>
        </div>

        {/* Cancelled short-circuit */}
        {isCancelled ? (
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
            <XCircle size={18} className="mt-0.5 flex-shrink-0 text-red-300" aria-hidden="true" />
            <div>
              <p className="text-sm font-bold text-red-100">This order was cancelled</p>
              <p className="mt-1 text-xs leading-relaxed text-neutral-200">
                {order.cancelReason ?? 'Cancelled by the seller.'} The reserved items were returned to stock.
                {order.cancelledAt && ` Cancelled ${formatDateTime(order.cancelledAt)}.`}
              </p>
              <p className="mt-2 text-2xs leading-relaxed text-neutral-300">
                If this was a mistake, message us on WhatsApp and we will reopen it.
              </p>
            </div>
          </div>
        ) : (
          <ol className="mt-5 space-y-3">
            {STEPS.map((step, index) => {
              const isDone = index < activeIndex;
              const isActive = index === activeIndex;

              return (
                <li key={step.label} className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border ${
                      isDone
                        ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                        : isActive
                        ? 'border-orangeMoney/50 bg-orangeMoney/15 text-orangeMoney'
                        : 'border-white/10 bg-white/[0.04] text-neutral-500'
                    }`}
                  >
                    {step.icon}
                  </span>

                  <div className="min-w-0 pt-0.5">
                    <p
                      className={`text-xs font-bold ${
                        isDone ? 'text-emerald-200' : isActive ? 'text-white' : 'text-neutral-400'
                      }`}
                    >
                      {step.label}
                      {isActive && (
                        <span className="ml-2 rounded-full border border-orangeMoney/40 bg-orangeMoney/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-orange-100">
                          Current
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-2xs leading-relaxed text-neutral-400">{step.description}</p>

                    {step.status === 'dispatched' && order.pickupSlot && isActive && (
                      <p className="mt-1.5 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.08] px-2.5 py-2 text-2xs font-semibold text-emerald-100">
                        Collection: {order.pickupSlot.date} · {order.pickupSlot.window} · {order.pickupSlot.point}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {/* Items */}
        <ul className="mt-5 space-y-2 border-t border-white/[0.07] pt-4">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-3 text-xs">
              <span className="min-w-0 text-neutral-200">
                <span className="font-semibold">{item.quantity}×</span> {item.productTitle}
                <span className="block text-2xs text-neutral-400">{item.variantLabel}</span>
              </span>
              <span className="flex-shrink-0 font-mono font-bold text-white" data-price>
                {formatBWP(item.lineTotalBWP)}
              </span>
            </li>
          ))}
        </ul>

        <dl className="mt-4 space-y-1.5 border-t border-white/[0.07] pt-4 text-xs">
          {(order.discountBWP ?? 0) > 0 && (
            <div className="flex items-center justify-between">
              <dt className="text-emerald-200">Discount{order.promoCode ? ` · ${order.promoCode}` : ''}</dt>
              <dd className="font-mono text-emerald-200">-{formatBWP(order.discountBWP ?? 0)}</dd>
            </div>
          )}
          <div className="flex items-center justify-between">
            <dt className="text-neutral-300">Delivery</dt>
            <dd className="font-mono text-neutral-100">
              {order.deliveryFeeBWP > 0 ? formatBWP(order.deliveryFeeBWP) : 'FREE'}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-sm font-bold text-white">Total</dt>
            <dd className="font-mono text-base font-black text-white" data-price>
              {formatBWP(order.totalAmountBWP)}
            </dd>
          </div>
        </dl>

        <div className="mt-4 space-y-1 rounded-2xl border border-white/10 bg-black/25 p-3.5 text-2xs text-neutral-300">
          <p>
            <strong className="text-neutral-100">Delivering to:</strong> {order.customer.town}
            {order.customer.address ? ` · ${order.customer.address}` : ''}
          </p>
          {order.paymentReference && (
            <p>
              <strong className="text-neutral-100">Payment reference:</strong>{' '}
              <span className="font-mono">{order.paymentReference}</span>
            </p>
          )}
          <p>
            <strong className="text-neutral-100">Collection points:</strong>{' '}
            {SELLER_CONFIG.pickupPoints.join(' · ')}
          </p>
        </div>

        <a
          href={buildStatusUpdateLink(order, order.status)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-whatsapp/40 bg-whatsapp/10 text-sm font-bold text-whatsapp transition-colors hover:bg-whatsapp/20 focus-visible:outline-2 focus-visible:outline-whatsapp"
        >
          <MessageCircle size={16} aria-hidden="true" />
          Ask about this order
        </a>
      </div>
    </section>
  );
}
