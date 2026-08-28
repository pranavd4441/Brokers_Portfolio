'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2, CheckCircle2, ChevronRight, ClipboardCopy, Clock3, Columns3,
  Inbox, List, MessageCircle, Phone, Search, Trash2, UserRound, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { fetchApi } from '@/lib/api';

type LeadStatus = 'NEW' | 'CONTACTED' | 'SITE_VISIT' | 'NEGOTIATION' | 'CLOSED' | 'LOST';
type LeadFilter = 'ALL' | LeadStatus;

interface Lead {
  id: string;
  property: string | null;
  property_title: string;
  source: 'WHATSAPP_CLICK' | 'PHONE_CLICK' | 'GATED_MODAL' | string;
  buyer_name: string;
  phone: string;
  email: string | null;
  status: LeadStatus;
  notes: string | null;
  analytics_event: string | null;
  tenant_name: string;
  created_at: string;
  updated_at: string;
}

const STATUS_CHOICES: Array<{ value: LeadStatus; label: string; shortLabel: string }> = [
  { value: 'NEW', label: 'New / uncontacted', shortLabel: 'New' },
  { value: 'CONTACTED', label: 'Contacted', shortLabel: 'Contacted' },
  { value: 'SITE_VISIT', label: 'Site visit planned', shortLabel: 'Site visit' },
  { value: 'NEGOTIATION', label: 'In negotiation', shortLabel: 'Negotiation' },
  { value: 'CLOSED', label: 'Closed / won', shortLabel: 'Won' },
  { value: 'LOST', label: 'Lost / not interested', shortLabel: 'Lost' },
];

const SOURCE_LABELS: Record<string, string> = {
  WHATSAPP_CLICK: 'WhatsApp enquiry',
  PHONE_CLICK: 'Phone enquiry',
  GATED_MODAL: 'Property form',
};
const FILTERS: LeadFilter[] = ['ALL', 'NEW', 'CONTACTED', 'SITE_VISIT', 'NEGOTIATION', 'CLOSED', 'LOST'];

function statusLabel(status: LeadStatus) {
  return STATUS_CHOICES.find((choice) => choice.value === status)?.shortLabel ?? status;
}

function statusClass(status: LeadStatus) {
  if (status === 'CLOSED') return 'border-emerald-600/25 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300';
  if (status === 'LOST') return 'border-rose-600/25 bg-rose-600/10 text-rose-700 dark:text-rose-300';
  if (status === 'NEW') return 'border-amber-600/25 bg-amber-500/10 text-amber-800 dark:text-amber-300';
  if (status === 'SITE_VISIT') return 'border-sky-600/25 bg-sky-600/10 text-sky-700 dark:text-sky-300';
  return 'border-[var(--ui-border)] bg-[var(--ui-surface-muted)] text-[var(--ui-text-muted)]';
}

function formatCapturedAt(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
  }).format(new Date(value));
}

export default function LeadsPage() {
  const queryClient = useQueryClient();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [viewMode, setViewMode] = useState<'LIST' | 'PIPELINE'>('LIST');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<LeadFilter>('ALL');
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editStatus, setEditStatus] = useState<LeadStatus>('NEW');
  const [editNotes, setEditNotes] = useState('');

  const leadsQuery = useQuery<Lead[]>({ queryKey: ['leads'], queryFn: () => fetchApi('/leads/') });
  const leads = useMemo(() => leadsQuery.data ?? [], [leadsQuery.data]);

  const updateLeadMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Lead> }) =>
      fetchApi<Lead>(`/leads/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) }),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: ['leads'] });
      setSelectedLead((current) => current?.id === updated.id ? updated : current);
      toast.success('Lead updated');
    },
    onError: (error: Error) => toast.error(error.message || 'Could not update this lead'),
  });

  const deleteLeadMutation = useMutation({
    mutationFn: (id: string) => fetchApi(`/leads/${id}/`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['leads'] });
      setSelectedLead(null);
      toast.success('Lead deleted');
    },
    onError: (error: Error) => toast.error(error.message || 'Could not delete this lead'),
  });

  const openLead = (lead: Lead) => {
    setSelectedLead(lead);
    setEditName(lead.buyer_name || '');
    setEditPhone(lead.phone || '');
    setEditEmail(lead.email || '');
    setEditStatus(lead.status);
    setEditNotes(lead.notes || '');
  };

  const filteredLeads = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return leads.filter((lead) => {
      const matchesStatus = activeFilter === 'ALL' || lead.status === activeFilter;
      const matchesQuery = !query || [lead.buyer_name, lead.phone, lead.property_title, lead.email ?? '']
        .some((value) => value.toLowerCase().includes(query));
      return matchesStatus && matchesQuery;
    });
  }, [activeFilter, leads, searchQuery]);

  const searchedLeads = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return leads;
    return leads.filter((lead) => [lead.buyer_name, lead.phone, lead.property_title, lead.email ?? '']
      .some((value) => value.toLowerCase().includes(query)));
  }, [leads, searchQuery]);

  const count = (filter: LeadFilter) => filter === 'ALL'
    ? leads.length
    : leads.filter((lead) => lead.status === filter).length;

  const getLeadMessage = (lead: Lead) => {
    const firstName = lead.buyer_name?.split(' ')[0] || 'there';
    const listing = lead.property_title || 'the property you viewed';
    return `Hi ${firstName}, thanks for checking ${listing}. Would you prefer a quick video tour or a site visit slot?`;
  };

  const openWhatsApp = (lead: Lead) => {
    const phone = lead.phone.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(getLeadMessage(lead))}`, '_blank', 'noopener,noreferrer');
  };

  const copyFollowUp = async (lead: Lead) => {
    try {
      await navigator.clipboard.writeText(getLeadMessage(lead));
      toast.success('Follow-up copied');
    } catch {
      toast.error('Could not copy the follow-up');
    }
  };

  const saveLead = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedLead) return;
    updateLeadMutation.mutate({
      id: selectedLead.id,
      payload: {
        buyer_name: editName.trim(), phone: editPhone.trim(),
        email: editEmail.trim() || null, status: editStatus, notes: editNotes.trim() || null,
      },
    });
  };

  const dropLead = (event: React.DragEvent, status: LeadStatus) => {
    event.preventDefault();
    const leadId = event.dataTransfer.getData('leadId');
    if (leadId) updateLeadMutation.mutate({ id: leadId, payload: { status } });
  };

  return (
    <div className="space-y-6 os-fade-in">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--ui-brand-strong)]">Buyer follow-up</p>
          <h1 className="mt-1 text-3xl font-bold tracking-[-0.035em] text-[var(--ui-text)]">Leads</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--ui-text-muted)]">
            Respond to new enquiries first, then keep every next step visible.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:min-w-64">
          <div className="os-surface px-4 py-3"><span className="text-xs text-[var(--ui-text-muted)]">Needs reply</span><strong className="mt-1 block text-2xl text-[var(--ui-text)]">{count('NEW')}</strong></div>
          <div className="os-surface px-4 py-3"><span className="text-xs text-[var(--ui-text-muted)]">Site visits</span><strong className="mt-1 block text-2xl text-[var(--ui-text)]">{count('SITE_VISIT')}</strong></div>
        </div>
      </header>

      <section className="os-surface space-y-3 p-3 sm:p-4" aria-label="Lead controls">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-h-11 w-fit rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface-muted)] p-1">
            <button type="button" onClick={() => setViewMode('LIST')} className={`flex min-h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold ${viewMode === 'LIST' ? 'bg-[var(--ui-surface-raised)] text-[var(--ui-text)] shadow-sm' : 'text-[var(--ui-text-muted)]'}`}><List size={17} /> List</button>
            <button type="button" onClick={() => setViewMode('PIPELINE')} className={`flex min-h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold ${viewMode === 'PIPELINE' ? 'bg-[var(--ui-surface-raised)] text-[var(--ui-text)] shadow-sm' : 'text-[var(--ui-text-muted)]'}`}><Columns3 size={17} /> Pipeline</button>
          </div>
          <label className="relative block w-full lg:max-w-sm">
            <span className="sr-only">Search leads</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ui-text-muted)]" size={18} />
            <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="os-input min-h-11 !pl-10" placeholder="Search buyer, phone or listing" />
          </label>
        </div>
        {viewMode === 'LIST' && (
          <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Lead status filters">
            {FILTERS.map((filter) => (
              <button type="button" key={filter} onClick={() => setActiveFilter(filter)} className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl border px-3 text-sm font-semibold ${activeFilter === filter ? 'border-[var(--ui-brand)] bg-[color-mix(in_srgb,var(--ui-brand)_10%,transparent)] text-[var(--ui-brand-strong)]' : 'border-[var(--ui-border)] text-[var(--ui-text-muted)]'}`}>
                {filter === 'ALL' ? 'All' : statusLabel(filter)}
                <span className="rounded-full bg-[var(--ui-surface-muted)] px-2 py-0.5 text-xs">{count(filter)}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {leadsQuery.isLoading ? (
        <div className="space-y-3" aria-label="Loading leads">{[1, 2, 3].map((item) => <div key={item} className="h-32 animate-pulse rounded-2xl bg-[var(--ui-surface-muted)]" />)}</div>
      ) : leadsQuery.isError ? (
        <section className="os-surface flex flex-col items-start gap-3 p-6"><Inbox className="text-[var(--ui-text-muted)]" /><div><h2 className="font-bold text-[var(--ui-text)]">Could not load leads</h2><p className="mt-1 text-sm text-[var(--ui-text-muted)]">Check your connection and try again.</p></div><button type="button" className="os-btn-ghost" onClick={() => void leadsQuery.refetch()}>Try again</button></section>
      ) : viewMode === 'PIPELINE' ? (
        <section className="flex snap-x gap-3 overflow-x-auto pb-3" aria-label="Lead pipeline">
          {STATUS_CHOICES.map((column) => {
            const columnLeads = searchedLeads.filter((lead) => lead.status === column.value);
            return (
              <div key={column.value} onDragOver={(event) => event.preventDefault()} onDrop={(event) => dropLead(event, column.value)} className="min-h-96 w-[280px] shrink-0 snap-start rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface-muted)] p-3 lg:w-[300px]">
                <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-bold text-[var(--ui-text)]">{column.label}</h2><span className="rounded-full bg-[var(--ui-surface-raised)] px-2 py-1 text-xs text-[var(--ui-text-muted)]">{columnLeads.length}</span></div>
                <div className="space-y-2">
                  {columnLeads.map((lead) => (
                    <button type="button" draggable onDragStart={(event) => event.dataTransfer.setData('leadId', lead.id)} onClick={() => openLead(lead)} key={lead.id} className="w-full rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface-raised)] p-3 text-left transition hover:border-[var(--ui-brand)]">
                      <strong className="block truncate text-sm text-[var(--ui-text)]">{lead.buyer_name}</strong><span className="mt-1 block text-xs text-[var(--ui-text-muted)]">{lead.phone}</span><span className="mt-3 block truncate border-t border-[var(--ui-border)] pt-3 text-xs text-[var(--ui-text-muted)]">{lead.property_title || 'General enquiry'}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      ) : filteredLeads.length === 0 ? (
        <section className="os-surface flex flex-col items-center px-6 py-16 text-center"><Inbox size={36} className="text-[var(--ui-text-muted)]" /><h2 className="mt-4 font-bold text-[var(--ui-text)]">No leads here yet</h2><p className="mt-2 max-w-sm text-sm leading-6 text-[var(--ui-text-muted)]">{searchQuery || activeFilter !== 'ALL' ? 'Try a different search or status.' : 'Buyer WhatsApp and phone actions from your public property pages will appear here.'}</p></section>
      ) : (
        <section className="space-y-3" aria-label="Lead list">
          {filteredLeads.map((lead) => (
            <article key={lead.id} className="os-surface p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--ui-surface-muted)] text-[var(--ui-brand-strong)]"><UserRound size={20} /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="font-bold text-[var(--ui-text)]">{lead.buyer_name}</h2><p className="mt-0.5 text-sm text-[var(--ui-text-muted)]">{lead.phone}</p></div><span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClass(lead.status)}`}>{statusLabel(lead.status)}</span></div>
                  <div className="mt-3 grid gap-2 text-sm text-[var(--ui-text-muted)] sm:grid-cols-2"><p className="flex min-w-0 items-center gap-2"><Building2 size={16} className="shrink-0" /><span className="truncate">{lead.property_title || 'General enquiry'}</span></p><p className="flex items-center gap-2"><Clock3 size={16} />{formatCapturedAt(lead.created_at)}</p></div>
                  <p className="mt-3 text-xs font-semibold text-[var(--ui-brand-strong)]">{SOURCE_LABELS[lead.source] || 'Buyer enquiry'}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-[1fr_44px] gap-2 border-t border-[var(--ui-border)] pt-4 sm:flex sm:justify-end"><button type="button" onClick={() => openWhatsApp(lead)} className="os-btn-primary px-4"><MessageCircle size={18} /> Reply on WhatsApp</button><button type="button" onClick={() => openLead(lead)} className="os-btn-icon" aria-label={`Open ${lead.buyer_name} lead`}><ChevronRight size={19} /></button></div>
            </article>
          ))}
        </section>
      )}

      {selectedLead && (
        <div className="fixed inset-0 z-50 flex justify-end bg-[var(--ui-overlay)]" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedLead(null); }}>
          <aside className="h-full w-full overflow-y-auto border-l border-[var(--ui-border)] bg-[var(--ui-surface-raised)] shadow-2xl sm:max-w-md" aria-label="Lead details">
            <header className="sticky top-0 z-10 flex items-start justify-between border-b border-[var(--ui-border)] bg-[var(--ui-surface-raised)] p-5"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--ui-brand-strong)]">Lead details</p><h2 className="mt-1 text-xl font-bold text-[var(--ui-text)]">{selectedLead.buyer_name}</h2></div><button type="button" onClick={() => setSelectedLead(null)} className="os-btn-icon" aria-label="Close lead details"><X size={19} /></button></header>
            <div className="grid grid-cols-2 gap-2 border-b border-[var(--ui-border)] p-5"><button type="button" onClick={() => openWhatsApp(selectedLead)} className="os-btn-primary px-3"><MessageCircle size={18} /> WhatsApp</button><a href={`tel:${selectedLead.phone}`} className="os-btn-ghost px-3"><Phone size={18} /> Call</a><button type="button" onClick={() => void copyFollowUp(selectedLead)} className="os-btn-ghost col-span-2"><ClipboardCopy size={17} /> Copy follow-up message</button></div>
            <form onSubmit={saveLead} className="space-y-5 p-5 pb-28">
              <div className="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface-muted)] p-4"><p className="text-xs font-semibold text-[var(--ui-text-muted)]">Interested in</p><p className="mt-1 font-semibold text-[var(--ui-text)]">{selectedLead.property_title || 'General enquiry'}</p><p className="mt-2 text-xs text-[var(--ui-text-muted)]">{SOURCE_LABELS[selectedLead.source] || 'Buyer enquiry'} · {formatCapturedAt(selectedLead.created_at)}</p></div>
              <label className="block"><span className="os-input-label">Buyer name</span><input required value={editName} onChange={(event) => setEditName(event.target.value)} className="os-input min-h-11" /></label>
              <label className="block"><span className="os-input-label">Phone number</span><input required type="tel" value={editPhone} onChange={(event) => setEditPhone(event.target.value)} className="os-input min-h-11" /></label>
              <label className="block"><span className="os-input-label">Email (optional)</span><input type="email" value={editEmail} onChange={(event) => setEditEmail(event.target.value)} className="os-input min-h-11" placeholder="Not provided" /></label>
              <label className="block"><span className="os-input-label">Next stage</span><select value={editStatus} onChange={(event) => setEditStatus(event.target.value as LeadStatus)} className="os-input min-h-11">{STATUS_CHOICES.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}</select></label>
              <label className="block"><span className="os-input-label">Follow-up notes</span><textarea rows={5} value={editNotes} onChange={(event) => setEditNotes(event.target.value)} className="os-input resize-none" placeholder="Add discussion, budget or site-visit notes" /></label>
              <button type="submit" disabled={updateLeadMutation.isPending} className="os-btn-primary w-full disabled:opacity-50"><CheckCircle2 size={18} /> {updateLeadMutation.isPending ? 'Saving…' : 'Save lead'}</button>
              <button type="button" disabled={deleteLeadMutation.isPending} onClick={() => { if (window.confirm('Delete this lead permanently?')) deleteLeadMutation.mutate(selectedLead.id); }} className="os-btn-ghost w-full border-rose-600/25 text-rose-700 dark:text-rose-300"><Trash2 size={17} /> Delete lead</button>
            </form>
          </aside>
        </div>
      )}
    </div>
  );
}
