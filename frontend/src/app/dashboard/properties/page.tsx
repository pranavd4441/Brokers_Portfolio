'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Building2, Copy, ExternalLink, Eye, LockKeyhole, MapPin, MessageCircle, Pencil, RefreshCw, Trash2, UsersRound } from 'lucide-react';
import { toast } from 'sonner';
import { useAppPreferences } from '@/components/AppPreferencesProvider';
import { PropertyPhoto } from '@/components/property/PropertyPhoto';
import { WorkspaceHeader } from '@/components/workspace/WorkspaceHeader';
import ShareModal from '@/components/ShareModal';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Skeleton } from '@/components/ui/skeleton';
import { inventoryText, type InventoryMessageKey } from '@/i18n/inventory';
import { fetchApi } from '@/lib/api';

interface Property {
  id: string; title: string; price: number; property_type: string; status: string;
  city: string; area: string; bhk: number | null; square_feet: number | null;
  images: { id: string; url: string; thumbnail_url: string }[];
  views_count?: number; leads_count?: number; source?: 'MANUAL' | 'WHATSAPP';
}
type CopyFn = (key: InventoryMessageKey) => string;
const STATUSES = ['DRAFT', 'AVAILABLE', 'NEGOTIATION', 'SITE_VISIT', 'BOOKED', 'SOLD', 'EXPIRED'] as const;
const TYPES = ['APARTMENT', 'VILLA', 'PLOT', 'COMMERCIAL'] as const;
function formatPrice(value: number) { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value); }

function PropertyCard({ property: p, sharing, pending, onShare, onDuplicate, onDelete, c }: {
  property: Property; sharing: boolean; pending: boolean; onShare: () => void; onDuplicate: () => void; onDelete: () => void; c: CopyFn;
}) {
  const cover = p.images?.[0]?.thumbnail_url || p.images?.[0]?.url;
  const draft = p.status === 'DRAFT';
  const href = `/dashboard/properties/${p.id}${draft ? '/review' : ''}`;
  const shareable = ['AVAILABLE', 'NEGOTIATION', 'SITE_VISIT', 'BOOKED'].includes(p.status);
  return <Card variant="property">
    <Link href={href} className="relative block overflow-hidden rounded-2xl focus-visible:outline-2 focus-visible:outline-ring" aria-label={`${c('open')}: ${p.title}`}>
      <PropertyPhoto src={cover} alt={p.title} fallback={c(cover ? 'imageFailed' : 'noPhoto')} compact />
    </Link>
    <CardHeader>
      <div className="mb-2 flex items-center justify-between gap-2"><Badge variant="outline"><span className="workspace-state-dot" data-status={p.status} />{c(STATUSES.find(s => s === p.status) ?? 'DRAFT')}</Badge>{p.source === 'WHATSAPP' && <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><MessageCircle className="size-3.5" />WhatsApp</span>}</div>
      <CardTitle><h2><Link href={href} className="line-clamp-2 leading-6" title={p.title}>{p.title}</Link></h2></CardTitle>
      <p className="mt-1 flex items-center gap-1.5 text-xs leading-5 text-muted-foreground"><MapPin className="size-3.5 shrink-0" />{[p.area, p.city].filter(Boolean).join(', ') || c('locationMissing')}</p>
    </CardHeader>
    <CardContent className="flex flex-1 flex-col gap-2">
      <p className="text-xl font-semibold tracking-tight">{formatPrice(Number(p.price))}</p>
      <p className="text-xs leading-5 text-muted-foreground">{[p.bhk ? `${p.bhk} ${c('bhkUnit')}` : '', c(TYPES.find(s => s === p.property_type) ?? 'APARTMENT'), p.square_feet ? `${Number(p.square_feet).toLocaleString('en-IN')} ${c('sqft')}` : ''].filter(Boolean).join(' · ')}</p>
      <div className="mt-1 flex gap-4 text-xs text-muted-foreground"><span className="flex items-center gap-1.5"><Eye className="size-3.5" />{p.views_count ?? 0} {c('views')}</span><span className="flex items-center gap-1.5"><UsersRound className="size-3.5" />{p.leads_count ?? 0} {c('leads')}</span></div>
    </CardContent>
    <CardFooter className="flex-wrap gap-1">
      {draft ? <Link href={href} className={buttonVariants({ variant: 'outline', className: 'flex-1' })}><Pencil data-icon="inline-start" />{c('review')}</Link> : <Button variant="outline" className="flex-1" disabled={sharing || !shareable} onClick={onShare}><MessageCircle data-icon="inline-start" />{sharing ? c('preparing') : c('share')}</Button>}
      <Link href={`/dashboard/properties/${p.id}`} className={buttonVariants({ variant: 'ghost', size: 'icon' })} aria-label={`${c('open')}: ${p.title}`}><ExternalLink /></Link>
      <Button variant="ghost" size="icon" disabled={pending} onClick={onDuplicate} aria-label={`${c('duplicate')}: ${p.title}`}><Copy /></Button>
      <Button variant="ghost" size="icon" disabled={pending} onClick={onDelete} aria-label={`${c('delete')}: ${p.title}`}><Trash2 /></Button>
    </CardFooter>
  </Card>;
}

export default function PropertiesPage() {
  const client = useQueryClient();
  const { locale } = useAppPreferences();
  const c: CopyFn = key => inventoryText(locale, key);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [propertyType, setPropertyType] = useState('ALL');
  const [shareData, setShareData] = useState<{ url: string; whatsappText: string; propertyTitle: string } | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const query = useQuery<Property[]>({ queryKey: ['properties'], queryFn: () => fetchApi('/properties/') });
  const connection = useQuery<{ provider: string; configured: boolean }>({ queryKey: ['whatsapp-connection'], queryFn: () => fetchApi('/whatsapp/connection/'), retry: 1 });
  const duplicate = useMutation({ mutationFn: (id: string) => fetchApi(`/properties/${id}/duplicate/`, { method: 'POST' }), onSuccess: () => { void client.invalidateQueries({ queryKey: ['properties'] }); toast.success(c('duplicated')); }, onError: (error: Error) => toast.error(error.message || c('failed')) });
  const remove = useMutation({ mutationFn: (id: string) => fetchApi(`/properties/${id}/`, { method: 'DELETE' }), onSuccess: () => { void client.invalidateQueries({ queryKey: ['properties'] }); toast.success(c('deleted')); }, onError: (error: Error) => toast.error(error.message || c('failed')) });
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (query.data ?? []).filter(p => (!term || [p.title, p.area, p.city].some(value => value?.toLowerCase().includes(term))) && (status === 'ALL' || p.status === status) && (propertyType === 'ALL' || p.property_type === propertyType));
  }, [query.data, search, status, propertyType]);
  const drafts = (query.data ?? []).filter(p => p.source === 'WHATSAPP' && p.status === 'DRAFT');
  const hasFilters = Boolean(search || status !== 'ALL' || propertyType !== 'ALL');
  const clear = () => { setSearch(''); setStatus('ALL'); setPropertyType('ALL'); };
  const share = async (property: Property) => {
    setSharingId(property.id);
    try { const result = await fetchApi<{ full_share_url: string; whatsapp_share_text: string }>('/sharing/links/', { method: 'POST', body: JSON.stringify({ property: property.id }) }); setShareData({ url: result.full_share_url, whatsappText: result.whatsapp_share_text, propertyTitle: property.title }); }
    catch (error) { toast.error(error instanceof Error ? error.message : c('failed')); }
    finally { setSharingId(null); }
  };
  return <div className="workspace-page" data-ui-reference="workspace-v4-inventory">
    {shareData && <ShareModal {...shareData} onClose={() => setShareData(null)} />}
    <WorkspaceHeader eyebrow={c('inventoryEyebrow')} title={c('inventoryTitle')} description={c('inventoryIntro')} action={<Link href="/dashboard/properties/imports" className={buttonVariants({ variant: 'outline' })}><MessageCircle data-icon="inline-start" />{c('imports')}{drafts.length > 0 && <Badge variant="secondary">{drafts.length}</Badge>}<ArrowRight data-icon="inline-end" /></Link>} />
    <section className="flex flex-col gap-5" aria-label={c('allListings')}>
      <div className="workspace-filter-bar">
        <label className="min-w-0 flex-1 basis-56"><span className="sr-only">{c('search')}</span><Input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder={c('searchPlaceholder')} /></label>
        <label className="min-w-0 flex-1 basis-36 sm:flex-none"><span className="sr-only">{c('statusFilter')}</span><NativeSelect value={status} onChange={event => setStatus(event.target.value)}><NativeSelectOption value="ALL">{c('allStatuses')}</NativeSelectOption>{STATUSES.map(value => <NativeSelectOption key={value} value={value}>{c(value)}</NativeSelectOption>)}</NativeSelect></label>
        <label className="min-w-0 flex-1 basis-36 sm:flex-none"><span className="sr-only">{c('typeFilter')}</span><NativeSelect value={propertyType} onChange={event => setPropertyType(event.target.value)}><NativeSelectOption value="ALL">{c('allTypes')}</NativeSelectOption>{TYPES.map(value => <NativeSelectOption key={value} value={value}>{c(value)}</NativeSelectOption>)}</NativeSelect></label>
      </div>
      {drafts.length > 0 && !query.isError && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted px-4 py-3" aria-label={c('draftsWaiting')}><div className="flex min-w-0 items-center gap-3"><LockKeyhole className="size-4 shrink-0 text-muted-foreground" /><p className="text-xs leading-5"><strong className="font-semibold">{drafts.length} · {c('draftsWaiting')}</strong><span className="ml-2 hidden text-muted-foreground lg:inline">{c('draftsHint')}</span></p></div><Link href={`/dashboard/properties/${drafts[0].id}/review`} className={buttonVariants({ variant: 'ghost', size: 'sm' })}>{c('review')}<ArrowRight data-icon="inline-end" /></Link></div>}
      <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-muted-foreground" role="status">{c('results')}: {query.isLoading ? '—' : filtered.length}</p>{hasFilters ? <Button variant="ghost" size="sm" onClick={clear}>{c('clearFilters')}</Button> : <p className="text-[11px] text-muted-foreground">{connection.isPending ? '…' : connection.isError || typeof connection.data?.configured !== 'boolean' ? c('connectionUnknown') : connection.data.configured && connection.data.provider !== 'MOCK' ? c('configured') : c('notConfigured')}</p>}</div>
      {query.isLoading && <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3" aria-label={c('loading')}>{[0,1,2].map(i => <Skeleton key={i} className="h-80" />)}</div>}
      {query.isError && <Alert variant="destructive"><RefreshCw /><AlertTitle>{c('loadFailed')}</AlertTitle><AlertDescription>{query.error.message}<Button variant="outline" onClick={() => void query.refetch()} className="mt-3 self-start">{c('retry')}</Button></AlertDescription></Alert>}
      {!query.isLoading && !query.isError && filtered.length === 0 && <Alert><Building2 /><AlertTitle>{c(query.data?.length ? 'noMatch' : 'empty')}</AlertTitle><AlertDescription>{c(query.data?.length ? 'noMatchHint' : 'emptyHint')}{query.data?.length ? <Button variant="outline" onClick={clear} className="mt-3 self-start">{c('clearFilters')}</Button> : <Link href="/dashboard/properties/imports" className={buttonVariants({ variant: 'outline' })}>{c('imports')}</Link>}</AlertDescription></Alert>}
      {!query.isLoading && !query.isError && filtered.length > 0 && <div className="grid items-start gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">{filtered.map(p => <PropertyCard key={p.id} property={p} c={c} sharing={sharingId === p.id} pending={duplicate.isPending || remove.isPending} onShare={() => void share(p)} onDuplicate={() => duplicate.mutate(p.id)} onDelete={() => window.confirm(`${p.title}\n\n${c('deleteConfirm')}`) && remove.mutate(p.id)} />)}</div>}
    </section>
  </div>;
}
