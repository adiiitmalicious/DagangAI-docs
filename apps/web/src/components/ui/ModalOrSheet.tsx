'use client';

import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface ModalOrSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/**
 * Centered Modal pada desktop (>= 768px) dan Bottom Sheet pada mobile (< 768px)
 * sesuai spesifikasi design.md §7.
 */
export function ModalOrSheet({
  open,
  onClose,
  title,
  children,
  footer,
  className,
}: ModalOrSheetProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 md:items-center md:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <div
        className={cn(
          'relative z-10 flex max-h-[88vh] w-full flex-col bg-[var(--bg-surface)] shadow-[var(--shadow-floating)]',
          'rounded-t-[16px] md:max-w-lg md:rounded-[16px]',
          className
        )}
      >
        {/* Drag handle visual untuk mobile bottom sheet */}
        <div className="flex justify-center pt-2.5 md:hidden" aria-hidden="true">
          <span className="h-1 w-10 rounded-full bg-[var(--border-strong)]" />
        </div>

        <div className="flex items-center justify-between border-b border-[var(--border-default)] px-5 py-3.5">
          <h2 className="font-heading text-[17px] font-semibold text-[var(--text-primary)]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="flex h-11 w-11 items-center justify-center rounded-[8px] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] md:h-9 md:w-9"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-[var(--border-default)] px-5 py-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
