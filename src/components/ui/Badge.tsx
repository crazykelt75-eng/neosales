import React from 'react';
import { AlertTriangle, Sparkles, Check, Clock, Package } from 'lucide-react';

export type BadgeVariant =
  | 'new'
  | 'lowStock'
  | 'soldOut'
  | 'success'
  | 'warning'
  | 'info'
  | 'neutral'
  | 'orangeMoney'
  | 'fnb'
  | 'category';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  icon?: React.ReactNode;
  pulse?: boolean;
}

export function Badge({
  children,
  variant = 'neutral',
  icon,
  pulse = false,
  className = '',
  ...props
}: BadgeProps) {
  const baseStyles =
    'inline-flex items-center gap-1 font-bold text-[11px] px-2.5 py-0.5 rounded-full tracking-wide transition-colors select-none';

  const variantStyles = {
    new: 'bg-orangeMoney/20 text-orange-200 border border-orangeMoney/40 shadow-glow-orange',
    lowStock: 'bg-red-500/20 text-red-300 border border-red-500/40',
    soldOut: 'bg-neutral-800/80 text-neutral-400 border border-neutral-700/60',
    success: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
    warning: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
    info: 'bg-sky-500/20 text-sky-300 border border-sky-500/40',
    neutral: 'bg-white/[0.08] text-neutral-200 border border-white/10',
    orangeMoney: 'bg-orangeMoney/20 text-orange-300 border border-orangeMoney/40',
    fnb: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40',
    category: 'bg-white/10 text-neutral-200 border border-white/10 backdrop-blur-xs',
  };

  const defaultIcons = {
    new: <Sparkles size={10} className="text-amber-400" aria-hidden="true" />,
    lowStock: <AlertTriangle size={11} className="text-red-600" aria-hidden="true" />,
    soldOut: null,
    success: <Check size={11} className="text-emerald-600" aria-hidden="true" />,
    warning: <Clock size={11} className="text-amber-700" aria-hidden="true" />,
    info: <Package size={11} className="text-sky-600" aria-hidden="true" />,
    neutral: null,
    orangeMoney: null,
    fnb: null,
    category: null,
  };

  const renderedIcon = icon !== undefined ? icon : defaultIcons[variant];

  return (
    <span
      className={`${baseStyles} ${variantStyles[variant]} ${
        pulse ? 'animate-pulse-subtle' : ''
      } ${className}`}
      {...props}
    >
      {renderedIcon}
      <span>{children}</span>
    </span>
  );
}
