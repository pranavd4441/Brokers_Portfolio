'use client';

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Toggle } from '@base-ui/react/toggle';
import { ToggleGroup } from '@base-ui/react/toggle-group';
import { ArrowRight, Building2, Check, ClipboardCopy, Columns3, Inbox, List, MessageCircle, Phone, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAppPreferences } from '@/components/AppPreferencesProvider';
import { WorkspaceHeader } from '@/components/workspace/WorkspaceHeader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { workspaceText, type WorkspaceKey } from '@/i18n/workspace';
import type { Locale } from '@/i18n';
import { fetchApi } from '@/lib/api';

type LeadStatus = 'NEW' | 'CONTACTED' | 'SITE_VISIT' | 'NEGOTIATION' | 'CLOSED' | 'LOST';
const STAGES: LeadStatus[] = ['NEW', 'CONTACTED', 'SITE_VISIT', 'NEGOTIATION', 'CLOSED', 'LOST'];
interface Lead {
  id: string; property: string | null; property_title: string; source: string;
  buyer_name: string; phone: string; email: string | null; status: LeadStatus;
  notes: string | null; created_at: string; updated_at: string;
}
type W = (key: WorkspaceKey) => string;
function sourceLabel(source: string, w: W) { return ['WHATSAPP_CLICK','PHONE_CLICK','GATED_MODAL'].includes(source) ? w(source as WorkspaceKey) : w('general'); }
function capturedAt(value: string, locale: Locale) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString(`${locale}-IN`, { day: 'numeric', month: 'short' });
}
function followUp(lead: Lead) {
  return `Hi ${lead.buyer_name?.split(' ')[0] || 'there'}, thanks for checking ${lead.property_title || 'the property you viewed'}. Would you prefer a quick video tour or a site visit slot?`;
}
function reply(lead: Lead) {
  const phone = lead.phone.replace(/[^0-9]/g, '');
  if (phone) window.open(`https://wa.me/${phone}?text=${encodeURIComponent(followUp(lead))}`, '_blank', 'noopener,noreferrer');
}
function StageBadge({ status, w }: { status: LeadStatus; w: W }) {
  return <Badge variant="outline"><span className="workspace-state-dot" data-status={status} />{w(status)}</Badge>;
}

function LeadEditor({ lead, w, pending, save, remove }: { lead: Lead; w: W; pending: boolean; save: (patch: Partial<Lead>) => void; remove: () => void }) {
  const [name, setName] = useState(lead.buyer_name);
  const [phone, setPhone] = useState(lead.phone);
  const [email, setEmail] = useState(lead.email || '');
  const [status, setStatus] = useState(lead.status);
  const [notes, setNotes] = useState(lead.notes || '');
  const copy = async () => { try { await navigator.clipboard.writeText(followUp(lead)); toast.success(w('copied')); } catch { toast.error(w('failed')); } };
  return <div className="flex flex-col gap-6">
    <DialogHeader><DialogTitle>{w('details')}</DialogTitle><DialogDescription>{sourceLabel(lead.source, w)}</DialogDescription></DialogHeader>
    <div className="workspace-detail-hero flex flex-col items-start gap-4"><Avatar size="lg"><AvatarFallback>{lead.buyer_name?.[0] || '?'}</AvatarFallback></Avatar><div><h2 className="text-2xl font-semibold tracking-tight">{lead.buyer_name}</h2><p className="mt-1 text-sm text-muted-foreground">{lead.phone}</p></div><StageBadge status={lead.status} w={w} /></div>
    <div className="flex gap-2"><Button className="flex-1" onClick={() => reply(lead)} disabled={!lead.phone}><MessageCircle data-icon="inline-start" />{w('reply')}</Button><a href={`tel:${lead.phone}`} className={buttonVariants({ variant: 'outline' })}><Phone data-icon="inline-start" />{w('call')}</a></div>
    <div className="flex items-start gap-3"><Building2 size={19} className="mt-0.5 shrink-0 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">{w('property')}</p><p className="mt-1 text-sm leading-6">{lead.property_title || w('general')}</p></div></div>
    <Separator />
    <form onSubmit={event => { event.preventDefault(); save({ buyer_name: name.trim(), phone: phone.trim(), email: email.trim() || null, status, notes: notes.trim() || null }); }} className="flex flex-col gap-6">
      <FieldGroup>
        <Field><FieldLabel htmlFor="lead-name">{w('name')}</FieldLabel><Input id="lead-name" required value={name} onChange={event => setName(event.target.value)} /></Field>
        <Field><FieldLabel htmlFor="lead-phone">{w('phone')}</FieldLabel><Input id="lead-phone" required type="tel" value={phone} onChange={event => setPhone(event.target.value)} /></Field>
        <Field><FieldLabel htmlFor="lead-email">{w('email')}</FieldLabel><Input id="lead-email" type="email" value={email} onChange={event => setEmail(event.target.value)} /></Field>
        <Field><FieldLabel htmlFor="lead-stage">{w('status')}</FieldLabel><NativeSelect id="lead-stage" value={status} onChange={event => setStatus(event.target.value as LeadStatus)}>{STAGES.map(stage => <NativeSelectOption key={stage} value={stage}>{w(stage)}</NativeSelectOption>)}</NativeSelect></Field>
        <Field><FieldLabel htmlFor="lead-notes">{w('notes')}</FieldLabel><Textarea id="lead-notes" rows={4} value={notes} onChange={event => setNotes(event.target.value)} placeholder={w('notesHint')} /></Field>
      </FieldGroup>
      <div className="sticky bottom-0 flex gap-2 border-t bg-card py-4"><Button type="submit" className="flex-1" disabled={pending}><Check data-icon="inline-start" />{w(pending ? 'saving' : 'save')}</Button><Button type="button" variant="outline" size="icon" onClick={() => void copy()} aria-label={w('copy')}><ClipboardCopy /></Button><Button type="button" variant="destructive" size="icon" disabled={pending} onClick={() => window.confirm(w('deleteConfirm')) && remove()} aria-label={w('delete')}><Trash2 /></Button></div>
    </form>
  </div>;
}

function LeadsWorkspace() {
  const { locale, t } = useAppPreferences();
  const w: W = key => workspaceText(locale, key);
  const params = useSearchParams();
  const client = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null | undefined>();
  const [viewMode, setViewMode] = useState<'LIST' | 'PIPELINE'>('LIST');
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('ALL');
  const query = useQuery<Lead[]>({ queryKey: ['leads'], queryFn: () => fetchApi('/leads/') });
  const leads = useMemo(() => query.data ?? [], [query.data]);
  const selected = leads.find(lead => String(lead.id) === (selectedId === undefined ? params.get('lead') : selectedId));
  const filtered = useMemo(() => leads.filter(lead => (!search.trim() || [lead.buyer_name, lead.phone, lead.property_title, lead.email].some(value => value?.toLowerCase().includes(search.trim().toLowerCase()))) && (viewMode === 'PIPELINE' || stage === 'ALL' || lead.status === stage)).sort((a,b) => Number(b.status === 'NEW') - Number(a.status === 'NEW') || new Date(b.created_at).getTime() - new Date(a.created_at).getTime()), [leads, search, stage, viewMode]);
  const update = useMutation({ mutationFn: ({ id, patch }: { id: string; patch: Partial<Lead> }) => fetchApi<Lead>(`/leads/${id}/`, { method: 'PATCH', body: JSON.stringify(patch) }), onSuccess: () => { void client.invalidateQueries({ queryKey: ['leads'] }); toast.success(w('saved')); }, onError: (error: Error) => toast.error(error.message || w('failed')) });
  const remove = useMutation({ mutationFn: (id: string) => fetchApi(`/leads/${id}/`, { method: 'DELETE' }), onSuccess: () => { void client.invalidateQueries({ queryKey: ['leads'] }); setSelectedId(null); toast.success(w('deleted')); }, onError: (error: Error) => toast.error(error.message || w('failed')) });
  const count = (status: LeadStatus) => leads.filter(lead => lead.status === status).length;

  return <div className="workspace-page" data-ui-reference="workspace-v4-leads">
    <WorkspaceHeader eyebrow={w('leadEyebrow')} title={w('leads')} description={w('leadIntro')} />
    <dl className="workspace-stat-strip">{[[w('allBuyers'), leads.length], [w('needsReply'), count('NEW')], [w('visits'), count('SITE_VISIT')], [w('won'), count('CLOSED')]].map(([label,value]) => <div key={String(label)}><dt>{label}</dt><dd>{query.data ? value : '—'}</dd></div>)}</dl>
    <div className="workspace-filter-bar">
      <label className="min-w-0 flex-1 basis-56"><span className="sr-only">{w('search')}</span><Input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder={w('search')} /></label>
      {viewMode === 'LIST' && <label className="min-w-0"><span className="sr-only">{w('status')}</span><NativeSelect value={stage} onChange={event => setStage(event.target.value)}><NativeSelectOption value="ALL">{w('all')}</NativeSelectOption>{STAGES.map(value => <NativeSelectOption key={value} value={value}>{w(value)} ({count(value)})</NativeSelectOption>)}</NativeSelect></label>}
      <ToggleGroup aria-label={w('view')} value={[viewMode]} onValueChange={value => { if (value[0]) setViewMode(value[0] as 'LIST' | 'PIPELINE'); }} className="flex rounded-xl bg-muted p-1">
        <Toggle value="LIST" className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-xs text-muted-foreground outline-ring data-pressed:bg-card data-pressed:text-foreground data-pressed:shadow-sm"><List size={16} />{w('list')}</Toggle>
        <Toggle value="PIPELINE" className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-xs text-muted-foreground outline-ring data-pressed:bg-card data-pressed:text-foreground data-pressed:shadow-sm"><Columns3 size={16} />{w('pipeline')}</Toggle>
      </ToggleGroup>
    </div>
    {query.isLoading ? <div className="flex flex-col gap-3">{[0,1,2].map(i => <Skeleton key={i} className="h-20" />)}</div> : query.isError ? <Alert variant="destructive"><RefreshCw /><AlertTitle>{w('error')}</AlertTitle><AlertDescription><Button variant="outline" onClick={() => void query.refetch()}>{w('retry')}</Button></AlertDescription></Alert> : filtered.length === 0 ? <Alert><Inbox /><AlertTitle>{w(leads.length ? 'noMatch' : 'noLeads')}</AlertTitle><AlertDescription>{w('noMatchHint')}</AlertDescription></Alert> : viewMode === 'PIPELINE' ? <section className="flex gap-4 overflow-x-auto pb-4" aria-label={w('pipeline')}>
      {STAGES.map(status => <div key={status} className="w-64 shrink-0 rounded-2xl bg-muted p-3" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); const id = event.dataTransfer.getData('leadId'); if (id && leads.some(lead => String(lead.id) === id)) update.mutate({ id, patch: { status } }); }}><div className="mb-4 flex items-center justify-between p-1"><h2 className="text-sm font-semibold">{w(status)}</h2><Badge variant="outline">{filtered.filter(lead => lead.status === status).length}</Badge></div><div className="flex flex-col gap-3">{filtered.filter(lead => lead.status === status).map(lead => <button key={lead.id} type="button" draggable onDragStart={event => event.dataTransfer.setData('leadId', String(lead.id))} onClick={() => setSelectedId(String(lead.id))} className="flex min-h-32 flex-col gap-3 rounded-xl border bg-card p-4 text-left transition-shadow hover:shadow-sm"><span className="text-sm font-semibold">{lead.buyer_name}</span><span className="text-xs text-muted-foreground">{lead.phone}</span><span className="text-xs leading-5 text-muted-foreground">{lead.property_title || w('general')}</span></button>)}</div></div>)}
    </section> : <section className="workspace-panel" aria-label={w('leads')}>
      <div className="workspace-lead-row workspace-lead-heading" aria-hidden="true"><span>{w('buyer')}</span><span>{w('property')}</span><span>{w('status')}</span><span>{w('received')}</span><span /></div>
      {filtered.map(lead => <article key={lead.id} className="workspace-lead-row" data-selected={selected?.id === lead.id}>
        <button type="button" onClick={() => setSelectedId(String(lead.id))} className="flex min-h-11 min-w-0 items-center gap-3 text-left" aria-label={`${w('open')}: ${lead.buyer_name}`}><Avatar size="lg"><AvatarFallback>{lead.buyer_name?.[0] || '?'}</AvatarFallback></Avatar><span className="min-w-0"><strong className="block truncate text-[13px] font-semibold">{lead.buyer_name}</strong><span className="mt-1 block text-xs text-muted-foreground">{lead.phone}</span></span></button>
        <div className="workspace-lead-property min-w-0"><p className="truncate text-xs leading-5" title={lead.property_title}>{lead.property_title || w('general')}</p><p className="mt-1 text-[11px] text-muted-foreground">{sourceLabel(lead.source, w)}</p></div>
        <div className="workspace-lead-status"><StageBadge status={lead.status} w={w} /></div>
        <p className="workspace-lead-date text-xs text-muted-foreground">{capturedAt(lead.created_at, locale)}</p>
        <Button variant="ghost" size="icon" className="workspace-lead-open" onClick={() => setSelectedId(String(lead.id))} aria-label={`${w('review')}: ${lead.buyer_name}`}><ArrowRight /></Button>
      </article>)}
    </section>}
    <Dialog open={Boolean(selected)} onOpenChange={open => { if (!open) setSelectedId(null); }}><DialogContent closeLabel={t('common.close')} className="top-0 right-0 left-auto block h-dvh max-w-full translate-x-0 translate-y-0 overflow-y-auto rounded-none p-6 sm:max-w-lg">{selected && <LeadEditor key={selected.id} lead={selected} w={w} pending={update.isPending || remove.isPending} save={patch => update.mutate({ id: selected.id, patch })} remove={() => remove.mutate(selected.id)} />}</DialogContent></Dialog>
  </div>;
}

export default function LeadsPage() { return <Suspense fallback={<Skeleton className="h-80" />}><LeadsWorkspace /></Suspense>; }
