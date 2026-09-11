import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant =
  | 'primary'
  | 'amber'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'whatsapp'
  | 'danger';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const BASE_STYLES =
  'inline-flex select-none items-center justify-center gap-2 rounded-xl font-bold tracking-tight transition-all duration-150 ease-luxe focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orangeMoney active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50';

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: 'min-h-[38px] px-3.5 text-xs',
  md: 'min-h-[44px] px-4 text-sm',
  lg: 'min-h-[52px] px-6 text-sm sm:text-base',
};

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-orangeMoney to-orangeMoney-dark text-white shadow-[0_10px_30px_-12px_rgba(255,102,0,0.9)] hover:from-orangeMoney-light hover:to-orangeMoney',
  amber:
    'bg-gradient-to-r from-amber-400 to-amber-600 text-neutral-950 shadow-[0_10px_30px_-14px_rgba(245,158,11,0.9)] hover:from-amber-300 hover:to-amber-500',
  secondary:
    'bg-white/[0.07] text-white border border-white/12 hover:bg-white/[0.12] hover:border-white/20',
  outline:
    'bg-transparent text-neutral-200 border border-white/15 hover:border-orangeMoney/50 hover:text-white hover:bg-orangeMoney/5',
  ghost: 'bg-transparent text-neutral-300 hover:bg-white/[0.07] hover:text-white',
  whatsapp:
    'bg-whatsapp text-neutral-950 shadow-[0_10px_30px_-12px_rgba(37,211,102,0.9)] hover:bg-whatsapp-dark hover:text-white',
  danger: 'bg-red-600 text-white hover:bg-red-500 shadow-[0_10px_30px_-14px_rgba(239,68,68,0.9)]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className = '',
      variant = 'primary',
      size = 'md',
      isLoading = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      disabled,
      type = 'button',
      ...props
    },
    ref
  ) => (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={`${BASE_STYLES} ${SIZE_STYLES[size]} ${VARIANT_STYLES[variant]} ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 size={16} className="animate-spin" aria-hidden="true" />
      ) : (
        leftIcon && (
          <span className="flex-shrink-0" aria-hidden="true">
            {leftIcon}
          </span>
        )
      )}

      <span className="truncate">{children}</span>

      {!isLoading && rightIcon && (
        <span className="flex-shrink-0" aria-hidden="true">
          {rightIcon}
        </span>
      )}
    </button>
  )
);

Button.displayName = 'Button';
