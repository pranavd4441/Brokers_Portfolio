'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import type { Locale, MessageKey } from '@/i18n';
import { workspaceText } from '@/i18n/workspace';
import type { ThemeMode } from '@/lib/theme';
import { cn } from '@/lib/utils';
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
      className={cn(
        'workspace-nav-link group relative flex items-center gap-3 px-3 text-[13px] font-medium transition-colors',
        active
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : 'text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground',
      )}
    >
      <Icon size={17} strokeWidth={active ? 2.25 : 1.85} />
      <span className="truncate">{item.label}</span>
      {active && <span className="ml-auto size-1.5 shrink-0 rounded-full bg-primary" />}
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
      className={cn(
        'relative flex min-h-16 flex-1 flex-col items-center justify-center gap-1 px-1 text-[11px] font-semibold',
        active ? 'text-primary' : 'text-muted-foreground',
      )}
    >
      <Icon size={20} strokeWidth={active ? 2.35 : 1.85} />
      <span>{item.label}</span>
      {active && <span className="absolute bottom-1 h-0.5 w-5 rounded-full bg-primary" />}
    </Link>
  );
}

function routeName(pathname: string, t: (key: MessageKey) => string): string {
  if (pathname === '/dashboard') return t('nav.today');
  if (pathname.startsWith('/dashboard/properties')) return t('nav.listings');
  if (pathname.startsWith('/dashboard/leads')) return t('nav.leads');
  if (pathname.startsWith('/dashboard/chats')) return t('nav.conversations');
  if (pathname.startsWith('/dashboard/settings/profile')) return t('nav.profile');
  if (pathname.startsWith('/dashboard/settings')) return t('nav.branding');
  if (pathname.startsWith('/dashboard/growth')) return t('nav.growth');
  return t('shell.brokerWorkspace');
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, loadUser, logout } = useAuthStore();
  const { locale, setLocale, themeMode, setThemeMode, t } = useAppPreferences();
  const w = (key: Parameters<typeof workspaceText>[1]) => workspaceText(locale, key);
  const [authChecked, setAuthChecked] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null);
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

  const moreRouteActive = secondaryNav.some((item) => isActiveRoute(pathname, item));
  const workspaceName = user?.tenant?.name || t('shell.workspaceFallback');
  const workspaceLogo = user?.tenant?.logo_url;
  const workspaceInitial = workspaceName.trim().charAt(0).toUpperCase();
  const userInitial = user?.name?.trim()?.[0]?.toUpperCase() || 'B';
  const localeCode = locale === 'hi' ? 'hi-IN' : locale === 'mr' ? 'mr-IN' : 'en-IN';
  const pilotEnd = user?.tenant?.pilot_ends_at
    ? new Date(user.tenant.pilot_ends_at).toLocaleDateString(localeCode, { day: 'numeric', month: 'short' })
    : null;

  if (isLoading || !authChecked) {
    return (
      <div className="os-page-shell grid min-h-screen place-items-center px-6" role="status" aria-live="polite">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="grid size-12 place-items-center rounded-xl border bg-card text-primary shadow-sm">
            <Building2 size={23} />
          </span>
          <div className="flex gap-1.5" aria-hidden="true">
            {[0, 1, 2].map((index) => (
              <span key={index} className="size-1.5 animate-pulse rounded-full bg-primary" style={{ animationDelay: `${index * 140}ms` }} />
            ))}
          </div>
          <p className="text-sm font-medium text-muted-foreground">{t('shell.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="workspace-shell os-page-shell min-h-screen">
      <aside aria-label={w('workspace')} className="workspace-sidebar fixed inset-y-0 left-0 z-40 hidden w-56 flex-col lg:flex">
        <div className="flex h-24 items-center gap-3 px-5">
          <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-card text-lg font-semibold text-foreground">
            {workspaceLogo && failedLogoUrl !== workspaceLogo
              ? <Image src={workspaceLogo} alt="" width={36} height={36} unoptimized className="size-full object-cover" onError={() => setFailedLogoUrl(workspaceLogo)} />
              : workspaceInitial}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-sidebar-foreground">{workspaceName}</p>
            <p className="truncate text-[11px] text-muted-foreground">{t('shell.brokerWorkspace')}</p>
          </div>
        </div>

        <div className="px-4 pb-2">
          <Link href="/dashboard/properties/new" className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}>
            <Plus data-icon="inline-start" />
            {t('listing.new')}
          </Link>
        </div>

        <nav className="flex flex-1 flex-col gap-1.5 overflow-y-auto px-4 py-5" aria-label={w('workspace')}>
          <p className="workspace-eyebrow px-3 pb-2">{w('workspace')}</p>
          {primaryNav.map((item) => <DesktopNavItem key={item.href} item={item} pathname={pathname} />)}
          <p className="workspace-eyebrow mt-7 px-3 pb-2">{w('business')}</p>
          {secondaryNav.map((item) => <DesktopNavItem key={item.href} item={item} pathname={pathname} />)}
        </nav>

        <Link href="/support" className="mx-4 mb-5 flex flex-col gap-2 rounded-xl border border-border p-4 transition-colors hover:bg-card">
          <BadgeHelp size={19} className="text-muted-foreground" />
          <span className="text-xs font-semibold">{w('support')}</span>
          <span className="text-[11px] leading-5 text-muted-foreground">{w('supportHint')}</span>
        </Link>
        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-2.5 rounded-xl p-2">
            <Avatar size="lg">
              <AvatarFallback className="bg-muted font-bold text-primary">{userInitial}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-foreground">{user?.name}</p>
              <p className="truncate text-[10px] text-muted-foreground">{user?.role}</p>
            </div>
            <Button type="button" onClick={logout} variant="ghost" size="icon-sm" aria-label={t('nav.signOut')} title={t('nav.signOut')}>
              <LogOut />
            </Button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-56">
        <div className="workspace-main">
        <header className="sticky top-0 z-30 hidden h-16 items-center justify-between rounded-tl-3xl bg-card/95 px-7 backdrop-blur-xl lg:flex xl:px-10">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{routeName(pathname, t)}</span>
            <span aria-hidden="true">/</span>
            <span>{workspaceName}</span>
          </div>
          <div className="flex items-center gap-2">
            {user?.tenant?.plan_status === 'PILOT' && (
              <Link href="/dashboard/growth" className="flex min-h-11 items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Badge variant="outline" className="h-7 gap-1.5 border-[color-mix(in_srgb,var(--ui-warning)_32%,var(--ui-border))] bg-[color-mix(in_srgb,var(--ui-warning)_7%,var(--ui-surface))] text-foreground">
                  <span className="size-1.5 rounded-full bg-[var(--ui-warning)]" />
                  {t('pilot.title')}{pilotEnd ? ` · ${pilotEnd}` : ''}
                </Badge>
              </Link>
            )}
            <Button type="button" variant="ghost" size="icon" onClick={() => setThemeMode(themeMode === 'LIGHT' ? 'DARK' : 'LIGHT')} aria-label={w(themeMode === 'LIGHT' ? 'dark' : 'light')}>
              {themeMode === 'LIGHT' ? <Moon /> : <Sun />}
            </Button>
            <Button type="button" variant="ghost" size="icon" onClick={() => setMoreOpen(true)} aria-label={w('preferences')}>
              <MoreHorizontal />
            </Button>
          </div>
        </header>

        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card/95 px-4 backdrop-blur-xl lg:hidden">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-primary text-xs font-bold text-primary-foreground">
              {workspaceLogo && failedLogoUrl !== workspaceLogo
                ? <Image src={workspaceLogo} alt="" width={36} height={36} unoptimized className="size-full object-cover" onError={() => setFailedLogoUrl(workspaceLogo)} />
                : workspaceInitial}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-foreground">{routeName(pathname, t)}</p>
              <p className="truncate text-[11px] text-muted-foreground">{workspaceName}</p>
            </div>
          </div>
          <Link href="/dashboard/properties/new" className={buttonVariants({ size: 'icon' })} aria-label={t('listing.new')}>
            <Plus />
          </Link>
        </header>

        <main className="min-h-[calc(100vh-3.5rem)]">
          <div className="mx-auto max-w-[1440px] px-4 py-6 pb-28 sm:px-6 lg:px-7 lg:py-5 lg:pb-10 xl:px-10">
            {children}
          </div>
        </main>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex min-h-16 border-t bg-background/96 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden" aria-label={w('workspace')}>
        {primaryNav.map((item) => <MobileNavLink key={item.href} item={item} pathname={pathname} />)}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={cn('relative flex min-h-16 flex-1 flex-col items-center justify-center gap-1 px-1 text-[11px] font-semibold', moreRouteActive ? 'text-primary' : 'text-muted-foreground')}
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
        >
          <MoreHorizontal size={20} strokeWidth={moreRouteActive ? 2.35 : 1.85} />
          <span>{t('nav.more')}</span>
          {moreRouteActive && <span className="absolute bottom-1 h-0.5 w-5 rounded-full bg-primary" />}
        </button>
      </nav>

      <dialog ref={moreDialogRef} className="os-dialog" aria-label={t('more.title')} onClose={() => setMoreOpen(false)} onCancel={() => setMoreOpen(false)}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-card px-5 py-4">
          <div>
            <p className="text-lg font-bold text-foreground">{t('more.title')}</p>
            <p className="text-sm text-muted-foreground">{workspaceName}</p>
          </div>
          <Button type="button" onClick={() => setMoreOpen(false)} variant="ghost" size="icon" aria-label={t('common.close')}>
            <X />
          </Button>
        </div>

        <div className="flex flex-col gap-5 p-4 pb-6">
          <nav className="flex flex-col gap-1" aria-label={t('nav.more')}>
            {secondaryNav.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} onClick={() => setMoreOpen(false)} className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-foreground hover:bg-muted">
                  <Icon size={19} className="text-primary" />
                  <span className="flex-1">{item.label}</span>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </Link>
              );
            })}
            <Link href="/support" onClick={() => setMoreOpen(false)} className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-foreground hover:bg-muted">
              <BadgeHelp size={19} className="text-primary" />
              <span className="flex-1">{t('nav.support')}</span>
              <ChevronRight size={16} className="text-muted-foreground" />
            </Link>
            <Link href="/privacy" onClick={() => setMoreOpen(false)} className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-foreground hover:bg-muted">
              <FileText size={19} className="text-primary" />
              <span className="flex-1">{t('nav.legal')}</span>
              <ChevronRight size={16} className="text-muted-foreground" />
            </Link>
          </nav>

          <section className="rounded-xl border bg-card p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
              <Languages size={17} />
              {t('preferences.language')}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {([['en', 'English'], ['hi', 'हिंदी'], ['mr', 'मराठी']] as Array<[Locale, string]>).map(([value, label]) => (
                <Button key={value} type="button" onClick={() => setLocale(value)} variant={locale === value ? 'secondary' : 'outline'} aria-pressed={locale === value}>
                  {label}
                </Button>
              ))}
            </div>
          </section>

          <section className="rounded-xl border bg-card p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
              <Sparkles size={17} />
              {t('preferences.theme')}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {([['LIGHT', t('theme.light'), Sun], ['DARK', t('theme.dark'), Moon]] as Array<[ThemeMode, string, typeof Sun]>).map(([value, label, Icon]) => (
                <Button key={value} type="button" onClick={() => setThemeMode(value)} variant={themeMode === value ? 'secondary' : 'outline'} aria-pressed={themeMode === value}>
                  <Icon data-icon="inline-start" />
                  {label}
                </Button>
              ))}
            </div>
          </section>

          <Button type="button" onClick={logout} variant="destructive" className="justify-start">
            <LogOut data-icon="inline-start" />
            {t('nav.signOut')}
          </Button>
        </div>
      </dialog>
    </div>
  );
}
