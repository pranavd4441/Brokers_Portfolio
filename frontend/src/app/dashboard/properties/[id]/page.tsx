'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { fetchApi } from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────
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
  location_address?: string;
  bhk: number | null;
  square_feet: number | null;
  amenities: string[];
  images: PropertyImage[];
  created_at: string;
  updated_at: string;
  assigned_to?: string;
  assigned_to_name?: string;
  created_by_name?: string;
  tenant_name?: string;
  expires_at?: string;
  views_count?: number;
  leads_count?: number;
  slug?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const STATUSES = [
  { value: 'AVAILABLE',   label: 'Available',   color: '#16c784', bg: 'rgba(22,199,132,0.1)' },
  { value: 'SITE_VISIT',  label: 'Site Visit',  color: '#38bdf8', bg: 'rgba(56,189,248,0.1)' },
  { value: 'NEGOTIATION', label: 'Negotiation', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  { value: 'BOOKED',      label: 'Booked',      color: '#818cf8', bg: 'rgba(129,140,248,0.1)' },
  { value: 'SOLD',        label: 'Sold',        color: '#f43f5e', bg: 'rgba(244,63,94,0.1)' },
  { value: 'EXPIRED',     label: 'Expired',     color: '#4a5470', bg: 'rgba(74,84,112,0.1)' },
];

const AMENITY_LABELS: Record<string, { label: string; icon: string }> = {
  gym:          { label: 'Gym',             icon: '🏋️' },
  pool:         { label: 'Swimming Pool',   icon: '🏊' },
  parking:      { label: 'Car Parking',     icon: '🚗' },
  security:     { label: '24/7 Security',   icon: '🔒' },
  clubhouse:    { label: 'Club House',      icon: '🏛️' },
  garden:       { label: 'Garden',          icon: '🌳' },
  lift:         { label: 'Lift/Elevator',   icon: '🛗' },
  power_backup: { label: 'Power Backup',    icon: '⚡' },
  wifi:         { label: 'High-Speed WiFi', icon: '📶' },
  cctv:         { label: 'CCTV',            icon: '📷' },
  intercom:     { label: 'Intercom',        icon: '📟' },
  fire_safety:  { label: 'Fire Safety',     icon: '🔥' },
};

const TYPE_ICONS: Record<string, string> = {
  APARTMENT: '🏢', VILLA: '🏡', PLOT: '🌿', COMMERCIAL: '🏬',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatPrice(p: number) {
  if (p >= 10_000_000) return `₹${(p / 10_000_000).toFixed(2)} Cr`;
  if (p >= 100_000)    return `₹${(p / 100_000).toFixed(2)} L`;
  return `₹${p.toLocaleString('en-IN')}`;
}
function getStatus(v: string) { return STATUSES.find(s => s.value === v) ?? STATUSES[0]; }

// ─── Skeleton ────────────────────────────────────────────────────────────────
function DetailSkeleton() {
  return (
    <div className="space-y-6 os-fade-in max-w-5xl mx-auto">
      <div className="os-skeleton h-5 w-28 rounded-lg" />
      <div className="os-skeleton h-80 rounded-2xl" />
      <div className="os-skeleton h-10 w-56 rounded-xl" />
      <div className="os-skeleton h-4 w-full rounded-lg" />
      <div className="os-skeleton h-4 w-3/4 rounded-lg" />
    </div>
  );
}

// ─── Image Gallery ────────────────────────────────────────────────────────────
function ImageGallery({ images, title }: { images: PropertyImage[]; title: string }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  if (!images?.length) {
    return (
      <div className="h-64 rounded-2xl bg-[#0d1117] border border-[rgba(255,255,255,0.06)] flex flex-col items-center justify-center gap-3 text-[#4a5470]">
        <span className="text-4xl">🏠</span>
        <span className="text-sm">No photos uploaded yet</span>
      </div>
    );
  }

  const sorted = [...images].sort((a, b) => a.display_order - b.display_order);

  return (
    <>
      <div
        className="relative h-72 md:h-96 rounded-2xl overflow-hidden bg-[#0d1117] cursor-zoom-in group"
        onClick={() => setLightbox(true)}
      >
        <img
          src={sorted[activeIdx]?.url}
          alt={`${title} — photo ${activeIdx + 1}`}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
        />
        <div className="absolute bottom-3 right-3 bg-[#07090f]/70 backdrop-blur-sm rounded-lg px-2.5 py-1 text-[11px] font-semibold text-[#f0f4ff]">
          {activeIdx + 1} / {sorted.length}
        </div>
        <div className="absolute top-3 right-3 os-btn-icon opacity-0 group-hover:opacity-100 transition-opacity text-base">⛶</div>
        {sorted.length > 1 && (
          <>
            <button
              onClick={e => { e.stopPropagation(); setActiveIdx(i => Math.max(0, i - 1)); }}
              className="absolute left-3 top-1/2 -translate-y-1/2 os-btn-icon opacity-0 group-hover:opacity-100 transition-opacity text-lg font-bold"
              disabled={activeIdx === 0}
            >‹</button>
            <button
              onClick={e => { e.stopPropagation(); setActiveIdx(i => Math.min(sorted.length - 1, i + 1)); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 os-btn-icon opacity-0 group-hover:opacity-100 transition-opacity text-lg font-bold"
              disabled={activeIdx === sorted.length - 1}
            >›</button>
          </>
        )}
      </div>

      {sorted.length > 1 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar pt-1">
          {sorted.map((img, idx) => (
            <button
              key={img.id}
              onClick={() => setActiveIdx(idx)}
              className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                idx === activeIdx ? 'border-[#16c784]' : 'border-transparent opacity-50 hover:opacity-80'
              }`}
            >
              <img src={img.thumbnail_url || img.url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-[#07090f]/95 backdrop-blur-xl flex items-center justify-center p-4 os-fade-in"
          onClick={() => setLightbox(false)}
        >
          <button className="absolute top-4 right-4 os-btn-icon text-xl" onClick={() => setLightbox(false)}>✕</button>
          <img
            src={sorted[activeIdx]?.url} alt={title}
            className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain"
            onClick={e => e.stopPropagation()}
          />
          {sorted.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
              {sorted.map((_, idx) => (
                <button
                  key={idx}
                  onClick={e => { e.stopPropagation(); setActiveIdx(idx); }}
                  className={`h-2 rounded-full transition-all ${idx === activeIdx ? 'bg-[#16c784] w-6' : 'bg-[rgba(255,255,255,0.3)] w-2'}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ─── Inline Status Picker ─────────────────────────────────────────────────────
function StatusPicker({
  propertyId, currentStatus, onStatusChange,
}: { propertyId: string; currentStatus: string; onStatusChange: (s: string) => void }) {
  const [open, setOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const current = getStatus(currentStatus);

  const handleChange = async (next: string) => {
    if (next === currentStatus) { setOpen(false); return; }
    setUpdating(true);
    try {
      await fetchApi(`/properties/${propertyId}/`, { method: 'PATCH', body: JSON.stringify({ status: next }) });
      onStatusChange(next);
      toast.success('Status updated');
    } catch { toast.error('Failed to update status'); }
    finally { setUpdating(false); setOpen(false); }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={updating}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border cursor-pointer transition-all"
        style={{ background: current.bg, borderColor: `${current.color}30`, color: current.color }}
      >
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: current.color }} />
        <span className="text-xs font-bold tracking-wide uppercase">{current.label}</span>
        {updating
          ? <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin ml-1" />
          : <span className="text-[10px] ml-1 opacity-60">▾</span>}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-2 left-0 z-20 os-card py-1.5 shadow-2xl min-w-[160px]">
            {STATUSES.map(s => (
              <button
                key={s.value}
                onClick={() => handleChange(s.value)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold transition-colors hover:bg-[rgba(255,255,255,0.04)] ${
                  s.value === currentStatus ? 'opacity-40 cursor-default' : 'cursor-pointer'
                }`}
                style={{ color: s.color }}
              >
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                {s.label}
                {s.value === currentStatus && <span className="ml-auto">✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────
function DeleteModal({ title, onConfirm, onCancel, isDeleting }: {
  title: string; onConfirm: () => void; onCancel: () => void; isDeleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07090f]/80 backdrop-blur-md os-fade-in">
      <div className="os-card os-slide-up p-6 max-w-sm w-full shadow-2xl">
        <div className="w-12 h-12 rounded-2xl bg-[rgba(244,63,94,0.1)] border border-[rgba(244,63,94,0.2)] flex items-center justify-center text-2xl mb-4">🗑️</div>
        <h2 className="text-base font-bold text-[#f0f4ff] mb-1">Delete Listing?</h2>
        <p className="text-sm text-[#4a5470] leading-relaxed mb-6">
          <span className="text-[#8892aa] font-medium">"{title}"</span> will be permanently deleted. This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={isDeleting} className="os-btn-ghost flex-1 text-sm h-10">Cancel</button>
          <button
            onClick={onConfirm} disabled={isDeleting}
            className="flex-1 h-10 px-4 rounded-xl bg-[rgba(244,63,94,0.1)] border border-[rgba(244,63,94,0.2)] text-[#f43f5e] text-sm font-bold hover:bg-[rgba(244,63,94,0.18)] transition-all disabled:opacity-50"
          >
            {isDeleting
              ? <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-[#f43f5e]/30 border-t-[#f43f5e] rounded-full animate-spin" />Deleting…
                </span>
              : 'Delete Listing'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [liveStatus, setLiveStatus] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [generatingBrochure, setGeneratingBrochure] = useState(false);
  const [generatingShare, setGeneratingShare] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [descExpanded, setDescExpanded] = useState(false);

  const { data: property, isLoading, isError } = useQuery<Property, Error, Property>({
    queryKey: ['property', id],
    queryFn: () => fetchApi(`/properties/${id}/`) as Promise<Property>,
    enabled: !!id,
  });

  // Sync status once on first load
  useEffect(() => {
    if (property && !liveStatus) setLiveStatus(property.status);
  }, [property, liveStatus]);

  const status = liveStatus || property?.status || 'AVAILABLE';

  // ── Actions ──
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await fetchApi(`/properties/${id}/`, { method: 'DELETE' });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      toast.success('Listing deleted');
      router.push('/dashboard');
    } catch { toast.error('Failed to delete listing'); setIsDeleting(false); setShowDelete(false); }
  };

  const handleShare = async () => {
    if (!property) return;
    const existingSlug = property.slug || (shareUrl ? shareUrl.split('/p/')[1] : null);
    if (existingSlug) {
      const url = `${window.location.origin}/p/${existingSlug}`;
      setShareUrl(url);
      await navigator.clipboard.writeText(url).catch(() => {});
      toast.success('Link copied!');
      return;
    }
    setGeneratingShare(true);
    try {
      const result = await fetchApi('/sharing/', { method: 'POST', body: JSON.stringify({ property: id }) });
      const url = `${window.location.origin}/p/${result.slug}`;
      setShareUrl(url);
      queryClient.invalidateQueries({ queryKey: ['property', id] });
      await navigator.clipboard.writeText(url).catch(() => {});
      toast.success('Share link created & copied!');
    } catch { toast.error('Failed to generate share link'); }
    finally { setGeneratingShare(false); }
  };

  const handleBrochure = async () => {
    setGeneratingBrochure(true);
    try {
      const result = await fetchApi(`/properties/${id}/brochure/`);
      window.open(result.brochure_url, '_blank');
    } catch { toast.error('Failed to generate brochure'); }
    finally { setGeneratingBrochure(false); }
  };

  // ─── Render ───
  if (isLoading) return <DetailSkeleton />;

  if (isError || !property) return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-4 os-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-[#0d1117] border border-[rgba(255,255,255,0.06)] flex items-center justify-center text-3xl">⚠️</div>
      <h2 className="text-base font-bold text-[#f0f4ff]">Property not found</h2>
      <p className="text-sm text-[#4a5470]">It may have been deleted or you don't have access.</p>
      <Link href="/dashboard" className="os-btn-ghost text-sm mt-2">← Back to Dashboard</Link>
    </div>
  );

  const descLong = (property.description?.length ?? 0) > 300;
  const shareLink = shareUrl ?? (property.slug
    ? (typeof window !== 'undefined' ? `${window.location.origin}/p/${property.slug}` : `/p/${property.slug}`)
    : null);

  return (
    <div className="os-fade-in max-w-5xl mx-auto">

      {/* ── Header bar ── */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <Link href="/dashboard" className="flex items-center gap-1.5 text-xs text-[#4a5470] hover:text-[#8892aa] transition-colors">
          ← Back to Dashboard
        </Link>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="brochure-btn"
            onClick={handleBrochure}
            disabled={generatingBrochure}
            className="os-btn-ghost text-sm h-9 px-3 gap-1.5"
          >
            {generatingBrochure
              ? <span className="w-3.5 h-3.5 border-2 border-[#8892aa]/30 border-t-[#8892aa] rounded-full animate-spin" />
              : '📄'}
            <span className="hidden sm:inline">Brochure</span>
          </button>
          <button
            id="share-btn"
            onClick={handleShare}
            disabled={generatingShare}
            className="os-btn-ghost text-sm h-9 px-3 gap-1.5"
          >
            {generatingShare
              ? <span className="w-3.5 h-3.5 border-2 border-[#8892aa]/30 border-t-[#8892aa] rounded-full animate-spin" />
              : '🔗'}
            <span className="hidden sm:inline">{shareLink ? 'Copy Link' : 'Share'}</span>
          </button>
          <Link id="edit-btn" href={`/dashboard/properties/${id}/edit`} className="os-btn-primary text-sm h-9 px-4">
            ✏️ Edit
          </Link>
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div className="flex flex-col lg:flex-row gap-6">

        {/* LEFT */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* Gallery */}
          <ImageGallery images={property.images} title={property.title} />

          {/* Title card */}
          <div className="os-card p-5">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{TYPE_ICONS[property.property_type] ?? '🏠'}</span>
                  <span className="text-[10px] font-bold text-[#4a5470] uppercase tracking-widest">
                    {property.property_type}
                  </span>
                </div>
                <h1 className="text-xl md:text-2xl font-bold text-[#f0f4ff] tracking-tight leading-tight">
                  {property.title}
                </h1>
                <p className="text-sm text-[#4a5470] mt-1">
                  {[property.area, property.city].filter(Boolean).join(', ')}
                  {property.location_address && <span> · {property.location_address}</span>}
                </p>
              </div>
              <StatusPicker propertyId={id} currentStatus={status} onStatusChange={setLiveStatus} />
            </div>

            {/* Price */}
            <div className="mt-4 flex items-end gap-3 flex-wrap">
              <span className="text-3xl md:text-4xl font-extrabold text-[#f0f4ff] tracking-tight">
                {formatPrice(property.price)}
              </span>
            </div>

            {/* Stat pills */}
            <div className="flex flex-wrap gap-2 mt-4">
              {property.bhk && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111622] border border-[rgba(255,255,255,0.06)] text-xs text-[#8892aa]">
                  🛏️ {property.bhk} BHK
                </span>
              )}
              {property.square_feet && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111622] border border-[rgba(255,255,255,0.06)] text-xs text-[#8892aa]">
                  📐 {property.square_feet.toLocaleString('en-IN')} sqft
                </span>
              )}
              {property.city && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111622] border border-[rgba(255,255,255,0.06)] text-xs text-[#8892aa]">
                  📍 {property.city}
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          {property.description && (
            <div className="os-card p-5">
              <h2 className="text-sm font-bold text-[#f0f4ff] mb-3">Description</h2>
              <p className={`text-sm text-[#8892aa] leading-relaxed whitespace-pre-line ${!descExpanded && descLong ? 'line-clamp-5' : ''}`}>
                {property.description}
              </p>
              {descLong && (
                <button
                  onClick={() => setDescExpanded(e => !e)}
                  className="text-xs text-[#16c784] hover:text-[#19e098] font-semibold mt-2 transition-colors"
                >
                  {descExpanded ? 'Show less ↑' : 'Read more ↓'}
                </button>
              )}
            </div>
          )}

          {/* Amenities */}
          {property.amenities?.length > 0 && (
            <div className="os-card p-5">
              <h2 className="text-sm font-bold text-[#f0f4ff] mb-3">Amenities</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {property.amenities.map(amenity => {
                  const info = AMENITY_LABELS[amenity] ?? { label: amenity, icon: '✓' };
                  return (
                    <div key={amenity} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-[#16c784]/8 border border-[#16c784]/15 text-[#16c784] text-xs font-medium">
                      <span className="text-sm">{info.icon}</span>
                      <span className="truncate">{info.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Danger zone */}
          <div className="os-card p-5" style={{ borderColor: 'rgba(244,63,94,0.12)' }}>
            <h2 className="text-sm font-bold text-[#f43f5e] mb-1">Danger Zone</h2>
            <p className="text-xs text-[#4a5470] mb-4">Permanently remove this listing and all its data.</p>
            <button
              id="delete-listing-btn"
              onClick={() => setShowDelete(true)}
              className="h-9 px-4 rounded-xl bg-[rgba(244,63,94,0.08)] border border-[rgba(244,63,94,0.2)] text-[#f43f5e] text-xs font-bold hover:bg-[rgba(244,63,94,0.14)] transition-all"
            >
              🗑️ Delete Listing
            </button>
          </div>
        </div>

        {/* RIGHT sidebar */}
        <div className="w-full lg:w-[268px] flex-shrink-0 space-y-4">

          {/* Insights */}
          <div className="os-card p-5">
            <p className="os-label mb-3">Insights</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 rounded-xl bg-[#111622] border border-[rgba(255,255,255,0.05)]">
                <div className="text-2xl font-extrabold text-[#38bdf8]">{property.views_count ?? 0}</div>
                <div className="text-[10px] text-[#4a5470] mt-0.5">Views</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-[#111622] border border-[rgba(255,255,255,0.05)]">
                <div className="text-2xl font-extrabold text-[#16c784]">{property.leads_count ?? 0}</div>
                <div className="text-[10px] text-[#4a5470] mt-0.5">Leads</div>
              </div>
            </div>
          </div>

          {/* Share link */}
          <div className="os-card p-5">
            <p className="os-label mb-3">Share Link</p>
            {shareLink ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0 bg-[#111622] border border-[rgba(255,255,255,0.06)] rounded-xl px-3 py-2 text-[11px] text-[#4a5470] truncate">
                  {shareLink}
                </div>
                <button onClick={handleShare} className="os-btn-icon flex-shrink-0" title="Copy link">📋</button>
              </div>
            ) : (
              <button
                onClick={handleShare}
                disabled={generatingShare}
                className="w-full h-9 rounded-xl bg-[#16c784]/10 border border-[#16c784]/20 text-[#16c784] text-xs font-bold hover:bg-[#16c784]/15 transition-all"
              >
                {generatingShare ? 'Generating…' : '🔗 Generate Link'}
              </button>
            )}
          </div>

          {/* Meta */}
          <div className="os-card p-5">
            <p className="os-label mb-3">Details</p>
            <div className="space-y-2.5 text-xs">
              {property.created_by_name && (
                <div className="flex justify-between">
                  <span className="text-[#4a5470]">Created by</span>
                  <span className="text-[#8892aa] font-medium">{property.created_by_name}</span>
                </div>
              )}
              {property.assigned_to_name && (
                <div className="flex justify-between">
                  <span className="text-[#4a5470]">Assigned to</span>
                  <span className="text-[#8892aa] font-medium">{property.assigned_to_name}</span>
                </div>
              )}
              {property.tenant_name && (
                <div className="flex justify-between">
                  <span className="text-[#4a5470]">Agency</span>
                  <span className="text-[#8892aa] font-medium">{property.tenant_name}</span>
                </div>
              )}
              {property.expires_at && (
                <div className="flex justify-between">
                  <span className="text-[#4a5470]">Expires</span>
                  <span className="text-[#f59e0b] font-medium">
                    {new Date(property.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[#4a5470]">Listed on</span>
                <span className="text-[#8892aa]">
                  {new Date(property.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>

          <Link href={`/dashboard/properties/${id}/edit`} className="os-btn-primary w-full text-sm h-10 justify-center flex items-center gap-2">
            ✏️ Edit This Listing
          </Link>
        </div>
      </div>

      {showDelete && (
        <DeleteModal
          title={property.title}
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}
