'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { fetchApi } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import ShareModal from '@/components/ShareModal';
import PropertyCard from '@/components/PropertyCard';

// ─── Type definitions ──────────────────────────────────────────
interface PropertyImage {
  id: string;
  url: string;
  thumbnail_url: string;
  display_order: number;
}

interface Property {
  id: string;
  title: string;
  description: string;
  price: number;
  property_type: 'APARTMENT' | 'VILLA' | 'PLOT' | 'COMMERCIAL';
  status: 'AVAILABLE' | 'NEGOTIATION' | 'SITE_VISIT' | 'BOOKED' | 'SOLD' | 'EXPIRED';
  city: string;
  area: string;
  bhk: number | null;
  square_feet: number | null;
  amenities: string[];
  images: PropertyImage[];
  created_at: string;
  assigned_to?: string;
  assigned_to_name?: string;
  expires_at?: string;
  views_count?: number;
  leads_count?: number;
  slug?: string;
}

interface DashboardMetrics {
  summary: {
    total_properties: number;
    total_views: number;
    whatsapp_clicks: number;
    phone_clicks: number;
    conversion_rate: number;
    total_clicks: number;
  };
  device_distribution: Record<string, number>;
  top_properties: Array<{ id: string; title: string; views: number; price: number; status: string }>;
  performance_chart: Array<{ date: string; views: number; clicks: number }>;
}

const PIPELINE_COLUMNS = [
  { value: 'AVAILABLE', label: 'Available', border: 'border-emerald-500/10', bg: 'bg-emerald-500/5', text: 'text-emerald-400' },
  { value: 'SITE_VISIT', label: 'Site Visit', border: 'border-cyan-500/10', bg: 'bg-cyan-500/5', text: 'text-cyan-400' },
  { value: 'NEGOTIATION', label: 'Negotiation', border: 'border-blue-500/10', bg: 'bg-blue-500/5', text: 'text-blue-400' },
  { value: 'BOOKED', label: 'Booked', border: 'border-yellow-500/10', bg: 'bg-yellow-500/5', text: 'text-yellow-400' },
  { value: 'SOLD', label: 'Sold', border: 'border-purple-500/10', bg: 'bg-purple-500/5', text: 'text-purple-400' },
  { value: 'EXPIRED', label: 'Expired', border: 'border-rose-500/10', bg: 'bg-rose-500/5', text: 'text-rose-400' },
];

// ─── Stat Card ─────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  gradientClass: string;
  icon: string;
  trend?: { value: number; positive: boolean };
}

function StatCard({ label, value, sublabel, gradientClass, icon, trend }: StatCardProps) {
  return (
    <div className={`os-card ${gradientClass} p-5 flex flex-col gap-3 cursor-default select-none`}>
      <div className="flex items-center justify-between">
        <span className="os-label">{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <div>
        <div className="text-2xl lg:text-3xl font-bold tracking-tight text-[#f0f4ff]">{value}</div>
        {sublabel && <div className="text-xs text-[#4a5470] mt-0.5">{sublabel}</div>}
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-[11px] font-semibold ${trend.positive ? 'text-[#16c784]' : 'text-[#f43f5e]'}`}>
          <span>{trend.positive ? '↑' : '↓'}</span>
          <span>{trend.value}% vs last week</span>
        </div>
      )}
    </div>
  );
}

// ─── Micro Bar Chart ────────────────────────────────────────────
function MiniBarChart({ data }: { data: Array<{ date: string; views: number; clicks: number }> }) {
  const maxViews = Math.max(...data.map(d => d.views), 1);

  return (
    <div className="flex items-end gap-1.5 h-20">
      {data.map((item, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
          {/* Tooltip */}
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#0d1117] border border-[rgba(255,255,255,0.08)] rounded-lg px-2.5 py-1.5 text-[10px] text-[#f0f4ff] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 shadow-xl">
            <div className="font-semibold">{item.date}</div>
            <div className="text-[#38bdf8]">{item.views} views</div>
            <div className="text-[#16c784]">{item.clicks} clicks</div>
          </div>
          {/* Bar */}
          <div
            className="w-full rounded-t-sm bg-[rgba(56,189,248,0.15)] hover:bg-[rgba(56,189,248,0.3)] transition-all relative overflow-hidden"
            style={{ height: `${Math.max((item.views / maxViews) * 100, 8)}%` }}
          >
            {/* Click fill overlay */}
            <div
              className="absolute bottom-0 left-0 right-0 bg-[#16c784]/60"
              style={{ height: item.views > 0 ? `${(item.clicks / item.views) * 100}%` : '0%' }}
            />
          </div>
          {/* Label */}
          <span className="text-[9px] text-[#4a5470] mt-1">{item.date.split(' ')[0]}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Empty State ────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-3xl bg-[#0d1117] border border-[rgba(255,255,255,0.06)] flex items-center justify-center text-4xl">
          🏡
        </div>
        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#16c784] flex items-center justify-center text-[#07090f] text-xs font-bold">
          +
        </div>
      </div>
      <h3 className="text-base font-bold text-[#f0f4ff] mb-2">No listings yet</h3>
      <p className="text-sm text-[#4a5470] max-w-xs leading-relaxed">
        Create your first premium property listing and start sharing with prospects in under 60 seconds.
      </p>
      <Link href="/dashboard/properties/new" className="os-btn-primary mt-6 text-sm">
        <span>+</span>
        <span>Create First Listing</span>
      </Link>
    </div>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────────
export default function DashboardPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [shareData, setShareData] = useState<{
    url: string;
    whatsappText: string;
    propertyTitle: string;
  } | null>(null);

  const [generatingShareId, setGeneratingShareId] = useState<string | null>(null);

  // ─── Inventory filter & view states ──────────────────────────
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  
  // Phase 4 additions
  const [viewMode, setViewMode] = useState<'GRID' | 'KANBAN'>('GRID');
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);
  const [showBulkStatusDropdown, setShowBulkStatusDropdown] = useState(false);
  const [activeAssignMenuId, setActiveAssignMenuId] = useState<string | null>(null);

  const STATUS_OPTIONS = [
    { value: 'ALL', label: 'All' },
    { value: 'AVAILABLE', label: 'Available' },
    { value: 'SITE_VISIT', label: 'Site Visit' },
    { value: 'NEGOTIATION', label: 'Negotiation' },
    { value: 'BOOKED', label: 'Booked' },
    { value: 'SOLD', label: 'Sold' },
    { value: 'EXPIRED', label: 'Expired' },
  ];

  const TYPE_OPTIONS = [
    { value: 'ALL', label: 'All Types' },
    { value: 'APARTMENT', label: 'Apartment' },
    { value: 'VILLA', label: 'Villa' },
    { value: 'PLOT', label: 'Plot' },
    { value: 'COMMERCIAL', label: 'Commercial' },
  ];

  // Fetch analytics metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery<DashboardMetrics>({
    queryKey: ['dashboardMetrics'],
    queryFn: () => fetchApi('/analytics/dashboard/'),
    staleTime: 30_000,
  });

  // Fetch properties
  const { data: properties, isLoading: propertiesLoading } = useQuery<Property[]>({
    queryKey: ['properties'],
    queryFn: () => fetchApi('/properties/'),
  });

  // Fetch team members for assignment
  const { data: teamMembers = [] } = useQuery<any[]>({
    queryKey: ['teamMembers'],
    queryFn: () => fetchApi('/auth/team/'),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => fetchApi(`/properties/${id}/duplicate/`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      toast.success('Listing duplicated');
    },
    onError: () => toast.error('Failed to duplicate listing'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetchApi(`/properties/${id}/`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      toast.success('Listing deleted');
    },
    onError: () => toast.error('Failed to delete listing'),
  });

  // Bulk actions mutations
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => fetchApi(`/properties/${id}/`, { method: 'DELETE' })));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      setSelectedPropertyIds([]);
      toast.success('Selected listings deleted');
    },
    onError: () => toast.error('Failed to delete some listings'),
  });

  const bulkStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      await Promise.all(ids.map(id => fetchApi(`/properties/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      setSelectedPropertyIds([]);
      setShowBulkStatusDropdown(false);
      toast.success('Status updated for selected listings');
    },
    onError: () => toast.error('Failed to update status for some listings'),
  });

  // Drag and drop handlers for Kanban pipeline
  const handleDragStart = (e: React.DragEvent, propertyId: string) => {
    e.dataTransfer.setData('propertyId', propertyId);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    const propertyId = e.dataTransfer.getData('propertyId');
    if (propertyId) {
      try {
        await fetchApi(`/properties/${propertyId}/`, {
          method: 'PATCH',
          body: JSON.stringify({ status: newStatus }),
        });
        queryClient.invalidateQueries({ queryKey: ['properties'] });
        toast.success(`Listing status updated to ${newStatus.toLowerCase().replace('_', ' ')}`);
      } catch (err: any) {
        toast.error(err.message || 'Failed to update status');
      }
    }
  };

  // Property assignment handler
  const handleAssignProperty = async (propertyId: string, userId: string | null) => {
    try {
      await fetchApi(`/properties/${propertyId}/`, {
        method: 'PATCH',
        body: JSON.stringify({ assigned_to: userId }),
      });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      setActiveAssignMenuId(null);
      toast.success(userId ? 'Listing assigned' : 'Listing unassigned');
    } catch (err: any) {
      toast.error(err.message || 'Failed to assign listing');
    }
  };

  const handleShare = useCallback(async (property: Property) => {
    setGeneratingShareId(property.id);
    try {
      const res = await fetchApi('/sharing/links/', {
        method: 'POST',
        body: JSON.stringify({ property: property.id }),
      });
      setShareData({
        url: res.full_share_url,
        whatsappText: res.whatsapp_share_text,
        propertyTitle: property.title,
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate share link');
    } finally {
      setGeneratingShareId(null);
    }
  }, []);

  const isLoading = metricsLoading || propertiesLoading;
  const summary = metrics?.summary;
  const totalMobile = Object.values(metrics?.device_distribution ?? {}).reduce((a, b) => a + b, 0);
  const mobilePercent = totalMobile > 0
    ? Math.round(((metrics?.device_distribution?.MOBILE ?? 0) / totalMobile) * 100)
    : 0;

  // ─── Client-side filtering ──────────────────────────────────
  const filteredProperties = (properties ?? []).filter(p => {
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || p.property_type === typeFilter;
    const q = search.toLowerCase();
    const matchesSearch = q === '' ||
      p.title.toLowerCase().includes(q) ||
      p.area.toLowerCase().includes(q) ||
      p.city.toLowerCase().includes(q);
    return matchesStatus && matchesType && matchesSearch;
  });

  // Expiry Checker Helper (within 7 days)
  const isExpiringSoon = (expiryStr?: string) => {
    if (!expiryStr) return false;
    const expiry = new Date(expiryStr);
    const diffTime = expiry.getTime() - new Date().getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  };

  return (
    <>
      {/* ── Share Modal ── */}
      {shareData && (
        <ShareModal
          url={shareData.url}
          whatsappText={shareData.whatsappText}
          propertyTitle={shareData.propertyTitle}
          onClose={() => setShareData(null)}
        />
      )}

      <div className="space-y-8 os-fade-in pb-20">
        {/* ── Page header ── */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <p className="os-label mb-1">Good morning, {user?.name?.split(' ')[0] ?? 'Broker'}</p>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#f0f4ff]">
              Workspace Overview
            </h1>
          </div>
          <Link href="/dashboard/properties/new" className="os-btn-primary shrink-0">
            <span className="text-base leading-none">+</span>
            <span>New Listing</span>
          </Link>
        </div>

        {/* ── Stats grid ── */}
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="os-skeleton h-28 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Listings"
              value={summary?.total_properties ?? 0}
              sublabel="Active inventory"
              gradientClass="grad-blue"
              icon="🏠"
            />
            <StatCard
              label="Page Views"
              value={(summary?.total_views ?? 0).toLocaleString()}
              sublabel="Cumulative"
              gradientClass="grad-purple"
              icon="👁"
            />
            <StatCard
              label="WhatsApp Clicks"
              value={summary?.whatsapp_clicks ?? 0}
              sublabel="Leads captured"
              gradientClass="grad-emerald"
              icon="💬"
            />
            <StatCard
              label="Conversion Rate"
              value={`${(summary?.conversion_rate ?? 0).toFixed(1)}%`}
              sublabel={`${mobilePercent}% mobile traffic`}
              gradientClass="grad-amber"
              icon="📈"
            />
          </div>
        )}

        {/* ── Analytics row ── */}
        {!isLoading && metrics && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* 7-day chart */}
            <div className="lg:col-span-2 os-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-[#f0f4ff]">Performance</h3>
                  <p className="text-xs text-[#4a5470] mt-0.5">Views vs WhatsApp clicks, last 7 days</p>
                </div>
                <div className="flex items-center gap-4 text-[10px] text-[#4a5470] font-medium">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-sm inline-block bg-[rgba(56,189,248,0.3)]" /> Views
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-sm inline-block bg-[#16c784]/60" /> Clicks
                  </span>
                </div>
              </div>
              <MiniBarChart data={metrics.performance_chart} />
            </div>

            {/* Top performers */}
            <div className="os-card p-5 flex flex-col">
              <h3 className="text-sm font-semibold text-[#f0f4ff] mb-4">Top Properties</h3>
              <div className="flex-1 space-y-3">
                {metrics.top_properties.length > 0 ? (
                  metrics.top_properties.slice(0, 5).map((item, rank) => {
                    const maxViews = Math.max(...metrics.top_properties.map(p => p.views), 1);
                    return (
                      <div key={item.id} className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-[#4a5470] w-4 text-center">
                          {rank + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-[#c8d0e0] truncate">{item.title}</div>
                          {/* Progress bar */}
                          <div className="mt-1 h-1 bg-[rgba(255,255,255,0.04)] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#16c784] rounded-full transition-all"
                              style={{ width: `${(item.views / maxViews) * 100}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-[10px] font-semibold text-[#4a5470] shrink-0">
                          {item.views}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex-1 flex items-center justify-center text-xs text-[#4a5470] py-8">
                    Share a listing to see analytics
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Inventory section ── */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-bold text-[#f0f4ff]">Property Inventory</h2>
              {properties && properties.length > 0 && (
                <p className="text-xs text-[#4a5470] mt-0.5">
                  {filteredProperties.length} of {properties.length} listing{properties.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
            
            {/* View Mode Toggle */}
            {properties && properties.length > 0 && (
              <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0a0c14] border border-[rgba(255,255,255,0.04)] self-start sm:self-auto flex-shrink-0">
                <button
                  onClick={() => setViewMode('GRID')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    viewMode === 'GRID'
                      ? 'bg-[#16c784]/15 text-[#16c784]'
                      : 'text-[#8892aa] hover:text-[#c8d0e0]'
                  }`}
                >
                  <span>田</span> Grid View
                </button>
                <button
                  onClick={() => setViewMode('KANBAN')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    viewMode === 'KANBAN'
                      ? 'bg-[#16c784]/15 text-[#16c784]'
                      : 'text-[#8892aa] hover:text-[#c8d0e0]'
                  }`}
                >
                  <span>📋</span> Pipeline Board
                </button>
              </div>
            )}
          </div>

          {/* ── Filter & Search Bar ── */}
          {properties && properties.length > 0 && (
            <div className="mb-5 flex flex-col gap-3">
              {/* Search */}
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4a5470] text-sm">🔍</span>
                <input
                  type="text"
                  placeholder="Search by title, area or city…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#0d1117] border border-[rgba(255,255,255,0.06)] text-sm text-[#f0f4ff] placeholder:text-[#4a5470] focus:outline-none focus:border-[#16c784]/40 transition-colors"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4a5470] hover:text-[#f0f4ff] text-xs"
                  >✕</button>
                )}
              </div>

              {/* Status filter pills */}
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setStatusFilter(opt.value)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                      statusFilter === opt.value
                        ? 'bg-[#16c784] text-[#07090f] border-[#16c784]'
                        : 'bg-transparent text-[#8892aa] border-[rgba(255,255,255,0.08)] hover:border-[#16c784]/40 hover:text-[#c8d0e0]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
                <span className="text-[rgba(255,255,255,0.08)] select-none px-1">│</span>
                {TYPE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setTypeFilter(opt.value)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                      typeFilter === opt.value
                        ? 'bg-[#38bdf8]/20 text-[#38bdf8] border-[#38bdf8]/40'
                        : 'bg-transparent text-[#8892aa] border-[rgba(255,255,255,0.08)] hover:border-[#38bdf8]/30 hover:text-[#c8d0e0]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="os-skeleton rounded-2xl h-80" />
              ))}
            </div>
          ) : !properties || properties.length === 0 ? (
            <div className="os-card">
              <EmptyState />
            </div>
          ) : filteredProperties.length === 0 ? (
            <div className="os-card flex flex-col items-center justify-center py-16 text-center">
              <span className="text-4xl mb-4">🔎</span>
              <h3 className="text-sm font-bold text-[#f0f4ff] mb-1">No listings match your filters</h3>
              <p className="text-xs text-[#4a5470]">
                Try adjusting your search or filter options
              </p>
              <button
                onClick={() => { setSearch(''); setStatusFilter('ALL'); setTypeFilter('ALL'); }}
                className="mt-4 px-4 py-1.5 rounded-xl bg-[#16c784]/10 text-[#16c784] text-xs font-semibold hover:bg-[#16c784]/20 transition-all cursor-pointer"
              >
                Clear filters
              </button>
            </div>
          ) : viewMode === 'KANBAN' ? (
            /* ─── KANBAN BOARD ───────────────────────────────────── */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 overflow-x-auto pb-4 items-start select-none">
              {PIPELINE_COLUMNS.map(col => {
                const colProperties = filteredProperties.filter(p => p.status === col.value);
                return (
                  <div
                    key={col.value}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => handleDrop(e, col.value)}
                    className="flex flex-col gap-3.5 min-w-[200px] max-w-[280px] p-2.5 rounded-2xl border border-[rgba(255,255,255,0.03)] bg-[#0a0c14]/30"
                  >
                    {/* Column Header */}
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          col.value === 'AVAILABLE' ? 'bg-emerald-500' :
                          col.value === 'SOLD' ? 'bg-purple-500' :
                          col.value === 'EXPIRED' ? 'bg-rose-500' : 'bg-blue-500'
                        }`} />
                        <h4 className="text-[11px] font-bold text-[#f0f4ff] uppercase tracking-wide">
                          {col.label}
                        </h4>
                      </div>
                      <span className="text-[9px] font-bold text-[#4a5470] px-1.5 py-0.5 rounded-full bg-[#0d1117] border border-[rgba(255,255,255,0.03)]">
                        {colProperties.length}
                      </span>
                    </div>

                    {/* Column Cards Container */}
                    <div className="flex flex-col gap-2.5 min-h-[360px] overflow-y-auto max-h-[600px] no-scrollbar">
                      {colProperties.length === 0 ? (
                        <div className="flex-1 border border-dashed border-[rgba(255,255,255,0.04)] rounded-xl flex items-center justify-center py-10 text-[10px] text-[#4a5470] text-center px-4">
                          Drop listings here
                        </div>
                      ) : (
                        colProperties.map(p => {
                          const expiringSoon = isExpiringSoon(p.expires_at);
                          const priceVal = p.price;
                          const priceStr = priceVal >= 10_000_000
                            ? `₹${(priceVal / 10_000_000).toFixed(1)} Cr`
                            : `₹${(priceVal / 100_000).toFixed(0)} L`;

                          return (
                            <div
                              key={p.id}
                              draggable
                              onDragStart={e => handleDragStart(e, p.id)}
                              className="bg-[#0d1117]/80 hover:bg-[#0d1117] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] rounded-xl p-3.5 shadow-sm transition-all duration-150 cursor-grab active:cursor-grabbing relative group"
                            >
                              {/* Title */}
                              <h5 className="text-xs font-semibold text-[#f0f4ff] line-clamp-1 leading-snug">
                                {p.title}
                              </h5>

                              {/* Price */}
                              <div className="text-[11px] font-bold text-[#16c784] mt-1">
                                {priceStr}
                              </div>

                              {/* Location */}
                              <div className="text-[10px] text-[#4a5470] mt-1 truncate">
                                📍 {p.area}, {p.city}
                              </div>

                              {/* Expiry Warning */}
                              {expiringSoon && p.status !== 'EXPIRED' && (
                                <div className="mt-2 text-[8px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/25 w-max">
                                  ⏳ Expiring Soon
                                </div>
                              )}

                              {/* Metrics count row */}
                              <div className="flex items-center gap-3 mt-3 pt-2.5 border-t border-[rgba(255,255,255,0.04)] text-[9px] text-[#4a5470] font-semibold">
                                <span>👀 {p.views_count ?? 0}</span>
                                <span>🎯 {p.leads_count ?? 0}</span>
                              </div>

                              {/* Footer Assignment & Quick Action Row */}
                              <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[rgba(255,255,255,0.04)] gap-2">
                                {/* Assignment Dropdown */}
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveAssignMenuId(activeAssignMenuId === p.id ? null : p.id);
                                    }}
                                    className="h-6 px-2 rounded-lg bg-[#07090f] border border-[rgba(255,255,255,0.06)] text-[9px] font-bold text-[#8892aa] hover:text-[#f0f4ff] flex items-center gap-1 cursor-pointer"
                                  >
                                    👤 {p.assigned_to_name ? p.assigned_to_name.split(' ')[0] : 'Unassigned'} ▾
                                  </button>
                                  {activeAssignMenuId === p.id && (
                                    <>
                                      <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setActiveAssignMenuId(null); }} />
                                      <div className="absolute bottom-full left-0 mb-1 z-20 w-36 bg-[#0a0c14] border border-[rgba(255,255,255,0.08)] rounded-xl overflow-hidden shadow-2xl py-0.5 max-h-40 overflow-y-auto no-scrollbar">
                                        <button
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); handleAssignProperty(p.id, null); }}
                                          className="w-full px-2.5 py-1.5 text-left text-[10px] text-[#f43f5e] hover:bg-[#f43f5e]/5 transition-colors font-medium cursor-pointer"
                                        >
                                          Unassign
                                        </button>
                                        {teamMembers.map((member: any) => (
                                          <button
                                            key={member.id}
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); handleAssignProperty(p.id, member.id); }}
                                            className={`w-full px-2.5 py-1.5 text-left text-[10px] text-[#8892aa] hover:text-[#f0f4ff] hover:bg-[rgba(255,255,255,0.03)] transition-colors cursor-pointer ${
                                              p.assigned_to === member.id ? 'text-[#16c784] font-bold' : ''
                                            }`}
                                          >
                                            {member.name}
                                          </button>
                                        ))}
                                      </div>
                                    </>
                                  )}
                                </div>

                                {/* Share & Link */}
                                <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleShare(p); }}
                                    className="w-6 h-6 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] flex items-center justify-center text-[10px] text-[#8892aa] hover:text-[#16c784] hover:bg-[#16c784]/10 transition-colors cursor-pointer"
                                    title="Share on WhatsApp"
                                  >
                                    💬
                                  </button>
                                  <Link
                                    href={`/p/${p.slug || p.id}`}
                                    target="_blank"
                                    className="w-6 h-6 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] flex items-center justify-center text-[10px] text-[#8892aa] hover:text-[#f0f4ff] transition-colors"
                                    title="View listing"
                                  >
                                    ↗
                                  </Link>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ─── GRID / CARD VIEW ───────────────────────────────── */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProperties.map(property => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  isGeneratingShare={generatingShareId === property.id}
                  onShare={() => handleShare(property)}
                  onDuplicate={() => duplicateMutation.mutate(property.id)}
                  onDelete={() => {
                    if (confirm(`Delete "${property.title}"? This cannot be undone.`)) {
                      deleteMutation.mutate(property.id);
                    }
                  }}
                  isSelected={selectedPropertyIds.includes(property.id)}
                  onSelectToggle={() => setSelectedPropertyIds(prev =>
                    prev.includes(property.id)
                      ? prev.filter(id => id !== property.id)
                      : [...prev, property.id]
                  )}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Floating Bulk Actions Bar ── */}
      {selectedPropertyIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-lg px-4 os-slide-up">
          <div className="bg-[#0a0c14]/90 backdrop-blur-xl border border-[#16c784]/30 rounded-2xl px-5 py-3.5 shadow-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-[#16c784]/15 text-[#16c784] flex items-center justify-center text-xs font-bold">
                {selectedPropertyIds.length}
              </div>
              <span className="text-xs font-semibold text-[#f0f4ff]">Selected</span>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Status change dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowBulkStatusDropdown(prev => !prev)}
                  className="px-3 h-9 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0d1117] text-[#8892aa] hover:text-[#f0f4ff] text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  Change Status ▾
                </button>
                {showBulkStatusDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowBulkStatusDropdown(false)} />
                    <div className="absolute bottom-full right-0 mb-2 z-20 w-40 os-frosted rounded-xl overflow-hidden shadow-2xl py-1 border border-[rgba(255,255,255,0.08)]">
                      {['AVAILABLE', 'NEGOTIATION', 'SITE_VISIT', 'BOOKED', 'SOLD', 'EXPIRED'].map(st => (
                        <button
                          key={st}
                          onClick={() => bulkStatusMutation.mutate({ ids: selectedPropertyIds, status: st })}
                          className="w-full px-3 py-2 text-left text-xs text-[#8892aa] hover:text-[#f0f4ff] hover:bg-[rgba(255,255,255,0.04)] transition-colors cursor-pointer"
                        >
                          {st.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Delete */}
              <button
                onClick={() => {
                  if (window.confirm(`Delete ${selectedPropertyIds.length} selected listings? This action is permanent.`)) {
                    bulkDeleteMutation.mutate(selectedPropertyIds);
                  }
                }}
                disabled={bulkDeleteMutation.isPending}
                className="px-3.5 h-9 rounded-xl bg-[#f43f5e]/10 border border-[#f43f5e]/20 text-[#f43f5e] text-xs font-bold hover:bg-[#f43f5e]/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {bulkDeleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>

              {/* Cancel / Clear Selection */}
              <button
                onClick={() => setSelectedPropertyIds([])}
                className="w-7 h-9 rounded-xl text-[#4a5470] hover:text-[#8892aa] text-sm flex items-center justify-center transition-all cursor-pointer"
                title="Clear Selection"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
