import React from 'react';
import { AlertTriangle, Check, Sparkles, Truck, XCircle } from 'lucide-react';

export type BadgeVariant =
  | 'new'
  | 'lowStock'
  | 'soldOut'
  | 'success'
  | 'amber'
  | 'neutral'
  | 'info';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  icon?: React.ReactNode | null;
  pulse?: boolean;
}

const BASE =
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-2xs font-bold uppercase tracking-wider';

const VARIANTS: Record<BadgeVariant, string> = {
  new: 'border-orangeMoney/45 bg-orangeMoney/15 text-orange-100',
  lowStock: 'border-red-500/40 bg-red-500/15 text-red-100',
  soldOut: 'border-white/12 bg-white/[0.06] text-neutral-300',
  success: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-100',
  amber: 'border-amber-500/40 bg-amber-500/15 text-amber-100',
  neutral: 'border-white/12 bg-white/[0.06] text-neutral-200',
  info: 'border-sky-500/40 bg-sky-500/15 text-sky-100',
};

const DEFAULT_ICONS: Record<BadgeVariant, React.ReactNode> = {
  new: <Sparkles size={11} aria-hidden="true" />,
  lowStock: <AlertTriangle size={11} aria-hidden="true" />,
  soldOut: <XCircle size={11} aria-hidden="true" />,
  success: <Check size={11} aria-hidden="true" />,
  amber: <Sparkles size={11} aria-hidden="true" />,
  neutral: <Truck size={11} aria-hidden="true" />,
  info: null,
};

/** Compact status pill used for stock state, categories and order status. */
export function Badge({
  children,
  variant = 'neutral',
  icon,
  pulse = false,
  className = '',
  ...props
}: BadgeProps) {
  const renderedIcon = icon === undefined ? DEFAULT_ICONS[variant] : icon;

  return (
    <span className={`${BASE} ${VARIANTS[variant]} ${pulse ? 'animate-pulse' : ''} ${className}`} {...props}>
      {renderedIcon}
      <span>{children}</span>
    </span>
  );
}
