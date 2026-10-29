'use client';

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface ModalProps {
  onClose: () => void;
  labelledBy?: string;
  children: React.ReactNode;
  panelClassName?: string;
  showClose?: boolean;
  closeLabel?: string;
  initialFocus?: string;
}

/**
 * Accessible modal shell.
 * - Scrolls inside on small screens (max 90dvh) instead of clipping
 * - Closes on Escape / backdrop click
 * - Locks body scroll and traps keyboard focus
 */
export default function Modal({
  onClose,
  labelledBy,
  children,
  panelClassName = '',
  showClose = true,
  closeLabel = 'Close dialog',
  initialFocus,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;

    const getFocusable = () =>
      Array.from(panel?.querySelectorAll<HTMLElement>(FOCUSABLE) || []).filter(
        el => el.offsetParent !== null
      );

    const isCoarsePointer = window.matchMedia?.('(pointer: coarse)').matches;
    const preferred = initialFocus
      ? panel?.querySelector<HTMLElement>(initialFocus)
      : null;
    const initialTarget = !isCoarsePointer && preferred ? preferred : panel;
    initialTarget?.focus();

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = getFocusable();
      if (items.length === 0) return;
      const index = items.indexOf(document.activeElement as HTMLElement);
      if (event.shiftKey && index <= 0) {
        event.preventDefault();
        items[items.length - 1].focus();
      } else if (!event.shiftKey && index === items.length - 1) {
        event.preventDefault();
        items[0].focus();
      }
    };

    document.addEventListener('keydown', handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/70 backdrop-blur-sm animate-fadeIn overscroll-contain"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`relative w-full max-w-sm sm:max-w-lg card max-h-[90dvh] overflow-y-auto overscroll-contain focus:outline-none ${panelClassName}`}
      >
        {showClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            data-modal-close
            className="absolute top-3 right-3 z-20 p-2 rounded-lg text-slate-400 hover:text-ink hover:bg-slate-100"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        )}
        {children}
      </div>
    </div>,
    document.body
  );
}
