'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Delete, Lock, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { Button } from '@/components/ui/Button';
import { SELLER_CONFIG } from '@/lib/constants';

interface AdminAuthGateProps {
  children: React.ReactNode;
}

/**
 * PIN gate protecting `/admin`.
 *
 * Sessions live in `sessionStorage`, so they clear the moment the tab closes.
 * Five incorrect attempts trigger a 60 second lockout (rate limited in context).
 */
export function AdminAuthGate({ children }: AdminAuthGateProps) {
  const { isAdminUnlocked, unlockAdmin, adminAttemptsRemaining, adminLockSecondsRemaining } = useStore();

  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [showKeypad, setShowKeypad] = useState(false);

  if (isAdminUnlocked) return <>{children}</>;

  const isLockedOut = adminLockSecondsRemaining > 0;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (isLockedOut) return;

    const result = unlockAdmin(pin);
    if (!result.success) {
      setError(result.message);
      setPin('');
      return;
    }

    setError('');
    setPin('');
  };

  const appendDigit = (digit: string) => {
    setError('');
    setPin((current) => (current.length >= 6 ? current : `${current}${digit}`));
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="rounded-3xl border border-white/10 bg-surface/90 p-6 shadow-elevated backdrop-blur-xl">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-orangeMoney/35 bg-orangeMoney/15 text-orangeMoney">
              <Lock size={22} aria-hidden="true" />
            </span>

            <div>
              <h1 className="text-lg font-extrabold text-white">Seller access</h1>
              <p className="mt-1 text-xs leading-relaxed text-neutral-300">
                Enter the operations PIN to manage orders and inventory for {SELLER_CONFIG.storeName}.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-3">
            <label htmlFor="admin-pin" className="block text-2xs font-bold uppercase tracking-[0.14em] text-neutral-400">
              Operations PIN
            </label>

            <input
              id="admin-pin"
              name="pin"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              pattern="[0-9]*"
              maxLength={6}
              value={pin}
              onChange={(event) => {
                setError('');
                setPin(event.target.value.replace(/\D/g, ''));
              }}
              disabled={isLockedOut}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'admin-pin-error' : 'admin-pin-hint'}
              placeholder="••••"
              className={`w-full rounded-xl border bg-black/35 px-4 py-3 text-center font-mono text-lg font-bold tracking-[0.4em] text-white placeholder:tracking-[0.4em] placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-orangeMoney/40 disabled:opacity-50 ${
                error ? 'border-red-500/60' : 'border-white/12 focus:border-orangeMoney'
              }`}
            />

            {error && (
              <p
                id="admin-pin-error"
                role="alert"
                className="flex items-start gap-1.5 text-2xs font-semibold leading-relaxed text-red-300"
              >
                <ShieldAlert size={13} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
                {error}
              </p>
            )}

            {isLockedOut ? (
              <p role="status" className="text-center text-2xs font-semibold text-amber-300">
                Locked for {adminLockSecondsRemaining}s after too many incorrect attempts.
              </p>
            ) : (
              <p id="admin-pin-hint" className="text-center text-2xs text-neutral-400">
                {adminAttemptsRemaining} of 5 attempts remaining
                {!process.env.NEXT_PUBLIC_ADMIN_PIN && ' · default PIN 2670, set NEXT_PUBLIC_ADMIN_PIN to change'}
              </p>
            )}

            {/* Optional numeric keypad for phone-first sellers */}
            {showKeypad && (
              <div className="grid grid-cols-3 gap-2 pt-1" role="group" aria-label="Numeric keypad">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => appendDigit(digit)}
                    disabled={isLockedOut}
                    className="rounded-xl border border-white/10 bg-white/[0.04] py-3 font-mono text-sm font-bold text-white transition-colors hover:bg-white/[0.1] disabled:opacity-40"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPin('')}
                  disabled={isLockedOut}
                  className="col-span-1 rounded-xl border border-white/10 bg-white/[0.04] py-3 text-2xs font-bold uppercase text-neutral-300 transition-colors hover:bg-white/[0.1] disabled:opacity-40"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => appendDigit('0')}
                  disabled={isLockedOut}
                  className="col-span-1 rounded-xl border border-white/10 bg-white/[0.04] py-3 font-mono text-sm font-bold text-white transition-colors hover:bg-white/[0.1] disabled:opacity-40"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={() => setPin((current) => current.slice(0, -1))}
                  disabled={isLockedOut}
                  aria-label="Delete last digit"
                  className="col-span-1 flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] py-3 text-neutral-300 transition-colors hover:bg-white/[0.1] disabled:opacity-40"
                >
                  <Delete size={15} aria-hidden="true" />
                </button>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={pin.length < 4 || isLockedOut}
              leftIcon={<ShieldCheck size={16} />}
            >
              Unlock dashboard
            </Button>

            <button
              type="button"
              onClick={() => setShowKeypad((shown) => !shown)}
              aria-expanded={showKeypad}
              className="w-full rounded-xl border border-white/10 py-2.5 text-2xs font-bold uppercase tracking-wide text-neutral-300 transition-colors hover:border-white/25 hover:text-white"
            >
              {showKeypad ? 'Hide keypad' : 'Use on-screen keypad'}
            </button>
          </form>
        </div>

        <Link
          href="/"
          className="mt-5 inline-flex items-center gap-2 text-2xs font-semibold text-neutral-400 transition-colors hover:text-white"
        >
          <ArrowLeft size={13} aria-hidden="true" />
          Back to storefront
        </Link>
      </div>
    </main>
  );
}
