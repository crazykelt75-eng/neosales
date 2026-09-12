'use client';

import { useCallback, useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * WCAG 2.2 dialog behaviour for modals and drawers:
 *  - moves focus into the dialog on open and restores it to the trigger on close
 *  - traps Tab / Shift+Tab inside the dialog while open
 *  - closes on Escape
 *  - locks background scrolling
 *
 * @param isOpen  whether the dialog is currently mounted/visible
 * @param onClose invoked when Escape is pressed
 */
export function useFocusTrap<T extends HTMLElement>(isOpen: boolean, onClose?: () => void) {
  const containerRef = useRef<T | null>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  const getFocusableElements = useCallback((): HTMLElement[] => {
    const container = containerRef.current;
    if (!container) return [];

    return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
      (element) =>
        !element.hasAttribute('inert') &&
        element.getAttribute('aria-hidden') !== 'true' &&
        (element.offsetWidth > 0 || element.offsetHeight > 0 || element === document.activeElement)
    );
  }, []);

  // Remember the trigger, focus the first control, restore on unmount.
  useEffect(() => {
    if (!isOpen) return;

    // Snapshot the node so the cleanup below never reads a mutated ref.
    const container = containerRef.current;
    previouslyFocusedElement.current = document.activeElement as HTMLElement | null;

    const focusTimer = window.setTimeout(() => {
      const [firstFocusable] = getFocusableElements();
      if (firstFocusable) {
        firstFocusable.focus();
      } else {
        container?.focus();
      }
    }, 40);

    return () => {
      window.clearTimeout(focusTimer);
      // Restore focus to whatever opened the dialog.
      const trigger = previouslyFocusedElement.current;
      if (trigger && document.contains(trigger)) {
        trigger.focus();
      } else {
        container?.blur();
      }
    };
  }, [isOpen, getFocusableElements]);

  // Keyboard trap + Escape handling.
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose?.();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = getFocusableElements();
      if (focusable.length === 0) {
        event.preventDefault();
        containerRef.current?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && (active === first || !containerRef.current?.contains(active))) {
        event.preventDefault();
        last.focus();
        return;
      }

      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose, getFocusableElements]);

  // Prevent the page behind the dialog from scrolling.
  useEffect(() => {
    if (!isOpen) return;

    const { overflow, paddingRight } = document.body.style;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
    };
  }, [isOpen]);

  return containerRef;
}
