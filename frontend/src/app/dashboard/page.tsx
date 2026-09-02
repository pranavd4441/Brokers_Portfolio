'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowRight, CalendarClock, Camera, Check, Clock3, Eye, MessageCircle, RefreshCw, UserRoundPlus } from 'lucide-react';
import OnboardingChecklist from '@/components/OnboardingChecklist';
import { useAppPreferences } from '@/components/AppPreferencesProvider';
import { PropertyPhoto } from '@/components/property/PropertyPhoto';
import { WorkspaceHeader } from '@/components/workspace/WorkspaceHeader';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { workspaceText, type WorkspaceKey } from '@/i18n/workspace';
import { inventoryText } from '@/i18n/inventory';
import { fetchApi } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';

interface Property {
  id: string; title: string; status: string; area: string; city: string;
  images: { id: string; url: string; thumbnail_url: string }[];
  expires_at?: string | null; views_count?: number; created_at: string;
}
interface Lead { id: string; buyer_name: string; status: string; source: string; property_title?: string; created_at: string; updated_at: string }
interface Metrics { summary: { total_views: number; whatsapp_clicks: number; phone_clicks: number }; performance_chart: { date: string; views: number; clicks: number }[] }
interface Action { id: string; title: WorkspaceKey; detail: string; href: string; label: WorkspaceKey; kind: 'new' | 'followup' | 'expiry' | 'photo'; priority: number }
const PUBLIC = new Set(['AVAILABLE', 'NEGOTIATION', 'SITE_VISIT', 'BOOKED']);
const icons = { new: UserRoundPlus, followup: Clock3, expiry: CalendarClock, photo: Camera };

export default function DashboardPage() {
  const user = useAuthStore(s => s.user);
  const { locale } = useAppPreferences();
  const w = (key: WorkspaceKey) => workspaceText(locale, key);
  const [now] = useState(Date.now);
  const [expanded, setExpanded] = useState(false);
  const propertiesQuery = useQuery<Property[]>({ queryKey: ['properties'], queryFn: () => fetchApi('/properties/') });
  const leadsQuery = useQuery<Lead[]>({ queryKey: ['leads'], queryFn: () => fetchApi('/leads/') });
  const metricsQuery = useQuery<Metrics>({ queryKey: ['dashboardMetrics'], queryFn: () => fetchApi('/analytics/dashboard/'), staleTime: 30_000 });
  const properties = useMemo(() => propertiesQuery.data ?? [], [propertiesQuery.data]);
  const leads = useMemo(() => leadsQuery.data ?? [], [leadsQuery.data]);
  const actions = useMemo(() => {
    const items: Action[] = [];
    leads.forEach(lead => {
      if (lead.status === 'NEW') items.push({ id: `new-${lead.id}`, title: 'newLead', detail: [lead.buyer_name, lead.property_title].filter(Boolean).join(' · '), href: `/dashboard/leads?lead=${lead.id}`, label: 'contact', kind: 'new', priority: 1 });
      else if (lead.status === 'CONTACTED' && now - new Date(lead.updated_at || lead.created_at).getTime() > 48 * 3600_000) items.push({ id: `follow-${lead.id}`, title: 'followUp', detail: lead.buyer_name, href: `/dashboard/leads?lead=${lead.id}`, label: 'review', kind: 'followup', priority: 2 });
    });
    properties.forEach(property => {
      const days = property.expires_at ? Math.ceil((new Date(property.expires_at).getTime() - now) / 86400_000) : null;
      if (PUBLIC.has(property.status) && days !== null && days >= 0 && days <= 7) items.push({ id: `expiry-${property.id}`, title: 'expires', detail: property.title, href: `/dashboard/properties/${property.id}`, label: 'review', kind: 'expiry', priority: 3 });
      if (!property.images?.length && !['SOLD', 'EXPIRED'].includes(property.status)) items.push({ id: `photo-${property.id}`, title: 'photos', detail: property.title, href: `/dashboard/properties/${property.id}/${property.status === 'DRAFT' ? 'review' : 'edit'}`, label: 'review', kind: 'photo', priority: 4 });
    });
    return items.sort((a, b) => a.priority - b.priority);
  }, [leads, properties, now]);
  const loading = propertiesQuery.isLoading || leadsQuery.isLoading;
  const failed = propertiesQuery.isError || leadsQuery.isError;
  const chart = metricsQuery.data?.performance_chart ?? [];
  const max = Math.max(1, ...chart.flatMap(day => [day.views, day.clicks]));
  const hasActivity = chart.some(day => day.views || day.clicks);
  const firstName = user?.name?.split(/\s+/)[0] || 'Broker';
  const dateLocale = locale === 'en' ? 'en-IN' : `${locale}-IN`;
  const retry = () => { void propertiesQuery.refetch(); void leadsQuery.refetch(); };

  return <div className="workspace-page" data-ui-reference="workspace-v4-today">
    <WorkspaceHeader eyebrow={w('overview')} title={w('today')} description={`${w('hello')} ${firstName}. ${w('todayHint')}`} action={<p className="hidden pb-1 text-xs text-muted-foreground sm:block">{new Date(now).toLocaleDateString(dateLocale, { weekday: 'long', day: 'numeric', month: 'long' })}</p>} />
    <OnboardingChecklist />
    <dl className="workspace-stat-strip" aria-label={w('overview')}>
      {[
        { key: 'active', value: propertiesQuery.data ? properties.filter(p => PUBLIC.has(p.status)).length : null },
        { key: 'views', value: metricsQuery.data?.summary.total_views },
        { key: 'whatsapp', value: metricsQuery.data?.summary.whatsapp_clicks },
        { key: 'calls', value: metricsQuery.data?.summary.phone_clicks },
      ].map(({ key, value }) => <div key={key}><dt>{w(key as WorkspaceKey)}</dt><dd>{value?.toLocaleString(dateLocale) ?? '—'}</dd></div>)}
    </dl>
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,1fr)]">
      <div className="flex min-w-0 flex-col gap-6">
        <section className="workspace-panel" aria-label={w('attention')}>
          <div className="workspace-panel-heading"><div><h2>{w('attention')}</h2><p className="mt-1.5 text-xs text-muted-foreground">{w('attentionHint')}</p></div>{!loading && !failed && <Badge variant="secondary">{actions.length}</Badge>}</div>
          {loading ? <div className="flex flex-col gap-3 p-5">{[0,1,2].map(i => <Skeleton key={i} className="h-16" />)}</div> : failed ? <div className="p-5"><Alert variant="destructive"><RefreshCw /><AlertTitle>{w('error')}</AlertTitle><AlertDescription><Button variant="outline" onClick={retry}>{w('retry')}</Button></AlertDescription></Alert></div> : actions.length === 0 ? <div className="p-5"><Alert><Check /><AlertTitle>{w('clear')}</AlertTitle><AlertDescription>{w('clearHint')}</AlertDescription></Alert></div> : <>
            {(expanded ? actions : actions.slice(0, 4)).map(action => {
              const Icon = icons[action.kind];
              return <article key={action.id} className="workspace-task"><span className="workspace-icon" data-tone={action.kind === 'new' ? 'brand' : action.kind === 'followup' || action.kind === 'expiry' ? 'warning' : undefined}><Icon size={18} strokeWidth={1.6} /></span><div className="min-w-0 flex-1"><h3>{w(action.title)}</h3><p className="truncate">{action.detail}</p>{action.kind === 'followup' && <p>{w('noUpdate')}</p>}</div><Link href={action.href} className={buttonVariants({ variant: 'ghost', size: 'icon' })} aria-label={`${w(action.label)}: ${action.detail}`}><ArrowRight /></Link></article>;
            })}
            {actions.length > 4 && <div className="border-t px-4 py-2"><Button variant="ghost" className="w-full" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}><ArrowDown data-icon="inline-start" />{w('remaining')} ({actions.length - 4})</Button></div>}
          </>}
        </section>
        <section className="workspace-panel" aria-label={w('recentLeads')}>
          <div className="workspace-panel-heading"><h2>{w('recentLeads')}</h2><Link href="/dashboard/leads" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>{w('viewAll')}<ArrowRight data-icon="inline-end" /></Link></div>
          {leadsQuery.isError ? <p className="px-5 pb-5 text-sm text-muted-foreground">{w('error')}</p> : leadsQuery.isLoading ? <Skeleton className="mx-5 mb-5 h-16" /> : leads.length ? leads.slice(0, 3).map(lead => <Link key={lead.id} href={`/dashboard/leads?lead=${lead.id}`} className="workspace-task"><Avatar size="lg"><AvatarFallback>{lead.buyer_name?.slice(0, 1) || '?'}</AvatarFallback></Avatar><div className="min-w-0 flex-1"><h3>{lead.buyer_name}</h3><p className="truncate">{lead.property_title || w('general')}</p></div><ArrowRight size={16} className="shrink-0 text-muted-foreground" /></Link>) : <p className="px-5 pb-7 text-sm text-muted-foreground">{w('noLeads')}</p>}
        </section>
      </div>
      <div className="flex min-w-0 flex-col gap-6">
        <section className="workspace-panel" aria-label={w('recent')}>
          <div className="workspace-panel-heading"><h2>{w('recent')}</h2><Link href="/dashboard/properties" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>{w('viewAll')}<ArrowRight data-icon="inline-end" /></Link></div>
          {propertiesQuery.isError ? <p className="px-5 pb-5 text-sm text-muted-foreground">{w('error')}</p> : propertiesQuery.isLoading ? <Skeleton className="mx-5 mb-5 h-36" /> : properties.length ? properties.slice(0, 3).map(property => <Link key={property.id} href={`/dashboard/properties/${property.id}${property.status === 'DRAFT' ? '/review' : ''}`} className="workspace-task"><PropertyPhoto thumbnail src={property.images?.[0]?.thumbnail_url || property.images?.[0]?.url} alt={property.title} fallback={inventoryText(locale, 'noPhoto')} /><div className="min-w-0 flex-1"><h3 className="truncate">{property.title}</h3><p className="truncate">{[property.area, property.city].filter(Boolean).join(', ')}</p></div><ArrowRight size={15} className="shrink-0 text-muted-foreground" /></Link>) : <p className="px-5 pb-7 text-sm text-muted-foreground">{w('noListings')}</p>}
        </section>
        <section className="workspace-panel" aria-label={w('activity')}>
          <div className="workspace-panel-heading"><h2>{w('activity')}</h2><span className="text-[11px] text-muted-foreground">{w('sevenDays')}</span></div>
          <div className="px-5 pb-5">
            {metricsQuery.isError ? <Alert variant="destructive"><RefreshCw /><AlertTitle>{w('error')}</AlertTitle><AlertDescription><Button variant="outline" onClick={() => void metricsQuery.refetch()}>{w('retry')}</Button></AlertDescription></Alert> : metricsQuery.isLoading ? <Skeleton className="h-32" /> : !hasActivity ? <div className="flex flex-col gap-3 rounded-xl bg-muted p-5"><Eye size={23} className="text-muted-foreground" /><h3 className="text-sm font-medium">{w('noActivity')}</h3><p className="text-xs leading-6 text-muted-foreground">{w('shareHint')}</p></div> : <>
              <div className="flex h-32 items-end gap-3" aria-label={w('sevenDays')}>{chart.map(day => <div key={day.date} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-2"><div className="flex flex-1 items-end justify-center gap-1" title={`${day.date}: ${day.views} / ${day.clicks}`}><div className="w-2.5 rounded-t bg-muted-foreground/40" style={{ height: `${day.views / max * 100}%` }} /><div className="w-2.5 rounded-t bg-primary" style={{ height: `${day.clicks / max * 100}%` }} /></div><span className="truncate text-center text-[10px] text-muted-foreground">{day.date.split(' ')[0]}</span></div>)}</div><div className="mt-4 flex flex-wrap justify-between gap-3 text-xs text-muted-foreground"><span className="flex items-center gap-2"><Eye size={14} />{w('views')}</span><span className="flex items-center gap-2"><MessageCircle size={14} />{w('whatsapp')} + {w('calls')}</span></div>
            </>}
          </div>
        </section>
      </div>
    </div>
  </div>;
}
