'use client';

import { Sparkles } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { EmptyStateCard } from '@/components/ui/EmptyStateCard';
import { useToast } from '@/components/ui/Toast';

export function ModulePlaceholder({
  title,
  description,
  phaseNote,
}: {
  title: string;
  description: string;
  phaseNote: string;
}) {
  const { showToast } = useToast();

  return (
    <AppShell pageTitle={title} businessName="DagangAI Workspace">
      <EmptyStateCard
        icon={<Sparkles className="h-6 w-6" />}
        title={title}
        description={description}
        actionLabel="Cek Status Modul"
        onAction={() => showToast(phaseNote, 'info')}
      />
    </AppShell>
  );
}
