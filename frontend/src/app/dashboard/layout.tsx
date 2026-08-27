'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  BadgeHelp,
  Building2,
  ChevronRight,
  CircleUserRound,
  FileText,
  Home,
  Languages,
  LayoutGrid,
  LogOut,
  MessageCircle,
  Moon,
  MoreHorizontal,
  Palette,
  Plus,
  Sparkles,
  Sun,
  TrendingUp,
  UsersRound,
  X,
} from 'lucide-react';
import { useAppPreferences } from '@/components/AppPreferencesProvider';
import type { Locale } from '@/i18n';
import type { ThemeMode } from '@/lib/theme';
import { useAuthStore } from '@/store/useAuthStore';

interface ShellNavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  matchPrefix?: boolean;
}

function isActiveRoute(pathname: string, item: ShellNavItem): boolean {
  if (item.href === '/dashboard') return pathname === item.href;
  return item.matchPrefix ? pathname.startsWith(item.href) : pathname === item.href;
}

function DesktopNavItem({ item, pathname }: { item: ShellNavItem; pathname: string }) {
  const active = isActiveRoute(pathname, item);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={`group relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
        active
          ? 'bg-[var(--ui-surface-muted)] text-[var(--ui-text)]'
          : 'text-[var(--ui-text-muted)] hover:bg-[var(--ui-surface-muted)] hover:text-[var(--ui-text)]'
      }`}
    >
      {active && <span className="absolute inset-y-2 left-0 w-1 rounded-full bg-[var(--ui-brand-strong)]" />}
      <Icon size={19} strokeWidth={active ? 2.3 : 1.8} />
      <span>{item.label}</span>
    </Link>
  );
}

function MobileNavLink({ item, pathname }: { item: ShellNavItem; pathname: string }) {
  const active = isActiveRoute(pathname, item);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={`relative flex min-h-16 flex-1 flex-col items-center justify-center gap-1 px-1 text-[11px] font-semibold ${
        active ? 'text-[var(--ui-brand-strong)]' : 'text-[var(--ui-text-muted)]'
      }`}
    >
      <Icon size={21} strokeWidth={active ? 2.4 : 1.8} />
      <span>{item.label}</span>
      {active && <span className="absolute bottom-1 h-1 w-5 rounded-full bg-[var(--ui-brand-strong)]" />}
    </Link>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, loadUser, logout } = useAuthStore();
  const { locale, setLocale, themeMode, setThemeMode, t } = useAppPreferences();
  const [authChecked, setAuthChecked] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const initAuth = async () => {
      const activeUser = await loadUser();
      if (!activeUser) router.push('/auth/login');
      else setAuthChecked(true);
    };
    void initAuth();
  }, [loadUser, router]);

  useEffect(() => {
    const dialog = moreDialogRef.current;
    if (!dialog) return;
    if (moreOpen && !dialog.open) dialog.showModal();
    if (!moreOpen && dialog.open) dialog.close();
  }, [moreOpen]);

  const primaryNav = useMemo<ShellNavItem[]>(() => [
    { href: '/dashboard', label: t('nav.today'), icon: Home },
    { href: '/dashboard/properties', label: t('nav.listings'), icon: LayoutGrid, matchPrefix: true },
    { href: '/dashboard/leads', label: t('nav.leads'), icon: UsersRound, matchPrefix: true },
  ], [t]);

  const secondaryNav = useMemo<ShellNavItem[]>(() => [
    { href: '/dashboard/chats', label: t('nav.conversations'), icon: MessageCircle, matchPrefix: true },
    { href: '/dashboard/settings', label: t('nav.branding'), icon: Palette },
    { href: '/dashboard/settings/profile', label: t('nav.profile'), icon: CircleUserRound },
    { href: '/dashboard/growth', label: t('nav.growth'), icon: TrendingUp },
  ], [t]);

  const moreRouteActive = [...secondaryNav].some((item) => isActiveRoute(pathname, item));
  const workspaceName = user?.tenant?.name || t('shell.workspaceFallback');
  const workspaceLogo = user?.tenant?.logo_url;
  const userInitial = user?.name?.trim()?.[0]?.toUpperCase() || 'B';
  const localeCode = locale === 'hi' ? 'hi-IN' : locale === 'mr' ? 'mr-IN' : 'en-IN';

  if (isLoading || !authChecked) {
    return (
      <div className="os-page-shell grid min-h-screen place-items-center px-6" role="status" aria-live="polite">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] text-[var(--ui-brand-strong)] shadow-sm">
            <Building2 size={26} />
          </span>
          <div className="flex gap-1.5" aria-hidden="true">
            {[0, 1, 2].map((index) => (
              <span
                key={index}
                className="h-2 w-2 animate-pulse rounded-full bg-[var(--ui-brand-strong)]"
                style={{ animationDelay: `${index * 140}ms` }}
              />
            ))}
          </div>
          <p className="text-sm font-medium text-[var(--ui-text-muted)]">{t('shell.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="os-page-shell min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-[var(--ui-border)] bg-[var(--ui-surface)] lg:flex">
        <div className="flex h-20 items-center gap-3 border-b border-[var(--ui-border)] px-5">
          <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[var(--ui-brand)] font-bold text-[var(--ui-brand-ink)]">
            {workspaceLogo
              ? <Image src={workspaceLogo} alt="" width={44} height={44} unoptimized className="h-full w-full object-cover" />
              : userInitial}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-[var(--ui-text)]">{workspaceName}</p>
            <p className="mt-0.5 text-xs text-[var(--ui-text-muted)]">{t('shell.brokerWorkspace')}</p>
          </div>
        </div>

        <div className="px-4 pt-5">
          <Link href="/dashboard/properties/new" className="os-btn-primary w-full">
            <Plus size={18} />
            {t('listing.new')}
          </Link>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-5" aria-label="Workspace">
          {primaryNav.map((item) => <DesktopNavItem key={item.href} item={item} pathname={pathname} />)}
          <div className="my-3 border-t border-[var(--ui-border)]" />
          {secondaryNav.map((item) => <DesktopNavItem key={item.href} item={item} pathname={pathname} />)}
        </nav>

        <div className="border-t border-[var(--ui-border)] p-3">
          <div className="flex items-center gap-3 rounded-xl p-2">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--ui-surface-muted)] text-sm font-bold text-[var(--ui-brand-strong)]">
              {userInitial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[var(--ui-text)]">{user?.name}</p>
              <p className="truncate text-xs text-[var(--ui-text-muted)]">{user?.role}</p>
            </div>
            <button type="button" onClick={logout} className="os-btn-icon" aria-label={t('nav.signOut')} title={t('nav.signOut')}>
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[var(--ui-border)] bg-[color-mix(in_srgb,var(--ui-surface)_94%,transparent)] px-4 backdrop-blur-xl lg:hidden">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-[var(--ui-brand)] text-sm font-bold text-[var(--ui-brand-ink)]">
            {workspaceLogo
              ? <Image src={workspaceLogo} alt="" width={40} height={40} unoptimized className="h-full w-full object-cover" />
              : userInitial}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-[var(--ui-text)]">{workspaceName}</p>
            <p className="text-xs text-[var(--ui-text-muted)]">{t('shell.brokerWorkspace')}</p>
          </div>
        </div>
        <Link href="/dashboard/properties/new" className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--ui-brand)] text-[var(--ui-brand-ink)]" aria-label={t('listing.new')}>
          <Plus size={20} />
        </Link>
      </header>

      <main className="min-h-screen lg:ml-60">
        <div className="mx-auto max-w-[1280px] px-4 py-5 pb-28 sm:px-5 md:px-6 md:py-8 lg:px-8 lg:pb-10">
          {user?.tenant?.plan_status === 'PILOT' && (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--ui-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--ui-warning)_9%,var(--ui-surface))] px-4 py-3 text-sm text-[var(--ui-text)]">
              <span>
                <b>{t('pilot.title')}</b>
                {' · '}{t('pilot.freeUntil')}{' '}
                {user.tenant.pilot_ends_at
                  ? new Date(user.tenant.pilot_ends_at).toLocaleDateString(localeCode, { day: 'numeric', month: 'short' })
                  : '—'}
              </span>
              <Link href="/dashboard/growth" className="font-bold text-[var(--ui-brand-strong)]">
                {t('pilot.viewPlan')} →
              </Link>
            </div>
          )}
          {children}
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex min-h-16 border-t border-[var(--ui-border)] bg-[color-mix(in_srgb,var(--ui-surface)_96%,transparent)] pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden" aria-label="Primary">
        {primaryNav.map((item) => <MobileNavLink key={item.href} item={item} pathname={pathname} />)}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={`relative flex min-h-16 flex-1 flex-col items-center justify-center gap-1 px-1 text-[11px] font-semibold ${moreRouteActive ? 'text-[var(--ui-brand-strong)]' : 'text-[var(--ui-text-muted)]'}`}
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
        >
          <MoreHorizontal size={21} strokeWidth={moreRouteActive ? 2.4 : 1.8} />
          <span>{t('nav.more')}</span>
          {moreRouteActive && <span className="absolute bottom-1 h-1 w-5 rounded-full bg-[var(--ui-brand-strong)]" />}
        </button>
      </nav>

      <dialog ref={moreDialogRef} className="os-dialog" onClose={() => setMoreOpen(false)} onCancel={() => setMoreOpen(false)}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--ui-border)] bg-[var(--ui-surface-raised)] px-5 py-4">
          <div>
            <p className="text-lg font-bold text-[var(--ui-text)]">{t('more.title')}</p>
            <p className="text-sm text-[var(--ui-text-muted)]">{workspaceName}</p>
          </div>
          <button type="button" onClick={() => setMoreOpen(false)} className="os-btn-icon" aria-label={t('common.close')}>
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5 p-4 pb-6">
          <nav className="space-y-1" aria-label={t('nav.more')}>
            {secondaryNav.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} onClick={() => setMoreOpen(false)} className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-[var(--ui-text)] hover:bg-[var(--ui-surface-muted)]">
                  <Icon size={20} className="text-[var(--ui-brand-strong)]" />
                  <span className="flex-1">{item.label}</span>
                  <ChevronRight size={17} className="text-[var(--ui-text-muted)]" />
                </Link>
              );
            })}
            <Link href="/support" onClick={() => setMoreOpen(false)} className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-[var(--ui-text)] hover:bg-[var(--ui-surface-muted)]">
              <BadgeHelp size={20} className="text-[var(--ui-brand-strong)]" />
              <span className="flex-1">{t('nav.support')}</span>
              <ChevronRight size={17} className="text-[var(--ui-text-muted)]" />
            </Link>
            <Link href="/privacy" onClick={() => setMoreOpen(false)} className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-[var(--ui-text)] hover:bg-[var(--ui-surface-muted)]">
              <FileText size={20} className="text-[var(--ui-brand-strong)]" />
              <span className="flex-1">{t('nav.legal')}</span>
              <ChevronRight size={17} className="text-[var(--ui-text-muted)]" />
            </Link>
          </nav>

          <section className="rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--ui-text)]">
              <Languages size={18} />
              {t('preferences.language')}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {([['en', 'English'], ['hi', 'हिंदी'], ['mr', 'मराठी']] as Array<[Locale, string]>).map(([value, label]) => (
                <button key={value} type="button" onClick={() => setLocale(value)} className={`min-h-11 rounded-xl border px-2 text-sm font-semibold ${locale === value ? 'border-[var(--ui-brand-strong)] bg-[var(--ui-surface-muted)] text-[var(--ui-brand-strong)]' : 'border-[var(--ui-border)] text-[var(--ui-text-muted)]'}`}>
                  {label}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--ui-text)]">
              <Sparkles size={18} />
              {t('preferences.theme')}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {([['LIGHT', t('theme.light'), Sun], ['DARK', t('theme.dark'), Moon]] as Array<[ThemeMode, string, typeof Sun]>).map(([value, label, Icon]) => (
                <button key={value} type="button" onClick={() => setThemeMode(value)} className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold ${themeMode === value ? 'border-[var(--ui-brand-strong)] bg-[var(--ui-surface-muted)] text-[var(--ui-brand-strong)]' : 'border-[var(--ui-border)] text-[var(--ui-text-muted)]'}`}>
                  <Icon size={17} />
                  {label}
                </button>
              ))}
            </div>
          </section>

          <button type="button" onClick={logout} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-sm font-bold text-[var(--ui-danger)] hover:bg-[color-mix(in_srgb,var(--ui-danger)_8%,transparent)]">
            <LogOut size={20} />
            {t('nav.signOut')}
          </button>
        </div>
      </dialog>
    </div>
  );
}
