'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, KeyRound, Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabaseClient';

const MIN_PASSWORD_LENGTH = 12;

export function PasswordRecovery() {
  const [isReady, setIsReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!supabase) return;

    let mounted = true;
    const setRecoveryReady = () => {
      if (mounted) setIsReady(true);
    };

    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setRecoveryReady();
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) setRecoveryReady();
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirmation) {
      setError('The passwords do not match.');
      return;
    }
    if (!supabase) {
      setError('Password recovery is temporarily unavailable. Please try again shortly.');
      return;
    }

    setIsSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setIsSubmitting(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setPassword('');
    setConfirmation('');
    setIsComplete(true);
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-surface/90 p-6 shadow-elevated backdrop-blur-xl">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-orangeMoney/35 bg-orangeMoney/15 text-orangeMoney">
            <KeyRound size={22} aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-lg font-extrabold text-white">Set a new seller password</h1>
            <p className="mt-1 text-xs leading-relaxed text-neutral-300">
              Choose a unique password with at least {MIN_PASSWORD_LENGTH} characters.
            </p>
          </div>
        </div>

        {isComplete ? (
          <div className="mt-6 space-y-4 text-center">
            <p role="status" className="flex items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm font-semibold text-emerald-100">
              <CheckCircle2 size={17} aria-hidden="true" /> Password updated securely.
            </p>
            <Link href="/admin" className="inline-flex text-sm font-bold text-orangeMoney hover:text-orangeMoney-light">
              Continue to seller sign in
            </Link>
          </div>
        ) : !isReady ? (
          <p role="status" className="mt-6 flex items-start gap-2 rounded-xl border border-white/10 bg-black/25 p-3 text-xs leading-relaxed text-neutral-300">
            <Loader2 size={15} className="mt-0.5 shrink-0 animate-spin text-orangeMoney" aria-hidden="true" />
            Open this page from the password-reset link in your email. For safety, recovery links expire.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block text-2xs font-bold uppercase tracking-[0.14em] text-neutral-400" htmlFor="new-password">
              New password
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={MIN_PASSWORD_LENGTH}
                value={password}
                onChange={(event) => { setPassword(event.target.value); setError(''); }}
                className="mt-1.5 w-full rounded-xl border border-white/12 bg-black/35 px-4 py-3 text-sm normal-case tracking-normal text-white placeholder:text-neutral-500 focus:border-orangeMoney focus:outline-none focus:ring-2 focus:ring-orangeMoney/40"
              />
            </label>
            <label className="block text-2xs font-bold uppercase tracking-[0.14em] text-neutral-400" htmlFor="confirm-password">
              Confirm new password
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={MIN_PASSWORD_LENGTH}
                value={confirmation}
                onChange={(event) => { setConfirmation(event.target.value); setError(''); }}
                className="mt-1.5 w-full rounded-xl border border-white/12 bg-black/35 px-4 py-3 text-sm normal-case tracking-normal text-white placeholder:text-neutral-500 focus:border-orangeMoney focus:outline-none focus:ring-2 focus:ring-orangeMoney/40"
              />
            </label>
            {error && <p role="alert" className="flex gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-semibold text-red-200"><ShieldAlert size={15} className="shrink-0" aria-hidden="true" />{error}</p>}
            <Button type="submit" variant="primary" size="lg" fullWidth isLoading={isSubmitting}>Update password</Button>
          </form>
        )}

        <Link href="/admin" className="mt-6 inline-flex items-center gap-2 text-2xs font-semibold text-neutral-400 transition-colors hover:text-white">
          <ArrowLeft size={13} aria-hidden="true" /> Back to seller sign in
        </Link>
      </div>
    </main>
  );
}
