'use client';

/**
 * A styled stand-in for a native <select> — the browser's own dropdown
 * list (the open popup, not just the closed box) can't be restyled at all,
 * so on anything that needs to match the brand (the faculty picker) this
 * renders the whole thing ourselves instead.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

interface DropdownProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder: string;
  className?: string;
}

export default function Dropdown({ id, value, onChange, options, placeholder, className = '' }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const idx = options.indexOf(value);
    setActiveIndex(idx >= 0 ? idx : 0);
  }, [open, value, options]);

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    const el = listRef.current?.children[activeIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) buttonRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (activeIndex >= 0) {
        onChange(options[activeIndex]);
        close();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        id={id}
        onClick={() => setOpen(o => !o)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full px-4 py-3 rounded-xl bg-cream-50 border-2 border-ink text-ink text-base font-semibold focus:bg-white flex items-center justify-between gap-2 text-left focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
      >
        <span className={`truncate ${value ? '' : 'text-slate-400'}`}>{value || placeholder}</span>
        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <ul
          ref={listRef}
          role="listbox"
          aria-label={placeholder}
          tabIndex={-1}
          className="absolute z-20 mt-1.5 w-full max-h-64 overflow-y-auto rounded-xl bg-white border-2 border-ink shadow-brut py-1"
        >
          {options.map((opt, i) => (
            <li
              key={opt}
              role="option"
              aria-selected={opt === value}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => {
                onChange(opt);
                close();
              }}
              className={`px-4 py-2.5 text-sm font-semibold cursor-pointer flex items-center justify-between gap-2 ${
                i === activeIndex ? 'bg-brand-500 text-white' : 'text-ink'
              }`}
            >
              <span className="truncate">{opt}</span>
              {opt === value && <Check className="w-4 h-4 shrink-0" aria-hidden="true" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
