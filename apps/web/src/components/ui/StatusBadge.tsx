import type { ContentStatus } from '@dagangai/shared';
import { cn } from '@/lib/cn';

const STATUS_MAP: Record<
  ContentStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  draft: {
    label: 'Draf',
    bg: 'bg-[var(--status-draft-bg)]',
    text: 'text-[var(--status-draft-text)]',
    dot: 'bg-[#6B7280]',
  },
  planned: {
    label: 'Terjadwal',
    bg: 'bg-[var(--status-planned-bg)]',
    text: 'text-[var(--status-planned-text)]',
    dot: 'bg-[#D97706]',
  },
  published: {
    label: 'Dipublikasikan',
    bg: 'bg-[var(--status-published-bg)]',
    text: 'text-[var(--status-published-text)]',
    dot: 'bg-[#16A34A]',
  },
};

export function StatusBadge({
  status,
  className,
}: {
  status: ContentStatus;
  className?: string;
}) {
  const cfg = STATUS_MAP[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-medium',
        cfg.bg,
        cfg.text,
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} aria-hidden="true" />
      {cfg.label}
    </span>
  );
}
