'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** id of the element that labels the dialog (for `aria-labelledby`). */
  labelledBy: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  /** `sheet` anchors to the bottom of the viewport on mobile — better for thumbs. */
  presentation?: 'center' | 'sheet';
  closeLabel?: string;
  showCloseButton?: boolean;
}

const MAX_WIDTHS = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-xl',
  lg: 'sm:max-w-3xl',
  xl: 'sm:max-w-5xl',
};

/**
 * Shared accessible modal shell: focus trap, Escape to close, backdrop click to
 * close, background scroll lock and a labelled dialog role. Rendered through a
 * portal so it always sits above sticky headers and page transforms.
 */
export function Modal({
  isOpen,
  onClose,
  labelledBy,
  children,
  maxWidth = 'md',
  presentation = 'center',
  closeLabel = 'Close dialog',
  showCloseButton = true,
}: ModalProps) {
  const [isMounted, setIsMounted] = useState(false);
  const containerRef = useFocusTrap<HTMLDivElement>(isOpen, onClose);

  useEffect(() => setIsMounted(true), []);

  if (!isMounted || !isOpen) return null;

  const panel =
    presentation === 'sheet'
      ? 'w-full max-w-none sm:max-w-none rounded-t-3xl sm:rounded-3xl animate-slideUp sm:animate-scaleIn'
      : `w-full ${MAX_WIDTHS[maxWidth]} rounded-3xl animate-scaleIn`;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 animate-fadeIn bg-black/80 backdrop-blur-md"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={`relative z-10 ${panel} max-h-[92vh] overflow-hidden border border-white/10 bg-surface shadow-elevated focus:outline-none sm:mx-4`}
      >
        {showCloseButton && (
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="absolute right-3 top-3 z-20 rounded-xl border border-white/10 bg-black/50 p-2 text-neutral-300 backdrop-blur transition-colors hover:border-white/25 hover:text-white focus-visible:outline-2 focus-visible:outline-orangeMoney"
          >
            <X size={18} aria-hidden="true" />
          </button>
        )}

        {children}
      </div>
    </div>,
    document.body
  );
}
