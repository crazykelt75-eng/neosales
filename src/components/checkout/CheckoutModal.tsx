'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  Banknote,
  CheckCircle2,
  MapPin,
  MessageCircle,
  Receipt,
  ShieldCheck,
  Smartphone,
  Truck,
} from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { DeliveryPreference, Order, OrderCustomer, PaymentMethod } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PaymentInstructions } from '@/components/checkout/PaymentInstructions';
import { DELIVERY_OPTIONS, PAYMENT_OPTIONS, SELLER_CONFIG } from '@/lib/constants';
import { formatBWP } from '@/lib/format';
import { STORAGE_KEYS, readStorage, removeStorage, writeStorage } from '@/lib/storage';
import { buildOrderReceipt, buildOrderWhatsAppLink, isValidBotswanaPhone } from '@/lib/whatsapp';

const TITLE_ID = 'checkout-modal-title';

type CheckoutStep = 'details' | 'payment' | 'success';
type FieldErrors = Partial<Record<'name' | 'phone' | 'town' | 'address' | 'payment', string>>;

interface CheckoutForm {
  name: string;
  phone: string;
  town: string;
  address: string;
  deliveryPreference: DeliveryPreference;
  paymentMethod: PaymentMethod;
}

const EMPTY_FORM: CheckoutForm = {
  name: '',
  phone: '',
  town: '',
  address: '',
  deliveryPreference: 'francistown_pickup',
  paymentMethod: 'orange_money',
};

const PAYMENT_ICONS: Record<PaymentMethod, React.ReactNode> = {
  orange_money: <Smartphone size={18} className="text-orangeMoney" aria-hidden="true" />,
  fnb_pay2cell: <Smartphone size={18} className="text-fnb" aria-hidden="true" />,
  cash_on_pickup: <Banknote size={18} className="text-amber-300" aria-hidden="true" />,
};

/**
 * Zero-friction guest checkout.
 *
 * Flow: details → payment rail → order created → 1-tap WhatsApp dispatch. No
 * account, no password, and every field validates inline with friendly copy.
 */
export function CheckoutModal() {
  const {
    isCheckoutOpen,
    closeCheckout,
    cart,
    cartSubtotal,
    createOrder,
    selectedDelivery,
    setSelectedDelivery,
    setOrderPaymentReference,
  } = useStore();

  const [step, setStep] = useState<CheckoutStep>('details');
  const [form, setForm] = useState<CheckoutForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [order, setOrder] = useState<Order | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [referenceDraft, setReferenceDraft] = useState('');
  const hasRestoredDraft = useRef(false);

  const deliveryOption =
    DELIVERY_OPTIONS.find((option) => option.id === form.deliveryPreference) ?? DELIVERY_OPTIONS[0];
  const deliveryFeeBWP = deliveryOption.feeBWP;
  const totalBWP = cartSubtotal + deliveryFeeBWP;

  // Restore any half-finished checkout exactly once per open, seeding the delivery
  // rail the shopper last used.
  useEffect(() => {
    if (!isCheckoutOpen) {
      hasRestoredDraft.current = false;
      return;
    }

    if (hasRestoredDraft.current) return;
    hasRestoredDraft.current = true;

    const draft = readStorage<CheckoutForm | null>(STORAGE_KEYS.checkoutDraft, null, 'session');
    setForm({
      ...EMPTY_FORM,
      ...(draft ?? {}),
      deliveryPreference: selectedDelivery,
    });
    setErrors({});
  }, [isCheckoutOpen, selectedDelivery]);

  // Persist the draft so an accidental close never loses customer input.
  useEffect(() => {
    if (!isCheckoutOpen || step === 'success') return;
    writeStorage(STORAGE_KEYS.checkoutDraft, form, 'session');
  }, [form, isCheckoutOpen, step]);

  const receiptPreview = useMemo(() => {
    if (!order) return '';
    return buildOrderReceipt({
      items: order.items,
      orderNumber: order.orderNumber,
      customer: order.customer,
      subtotalBWP: order.subtotalBWP,
      deliveryFeeBWP: order.deliveryFeeBWP,
      totalAmountBWP: order.totalAmountBWP,
      paymentMethod: order.paymentMethod,
      paymentReference: order.paymentReference,
    });
  }, [order]);

  if (!isCheckoutOpen) return null;

  const updateField = <Key extends keyof CheckoutForm>(key: Key, value: CheckoutForm[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const handleDeliveryChange = (preference: DeliveryPreference) => {
    setSelectedDelivery(preference);
    setForm((current) => ({
      ...current,
      deliveryPreference: preference,
      // Cash on pickup only exists for Francistown pickups.
      paymentMethod:
        preference !== 'francistown_pickup' && current.paymentMethod === 'cash_on_pickup'
          ? 'orange_money'
          : current.paymentMethod,
    }));
  };

  const validateDetails = (): boolean => {
    const nextErrors: FieldErrors = {};

    if (form.name.trim().length < 2) {
      nextErrors.name = 'Please tell us your name so we know who is collecting.';
    }

    if (!form.phone.trim()) {
      nextErrors.phone = 'We need a WhatsApp number to confirm your order.';
    } else if (!isValidBotswanaPhone(form.phone)) {
      nextErrors.phone = 'Enter a valid Botswana mobile number, e.g. 71 550 200.';
    }

    if (!form.town.trim()) {
      nextErrors.town = 'Which town or village are we delivering to?';
    }

    if (!form.address.trim()) {
      nextErrors.address =
        form.deliveryPreference === 'francistown_pickup'
          ? 'Choose or type your preferred pickup point.'
          : 'Add a street, suburb or branch so the courier can find you.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleContinue = () => {
    if (validateDetails()) setStep('payment');
  };

  const handlePlaceOrder = () => {
    if (cart.length === 0) return;

    if (form.deliveryPreference !== 'francistown_pickup' && form.paymentMethod === 'cash_on_pickup') {
      setErrors({ payment: 'Cash on pickup is only available for Francistown pickups.' });
      return;
    }

    setIsSubmitting(true);

    const customer: OrderCustomer = {
      name: form.name.trim(),
      phone: form.phone.trim().startsWith('+') ? form.phone.trim() : `+267${form.phone.replace(/\D/g, '')}`,
      town: form.town.trim(),
      address: form.address.trim(),
      deliveryPreference: form.deliveryPreference,
    };

    const createdOrder = createOrder({ customer, paymentMethod: form.paymentMethod });
    setOrder(createdOrder);
    setReferenceDraft('');
    setStep('success');
    setIsSubmitting(false);
    removeStorage(STORAGE_KEYS.checkoutDraft, 'session');
    setErrors({});

    // 1-tap dispatch: opened straight from the user gesture so no popup blocker fires.
    const whatsappLink = buildOrderWhatsAppLink(createdOrder);
    window.open(whatsappLink, '_blank', 'noopener,noreferrer');
  };

  const handleClose = () => {
    closeCheckout();
    if (step === 'success') {
      setStep('details');
      setForm({ ...EMPTY_FORM, deliveryPreference: selectedDelivery });
      setOrder(null);
    }
  };

  const isPickup = form.deliveryPreference === 'francistown_pickup';

  return (
    <Modal
      isOpen={isCheckoutOpen}
      onClose={handleClose}
      labelledBy={TITLE_ID}
      maxWidth="lg"
      presentation="sheet"
      closeLabel="Close checkout"
    >
      <div className="flex max-h-[92vh] flex-col">
        {/* Header */}
        <header className="border-b border-white/10 bg-[#0a0c13]/90 px-5 py-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-400" aria-hidden="true" />
            <h2 id={TITLE_ID} className="text-base font-extrabold text-white sm:text-lg">
              {step === 'success' ? 'Order created' : 'Guest checkout'}
            </h2>
          </div>

          {step !== 'success' && (
            <>
              <p className="mt-1 text-xs text-neutral-400">
                No account needed. Pay by Orange Money, FNB Pay2Cell or cash on pickup.
              </p>

              <ol className="mt-3 flex items-center gap-2 text-2xs font-bold uppercase tracking-wide">
                <li className={step === 'details' ? 'text-orangeMoney' : 'text-emerald-300'}>
                  1 · Your details
                </li>
                <li aria-hidden="true" className="text-neutral-600">
                  —
                </li>
                <li className={step === 'payment' ? 'text-orangeMoney' : 'text-neutral-400'}>2 · Review &amp; pay</li>
              </ol>
            </>
          )}
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {step === 'success' && order ? (
            /* ----------------------------- SUCCESS ----------------------------- */
            <div className="space-y-5">
              <div className="flex flex-col items-center gap-2 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/40 bg-emerald-500/15 text-emerald-300">
                  <CheckCircle2 size={28} aria-hidden="true" />
                </span>
                <h3 className="text-lg font-extrabold text-white">Order created successfully</h3>
                <p className="max-w-md text-xs leading-relaxed text-neutral-300">
                  Your order reference is{' '}
                  <strong className="font-mono text-sm text-orangeMoney">{order.orderNumber}</strong>. Use it as the
                  payment reference, then send your confirmation screenshot on WhatsApp.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2">
                <Badge variant="success">Total {formatBWP(order.totalAmountBWP)}</Badge>
                <Badge variant="neutral">{deliveryOption.shortLabel}</Badge>
                <Badge variant="amber">
                  {PAYMENT_OPTIONS.find((option) => option.id === order.paymentMethod)?.label}
                </Badge>
              </div>

              {/* Already paid? Capture the transaction ID so the seller can verify instantly */}
              <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-4">
                <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-amber-100">
                  <Receipt size={14} aria-hidden="true" />
                  Already paid? Add your transaction ID
                </h4>
                <p className="mt-1.5 text-xs leading-relaxed text-neutral-300">
                  Paste the reference from your Orange Money or FNB SMS and it travels with your order — the seller can
                  verify it without waiting for a screenshot.
                </p>

                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <label className="sr-only" htmlFor="payment-reference">
                    Mobile money transaction ID for order {order.orderNumber}
                  </label>
                  <input
                    id="payment-reference"
                    value={referenceDraft}
                    onChange={(event) => setReferenceDraft(event.target.value)}
                    placeholder="e.g. OM-984102 or PP240911.1234.C56789"
                    className="min-w-0 flex-1 rounded-xl border border-white/12 bg-black/30 px-3.5 py-3 font-mono text-xs text-white placeholder:text-neutral-400 focus:border-orangeMoney focus:outline-none focus:ring-2 focus:ring-orangeMoney/40"
                  />
                  <Button
                    variant="secondary"
                    size="md"
                    disabled={!referenceDraft.trim()}
                    onClick={() => {
                      setOrderPaymentReference(order.id, referenceDraft);
                      setOrder((current) =>
                        current ? { ...current, paymentReference: referenceDraft.trim() } : current
                      );
                    }}
                  >
                    Save reference
                  </Button>
                </div>

                {order.paymentReference && (
                  <p className="mt-2 flex items-center gap-1.5 text-2xs font-semibold text-emerald-300">
                    <CheckCircle2 size={13} aria-hidden="true" />
                    Saved: <span className="font-mono">{order.paymentReference}</span>
                  </p>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-neutral-300">
                    <MessageCircle size={14} className="text-whatsapp" aria-hidden="true" />
                    Step 1 · Send your order
                  </h4>
                  <p className="mt-1.5 text-xs leading-relaxed text-neutral-400">
                    WhatsApp should have opened with your receipt. If it did not, tap the button below.
                  </p>
                  <a
                    href={buildOrderWhatsAppLink(order)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-whatsapp text-sm font-bold text-neutral-950 transition-colors hover:bg-whatsapp-dark hover:text-white focus-visible:outline-2 focus-visible:outline-whatsapp"
                  >
                    <MessageCircle size={16} aria-hidden="true" />
                    Open WhatsApp with my order
                  </a>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-neutral-300">
                    <Truck size={14} className="text-amber-300" aria-hidden="true" />
                    Step 2 · {isPickup ? 'Collect' : 'Delivery'}
                  </h4>
                  <p className="mt-1.5 text-xs leading-relaxed text-neutral-400">
                    {isPickup
                      ? `We will confirm your pickup point (${SELLER_CONFIG.pickupPoints.join(', ')}) and a collection window.`
                      : `We dispatch with Sprint Couriers / PostNet to ${order.customer.town} once payment is verified.`}
                  </p>
                  <p className="mt-3 text-2xs font-semibold uppercase tracking-wide text-emerald-300">
                    Tracked reference · {order.orderNumber}
                  </p>
                </div>
              </div>

              <PaymentInstructions
                paymentMethod={order.paymentMethod}
                reference={order.orderNumber}
                amountBWP={order.totalAmountBWP}
              />

              <details className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <summary className="cursor-pointer text-xs font-bold uppercase tracking-wide text-neutral-300">
                  View the receipt we are sending
                </summary>
                <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap text-2xs leading-relaxed text-neutral-300">
                  {receiptPreview}
                </pre>
              </details>

              <Button variant="secondary" size="lg" fullWidth onClick={handleClose}>
                Continue shopping
              </Button>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-[1.08fr_0.92fr]">
              {/* ------------------------- FORM COLUMN ------------------------- */}
              <div className="space-y-5">
                {step === 'details' ? (
                  <>
                    <fieldset className="space-y-3">
                      <legend className="text-xs font-bold uppercase tracking-[0.14em] text-neutral-400">
                        Your details
                      </legend>

                      <div>
                        <label htmlFor="checkout-name" className="mb-1.5 block text-xs font-semibold text-neutral-200">
                          Full name
                        </label>
                        <input
                          id="checkout-name"
                          name="name"
                          type="text"
                          autoComplete="name"
                          value={form.name}
                          onChange={(event) => updateField('name', event.target.value)}
                          aria-invalid={Boolean(errors.name)}
                          aria-describedby={errors.name ? 'checkout-name-error' : undefined}
                          placeholder="e.g. Naledi Kgosi"
                          className={`w-full rounded-xl border bg-black/30 px-3.5 py-3 text-sm text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-orangeMoney/40 ${
                            errors.name ? 'border-red-500/60' : 'border-white/12 focus:border-orangeMoney'
                          }`}
                        />
                        {errors.name && (
                          <p id="checkout-name-error" role="alert" className="mt-1.5 flex items-center gap-1.5 text-2xs font-semibold text-red-300">
                            <AlertCircle size={12} aria-hidden="true" />
                            {errors.name}
                          </p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="checkout-phone" className="mb-1.5 block text-xs font-semibold text-neutral-200">
                          WhatsApp number
                        </label>
                        <div
                          className={`flex items-center overflow-hidden rounded-xl border bg-black/30 focus-within:ring-2 focus-within:ring-orangeMoney/40 ${
                            errors.phone ? 'border-red-500/60' : 'border-white/12 focus-within:border-orangeMoney'
                          }`}
                        >
                          <span className="border-r border-white/10 bg-white/[0.05] px-3 py-3 font-mono text-sm font-bold text-neutral-300">
                            +267
                          </span>
                          <input
                            id="checkout-phone"
                            name="phone"
                            type="tel"
                            inputMode="numeric"
                            autoComplete="tel-national"
                            value={form.phone}
                            onChange={(event) => updateField('phone', event.target.value.replace(/[^\d\s]/g, ''))}
                            aria-invalid={Boolean(errors.phone)}
                            aria-describedby={errors.phone ? 'checkout-phone-error' : undefined}
                            placeholder="71 550 200"
                            className="w-full bg-transparent px-3.5 py-3 font-mono text-sm text-white placeholder:text-neutral-400 focus:outline-none"
                          />
                        </div>
                        {errors.phone && (
                          <p id="checkout-phone-error" role="alert" className="mt-1.5 flex items-center gap-1.5 text-2xs font-semibold text-red-300">
                            <AlertCircle size={12} aria-hidden="true" />
                            {errors.phone}
                          </p>
                        )}
                      </div>
                    </fieldset>

                    <fieldset className="space-y-3">
                      <legend className="text-xs font-bold uppercase tracking-[0.14em] text-neutral-400">
                        Delivery preference
                      </legend>

                      <div className="space-y-2">
                        {DELIVERY_OPTIONS.map((option) => {
                          const isActive = option.id === form.deliveryPreference;

                          return (
                            <label
                              key={option.id}
                              className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition-all ${
                                isActive
                                  ? 'border-orangeMoney bg-orangeMoney/10 shadow-[0_0_25px_-14px_rgba(255,102,0,1)]'
                                  : 'border-white/10 bg-white/[0.03] hover:border-white/20'
                              }`}
                            >
                              <input
                                type="radio"
                                name="deliveryPreference"
                                value={option.id}
                                checked={isActive}
                                onChange={() => handleDeliveryChange(option.id)}
                                className="mt-0.5 h-4 w-4 flex-shrink-0 accent-orangeMoney"
                              />

                              <span className="min-w-0 flex-1">
                                <span className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="text-xs font-bold text-white">{option.label}</span>
                                  <span
                                    className={`font-mono text-2xs font-bold ${
                                      option.feeBWP === 0 ? 'text-emerald-300' : 'text-amber-200'
                                    }`}
                                    data-price
                                  >
                                    {option.feeBWP === 0 ? 'FREE' : formatBWP(option.feeBWP)}
                                  </span>
                                </span>
                                <span className="mt-1 block text-2xs leading-relaxed text-neutral-400">
                                  {option.description}
                                </span>
                                <span className="mt-1.5 flex flex-wrap gap-1.5">
                                  {option.coverage.map((area) => (
                                    <span
                                      key={area}
                                      className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-2xs font-semibold text-neutral-300"
                                    >
                                      {area}
                                    </span>
                                  ))}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label htmlFor="checkout-town" className="mb-1.5 block text-xs font-semibold text-neutral-200">
                            Town / village
                          </label>
                          <input
                            id="checkout-town"
                            name="town"
                            type="text"
                            autoComplete="address-level2"
                            value={form.town}
                            onChange={(event) => updateField('town', event.target.value)}
                            aria-invalid={Boolean(errors.town)}
                            aria-describedby={errors.town ? 'checkout-town-error' : undefined}
                            placeholder="Francistown"
                            className={`w-full rounded-xl border bg-black/30 px-3.5 py-3 text-sm text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-orangeMoney/40 ${
                              errors.town ? 'border-red-500/60' : 'border-white/12 focus:border-orangeMoney'
                            }`}
                          />
                          {errors.town && (
                            <p id="checkout-town-error" role="alert" className="mt-1.5 flex items-center gap-1.5 text-2xs font-semibold text-red-300">
                              <AlertCircle size={12} aria-hidden="true" />
                              {errors.town}
                            </p>
                          )}
                        </div>

                        <div>
                          <label htmlFor="checkout-address" className="mb-1.5 block text-xs font-semibold text-neutral-200">
                            {isPickup ? 'Preferred pickup point' : 'Address / branch'}
                          </label>
                          <input
                            id="checkout-address"
                            name="address"
                            type="text"
                            autoComplete="street-address"
                            value={form.address}
                            onChange={(event) => updateField('address', event.target.value)}
                            aria-invalid={Boolean(errors.address)}
                            aria-describedby={errors.address ? 'checkout-address-error' : undefined}
                            placeholder={isPickup ? 'Galo Mall' : 'Block 8, Plot 4210'}
                            className={`w-full rounded-xl border bg-black/30 px-3.5 py-3 text-sm text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-orangeMoney/40 ${
                              errors.address ? 'border-red-500/60' : 'border-white/12 focus:border-orangeMoney'
                            }`}
                          />
                          {errors.address && (
                            <p id="checkout-address-error" role="alert" className="mt-1.5 flex items-center gap-1.5 text-2xs font-semibold text-red-300">
                              <AlertCircle size={12} aria-hidden="true" />
                              {errors.address}
                            </p>
                          )}
                        </div>
                      </div>

                      {isPickup && (
                        <div className="flex flex-wrap gap-2">
                          {SELLER_CONFIG.pickupPoints.map((point) => (
                            <button
                              key={point}
                              type="button"
                              onClick={() => updateField('address', point)}
                              className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5 text-2xs font-bold text-neutral-200 transition-colors hover:border-orangeMoney/50 hover:text-white"
                            >
                              <MapPin size={12} aria-hidden="true" />
                              {point}
                            </button>
                          ))}
                        </div>
                      )}
                    </fieldset>

                    <Button variant="primary" size="lg" fullWidth onClick={handleContinue}>
                      Continue to payment
                    </Button>
                  </>
                ) : (
                  /* ------------------------- PAYMENT STEP ------------------------- */
                  <>
                    <fieldset className="space-y-3">
                      <legend className="text-xs font-bold uppercase tracking-[0.14em] text-neutral-400">
                        Payment method
                      </legend>

                      <div className="space-y-2">
                        {PAYMENT_OPTIONS.map((option) => {
                          const isDisabled = option.pickupOnly && !isPickup;
                          const isActive = option.id === form.paymentMethod;

                          return (
                            <label
                              key={option.id}
                              className={`flex items-start gap-3 rounded-2xl border p-3.5 transition-all ${
                                isDisabled
                                  ? 'cursor-not-allowed border-white/5 bg-white/[0.02] opacity-55'
                                  : isActive
                                  ? 'cursor-pointer border-orangeMoney bg-orangeMoney/10 shadow-[0_0_25px_-14px_rgba(255,102,0,1)]'
                                  : 'cursor-pointer border-white/10 bg-white/[0.03] hover:border-white/20'
                              }`}
                            >
                              <input
                                type="radio"
                                name="paymentMethod"
                                value={option.id}
                                checked={isActive}
                                disabled={isDisabled}
                                onChange={() => updateField('paymentMethod', option.id)}
                                className="mt-0.5 h-4 w-4 flex-shrink-0 accent-orangeMoney"
                              />

                              <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-2 text-xs font-bold text-white">
                                  {PAYMENT_ICONS[option.id]}
                                  {option.label}
                                </span>
                                <span className="mt-1 block text-2xs leading-relaxed text-neutral-400">
                                  {option.description}
                                </span>
                                {isDisabled && (
                                  <span className="mt-1 block text-2xs font-semibold text-amber-300">
                                    Only available with Francistown pickup
                                  </span>
                                )}
                              </span>
                            </label>
                          );
                        })}
                      </div>

                      {errors.payment && (
                        <p role="alert" className="flex items-center gap-1.5 text-2xs font-semibold text-red-300">
                          <AlertCircle size={12} aria-hidden="true" />
                          {errors.payment}
                        </p>
                      )}
                    </fieldset>

                    <PaymentInstructions
                      paymentMethod={form.paymentMethod}
                      reference="your order number (generated next)"
                      amountBWP={totalBWP}
                    />

                    <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-3.5">
                      <p className="flex items-center gap-2 text-2xs font-bold uppercase tracking-wide text-emerald-200">
                        <BadgeCheck size={13} aria-hidden="true" />
                        What happens next
                      </p>
                      <p className="mt-1.5 text-xs leading-relaxed text-neutral-300">
                        We create your order reference, open WhatsApp with the full receipt, and verify your payment the
                        moment your screenshot lands. Dispatch same day before 15:00.
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button
                        variant="secondary"
                        size="lg"
                        onClick={() => setStep('details')}
                        leftIcon={<ArrowLeft size={16} />}
                      >
                        Back
                      </Button>

                      <Button
                        variant="primary"
                        size="lg"
                        fullWidth
                        isLoading={isSubmitting}
                        onClick={handlePlaceOrder}
                        leftIcon={<MessageCircle size={17} />}
                      >
                        Place order &amp; send on WhatsApp
                      </Button>
                    </div>
                  </>
                )}
              </div>

              {/* ------------------------- SUMMARY COLUMN ------------------------- */}
              <aside
                aria-label="Order summary"
                className="h-fit rounded-2xl border border-white/10 bg-black/30 p-4"
              >
                <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-neutral-400">Order summary</h3>

                {cart.length === 0 ? (
                  <p className="mt-3 text-xs text-neutral-400">
                    Your bag is empty. Add an item to continue checkout.
                  </p>
                ) : (
                  <>
                    <ul className="mt-3 space-y-2.5">
                      {cart.map((item) => (
                        <li key={item.variantId} className="flex items-start justify-between gap-3">
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-semibold text-neutral-100">
                              {item.product.title}
                            </span>
                            <span className="block text-2xs text-neutral-400">
                              {item.variantLabel} × {item.quantity}
                            </span>
                          </span>
                          <span className="flex-shrink-0 font-mono text-xs font-bold text-white" data-price>
                            {formatBWP(item.unitPriceBWP * item.quantity)}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <dl className="mt-4 space-y-2 border-t border-white/10 pt-3 text-xs">
                      <div className="flex items-center justify-between">
                        <dt className="text-neutral-300">Subtotal</dt>
                        <dd className="font-mono font-bold text-white" data-price>
                          {formatBWP(cartSubtotal)}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between">
                        <dt className="text-neutral-300">{deliveryOption.shortLabel}</dt>
                        <dd className="font-mono font-bold text-white" data-price>
                          {deliveryFeeBWP === 0 ? 'FREE' : formatBWP(deliveryFeeBWP)}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between border-t border-white/10 pt-2.5">
                        <dt className="text-sm font-bold text-white">Total due</dt>
                        <dd className="font-mono text-lg font-black text-orangeMoney" data-price>
                          {formatBWP(totalBWP)}
                        </dd>
                      </div>
                    </dl>
                  </>
                )}

                <p className="mt-3 flex items-center gap-1.5 text-2xs leading-relaxed text-neutral-400">
                  <MapPin size={12} className="text-orangeMoney" aria-hidden="true" />
                  {isPickup
                    ? `Free pickup at ${SELLER_CONFIG.pickupPoints.join(', ')}.`
                    : `Courier to ${form.town || 'your town'} · delivered in 1–3 working days.`}
                </p>
              </aside>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
