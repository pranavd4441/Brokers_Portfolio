'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { fetchApi } from '@/lib/api';

// ─── Interfaces ──────────────────────────────────────────────────
interface Lead {
  id: string;
  property: string | null;
  property_title: string;
  source: 'WHATSAPP_CLICK' | 'PHONE_CLICK' | 'GATED_MODAL' | string;
  buyer_name: string;
  phone: string;
  email: string | null;
  status: 'NEW' | 'CONTACTED' | 'SITE_VISIT' | 'NEGOTIATION' | 'CLOSED' | 'LOST';
  notes: string | null;
  analytics_event: string | null;
  tenant_name: string;
  created_at: string;
  updated_at: string;
}

const STATUS_CHOICES = [
  { value: 'NEW', label: 'New / Uncontacted', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
  { value: 'CONTACTED', label: 'Contacted / Active', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  { value: 'SITE_VISIT', label: 'Site Visit Scheduled', color: 'bg-sky-500/10 text-sky-500 border-sky-500/20' },
  { value: 'NEGOTIATION', label: 'In Negotiation', color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' },
  { value: 'CLOSED', label: 'Closed / Won', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  { value: 'LOST', label: 'Lost / Not Interested', color: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
];

const SOURCE_LABELS: Record<string, string> = {
  WHATSAPP_CLICK: '💬 WhatsApp CTA',
  PHONE_CLICK: '📞 Phone CTA',
  GATED_MODAL: '🎯 Lead Form',
};

export default function LeadsPage() {
  const queryClient = useQueryClient();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  
  // View mode, search and filter states
  const [viewMode, setViewMode] = useState<'LIST' | 'PIPELINE'>('LIST');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'NEW' | 'CONTACTED' | 'SITE_VISIT' | 'NEGOTIATION' | 'CLOSED' | 'LOST'>('ALL');

  // Edit states inside drawer
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editStatus, setEditStatus] = useState<'NEW' | 'CONTACTED' | 'SITE_VISIT' | 'NEGOTIATION' | 'CLOSED' | 'LOST'>('NEW');
  const [editNotes, setEditNotes] = useState('');

  // Fetch leads
  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ['leads'],
    queryFn: () => fetchApi('/leads/'),
  });

  // Update lead mutation
  const updateLeadMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Lead> }) =>
      fetchApi(`/leads/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      // Keep selected lead state in sync if it's the drawer's active lead
      if (selectedLead?.id === updated.id) {
        setSelectedLead(updated);
      }
      toast.success('Lead details updated');
    },
    onError: () => {
      toast.error('Failed to update lead details');
    },
  });

  // Delete lead mutation
  const deleteLeadMutation = useMutation({
    mutationFn: (id: string) =>
      fetchApi(`/leads/${id}/`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setSelectedLead(null);
      toast.success('Lead deleted');
    },
    onError: () => {
      toast.error('Failed to delete lead');
    },
  });

  // Load selected lead data into edit states when drawer opens/changes
  useEffect(() => {
    if (selectedLead) {
      setEditName(selectedLead.buyer_name || '');
      setEditPhone(selectedLead.phone || '');
      setEditEmail(selectedLead.email || '');
      setEditStatus(selectedLead.status || 'NEW');
      setEditNotes(selectedLead.notes || '');
    }
  }, [selectedLead]);

  // Handle drawer save
  const handleSaveChanges = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;

    updateLeadMutation.mutate({
      id: selectedLead.id,
      payload: {
        buyer_name: editName.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim() || null,
        status: editStatus,
        notes: editNotes.trim() || null,
      },
    });
  };

  // Handle Quick Actions
  const handleQuickWhatsApp = (lead: Lead) => {
    const text = encodeURIComponent(
      `Hi ${lead.buyer_name}! Thanks for your inquiry about "${lead.property_title || 'our listings'}". How can I help you further?`
    );
    window.open(`https://wa.me/${lead.phone.replace(/[^0-9+]/g, '')}?text=${text}`, '_blank');
  };

  // Drag and drop handlers for Kanban pipeline
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('leadId', leadId);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: Lead['status']) => {
    const leadId = e.dataTransfer.getData('leadId');
    if (!leadId) return;

    updateLeadMutation.mutate({
      id: leadId,
      payload: { status: newStatus },
    });
  };

  // Filter and search logic (tab + search queries)
  const filteredLeads = leads.filter((lead) => {
    const matchesTab = activeTab === 'ALL' || lead.status === activeTab;
    const matchesSearch =
      lead.buyer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone?.includes(searchQuery) ||
      lead.property_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.email && lead.email.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesTab && matchesSearch;
  });

  // Search filtered leads ignoring the active list tab (used for Kanban columns)
  const searchOnlyFilteredLeads = leads.filter((lead) => {
    const q = searchQuery.toLowerCase();
    return q === '' ||
      lead.buyer_name?.toLowerCase().includes(q) ||
      lead.phone?.includes(q) ||
      lead.property_title?.toLowerCase().includes(q) ||
      (lead.email && lead.email.toLowerCase().includes(q));
  });

  // Count helper
  const getTabCount = (statusType: 'ALL' | 'NEW' | 'CONTACTED' | 'SITE_VISIT' | 'NEGOTIATION' | 'CLOSED' | 'LOST') => {
    if (statusType === 'ALL') return leads.length;
    return leads.filter((l) => l.status === statusType).length;
  };

  return (
    <div className="space-y-6 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-[#f0f4ff] tracking-tight">Lead Inbox</h1>
          <p className="text-xs text-[#8892aa] mt-1">
            Real-time prospect tracking, CRM pipelines, and multi-tenant lead routing.
          </p>
        </div>
        
        {/* Toggle List/Pipeline + Summary counts */}
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-[#0a0c14] border border-[rgba(255,255,255,0.04)] rounded-xl p-1">
            <button
              onClick={() => setViewMode('LIST')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'LIST'
                  ? 'bg-[#16c784] text-[#07090f]'
                  : 'text-[#8892aa] hover:text-[#f0f4ff]'
              }`}
            >
              📥 List
            </button>
            <button
              onClick={() => setViewMode('PIPELINE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'PIPELINE'
                  ? 'bg-[#16c784] text-[#07090f]'
                  : 'text-[#8892aa] hover:text-[#f0f4ff]'
              }`}
            >
              📊 Pipeline
            </button>
          </div>

          <div className="hidden xs:flex items-center gap-2">
            <div className="px-3.5 py-1.5 rounded-xl bg-[#0a0c14] border border-[rgba(255,255,255,0.04)] text-center">
              <span className="text-xs font-bold text-[#f0f4ff]">{getTabCount('NEW')}</span>
              <span className="text-[9px] text-[#4a5470] font-semibold uppercase tracking-wider ml-1">New</span>
            </div>
            <div className="px-3.5 py-1.5 rounded-xl bg-[#0a0c14] border border-[rgba(255,255,255,0.04)] text-center">
              <span className="text-xs font-bold text-[#16c784]">{getTabCount('CLOSED')}</span>
              <span className="text-[9px] text-[#4a5470] font-semibold uppercase tracking-wider ml-1">Won</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar (Render search in both, tab filters only in List) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl bg-[#0a0c14] border border-[rgba(255,255,255,0.04)]">
        {/* Tab Filters (List mode only) */}
        {viewMode === 'LIST' ? (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2 lg:pb-0">
            {(['ALL', 'NEW', 'CONTACTED', 'SITE_VISIT', 'NEGOTIATION', 'CLOSED', 'LOST'] as const).map((tab) => {
              const isActive = activeTab === tab;
              const count = getTabCount(tab);
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                    isActive
                      ? 'bg-[#16c784]/15 text-[#16c784] border-[#16c784]/30'
                      : 'bg-transparent text-[#8892aa] border-transparent hover:text-[#c8d0e0] hover:bg-[#0d1117]/60'
                  }`}
                >
                  <span>{tab === 'ALL' ? 'All Leads' : tab.replace('_', ' ').charAt(0) + tab.replace('_', ' ').slice(1).toLowerCase()}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-[#16c784]/20 text-[#16c784]' : 'bg-[#0d1117] text-[#4a5470]'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#8892aa]">📊 Pipeline view active</span>
            <p className="text-[10px] text-[#4a5470]">Drag cards to update their status stages</p>
          </div>
        )}

        {/* Search Input */}
        <div className="relative max-w-sm w-full">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search by name, phone, listing..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-4 bg-[#07090f]/60 border border-[rgba(255,255,255,0.08)] rounded-xl text-xs text-[#f0f4ff] placeholder-[#4a5470] focus:outline-none focus:border-[#16c784] focus:ring-1 focus:ring-[#16c784] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#4a5470] hover:text-[#8892aa]"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main Container */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-20 w-full rounded-2xl bg-[#0a0c14]/40 border border-[rgba(255,255,255,0.03)] animate-pulse" />
          ))}
        </div>
      ) : viewMode === 'PIPELINE' ? (
        /* ─── KANBAN BOARD VIEW ─── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 overflow-x-auto pb-4 custom-scrollbar">
          {STATUS_CHOICES.map((col) => {
            const colLeads = searchOnlyFilteredLeads.filter((l) => l.status === col.value);
            return (
              <div
                key={col.value}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, col.value as Lead['status'])}
                className="flex flex-col min-h-[520px] w-full min-w-[210px] bg-[#0a0c14]/30 border border-[rgba(255,255,255,0.03)] rounded-2xl p-3"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between mb-3.5 pb-2 border-b border-[rgba(255,255,255,0.04)]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${
                      col.value === 'CLOSED'
                        ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]'
                        : col.value === 'LOST'
                        ? 'bg-rose-500'
                        : col.value === 'NEW'
                        ? 'bg-yellow-500'
                        : col.value === 'CONTACTED'
                        ? 'bg-blue-500'
                        : col.value === 'SITE_VISIT'
                        ? 'bg-sky-500'
                        : 'bg-indigo-500'
                    }`} />
                    <span className="text-[10px] font-bold text-[#f0f4ff] uppercase tracking-wider truncate">
                      {col.value.replace('_', ' ')}
                    </span>
                  </div>
                  <span className="text-[9px] font-bold text-[#4a5470] bg-[#0d1117] px-2 py-0.5 rounded-full">
                    {colLeads.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="flex-1 flex flex-col gap-2.5 overflow-y-auto no-scrollbar">
                  {colLeads.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-[rgba(255,255,255,0.02)] rounded-xl py-12 text-center text-[#4a5470]">
                      <span className="text-xl opacity-20">🎯</span>
                      <span className="text-[9px] mt-1 uppercase font-bold tracking-wider opacity-60">No Leads</span>
                    </div>
                  ) : (
                    colLeads.map((lead) => (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead.id)}
                        onClick={() => setSelectedLead(lead)}
                        className={`bg-[#0d1117]/80 hover:bg-[#0d1117] border border-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.12)] rounded-xl p-3 shadow-sm transition-all duration-150 cursor-grab active:cursor-grabbing relative group ${
                          selectedLead?.id === lead.id ? 'border-[#16c784]/40 bg-[#0d1117]' : ''
                        }`}
                      >
                        <h5 className="text-xs font-semibold text-[#f0f4ff] truncate leading-normal">
                          {lead.buyer_name}
                        </h5>
                        <p className="text-[10px] text-[#8892aa] mt-1 tracking-tight">{lead.phone}</p>
                        
                        <div className="text-[10px] text-[#4a5470] bg-[#07090f]/90 px-2 py-1 rounded-lg border border-[rgba(255,255,255,0.03)] mt-2.5 truncate">
                          🏡 {lead.property_title || 'General Inquiry'}
                        </div>

                        <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-[rgba(255,255,255,0.03)] text-[9px] text-[#4a5470] font-semibold">
                          <span className="truncate max-w-[100px]">
                            {SOURCE_LABELS[lead.source]?.split(' ')[0] || '🎯'} {lead.source.replace('_', ' ')}
                          </span>
                          <span>
                            {new Date(lead.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ─── INBOX LIST VIEW ─── */
        filteredLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl bg-[#0a0c14]/20 border border-[rgba(255,255,255,0.03)]">
            <span className="text-4xl opacity-30 mb-4">🎯</span>
            <h3 className="text-sm font-bold text-[#f0f4ff] mb-1.5">No leads found</h3>
            <p className="text-xs text-[#4a5470] max-w-xs leading-relaxed">
              {searchQuery || activeTab !== 'ALL'
                ? 'Try adjusting your search query or status filter criteria.'
                : 'When prospects click CTA buttons on your public listings, they will automatically appear in this inbox.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredLeads.map((lead) => {
              const statusConfig = STATUS_CHOICES.find((c) => c.value === lead.status) || STATUS_CHOICES[0];
              return (
                <div
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  className={`os-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-[rgba(255,255,255,0.12)] hover:bg-[#0a0c14]/80 cursor-pointer transition-all ${
                    selectedLead?.id === lead.id ? 'border-[#16c784]/40 bg-[#0a0c14]/90' : ''
                  }`}
                >
                  {/* Profile info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      lead.status === 'CLOSED'
                        ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                        : lead.status === 'CONTACTED'
                        ? 'bg-blue-500'
                        : lead.status === 'LOST'
                        ? 'bg-rose-500'
                        : lead.status === 'NEW'
                        ? 'bg-yellow-500 animate-pulse'
                        : lead.status === 'SITE_VISIT'
                        ? 'bg-sky-500'
                        : 'bg-indigo-500'
                    }`} />
                    
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-semibold text-[#f0f4ff] truncate">{lead.buyer_name}</h4>
                        <span className="text-[9px] font-medium text-[#4a5470]">
                          {new Date(lead.created_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-[#8892aa] truncate mt-0.5">{lead.phone}</p>
                    </div>
                  </div>

                  {/* Property & Source details */}
                  <div className="flex flex-wrap items-center gap-3 md:self-center">
                    <div className="text-xs bg-[#0d1117]/80 border border-[rgba(255,255,255,0.04)] px-3 py-1.5 rounded-xl max-w-xs truncate text-[#c8d0e0]">
                      🏡 {lead.property_title || 'General Inquiry'}
                    </div>

                    <span className="text-[10px] font-medium px-2.5 py-1 rounded-lg bg-[#0d1117] border border-[rgba(255,255,255,0.05)] text-[#8892aa]">
                      {SOURCE_LABELS[lead.source] || lead.source}
                    </span>

                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${statusConfig.color}`}>
                      {lead.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ── Slide-out Details Drawer ── */}
      {selectedLead && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setSelectedLead(null)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity"
          />

          {/* Drawer container */}
          <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-[#0a0c14] border-l border-[rgba(255,255,255,0.08)] shadow-2xl overflow-y-auto no-scrollbar flex flex-col transition-transform duration-300">
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-5 border-b border-[rgba(255,255,255,0.06)] bg-[#0d1117]/80">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#16c784]">Lead Profile</span>
                <h3 className="text-base font-bold text-[#f0f4ff] mt-0.5 truncate">{selectedLead.buyer_name}</h3>
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#4a5470] hover:text-[#f0f4ff] hover:bg-[rgba(255,255,255,0.05)] transition-all"
              >
                ✕
              </button>
            </div>

            {/* Quick Contact Bar */}
            <div className="grid grid-cols-2 gap-2 p-5 border-b border-[rgba(255,255,255,0.04)] bg-[#07090f]/40">
              <button
                onClick={() => handleQuickWhatsApp(selectedLead)}
                className="flex items-center justify-center gap-2 h-10 rounded-xl bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] text-xs font-semibold hover:bg-[#25D366]/25 active:scale-95 transition-all cursor-pointer"
              >
                <span>💬</span> WhatsApp
              </button>
              <a
                href={`tel:${selectedLead.phone}`}
                className="flex items-center justify-center gap-2 h-10 rounded-xl bg-[#16c784]/10 border border-[#16c784]/20 text-[#16c784] text-xs font-semibold hover:bg-[#16c784]/25 active:scale-95 transition-all cursor-pointer"
              >
                <span>📞</span> Call Direct
              </a>
            </div>

            {/* Form & Details */}
            <form onSubmit={handleSaveChanges} className="flex-1 p-5 space-y-5">
              {/* Read-only listing context */}
              <div className="p-3.5 rounded-xl bg-[#0d1117]/80 border border-[rgba(255,255,255,0.04)] space-y-1.5">
                <div className="text-[9px] font-bold text-[#4a5470] uppercase tracking-wider">Listing Target</div>
                <div className="text-xs font-semibold text-[#f0f4ff] truncate">
                  {selectedLead.property_title || 'General Inquiry'}
                </div>
                <div className="flex justify-between items-center text-[10px] text-[#8892aa] pt-1">
                  <span>Source: {SOURCE_LABELS[selectedLead.source] || selectedLead.source}</span>
                  <span>Captured: {new Date(selectedLead.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Edit Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#4a5470] mb-1.5">
                    Prospect Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full h-10 px-3.5 bg-[#07090f]/80 border border-[rgba(255,255,255,0.08)] rounded-xl text-xs text-[#f0f4ff] focus:outline-none focus:border-[#16c784] focus:ring-1 focus:ring-[#16c784] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#4a5470] mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full h-10 px-3.5 bg-[#07090f]/80 border border-[rgba(255,255,255,0.08)] rounded-xl text-xs text-[#f0f4ff] focus:outline-none focus:border-[#16c784] focus:ring-1 focus:ring-[#16c784] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#4a5470] mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="Not provided"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full h-10 px-3.5 bg-[#07090f]/80 border border-[rgba(255,255,255,0.08)] rounded-xl text-xs text-[#f0f4ff] placeholder-[#4a5470] focus:outline-none focus:border-[#16c784] focus:ring-1 focus:ring-[#16c784] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#4a5470] mb-1.5">
                    Lead Status
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {STATUS_CHOICES.map((choice) => {
                      const isSelected = editStatus === choice.value;
                      return (
                        <button
                          key={choice.value}
                          type="button"
                          onClick={() => setEditStatus(choice.value as any)}
                          className={`h-9 px-1 rounded-xl text-[9px] font-bold border transition-all flex items-center justify-center cursor-pointer ${
                            isSelected
                              ? 'bg-[#16c784]/15 text-[#16c784] border-[#16c784]/30'
                              : 'bg-transparent text-[#8892aa] border-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.02)]'
                          }`}
                        >
                          {choice.value.replace('_', ' ')}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#4a5470] mb-1.5">
                    Broker Notes / Follow-up History
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Enter discussion logs, budget specs, site visit notes, etc."
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full p-3.5 bg-[#07090f]/80 border border-[rgba(255,255,255,0.08)] rounded-xl text-xs text-[#f0f4ff] placeholder-[#4a5470] focus:outline-none focus:border-[#16c784] focus:ring-1 focus:ring-[#16c784] resize-none transition-all"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-[rgba(255,255,255,0.06)] flex flex-col sm:flex-row items-stretch gap-2.5">
                <button
                  type="submit"
                  disabled={updateLeadMutation.isPending}
                  className="flex-1 h-11 rounded-xl text-xs font-bold text-[#07090f] bg-[#16c784] hover:opacity-90 disabled:opacity-50 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {updateLeadMutation.isPending ? 'Saving...' : '✓ Save Changes'}
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this lead? This action is permanent.')) {
                      deleteLeadMutation.mutate(selectedLead.id);
                    }
                  }}
                  disabled={deleteLeadMutation.isPending}
                  className="h-11 px-4 rounded-xl text-xs font-semibold text-[#f43f5e] bg-[#f43f5e]/10 border border-[#f43f5e]/20 hover:bg-[#f43f5e]/15 active:scale-98 transition-all cursor-pointer flex items-center justify-center"
                  title="Delete Lead"
                >
                  🗑 Delete
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
