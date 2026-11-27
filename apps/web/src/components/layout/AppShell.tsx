'use client';

import {
  CalendarDays,
  FolderOpen,
  Home,
  LayoutGrid,
  Menu,
  Package,
  Palette,
  Plus,
  Settings,
  Sparkles,
  Store,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { ModalOrSheet } from '@/components/ui/ModalOrSheet';
import { QuotaPill } from '@/components/ui/QuotaPill';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/cn';

export interface AppShellProps {
  pageTitle: string;
  businessName?: string;
  userName?: string;
  quotaRemaining?: number;
  quotaLimit?: number;
  children: ReactNode;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PRIMARY_NAV: NavItem[] = [
  { label: 'Beranda', href: '/dashboard', icon: Home },
];

const BUSINESS_NAV: NavItem[] = [
  { label: 'Profil Bisnis', href: '/business', icon: Store },
  { label: 'Produk & Layanan', href: '/products', icon: Package },
];

const STUDIO_NAV: NavItem[] = [
  { label: 'AI Content', href: '/studio', icon: Sparkles },
  { label: 'Design Studio', href: '/designs', icon: Palette },
  { label: 'Marketing Plan', href: '/planner', icon: CalendarDays },
  { label: 'Pustaka Materi', href: '/library', icon: FolderOpen },
];

const MORE_SHEET_NAV: NavItem[] = [
  { label: 'Profil Bisnis', href: '/business', icon: Store },
  { label: 'Design Studio', href: '/designs', icon: Palette },
  { label: 'Pustaka Materi', href: '/library', icon: FolderOpen },
  { label: 'Pengaturan Akun', href: '/account', icon: Settings },
];

function SidebarContent({
  pathname,
  businessName,
  onNavigate,
}: {
  pathname: string;
  businessName: string;
  onNavigate?: () => void;
}) {
  const renderLink = (item: NavItem) => {
    const Icon = item.icon;
    const isActive =
      pathname === item.href ||
      (item.href === '/dashboard' && pathname === '/');

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onNavigate}
        className={cn(
          'flex min-h-[44px] items-center gap-3 rounded-[8px] px-3 py-2 text-[14px] font-medium transition-colors',
          isActive
            ? 'bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]'
            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
        )}
      >
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="truncate">{item.label}</span>
      </Link>
    );
  };

  return (
    <div className="flex h-full flex-col justify-between bg-[var(--bg-surface)] px-3 py-4">
      <div className="space-y-5">
        <div className="flex items-center gap-2.5 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[var(--brand-primary)] text-white">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          </div>
          <span className="font-heading text-[18px] font-bold tracking-tight text-[var(--text-primary)]">
            DagangAI
          </span>
        </div>

        <nav aria-label="Navigasi utama" className="space-y-5">
          <div className="space-y-1">{PRIMARY_NAV.map(renderLink)}</div>

          <div>
            <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-wider text-[var(--text-muted)] uppercase">
              Bisnis
            </p>
            <div className="space-y-1">{BUSINESS_NAV.map(renderLink)}</div>
          </div>

          <div>
            <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-wider text-[var(--text-muted)] uppercase">
              Studio &amp; Konten
            </p>
            <div className="space-y-1">{STUDIO_NAV.map(renderLink)}</div>
          </div>
        </nav>
      </div>

      <div className="space-y-2 border-t border-[var(--border-default)] pt-3">
        {renderLink({ label: 'Pengaturan Akun', href: '/account', icon: Settings })}
        <div className="rounded-[8px] bg-[var(--bg-subtle)] px-3 py-2">
          <p className="text-[11px] text-[var(--text-muted)]">Bisnis Aktif</p>
          <p className="truncate text-[13px] font-medium text-[var(--text-primary)]">
            {businessName}
          </p>
        </div>
      </div>
    </div>
  );
}

export function AppShell({
  pageTitle,
  businessName,
  userName,
  quotaRemaining,
  quotaLimit,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const resolvedBusinessName =
    businessName ?? user?.business_summary?.name ?? 'Usaha Anda';
  const resolvedUserName = userName ?? user?.full_name ?? 'Pengguna';
  const resolvedQuotaRemaining =
    quotaRemaining ?? user?.ai_quota?.daily_credits_remaining ?? 30;
  const resolvedQuotaLimit =
    quotaLimit ?? user?.ai_quota?.daily_credits_limit ?? 30;

  const userInitial = resolvedUserName.trim().charAt(0).toUpperCase() || 'U';

  return (
    <div className="min-h-screen w-full overflow-x-clip bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      {/* Desktop Fixed Sidebar (>= 1024px) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[240px] border-r border-[var(--border-default)] lg:block">
        <SidebarContent pathname={pathname} businessName={resolvedBusinessName} />
      </aside>

      {/* Tablet Collapsible Drawer (768px - 1023px) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 hidden md:block lg:hidden">
          <div
            className="fixed inset-0 bg-black/35"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-10 h-full w-[260px] border-r border-[var(--border-default)] bg-[var(--bg-surface)] shadow-[var(--shadow-floating)]">
            <div className="flex items-center justify-end px-3 pt-3">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Tutup menu"
                className="flex h-11 w-11 items-center justify-center rounded-[8px] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarContent
              pathname={pathname}
              businessName={resolvedBusinessName}
              onNavigate={() => setDrawerOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* Content Column */}
      <div className="flex min-h-screen flex-col lg:pl-[240px]">
        {/* Top Utility Bar */}
        <header className="sticky top-0 z-20 flex h-[56px] items-center justify-between gap-3 border-b border-[var(--border-default)] bg-[var(--bg-surface)]/95 px-4 backdrop-blur md:h-[60px] md:px-6 lg:h-[64px]">
          <div className="flex min-w-0 items-center gap-3">
            {/* Tablet Hamburger */}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Buka menu navigasi"
              className="hidden h-11 w-11 items-center justify-center rounded-[8px] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] md:flex lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Mobile Brand */}
            <div className="flex items-center gap-2 md:hidden">
              <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[var(--brand-primary)] text-white">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              </div>
              <span className="font-heading text-[16px] font-bold text-[var(--text-primary)]">
                DagangAI
              </span>
            </div>

            {/* Desktop/Tablet Page Title */}
            <h1 className="hidden truncate font-heading text-[18px] font-bold text-[var(--text-primary)] md:block lg:text-[20px]">
              {pageTitle}
            </h1>
          </div>

          <div className="flex shrink-0 items-center gap-2 md:gap-3">
            <div className="md:hidden">
              <QuotaPill remaining={resolvedQuotaRemaining} limit={resolvedQuotaLimit} compact />
            </div>
            <div className="hidden md:block">
              <QuotaPill remaining={resolvedQuotaRemaining} limit={resolvedQuotaLimit} />
            </div>

            <Link href="/studio" className="hidden md:inline-flex">
              <Button variant="primary" size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                Buat
              </Button>
            </Link>

            <Link
              href="/account"
              aria-label="Pengaturan akun"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand-primary-soft)] font-heading text-[14px] font-bold text-[var(--brand-primary)]"
            >
              {userInitial}
            </Link>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 pt-4 pb-[84px] md:px-6 md:py-6">
          <div className="mb-4 md:hidden">
            <h1 className="font-heading text-[20px] font-bold text-[var(--text-primary)]">
              {pageTitle}
            </h1>
          </div>
          {children}
        </main>
      </div>

      {/* Mobile Bottom Nav (360px - 767px) */}
      <nav
        aria-label="Navigasi bawah"
        className="fixed inset-x-0 bottom-0 z-30 grid h-[64px] grid-cols-5 border-t border-[var(--border-default)] bg-[var(--bg-surface)] px-1 md:hidden"
      >
        <Link
          href="/dashboard"
          className={cn(
            'flex min-h-[44px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium',
            pathname === '/dashboard' || pathname === '/'
              ? 'text-[var(--brand-primary)]'
              : 'text-[var(--text-secondary)]'
          )}
        >
          <Home className="h-5 w-5" aria-hidden="true" />
          <span>Beranda</span>
        </Link>

        <Link
          href="/products"
          className={cn(
            'flex min-h-[44px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium',
            pathname.startsWith('/products')
              ? 'text-[var(--brand-primary)]'
              : 'text-[var(--text-secondary)]'
          )}
        >
          <Package className="h-5 w-5" aria-hidden="true" />
          <span>Produk</span>
        </Link>

        <Link
          href="/studio"
          className="flex min-h-[44px] flex-col items-center justify-center gap-0.5 text-[11px] font-semibold text-[var(--brand-primary)]"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand-primary)] text-white shadow-sm">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          </span>
          <span>AI</span>
        </Link>

        <Link
          href="/planner"
          className={cn(
            'flex min-h-[44px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium',
            pathname.startsWith('/planner')
              ? 'text-[var(--brand-primary)]'
              : 'text-[var(--text-secondary)]'
          )}
        >
          <CalendarDays className="h-5 w-5" aria-hidden="true" />
          <span>Plan</span>
        </Link>

        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className="flex min-h-[44px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-[var(--text-secondary)]"
        >
          <LayoutGrid className="h-5 w-5" aria-hidden="true" />
          <span>Lainnya</span>
        </button>
      </nav>

      {/* Bottom Sheet "Lainnya" untuk Mobile */}
      <ModalOrSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        title="Menu Lainnya"
      >
        <div className="grid grid-cols-1 gap-2">
          {MORE_SHEET_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreOpen(false)}
                className="flex min-h-[48px] items-center gap-3 rounded-[10px] border border-[var(--border-default)] bg-[var(--bg-canvas)] px-4 py-3 text-[15px] font-medium text-[var(--text-primary)] active:bg-[var(--bg-subtle)]"
              >
                <Icon className="h-5 w-5 text-[var(--brand-primary)]" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </ModalOrSheet>
    </div>
  );
}
