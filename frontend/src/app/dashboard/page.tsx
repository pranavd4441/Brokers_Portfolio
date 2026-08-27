'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  CalendarClock,
  CameraOff,
  Clock3,
  Eye,
  LayoutGrid,
  MessageCircle,
  Phone,
  Plus,
  RefreshCw,
  UserRoundPlus,
} from 'lucide-react';
import OnboardingChecklist from '@/components/OnboardingChecklist';
import { fetchApi } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';

interface PropertyImage {
  id: string;
  url: string;
  thumbnail_url: string;
}

interface Property {
  id: string;
  title: string;
  status: string;
  area: string;
  city: string;
  images: PropertyImage[];
  expires_at?: string | null;
  views_count?: number;
  leads_count?: number;
  slug?: string;
  created_at: string;
}

interface Lead {
  id: string;
  buyer_name: string;
  phone: string;
  status: string;
  source: string;
  property: string | null;
  property_title?: string | null;
  created_at: string;
  updated_at: string;
}

interface DashboardMetrics {
  summary: {
    total_properties: number;
    total_views: number;
    whatsapp_clicks: number;
    phone_clicks: number;
  };
  performance_chart: Array<{ date: string; views: number; clicks: number }>;
}

interface ActionItem {
  id: string;
  title: string;
  detail: string;
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  tone: 'brand' | 'warning' | 'danger' | 'info';
  timestamp: number;
  priority: number;
}

const PUBLIC_PROPERTY_STATUSES = new Set(['AVAILABLE', 'NEGOTIATION', 'SITE_VISIT', 'BOOKED']);

const toneClasses: Record<ActionItem['tone'], string> = {
  brand: 'bg-[color-mix(in_srgb,var(--ui-brand)_12%,var(--ui-surface))] text-[var(--ui-brand-strong)]',
  warning: 'bg-[color-mix(in_srgb,var(--ui-warning)_12%,var(--ui-surface))] text-[var(--ui-warning)]',
  danger: 'bg-[color-mix(in_srgb,var(--ui-danger)_10%,var(--ui-surface))] text-[var(--ui-danger)]',
  info: 'bg-[color-mix(in_srgb,var(--ui-info)_10%,var(--ui-surface))] text-[var(--ui-info)]',
};

function relativeTime(value: string, currentTime: number): string {
  const difference = currentTime - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(difference / 60_000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getDaysUntil(value: string | null | undefined, currentTime: number): number | null {
  if (!value) return null;
  return Math.ceil((new Date(value).getTime() - currentTime) / 86_400_000);
}

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: React.ComponentType<{ size?: number }> }) {
  return (
    <article className="os-surface p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-[var(--ui-text-muted)]">{label}</p>
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--ui-surface-muted)] text-[var(--ui-brand-strong)]">
          <Icon size={19} />
        </span>
      </div>
      <p className="mt-4 text-3xl font-bold tracking-[-0.04em] text-[var(--ui-text)]">{value.toLocaleString('en-IN')}</p>
    </article>
  );
}

function SectionError({ title, onRetry }: { title: string; onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-[color-mix(in_srgb,var(--ui-danger)_25%,var(--ui-border))] bg-[var(--ui-surface)] p-5">
      <p className="font-bold text-[var(--ui-text)]">{title}</p>
      <p className="mt-1 text-sm text-[var(--ui-text-muted)]">The rest of your workspace remains available.</p>
      <button type="button" onClick={onRetry} className="os-btn-ghost mt-4 px-4">
        <RefreshCw size={16} />
        Retry
      </button>
    </div>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const [currentTime] = useState(Date.now);

  const propertiesQuery = useQuery<Property[]>({
    queryKey: ['properties'],
    queryFn: () => fetchApi('/properties/'),
  });
  const leadsQuery = useQuery<Lead[]>({
    queryKey: ['leads'],
    queryFn: () => fetchApi('/leads/'),
  });
  const metricsQuery = useQuery<DashboardMetrics>({
    queryKey: ['dashboardMetrics'],
    queryFn: () => fetchApi('/analytics/dashboard/'),
    staleTime: 30_000,
  });

  const properties = useMemo(() => propertiesQuery.data ?? [], [propertiesQuery.data]);
  const leads = useMemo(() => leadsQuery.data ?? [], [leadsQuery.data]);
  const activeListings = properties.filter((property) => PUBLIC_PROPERTY_STATUSES.has(property.status)).length;

  const actions = useMemo<ActionItem[]>(() => {
    const items: ActionItem[] = [];

    leads.forEach((lead) => {
      const timestamp = new Date(lead.updated_at || lead.created_at).getTime();
      if (lead.status === 'NEW') {
        items.push({
          id: `lead-new-${lead.id}`,
          title: lead.source === 'WHATSAPP_CLICK' ? 'New WhatsApp enquiry' : lead.source === 'PHONE_CLICK' ? 'New phone enquiry' : 'New uncontacted lead',
          detail: `${lead.buyer_name}${lead.property_title ? ` · ${lead.property_title}` : ''} · ${relativeTime(lead.created_at, currentTime)}`,
          href: `/dashboard/leads?lead=${lead.id}`,
          label: 'Contact lead',
          icon: UserRoundPlus,
          tone: 'brand',
          timestamp,
          priority: 1,
        });
      } else if (lead.status === 'CONTACTED' && currentTime - timestamp > 48 * 60 * 60 * 1000) {
        items.push({
          id: `lead-stale-${lead.id}`,
          title: 'No lead update for 48 hours',
          detail: `${lead.buyer_name}${lead.property_title ? ` · ${lead.property_title}` : ''}`,
          href: `/dashboard/leads?lead=${lead.id}`,
          label: 'Review lead',
          icon: Clock3,
          tone: 'warning',
          timestamp,
          priority: 3,
        });
      }
    });

    properties.forEach((property) => {
      const expiryDays = getDaysUntil(property.expires_at, currentTime);
      if (PUBLIC_PROPERTY_STATUSES.has(property.status) && expiryDays !== null && expiryDays >= 0 && expiryDays <= 7) {
        items.push({
          id: `property-expiry-${property.id}`,
          title: expiryDays === 0 ? 'Listing expires today' : `Listing expires in ${expiryDays} ${expiryDays === 1 ? 'day' : 'days'}`,
          detail: `${property.title} · ${property.area}, ${property.city}`,
          href: `/dashboard/properties/${property.id}`,
          label: 'Review listing',
          icon: CalendarClock,
          tone: expiryDays <= 1 ? 'danger' : 'warning',
          timestamp: new Date(property.expires_at ?? 0).getTime(),
          priority: 4,
        });
      }
      if (!property.images?.length) {
        items.push({
          id: `property-photo-${property.id}`,
          title: 'Listing needs photos',
          detail: `${property.title} · stronger pages start with a clear cover image`,
          href: `/dashboard/properties/${property.id}/edit`,
          label: 'Add photos',
          icon: CameraOff,
          tone: 'info',
          timestamp: new Date(property.created_at).getTime(),
          priority: 5,
        });
      }
    });

    return items.sort((first, second) => first.priority - second.priority || second.timestamp - first.timestamp).slice(0, 7);
  }, [currentTime, leads, properties]);

  const chart = metricsQuery.data?.performance_chart ?? [];
  const maxChartValue = Math.max(...chart.map((item) => item.views), 1);
  const firstName = user?.name?.trim().split(/\s+/)[0] || 'Broker';

  return (
    <div className="space-y-7 os-fade-in">
      <OnboardingChecklist />

      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--ui-brand-strong)]">Welcome back, {firstName}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-[-0.04em] text-[var(--ui-text)] sm:text-4xl">Your action desk</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--ui-text-muted)]">Start with the work that can move a buyer or listing forward today.</p>
        </div>
        <Link href="/dashboard/properties/new" className="os-btn-primary shrink-0">
          <Plus size={18} />
          New listing
        </Link>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,.75fr)]">
        <section className="os-surface overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--ui-border)] px-5 py-4">
            <div>
              <h2 className="text-xl font-bold text-[var(--ui-text)]">Needs attention</h2>
              <p className="mt-1 text-sm text-[var(--ui-text-muted)]">Based on real lead and listing status</p>
            </div>
            <span className="rounded-full bg-[var(--ui-surface-muted)] px-3 py-1 text-xs font-bold text-[var(--ui-text-muted)]">{actions.length}</span>
          </div>

          {(propertiesQuery.isLoading || leadsQuery.isLoading) && (
            <div className="space-y-3 p-4">
              {[0, 1, 2].map((value) => <div key={value} className="h-20 rounded-2xl os-skeleton" />)}
            </div>
          )}
          {(propertiesQuery.isError || leadsQuery.isError) && (
            <div className="p-4">
              <SectionError title="Some action items could not be loaded" onRetry={() => { void propertiesQuery.refetch(); void leadsQuery.refetch(); }} />
            </div>
          )}
          {!propertiesQuery.isLoading && !leadsQuery.isLoading && !propertiesQuery.isError && !leadsQuery.isError && actions.length === 0 && (
            <div className="px-5 py-14 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[var(--ui-surface-muted)] text-[var(--ui-success)]"><LayoutGrid size={25} /></span>
              <h3 className="mt-4 text-lg font-bold text-[var(--ui-text)]">Nothing urgent right now</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[var(--ui-text-muted)]">
                New enquiries, listings without photos, and approaching expiry dates will appear here.
              </p>
            </div>
          )}
          {!propertiesQuery.isLoading && !leadsQuery.isLoading && actions.length > 0 && (
            <div className="divide-y divide-[var(--ui-border)]">
              {actions.map((action) => {
                const Icon = action.icon;
                return (
                  <article key={action.id} className="flex items-start gap-3 px-4 py-4 sm:px-5">
                    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${toneClasses[action.tone]}`}><Icon size={20} /></span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-[var(--ui-text)]">{action.title}</h3>
                      <p className="mt-1 text-sm leading-5 text-[var(--ui-text-muted)]">{action.detail}</p>
                    </div>
                    <Link href={action.href} className="flex min-h-11 shrink-0 items-center gap-1 rounded-xl px-2 text-xs font-bold text-[var(--ui-brand-strong)] sm:px-3">
                      <span className="hidden sm:inline">{action.label}</span>
                      <ArrowRight size={16} />
                    </Link>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Active listings" value={activeListings} icon={LayoutGrid} />
            <StatCard label="Page views" value={metricsQuery.data?.summary.total_views ?? 0} icon={Eye} />
            <StatCard label="WhatsApp clicks" value={metricsQuery.data?.summary.whatsapp_clicks ?? 0} icon={MessageCircle} />
            <StatCard label="Phone clicks" value={metricsQuery.data?.summary.phone_clicks ?? 0} icon={Phone} />
          </div>

          {metricsQuery.isError ? (
            <SectionError title="Activity metrics could not be loaded" onRetry={() => void metricsQuery.refetch()} />
          ) : (
            <article className="os-surface p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold text-[var(--ui-text)]">Last 7 days</h2>
                  <p className="mt-1 text-xs text-[var(--ui-text-muted)]">Page views with buyer CTA activity</p>
                </div>
                <div className="flex gap-3 text-[11px] text-[var(--ui-text-muted)]">
                  <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-[var(--ui-info)]" />Views</span>
                  <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-[var(--ui-brand-strong)]" />Clicks</span>
                </div>
              </div>
              {metricsQuery.isLoading ? (
                <div className="mt-6 h-36 os-skeleton" />
              ) : chart.length === 0 ? (
                <p className="mt-6 rounded-xl bg-[var(--ui-surface-muted)] px-4 py-8 text-center text-sm text-[var(--ui-text-muted)]">Activity will appear after buyers open a shared page.</p>
              ) : (
                <div className="mt-6 flex h-36 items-end gap-2" aria-label="Seven day page-view activity">
                  {chart.map((item) => (
                    <div key={item.date} className="flex h-full flex-1 flex-col justify-end gap-1">
                      <div className="relative min-h-1 w-full overflow-hidden rounded-t-md bg-[color-mix(in_srgb,var(--ui-info)_20%,var(--ui-surface-muted))]" style={{ height: `${Math.max((item.views / maxChartValue) * 100, 5)}%` }} title={`${item.date}: ${item.views} views, ${item.clicks} clicks`}>
                        <div className="absolute inset-x-0 bottom-0 bg-[var(--ui-brand-strong)]" style={{ height: item.views > 0 ? `${Math.min((item.clicks / item.views) * 100, 100)}%` : '0%' }} />
                      </div>
                      <span className="truncate text-center text-[9px] text-[var(--ui-text-muted)]">{item.date.split(' ')[0]}</span>
                    </div>
                  ))}
                </div>
              )}
            </article>
          )}
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="os-surface overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--ui-border)] px-5 py-4">
            <h2 className="text-lg font-bold text-[var(--ui-text)]">Recent listings</h2>
            <Link href="/dashboard/properties" className="text-sm font-bold text-[var(--ui-brand-strong)]">View all</Link>
          </div>
          {properties.slice(0, 3).map((property) => (
            <Link key={property.id} href={`/dashboard/properties/${property.id}`} className="flex min-h-16 items-center gap-3 border-b border-[var(--ui-border)] px-5 py-3 last:border-0 hover:bg-[var(--ui-surface-muted)]">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--ui-surface-muted)] text-[var(--ui-brand-strong)]"><LayoutGrid size={18} /></span>
              <span className="min-w-0 flex-1"><b className="block truncate text-sm text-[var(--ui-text)]">{property.title}</b><small className="text-xs text-[var(--ui-text-muted)]">{property.area}, {property.city}</small></span>
              <span className="text-xs font-semibold text-[var(--ui-text-muted)]">{property.views_count ?? 0} views</span>
            </Link>
          ))}
          {!propertiesQuery.isLoading && properties.length === 0 && <p className="px-5 py-10 text-center text-sm text-[var(--ui-text-muted)]">No listings yet.</p>}
        </section>

        <section className="os-surface overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--ui-border)] px-5 py-4">
            <h2 className="text-lg font-bold text-[var(--ui-text)]">Recent leads</h2>
            <Link href="/dashboard/leads" className="text-sm font-bold text-[var(--ui-brand-strong)]">View all</Link>
          </div>
          {leads.slice(0, 3).map((lead) => (
            <Link key={lead.id} href={`/dashboard/leads?lead=${lead.id}`} className="flex min-h-16 items-center gap-3 border-b border-[var(--ui-border)] px-5 py-3 last:border-0 hover:bg-[var(--ui-surface-muted)]">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--ui-surface-muted)] text-sm font-bold text-[var(--ui-brand-strong)]">{lead.buyer_name?.[0]?.toUpperCase() || '?'}</span>
              <span className="min-w-0 flex-1"><b className="block truncate text-sm text-[var(--ui-text)]">{lead.buyer_name}</b><small className="text-xs text-[var(--ui-text-muted)]">{lead.source.replace('_', ' ').toLowerCase()} · {relativeTime(lead.created_at, currentTime)}</small></span>
              <span className="rounded-full bg-[var(--ui-surface-muted)] px-2 py-1 text-[10px] font-bold text-[var(--ui-text-muted)]">{lead.status.replace('_', ' ')}</span>
            </Link>
          ))}
          {!leadsQuery.isLoading && leads.length === 0 && <p className="px-5 py-10 text-center text-sm text-[var(--ui-text-muted)]">No buyer enquiries yet.</p>}
        </section>
      </div>

      <section className="flex flex-col items-start justify-between gap-4 rounded-3xl bg-[var(--ui-brand-strong)] p-6 text-white sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold">Ready to share another property?</h2>
          <p className="mt-1 text-sm text-white/75">Create the page once, then reuse the same professional link with every buyer.</p>
        </div>
        <Link href="/dashboard/properties/new" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-[#174d3c]">
          <Plus size={18} />
          New listing
        </Link>
      </section>
    </div>
  );
}
