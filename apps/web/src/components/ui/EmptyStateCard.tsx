import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Button } from './Button';

export interface EmptyStateCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyStateCard({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateCardProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-[12px] border border-dashed border-[var(--border-strong)] bg-[var(--bg-surface)] px-6 py-10 text-center',
        className
      )}
    >
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]">
        {icon}
      </div>
      <h3 className="font-heading text-[16px] font-semibold text-[var(--text-primary)]">
        {title}
      </h3>
      <p className="mt-1.5 max-w-md text-[14px] leading-relaxed text-[var(--text-secondary)]">
        {description}
      </p>
      {actionLabel && onAction && (
        <div className="mt-5">
          <Button variant="primary" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
