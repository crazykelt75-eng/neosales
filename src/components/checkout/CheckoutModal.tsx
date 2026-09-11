'use client';

import React, { useState, useEffect } from 'react';
import { X, ArrowRight, ShieldCheck, Truck, Smartphone, CreditCard, Check, MapPin, User, Phone } from 'lucide-react';
import confetti from 'canvas-confetti';
import { CustomerInput, PaymentMethod, DeliveryPreference, Order } from '@/types';
import { useStore } from '@/context/StoreContext';
import { useToast } from '@/components/ui/Toast';
import { DELIVERY_OPTIONS_LABELS, PAYMENT_METHOD_LABELS } from '@/lib/whatsapp';
import { PaymentInstructions } from './PaymentInstructions';
import { Button } from '@/components/ui/Button';

interface Props {
  onClose: () => void;
  onOrderComplete: () => void;
}

const BOTSWANA_TOWNS = [
  'Francistown',
  'Tati Siding',
  'Tonota',
  'Gaborone',
  'Maun',
  'Palapye',
  'Mahalapye',
  'Tutume',
  'Sebina',
  'Matsiloje',
  'Mogoditshane',
  'Tlokweng',
  'Phakalane',
  'Serowe',
  'Molepolole',
  'Kanye',
  'Lobatse',
  'Selebi-Phikwe',
  'Kasane',
  'Jwaneng',
  'Other / Village',
];

export function CheckoutModal({ onClose, onOrderComplete }: Props) {
  const { cart, cartSubtotal, createOrder } = useStore();
  const { showToast } = useToast();

  const [step, setStep] = useState<'form' | 'payment'>('form');
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

  // Form State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [deliveryTown, setDeliveryTown] = useState('Francistown');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryPreference, setDeliveryPreference] = useState<DeliveryPreference>('collection');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('orange_money');
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  const deliveryFee = DELIVERY_OPTIONS_LABELS[deliveryPreference].fee;
  const grandTotal = cartSubtotal + deliveryFee;

  // Escape key close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    if (!fullName.trim()) errors.fullName = 'Please enter your full name';
    if (!phone.trim()) {
      errors.phone = 'Please enter your phone/WhatsApp number';
    } else if (phone.replace(/\D/g, '').length < 8) {
      errors.phone = 'Please provide a valid 8-digit Botswana number (e.g. 72123456)';
    }
    if (!deliveryAddress.trim()) {
      errors.deliveryAddress = 'Please enter your ward, street, or preferred collection spot';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      showToast({
        type: 'error',
        title: 'Missing Required Fields',
        description: 'Please review and fill in all mandatory delivery details.',
      });
      return;
    }

    const customerInput: CustomerInput = {
      fullName: fullName.trim(),
      phone: phone.trim(),
      deliveryTown,
      deliveryAddress: deliveryAddress.trim(),
      deliveryPreference,
    };

    const order = createOrder(customerInput, paymentMethod);
    setCreatedOrder(order);

    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#25D366', '#FF6600', '#00A3A6', '#00CBFF'],
      });
    } catch {
      // safe fallback
    }

    showToast({
      type: 'success',
      title: 'Order Created!',
      description: `Order #${order.orderNumber} placed. Please complete your wallet transfer.`,
    });

    setStep('payment');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-dialog-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm transition-all animate-fadeIn"
    >
      <div className="fixed inset-0 cursor-pointer" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full max-w-lg bg-[#0e1118] text-white rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.95)] border border-white/10 z-10 max-h-[94vh] flex flex-col animate-scaleIn">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#08090f]/90 backdrop-blur-md">
          <div>
            <span className="text-[10px] font-bold text-orangeMoney uppercase tracking-widest block">
              {step === 'form' ? 'Guest Express Checkout' : 'Order Placed • Transfer Instructions'}
            </span>
            <h3 id="checkout-dialog-title" className="font-extrabold text-white text-base sm:text-lg">
              {step === 'form' ? 'Delivery & Payment Selection' : `Order Ref #${createdOrder?.orderNumber}`}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-neutral-400 hover:text-white rounded-full hover:bg-white/10 transition-colors focus-visible:outline-2 focus-visible:outline-orangeMoney"
            aria-label="Close checkout"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          {step === 'form' ? (
            <form onSubmit={handleSubmitOrder} className="space-y-4 text-left" noValidate>
              {/* No account registration banner */}
              <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-2xl p-3 flex items-center gap-2.5 text-xs text-emerald-200 shadow-xs">
                <ShieldCheck size={18} className="text-emerald-400 flex-shrink-0" aria-hidden="true" />
                <span className="font-medium">
                  <strong>Zero friction:</strong> No account or password required. Complete order in under 60 seconds.
                </span>
              </div>

              {/* 1. Customer Essentials */}
              <fieldset className="space-y-3 pt-1">
                <legend className="text-xs font-black text-white uppercase tracking-wider">
                  1. Contact Information
                </legend>

                <div>
                  <label htmlFor="customer-name" className="text-xs font-bold text-neutral-300 block mb-1">
                    Full Name <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-3.5 text-neutral-400" aria-hidden="true" />
                    <input
                      id="customer-name"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Kagiso Molefe"
                      autoComplete="name"
                      aria-invalid={!!formErrors.fullName}
                      aria-describedby={formErrors.fullName ? 'name-error' : undefined}
                      className="w-full pl-10 pr-3 py-3 bg-[#131622] border border-white/15 rounded-xl text-xs sm:text-sm text-white placeholder:text-neutral-500 focus:bg-[#161a28] focus:border-orangeMoney focus:ring-2 focus:ring-orangeMoney/20 focus:outline-none transition-all"
                    />
                  </div>
                  {formErrors.fullName && (
                    <p id="name-error" className="text-[11px] text-red-400 font-medium mt-1">
                      {formErrors.fullName}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="customer-phone" className="text-xs font-bold text-neutral-300 block mb-1">
                    Phone / WhatsApp Number <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-3.5 top-3.5 text-neutral-400" aria-hidden="true" />
                    <input
                      id="customer-phone"
                      type="tel"
                      inputMode="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 72123456 or +26772123456"
                      autoComplete="tel"
                      aria-invalid={!!formErrors.phone}
                      aria-describedby={formErrors.phone ? 'phone-error' : undefined}
                      className="w-full pl-10 pr-3 py-3 bg-[#131622] border border-white/15 rounded-xl text-xs sm:text-sm text-white placeholder:text-neutral-500 focus:bg-[#161a28] focus:border-orangeMoney focus:ring-2 focus:ring-orangeMoney/20 focus:outline-none transition-all"
                    />
                  </div>
                  {formErrors.phone && (
                    <p id="phone-error" className="text-[11px] text-red-400 font-medium mt-1">
                      {formErrors.phone}
                    </p>
                  )}
                </div>
              </fieldset>

              {/* 2. Delivery Location & Preference */}
              <fieldset className="space-y-3 pt-3 border-t border-white/10">
                <legend className="text-xs font-black text-white uppercase tracking-wider">
                  2. Delivery Destination
                </legend>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="delivery-town" className="text-xs font-bold text-neutral-300 block mb-1">
                      Town / City <span className="text-red-400">*</span>
                    </label>
                    <select
                      id="delivery-town"
                      value={deliveryTown}
                      onChange={(e) => setDeliveryTown(e.target.value)}
                      className="w-full px-3 py-3 bg-[#131622] border border-white/15 rounded-xl text-xs sm:text-sm text-white focus:bg-[#161a28] focus:border-orangeMoney focus:outline-none min-h-[44px]"
                    >
                      {BOTSWANA_TOWNS.map((town) => (
                        <option key={town} value={town} className="bg-[#0e1118] text-white">
                          {town}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="delivery-address" className="text-xs font-bold text-neutral-300 block mb-1">
                      Ward / Street / Landmark <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="delivery-address"
                      type="text"
                      required
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="e.g. Block 6, Plot 1420"
                      autoComplete="street-address"
                      aria-invalid={!!formErrors.deliveryAddress}
                      aria-describedby={formErrors.deliveryAddress ? 'address-error' : undefined}
                      className="w-full px-3 py-3 bg-[#131622] border border-white/15 rounded-xl text-xs sm:text-sm text-white placeholder:text-neutral-500 focus:bg-[#161a28] focus:border-orangeMoney focus:outline-none min-h-[44px]"
                    />
                  </div>
                </div>
                {formErrors.deliveryAddress && (
                  <p id="address-error" className="text-[11px] text-red-400 font-medium">
                    {formErrors.deliveryAddress}
                  </p>
                )}

                {/* Delivery Options Radiogroup */}
                <div className="space-y-2 pt-1" role="radiogroup" aria-label="Delivery Preference">
                  <label className="text-xs font-bold text-neutral-300 block">
                    Fulfillment Preference
                  </label>
                  {(Object.keys(DELIVERY_OPTIONS_LABELS) as DeliveryPreference[]).map((key) => {
                    const opt = DELIVERY_OPTIONS_LABELS[key];
                    const isSelected = deliveryPreference === key;
                    return (
                      <div
                        key={key}
                        role="radio"
                        aria-checked={isSelected}
                        tabIndex={0}
                        onClick={() => setDeliveryPreference(key)}
                        onKeyDown={(e) => {
                          if (e.key === ' ' || e.key === 'Enter') {
                            e.preventDefault();
                            setDeliveryPreference(key);
                          }
                        }}
                        className={`min-h-[52px] p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? 'border-orangeMoney bg-orangeMoney/20 text-white shadow-glow-orange ring-1 ring-orangeMoney/50'
                            : 'border-white/10 hover:border-white/20 text-neutral-200 bg-white/[0.04] hover:bg-white/[0.08]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                              isSelected ? 'border-orangeMoney bg-orangeMoney' : 'border-white/30'
                            }`}
                          >
                            {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm font-extrabold leading-tight">{opt.label}</p>
                            <p
                              className={`text-[10px] sm:text-[11px] ${
                                isSelected ? 'text-neutral-300' : 'text-neutral-400'
                              }`}
                            >
                              {opt.desc}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs sm:text-sm font-black whitespace-nowrap font-mono">
                          {opt.fee === 0 ? 'FREE' : `+P${opt.fee}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </fieldset>

              {/* 3. Payment Method Choice */}
              <fieldset className="space-y-2 pt-3 border-t border-white/10">
                <legend className="text-xs font-black text-white uppercase tracking-wider">
                  3. Select Payment Rail
                </legend>
                <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="Payment Wallet">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={paymentMethod === 'orange_money'}
                    onClick={() => setPaymentMethod('orange_money')}
                    className={`min-h-[64px] p-3 rounded-2xl border text-left transition-all ${
                      paymentMethod === 'orange_money'
                        ? 'border-orangeMoney bg-orangeMoney/20 text-white shadow-glow-orange ring-1 ring-orangeMoney/50'
                        : 'border-white/10 hover:border-white/20 bg-white/[0.04] text-neutral-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Smartphone
                        size={18}
                        className={paymentMethod === 'orange_money' ? 'text-orangeMoney' : 'text-neutral-400'}
                        aria-hidden="true"
                      />
                      {paymentMethod === 'orange_money' && (
                        <Check size={16} className="text-orangeMoney" aria-hidden="true" />
                      )}
                    </div>
                    <p className="text-xs font-black text-white">Orange Money</p>
                    <p className="text-[10px] text-neutral-400 font-medium">USSD (*145#) or App</p>
                  </button>

                  <button
                    type="button"
                    role="radio"
                    aria-checked={paymentMethod === 'fnb_pay2cell'}
                    onClick={() => setPaymentMethod('fnb_pay2cell')}
                    className={`min-h-[64px] p-3 rounded-2xl border text-left transition-all ${
                      paymentMethod === 'fnb_pay2cell'
                        ? 'border-fnb bg-fnb/20 text-white shadow-glow-fnb ring-1 ring-fnb/50'
                        : 'border-white/10 hover:border-white/20 bg-white/[0.04] text-neutral-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <CreditCard
                        size={18}
                        className={paymentMethod === 'fnb_pay2cell' ? 'text-fnb' : 'text-neutral-400'}
                        aria-hidden="true"
                      />
                      {paymentMethod === 'fnb_pay2cell' && (
                        <Check size={16} className="text-fnb" aria-hidden="true" />
                      )}
                    </div>
                    <p className="text-xs font-black text-white">FNB Pay2Cell</p>
                    <p className="text-[10px] text-neutral-400 font-medium">Cellphone Banking</p>
                  </button>
                </div>
              </fieldset>

              {/* Price Summary Breakdown */}
              <div className="bg-[#08090f] p-4 rounded-2xl space-y-1.5 text-xs text-neutral-300 border border-white/10">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Subtotal ({cart.reduce((s, i) => s + i.quantity, 0)} items)</span>
                  <span className="font-bold text-white font-mono">P{cartSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Delivery Fee</span>
                  <span className="font-bold text-white font-mono">
                    {deliveryFee > 0 ? `P${deliveryFee.toFixed(2)}` : 'FREE'}
                  </span>
                </div>
                <div className="flex justify-between text-base font-black text-white pt-2 border-t border-white/10">
                  <span>Total Due</span>
                  <span className="text-lg text-orangeMoney font-mono">P{grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-2 pb-safe">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full py-4 text-sm sm:text-base font-extrabold shadow-glow-orange"
                  rightIcon={<ArrowRight size={18} aria-hidden="true" />}
                >
                  Place Order & View Transfer Details
                </Button>
              </div>
            </form>
          ) : (
            createdOrder && (
              <PaymentInstructions
                order={createdOrder}
                onDone={() => {
                  onOrderComplete();
                }}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
}
