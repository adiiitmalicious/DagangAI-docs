import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface QuotaPillProps {
  remaining: number;
  limit: number;
  compact?: boolean;
  className?: string;
}

export function QuotaPill({
  remaining,
  limit,
  compact = false,
  className,
}: QuotaPillProps) {
  const ratio = limit > 0 ? remaining / limit : 0;

  let toneClasses =
    'bg-[var(--bg-subtle)] text-[var(--text-primary)] border-[var(--border-default)]';
  let label = compact ? `AI: ${remaining}/${limit}` : `Kuota AI: ${remaining}/${limit}`;

  if (remaining <= 0) {
    toneClasses =
      'bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] border-transparent';
    label = compact ? 'AI: 0' : 'Kuota AI Habis';
  } else if (ratio <= 0.2) {
    toneClasses =
      'bg-[var(--status-planned-bg)] text-[var(--status-planned-text)] border-transparent';
    label = compact
      ? `AI: ${remaining}/${limit}`
      : `AI: ${remaining}/${limit} — Reset 00.00 WIB`;
  }

  return (
    <div
      className={cn(
        'tabular-nums inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium whitespace-nowrap',
        toneClasses,
        className
      )}
      title="Kuota kredit AI harian direset setiap pukul 00.00 WIB"
    >
      <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
