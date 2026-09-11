import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'whatsapp'
  | 'orangeMoney'
  | 'fnb'
  | 'danger';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className = '',
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      type = 'button',
      ...props
    },
    ref
  ) => {
    // Base styles: 44px min target on mobile, smooth transitions, focus-visible outline
    const baseStyles =
      'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 select-none active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed';

    // Size variants
    const sizeStyles = {
      sm: 'text-xs px-3 py-1.5 min-h-[36px] sm:min-h-[32px] gap-1.5',
      md: 'text-xs sm:text-sm px-4 py-2.5 min-h-[44px] gap-2',
      lg: 'text-sm sm:text-base px-5 py-3.5 min-h-[48px] gap-2.5',
    };

    // Variant color styles
    const variantStyles = {
      primary:
        'bg-neutral-900 text-white hover:bg-neutral-800 shadow-sm focus-visible:outline-neutral-900',
      secondary:
        'bg-neutral-100 text-neutral-800 hover:bg-neutral-200 border border-neutral-200 focus-visible:outline-neutral-700',
      outline:
        'bg-transparent text-neutral-800 border border-neutral-300 hover:bg-neutral-50 hover:border-neutral-400 focus-visible:outline-neutral-800',
      ghost:
        'bg-transparent text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-neutral-800',
      whatsapp:
        'bg-[#25D366] text-white hover:bg-[#20bd5a] shadow-md shadow-emerald-500/20 focus-visible:outline-[#25D366]',
      orangeMoney:
        'bg-orangeMoney text-white hover:bg-orangeMoney-dark shadow-md shadow-orangeMoney/20 focus-visible:outline-orangeMoney',
      fnb:
        'bg-fnb text-white hover:bg-fnb-dark shadow-md shadow-fnb/20 focus-visible:outline-fnb',
      danger:
        'bg-red-600 text-white hover:bg-red-700 shadow-sm focus-visible:outline-red-600',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-current" aria-hidden="true" />
        ) : (
          leftIcon && <span className="flex-shrink-0" aria-hidden="true">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && (
          <span className="flex-shrink-0" aria-hidden="true">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
