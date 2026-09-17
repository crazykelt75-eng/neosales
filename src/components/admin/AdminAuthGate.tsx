'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Lock, Mail, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { Button } from '@/components/ui/Button';
import { SELLER_CONFIG } from '@/lib/constants';

export function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const { isAdminUnlocked, isAdminAuthLoading, unlockAdmin } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAdminAuthLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div role="status" className="flex items-center gap-3 text-sm font-semibold text-neutral-300">
          <Loader2 size={18} className="animate-spin text-orangeMoney" aria-hidden="true" />
          Checking seller session…
        </div>
      </main>
    );
  }

  if (isAdminUnlocked) return <>{children}</>;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await unlockAdmin(email, password);
      setPassword('');
    } catch (authError) {
      setError(
        authError instanceof Error
          ? authError.message
          : 'We could not sign you in. Check your details and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
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
              <h1 className="text-lg font-extrabold text-white">Seller sign in</h1>
              <p className="mt-1 text-xs leading-relaxed text-neutral-300">
                Secure access to {SELLER_CONFIG.storeName} orders, payments and inventory.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="admin-email" className="mb-1.5 block text-2xs font-bold uppercase tracking-[0.14em] text-neutral-400">
                Seller email
              </label>
              <div className="flex items-center rounded-xl border border-white/12 bg-black/35 focus-within:border-orangeMoney focus-within:ring-2 focus-within:ring-orangeMoney/40">
                <Mail size={15} className="ml-3 text-neutral-400" aria-hidden="true" />
                <input
                  id="admin-email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(event) => { setEmail(event.target.value); setError(''); }}
                  className="w-full bg-transparent px-3 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none"
                  placeholder="owner@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="admin-password" className="mb-1.5 block text-2xs font-bold uppercase tracking-[0.14em] text-neutral-400">
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                required
                minLength={8}
                value={password}
                onChange={(event) => { setPassword(event.target.value); setError(''); }}
                className="w-full rounded-xl border border-white/12 bg-black/35 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:border-orangeMoney focus:outline-none focus:ring-2 focus:ring-orangeMoney/40"
                placeholder="Your seller password"
              />
            </div>

            {error && (
              <p id="admin-auth-error" role="alert" className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-2xs font-semibold leading-relaxed text-red-200">
                <ShieldAlert size={14} className="mt-0.5 flex-shrink-0" aria-hidden="true" />
                {error}
              </p>
            )}

            <Button type="submit" variant="primary" size="lg" fullWidth isLoading={isSubmitting} leftIcon={<ShieldCheck size={16} />}>
              Sign in securely
            </Button>
            <Link href="/reset-password" className="block text-center text-2xs font-semibold text-orangeMoney transition-colors hover:text-orangeMoney-light">
              Forgot your password?
            </Link>
          </form>
        </div>

        <Link href="/" className="mt-5 inline-flex items-center gap-2 text-2xs font-semibold text-neutral-400 transition-colors hover:text-white">
          <ArrowLeft size={13} aria-hidden="true" />
          Back to storefront
        </Link>
      </div>
    </main>
  );
}
