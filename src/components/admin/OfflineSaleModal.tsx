'use client';

import React, { useMemo, useState } from 'react';
import { AlertCircle, Minus, Plus, Store, Trash2 } from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { DeliveryPreference, PaymentMethod, Product, ProductVariant, SalesChannel } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { DELIVERY_OPTIONS, PAYMENT_OPTIONS } from '@/lib/constants';
import { formatBWP } from '@/lib/format';
import { getVariantLabel } from '@/lib/product';
import { isValidBotswanaPhone } from '@/lib/whatsapp';

const TITLE_ID = 'offline-sale-title';

interface DraftLine {
  productId: string;
  variantId: string;
  quantity: number;
}

interface OfflineSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type FieldErrors = Partial<Record<'customer' | 'town' | 'phone' | 'lines', string>>;

/**
 * Logs a sale that closed on WhatsApp, in a DM or in person.
 *
 * Keeps the website's inventory as the single source of truth: recording a sale
 * takes stock off the shelf exactly like a web checkout does.
 */
export function OfflineSaleModal({ isOpen, onClose }: OfflineSaleModalProps) {
  const { products, recordOfflineSale } = useStore();

  const [lines, setLines] = useState<DraftLine[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [town, setTown] = useState('Francistown');
  const [address, setAddress] = useState('');
  const [channel, setChannel] = useState<Exclude<SalesChannel, 'website'>>('whatsapp');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('orange_money');
  const [deliveryPreference, setDeliveryPreference] = useState<DeliveryPreference>('francistown_pickup');
  const [isFulfilled, setIsFulfilled] = useState(true);
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});

  const sellableProducts = useMemo(
    () =>
      products.filter(
        (product) => product.isActive && product.variants.some((variant) => variant.stockQuantity > 0)
      ),
    [products]
  );

  const resolvedLines = useMemo(() => {
    return lines
      .map((line) => {
        const product = products.find((candidate) => candidate.id === line.productId);
        const variant = product?.variants.find((candidate) => candidate.id === line.variantId);
        return product && variant ? { product, variant, quantity: line.quantity } : null;
      })
      .filter((line): line is { product: Product; variant: ProductVariant; quantity: number } => line !== null);
  }, [lines, products]);

  const subtotal = resolvedLines.reduce((sum, line) => sum + line.variant.priceBWP * line.quantity, 0);
  const deliveryFee = DELIVERY_OPTIONS.find((option) => option.id === deliveryPreference)?.feeBWP ?? 0;
  const total = subtotal + deliveryFee;

  const reset = () => {
    setLines([]);
    setCustomerName('');
    setCustomerPhone('');
    setTown('Francistown');
    setAddress('');
    setChannel('whatsapp');
    setPaymentMethod('orange_money');
    setDeliveryPreference('francistown_pickup');
    setIsFulfilled(true);
    setNote('');
    setErrors({});
  };

  const addLine = (product: Product, variant: ProductVariant) => {
    setErrors((current) => ({ ...current, lines: undefined }));
    setLines((current) => {
      const existing = current.find((line) => line.variantId === variant.id);
      if (existing) {
        return current.map((line) =>
          line.variantId === variant.id
            ? { ...line, quantity: Math.min(variant.stockQuantity, line.quantity + 1) }
            : line
        );
      }
      return [...current, { productId: product.id, variantId: variant.id, quantity: 1 }];
    });
  };

  const changeQuantity = (variantId: string, delta: number) => {
    setLines((current) =>
      current
        .map((line) => {
          if (line.variantId !== variantId) return line;

          const variant = products
            .find((product) => product.id === line.productId)
            ?.variants.find((candidate) => candidate.id === variantId);
          const ceiling = variant?.stockQuantity ?? 1;
          const next = Math.min(ceiling, Math.max(0, line.quantity + delta));

          return { ...line, quantity: next };
        })
        .filter((line) => line.quantity > 0)
    );
  };

  const handleSubmit = () => {
    const nextErrors: FieldErrors = {};

    if (resolvedLines.length === 0) nextErrors.lines = 'Add at least one item to the sale.';
    if (customerName.trim().length < 2) nextErrors.customer = 'Add the customer name for your records.';
    if (!town.trim()) nextErrors.town = 'Which town is this going to?';
    if (customerPhone.trim() && !isValidBotswanaPhone(customerPhone)) {
      nextErrors.phone = 'That number does not look right — check it or leave it blank.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    recordOfflineSale({
      lines: resolvedLines,
      customerName,
      customerPhone: customerPhone.trim() ? `+267${customerPhone.replace(/\D/g, '')}` : '',
      town,
      address,
      channel,
      paymentMethod,
      deliveryPreference,
      isFulfilled,
      note,
    });

    reset();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} labelledBy={TITLE_ID} maxWidth="lg" presentation="sheet">
      <div className="flex max-h-[92vh] flex-col">
        <header className="border-b border-white/10 bg-[#0a0c13]/90 px-5 py-4">
          <h2 id={TITLE_ID} className="flex items-center gap-2 pr-10 text-base font-extrabold text-white">
            <Store size={18} className="text-orangeMoney" aria-hidden="true" />
            Record a sale
          </h2>
          <p className="mt-0.5 text-xs text-neutral-400">
            Closed the deal on WhatsApp or in person? Log it here so stock and takings stay accurate.
          </p>
        </header>

        <div className="space-y-5 overflow-y-auto px-5 py-5">
          {/* Item picker */}
          <section className="space-y-3">
            <h3 className="text-2xs font-bold uppercase tracking-[0.14em] text-neutral-400">Items sold</h3>

            {errors.lines && (
              <p role="alert" className="flex items-center gap-1.5 text-2xs font-semibold text-red-300">
                <AlertCircle size={12} aria-hidden="true" />
                {errors.lines}
              </p>
            )}

            {resolvedLines.length > 0 && (
              <ul className="space-y-2">
                {resolvedLines.map((line) => (
                  <li
                    key={line.variant.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/25 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-neutral-100">{line.product.title}</p>
                      <p className="mt-0.5 text-2xs text-neutral-400">
                        {getVariantLabel(line.variant)} · {formatBWP(line.variant.priceBWP)} ·{' '}
                        {line.variant.stockQuantity} in stock
                      </p>
                    </div>

                    <div className="flex flex-shrink-0 items-center gap-1.5">
                      <div
                        role="group"
                        aria-label={`Quantity for ${line.product.title}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-white/12 bg-black/30 p-0.5"
                      >
                        <button
                          type="button"
                          onClick={() => changeQuantity(line.variant.id, -1)}
                          aria-label="Decrease quantity"
                          className="rounded-md p-1.5 text-neutral-200 transition-colors hover:bg-white/10"
                        >
                          <Minus size={12} aria-hidden="true" />
                        </button>
                        <span className="min-w-[22px] text-center font-mono text-xs font-bold text-white">
                          {line.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => changeQuantity(line.variant.id, 1)}
                          disabled={line.quantity >= line.variant.stockQuantity}
                          aria-label="Increase quantity"
                          className="rounded-md p-1.5 text-neutral-200 transition-colors hover:bg-white/10 disabled:opacity-30"
                        >
                          <Plus size={12} aria-hidden="true" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setLines((current) => current.filter((l) => l.variantId !== line.variant.id))}
                        aria-label={`Remove ${line.product.title}`}
                        className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-red-500/15 hover:text-red-300"
                      >
                        <Trash2 size={13} aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <details className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <summary className="cursor-pointer text-2xs font-bold uppercase tracking-wide text-neutral-300">
                Add an item from the catalog
              </summary>

              <div className="mt-3 max-h-64 space-y-3 overflow-y-auto">
                {sellableProducts.map((product) => (
                  <div key={product.id}>
                    <p className="text-2xs font-bold text-neutral-200">{product.title}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {product.variants
                        .filter((variant) => variant.stockQuantity > 0)
                        .map((variant) => (
                          <button
                            key={variant.id}
                            type="button"
                            onClick={() => addLine(product, variant)}
                            className="rounded-lg border border-white/12 bg-white/[0.05] px-2.5 py-1.5 text-2xs font-semibold text-neutral-200 transition-colors hover:border-orangeMoney/50 hover:text-white"
                          >
                            {getVariantLabel(variant)}
                            <span className="ml-1.5 font-mono text-neutral-400">{formatBWP(variant.priceBWP)}</span>
                          </button>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          </section>

          {/* Channel + customer */}
          <section className="space-y-3">
            <h3 className="text-2xs font-bold uppercase tracking-[0.14em] text-neutral-400">Where did it sell?</h3>

            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Sales channel">
              {(
                [
                  { id: 'whatsapp', label: 'WhatsApp / DM' },
                  { id: 'walk_in', label: 'In person / walk-in' },
                ] as { id: Exclude<SalesChannel, 'website'>; label: string }[]
              ).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setChannel(option.id)}
                  aria-pressed={channel === option.id}
                  className={`rounded-xl border px-3 py-2 text-2xs font-bold uppercase tracking-wide transition-colors ${
                    channel === option.id
                      ? 'border-orangeMoney/50 bg-orangeMoney/15 text-white'
                      : 'border-white/10 bg-white/[0.04] text-neutral-300 hover:text-white'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="sale-name" className="mb-1.5 block text-xs font-semibold text-neutral-200">
                  Customer name
                </label>
                <input
                  id="sale-name"
                  value={customerName}
                  onChange={(event) => {
                    setCustomerName(event.target.value);
                    setErrors((current) => ({ ...current, customer: undefined }));
                  }}
                  aria-invalid={Boolean(errors.customer)}
                  placeholder="e.g. Naledi Kgosi"
                  className={`w-full rounded-xl border bg-black/30 px-3.5 py-3 text-sm text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-orangeMoney/40 ${
                    errors.customer ? 'border-red-500/60' : 'border-white/12 focus:border-orangeMoney'
                  }`}
                />
                {errors.customer && (
                  <p role="alert" className="mt-1.5 text-2xs font-semibold text-red-300">
                    {errors.customer}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="sale-phone" className="mb-1.5 block text-xs font-semibold text-neutral-200">
                  WhatsApp number (optional)
                </label>
                <input
                  id="sale-phone"
                  inputMode="numeric"
                  value={customerPhone}
                  onChange={(event) => {
                    setCustomerPhone(event.target.value.replace(/[^\d\s]/g, ''));
                    setErrors((current) => ({ ...current, phone: undefined }));
                  }}
                  aria-invalid={Boolean(errors.phone)}
                  placeholder="71 550 200"
                  className={`w-full rounded-xl border bg-black/30 px-3.5 py-3 font-mono text-sm text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-orangeMoney/40 ${
                    errors.phone ? 'border-red-500/60' : 'border-white/12 focus:border-orangeMoney'
                  }`}
                />
                {errors.phone && (
                  <p role="alert" className="mt-1.5 text-2xs font-semibold text-red-300">
                    {errors.phone}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="sale-town" className="mb-1.5 block text-xs font-semibold text-neutral-200">
                  Town
                </label>
                <input
                  id="sale-town"
                  value={town}
                  onChange={(event) => {
                    setTown(event.target.value);
                    setErrors((current) => ({ ...current, town: undefined }));
                  }}
                  aria-invalid={Boolean(errors.town)}
                  className={`w-full rounded-xl border bg-black/30 px-3.5 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orangeMoney/40 ${
                    errors.town ? 'border-red-500/60' : 'border-white/12 focus:border-orangeMoney'
                  }`}
                />
                {errors.town && (
                  <p role="alert" className="mt-1.5 text-2xs font-semibold text-red-300">
                    {errors.town}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="sale-address" className="mb-1.5 block text-xs font-semibold text-neutral-200">
                  Address / handover point (optional)
                </label>
                <input
                  id="sale-address"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="e.g. Galo Mall"
                  className="w-full rounded-xl border border-white/12 bg-black/30 px-3.5 py-3 text-sm text-white placeholder:text-neutral-400 focus:border-orangeMoney focus:outline-none focus:ring-2 focus:ring-orangeMoney/40"
                />
              </div>
            </div>
          </section>

          {/* Payment + fulfilment */}
          <section className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="sale-payment" className="mb-1.5 block text-xs font-semibold text-neutral-200">
                How did they pay?
              </label>
              <select
                id="sale-payment"
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
                className="w-full rounded-xl border border-white/12 bg-black/30 px-3.5 py-3 text-sm text-white focus:border-orangeMoney focus:outline-none focus:ring-2 focus:ring-orangeMoney/40"
              >
                {PAYMENT_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="sale-delivery" className="mb-1.5 block text-xs font-semibold text-neutral-200">
                Fulfilment
              </label>
              <select
                id="sale-delivery"
                value={deliveryPreference}
                onChange={(event) => setDeliveryPreference(event.target.value as DeliveryPreference)}
                className="w-full rounded-xl border border-white/12 bg-black/30 px-3.5 py-3 text-sm text-white focus:border-orangeMoney focus:outline-none focus:ring-2 focus:ring-orangeMoney/40"
              >
                {DELIVERY_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label} · {option.feeBWP === 0 ? 'FREE' : formatBWP(option.feeBWP)}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <section className="space-y-3">
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
              <input
                type="checkbox"
                checked={isFulfilled}
                onChange={(event) => setIsFulfilled(event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-orangeMoney"
              />
              <span>
                <span className="block text-xs font-bold text-white">Goods already handed over</span>
                <span className="mt-0.5 block text-2xs leading-relaxed text-neutral-400">
                  Leave unticked when the customer still needs delivery or collection — the order will sit in
                  Payment Confirmed until you dispatch it.
                </span>
              </span>
            </label>

            <div>
              <label htmlFor="sale-note" className="mb-1.5 block text-xs font-semibold text-neutral-200">
                Note (optional)
              </label>
              <input
                id="sale-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="e.g. Sold via WhatsApp Status, paid OM-778211"
                className="w-full rounded-xl border border-white/12 bg-black/30 px-3.5 py-3 text-sm text-white placeholder:text-neutral-400 focus:border-orangeMoney focus:outline-none focus:ring-2 focus:ring-orangeMoney/40"
              />
            </div>
          </section>
        </div>

        <footer className="border-t border-white/10 bg-[#0a0c13]/95 px-5 py-4">
          <dl className="mb-3 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <dt className="text-neutral-300">Subtotal</dt>
              <dd className="font-mono font-bold text-white" data-price>
                {formatBWP(subtotal)}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-neutral-300">Delivery</dt>
              <dd className="font-mono font-bold text-white" data-price>
                {deliveryFee === 0 ? 'FREE' : formatBWP(deliveryFee)}
              </dd>
            </div>
            <div className="flex items-center justify-between border-t border-white/10 pt-2">
              <dt className="text-sm font-bold text-white">Total</dt>
              <dd className="font-mono text-lg font-black text-orangeMoney" data-price>
                {formatBWP(total)}
              </dd>
            </div>
          </dl>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="secondary" size="lg" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" size="lg" fullWidth onClick={handleSubmit} leftIcon={<Store size={16} />}>
              Record sale &amp; reduce stock
            </Button>
          </div>
        </footer>
      </div>
    </Modal>
  );
}
