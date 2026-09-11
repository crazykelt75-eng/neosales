'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShieldCheck, Lock, ArrowLeft, KeyRound, AlertCircle, Store } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const AUTH_STORAGE_KEY = 'neosales_admin_auth_token';
const ADMIN_PIN = process.env.NEXT_PUBLIC_ADMIN_PIN || '2670';

interface Props {
  children: React.ReactNode;
}

export function AdminAuthGate({ children }: Props) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    try {
      const savedAuth = sessionStorage.getItem(AUTH_STORAGE_KEY);
      if (savedAuth === 'authenticated') {
        setIsAuthenticated(true);
      }
    } catch {
      // Ignore session storage errors
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    setTimeout(() => {
      if (pin.trim() === ADMIN_PIN) {
        try {
          sessionStorage.setItem(AUTH_STORAGE_KEY, 'authenticated');
        } catch {
          // ignore
        }
        setIsAuthenticated(true);
      } else {
        setError('Incorrect PIN code. Please try again or check your seller config.');
        setPin('');
      }
      setIsSubmitting(false);
    }, 300);
  };

  const handleLock = () => {
    try {
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      // ignore
    }
    setIsAuthenticated(false);
    setPin('');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#07080c] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-orangeMoney border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#07080c] text-white flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-orangeMoney/30 selection:text-orangeMoney-light">
        <div className="w-full max-w-md bg-[#0e1118] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_30px_rgba(255,102,0,0.12)] space-y-6 text-center animate-scaleIn">
          {/* Lock Icon Badge */}
          <div className="w-16 h-16 rounded-2xl bg-orangeMoney/15 border border-orangeMoney/30 flex items-center justify-center mx-auto text-orangeMoney shadow-glow-orange">
            <Lock size={28} aria-hidden="true" />
          </div>

          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-orangeMoney bg-orangeMoney/10 px-2.5 py-1 rounded-full border border-orangeMoney/20 inline-block mb-2">
              Protected Operations Hub
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Seller Authentication
            </h1>
            <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
              Customer orders, Botswana delivery addresses, and payment receipts are private. Enter your seller PIN to proceed.
            </p>
          </div>

          {/* PIN Form */}
          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="space-y-1.5 text-left">
              <label htmlFor="admin-pin" className="text-xs font-bold text-neutral-300 block">
                Seller Security PIN
              </label>
              <div className="relative">
                <KeyRound
                  size={16}
                  className="absolute left-3.5 top-3.5 text-neutral-400 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="admin-pin"
                  type="password"
                  inputMode="numeric"
                  maxLength={8}
                  required
                  autoFocus
                  placeholder="Enter 4-digit PIN (default: 2670)"
                  value={pin}
                  onChange={(e) => {
                    setError('');
                    setPin(e.target.value);
                  }}
                  className="w-full pl-10 pr-4 py-3 bg-[#131622] border border-white/15 rounded-xl text-center tracking-[0.3em] font-mono text-base text-white placeholder:tracking-normal placeholder:font-sans placeholder:text-xs placeholder:text-neutral-400 focus:outline-none focus:border-orangeMoney focus:ring-2 focus:ring-orangeMoney/20 transition-all"
                />
              </div>
              {error && (
                <div className="flex items-center gap-1.5 text-[11px] text-red-400 font-medium pt-1">
                  <AlertCircle size={14} className="flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full py-3.5 font-bold shadow-glow-orange"
              disabled={isSubmitting || pin.length < 3}
            >
              {isSubmitting ? 'Authenticating...' : 'Unlock Operations Portal'}
            </Button>
          </form>

          {/* Quick Return to Storefront */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-neutral-400">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 hover:text-white transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Back to Storefront</span>
            </Link>
            <span className="text-[10px] text-neutral-400 font-mono">Botswana Hub 🇧🇼</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="sticky top-0 z-40 bg-neutral-900 text-white text-[11px] px-4 py-1.5 flex items-center justify-between border-b border-neutral-800">
        <span className="flex items-center gap-1.5 text-neutral-300 font-semibold">
          <ShieldCheck size={13} className="text-emerald-400" />
          <span>Authenticated Session Active</span>
        </span>
        <button
          onClick={handleLock}
          className="text-neutral-400 hover:text-red-400 font-bold text-[10px] uppercase tracking-wider transition-colors"
        >
          Lock / Log Out
        </button>
      </div>
      {children}
    </>
  );
}
