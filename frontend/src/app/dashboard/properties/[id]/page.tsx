'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  FileText,
  ImageIcon,
  LoaderCircle,
  MapPin,
  MessageCircle,
  Pencil,
  ShieldCheck,
  Trash2,
  UsersRound,
} from 'lucide-react';
import ShareModal from '@/components/ShareModal';
import { fetchApi } from '@/lib/api';

interface PropertyImage {
  id: string;
  url: string;
  thumbnail_url?: string;
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
  location_address?: string | null;
  bhk?: number | null;
  square_feet?: number | null;
  amenities: string[];
  images: PropertyImage[];
  views_count?: number;
  leads_count?: number;
  slug?: string | null;
  created_at: string;
  updated_at: string;
}

interface ShareResponse {
  full_share_url: string;
  whatsapp_share_text: string;
}

const STATUSES: Array<{ value: Property['status']; label: string }> = [
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'SITE_VISIT', label: 'Site visit' },
  { value: 'NEGOTIATION', label: 'Negotiation' },
  { value: 'BOOKED', label: 'Booked' },
  { value: 'SOLD', label: 'Sold' },
  { value: 'EXPIRED', label: 'Inactive' },
];

const AMENITY_LABELS: Record<string, string> = {
  parking: 'Parking', security: '24/7 security', gym: 'Gym', power_backup: 'Power backup', lift: 'Lift', garden: 'Garden', pool: 'Swimming pool', clubhouse: 'Club house', wifi: 'Wi-Fi', cctv: 'CCTV', intercom: 'Intercom', fire_safety: 'Fire safety',
};

function formatPrice(value: number) {
  if (value >= 10_000_000) return `₹${(value / 10_000_000).toFixed(2)} Cr`;
  if (value >= 100_000) return `₹${(value / 100_000).toFixed(2)} L`;
  return `₹${Number(value).toLocaleString('en-IN')}`;
}

function pretty(value: string) {
  return value.toLowerCase().replaceAll('_', ' ').replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

function PropertySkeleton() {
  return <div className="mx-auto max-w-6xl space-y-5"><div className="os-skeleton h-11 w-40" /><div className="grid gap-6 lg:grid-cols-[1fr_360px]"><div className="os-skeleton h-[430px] rounded-3xl" /><div className="os-skeleton h-[430px] rounded-3xl" /></div></div>;
}

function Gallery({ images, title }: { images: PropertyImage[]; title: string }) {
  const sorted = [...images].sort((a, b) => a.display_order - b.display_order);
  const [active, setActive] = useState(0);

  if (!sorted.length) {
    return <div className="grid min-h-72 place-items-center rounded-[24px] border border-dashed border-[var(--ui-border-strong)] bg-[var(--ui-surface-muted)] text-center"><div><ImageIcon className="mx-auto text-[var(--ui-text-muted)]" size={34} /><p className="mt-3 text-sm font-black text-[var(--ui-text)]">No property photos yet</p><p className="mt-1 text-xs text-[var(--ui-text-muted)]">Add photos from Edit listing before sharing widely.</p></div></div>;
  }

  return (
    <div>
      <div className="relative aspect-[4/3] max-h-[520px] overflow-hidden rounded-[24px] bg-[var(--ui-surface-muted)]">
        <Image src={sorted[active].url} alt={`${title}, photo ${active + 1}`} fill unoptimized className="object-cover" priority />
        <span className="absolute bottom-3 right-3 rounded-full bg-black/65 px-3 py-1.5 text-xs font-bold text-white">{active + 1} / {sorted.length}</span>
        {sorted.length > 1 && <><button type="button" aria-label="Previous photo" onClick={() => setActive((index) => Math.max(0, index - 1))} disabled={active === 0} className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white disabled:opacity-30"><ChevronLeft /></button><button type="button" aria-label="Next photo" onClick={() => setActive((index) => Math.min(sorted.length - 1, index + 1))} disabled={active === sorted.length - 1} className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white disabled:opacity-30"><ChevronRight /></button></>}
      </div>
      {sorted.length > 1 && <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{sorted.map((image, index) => <button type="button" key={image.id} onClick={() => setActive(index)} className={`relative h-16 w-20 shrink-0 overflow-hidden rounded-xl border-2 ${index === active ? 'border-[var(--ui-brand-strong)]' : 'border-transparent opacity-65'}`}><Image src={image.thumbnail_url || image.url} alt="" fill unoptimized className="object-cover" /></button>)}</div>}
    </div>
  );
}

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [sharing, setSharing] = useState(false);
  const [shareData, setShareData] = useState<{ url: string; whatsappText: string; propertyTitle: string } | null>(null);
  const [brochureLoading, setBrochureLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: property, isLoading, isError, refetch } = useQuery<Property>({
    queryKey: ['property', id],
    queryFn: () => fetchApi(`/properties/${id}/`),
    enabled: Boolean(id),
  });

  const published = searchParams.get('published') === '1';
  const uploadFailures = Number(searchParams.get('upload_failed') || 0);

  const share = async () => {
    if (!property) return;
    setActionError(null);
    setSharing(true);
    try {
      const result = await fetchApi<ShareResponse>('/sharing/links/', { method: 'POST', body: JSON.stringify({ property: property.id }) });
      setShareData({ url: result.full_share_url, whatsappText: result.whatsapp_share_text, propertyTitle: property.title });
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['onboarding'] }), queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] })]);
    } catch (caught: unknown) {
      setActionError(caught instanceof Error ? caught.message : 'The share message could not be prepared. Try again.');
    } finally {
      setSharing(false);
    }
  };

  const updateStatus = async (status: Property['status']) => {
    if (!property) return;
    setActionError(null);
    try {
      const updated = await fetchApi<Property>(`/properties/${property.id}/`, { method: 'PATCH', body: JSON.stringify({ status }) });
      queryClient.setQueryData(['property', id], updated);
      await queryClient.invalidateQueries({ queryKey: ['properties'] });
    } catch (caught: unknown) {
      setActionError(caught instanceof Error ? caught.message : 'Status could not be updated.');
    }
  };

  const openBrochure = async () => {
    if (!property) return;
    setBrochureLoading(true);
    setActionError(null);
    try {
      const result = await fetchApi<{ brochure_url: string }>(`/properties/${property.id}/brochure/`);
      window.open(result.brochure_url, '_blank', 'noopener,noreferrer');
    } catch (caught: unknown) {
      setActionError(caught instanceof Error ? caught.message : 'Brochure generation is unavailable.');
    } finally {
      setBrochureLoading(false);
    }
  };

  const remove = async () => {
    if (!property || !window.confirm(`Delete “${property.title}”? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await fetchApi(`/properties/${property.id}/`, { method: 'DELETE' });
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['properties'] }), queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] })]);
      router.push('/dashboard/properties');
    } catch (caught: unknown) {
      setActionError(caught instanceof Error ? caught.message : 'Listing could not be deleted.');
      setDeleting(false);
    }
  };

  if (isLoading) return <PropertySkeleton />;
  if (isError || !property) return <div className="mx-auto grid min-h-96 max-w-xl place-items-center text-center"><div><AlertTriangle className="mx-auto text-[var(--ui-danger)]" size={38} /><h1 className="mt-4 text-xl font-black text-[var(--ui-text)]">Listing unavailable</h1><p className="mt-2 text-sm text-[var(--ui-text-muted)]">It may have been removed or your connection was interrupted.</p><button type="button" onClick={() => void refetch()} className="os-btn-primary mt-5">Try again</button></div></div>;

  const publicUrl = property.slug && typeof window !== 'undefined' ? `${window.location.origin}/p/${property.slug}` : null;

  return (
    <div className="mx-auto max-w-6xl pb-10">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link href="/dashboard/properties" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[var(--ui-text-muted)] hover:text-[var(--ui-text)]"><ArrowLeft size={17} /> All listings</Link>
        <div className="flex flex-wrap items-center gap-2">
          {publicUrl && <a href={publicUrl} target="_blank" rel="noreferrer" className="os-btn-ghost px-3"><ExternalLink size={16} /><span className="hidden sm:inline">Buyer view</span></a>}
          <Link href={`/dashboard/properties/${property.id}/edit`} className="os-btn-ghost px-3"><Pencil size={16} /> Edit</Link>
          <button type="button" onClick={() => void share()} disabled={sharing} className="os-btn-primary px-4 disabled:opacity-60">{sharing ? <LoaderCircle className="animate-spin" size={17} /> : <MessageCircle size={17} />} Share</button>
        </div>
      </div>

      {published && <section className="mb-5 flex flex-col gap-4 rounded-[22px] border border-[color-mix(in_srgb,var(--ui-success)_28%,var(--ui-border))] bg-[color-mix(in_srgb,var(--ui-success)_8%,var(--ui-surface))] p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--ui-success)] text-white"><Check size={20} /></span><div><h2 className="font-black text-[var(--ui-text)]">Your property page is live</h2><p className="mt-1 text-sm text-[var(--ui-text-muted)]">Send it to five genuine prospects, then review their actions in Today.</p>{uploadFailures > 0 && <p className="mt-2 text-xs font-bold text-[var(--ui-warning)]">{uploadFailures} photo{uploadFailures === 1 ? '' : 's'} could not upload. The page is published; retry photos from Edit listing.</p>}</div></div><button type="button" onClick={() => void share()} disabled={sharing} className="os-btn-primary min-h-12 shrink-0"><MessageCircle size={17} /> Share on WhatsApp</button></section>}

      {actionError && <div role="alert" className="mb-5 flex items-start gap-3 rounded-xl border border-[color-mix(in_srgb,var(--ui-danger)_24%,var(--ui-border))] bg-[color-mix(in_srgb,var(--ui-danger)_7%,var(--ui-surface))] p-4 text-sm font-medium text-[var(--ui-danger)]"><AlertTriangle className="mt-0.5 shrink-0" size={18} />{actionError}</div>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Gallery images={property.images || []} title={property.title} />
          <section className="os-card p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[color-mix(in_srgb,var(--ui-success)_10%,var(--ui-surface))] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--ui-success)]">{pretty(property.status)}</span><span className="rounded-full border border-[var(--ui-border)] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--ui-text-muted)]">{pretty(property.property_type)}</span></div><h1 className="mt-4 text-2xl font-black leading-tight tracking-[-0.04em] text-[var(--ui-text)] sm:text-3xl">{property.title}</h1><p className="mt-2 flex items-center gap-2 text-sm text-[var(--ui-text-muted)]"><MapPin size={16} />{property.area}, {property.city}</p></div><strong className="text-2xl font-black text-[var(--ui-text)] sm:text-3xl">{formatPrice(Number(property.price))}</strong></div>
            <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">{property.bhk ? <div className="rounded-xl bg-[var(--ui-surface-muted)] p-4"><strong className="block text-lg text-[var(--ui-text)]">{property.bhk} BHK</strong><span className="text-xs text-[var(--ui-text-muted)]">Configuration</span></div> : null}{property.square_feet ? <div className="rounded-xl bg-[var(--ui-surface-muted)] p-4"><strong className="block text-lg text-[var(--ui-text)]">{Number(property.square_feet).toLocaleString('en-IN')}</strong><span className="text-xs text-[var(--ui-text-muted)]">Square feet</span></div> : null}<div className="rounded-xl bg-[var(--ui-surface-muted)] p-4"><strong className="block text-lg text-[var(--ui-text)]">{property.images?.length || 0}</strong><span className="text-xs text-[var(--ui-text-muted)]">Photos</span></div><div className="rounded-xl bg-[var(--ui-surface-muted)] p-4"><strong className="block text-lg text-[var(--ui-text)]">{property.amenities?.length || 0}</strong><span className="text-xs text-[var(--ui-text-muted)]">Amenities</span></div></div>
          </section>
          <section className="os-card p-5 sm:p-7"><p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--ui-brand-strong)]">Broker-provided description</p><p className="mt-4 whitespace-pre-line text-sm leading-7 text-[var(--ui-text-muted)]">{property.description}</p></section>
          {property.amenities?.length > 0 && <section className="os-card p-5 sm:p-7"><h2 className="text-lg font-black text-[var(--ui-text)]">Amenities</h2><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">{property.amenities.map((amenity) => <div key={amenity} className="flex min-h-12 items-center gap-2 rounded-xl border border-[var(--ui-border)] px-3 text-xs font-bold text-[var(--ui-text)]"><Check size={15} className="text-[var(--ui-success)]" />{AMENITY_LABELS[amenity] || pretty(amenity)}</div>)}</div></section>}
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <section className="rounded-[24px] bg-[var(--ui-brand)] p-5 text-[var(--ui-brand-ink)] shadow-[var(--ui-shadow)]"><p className="text-[10px] font-black uppercase tracking-[0.14em] opacity-70">Next best action</p><h2 className="mt-2 text-xl font-black">Share while the property is fresh</h2><p className="mt-2 text-sm leading-6 opacity-75">Your message includes the price, locality and one public link. Buyer contact actions become leads.</p><button type="button" onClick={() => void share()} disabled={sharing} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--ui-brand-ink)] px-4 text-sm font-black text-[var(--ui-brand)]"><MessageCircle size={17} /> Prepare WhatsApp share</button></section>

          <section className="os-card p-5"><p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--ui-text-muted)]">Supported engagement</p><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl bg-[var(--ui-surface-muted)] p-4"><BarChart3 size={18} className="text-[var(--ui-brand-strong)]" /><strong className="mt-3 block text-2xl text-[var(--ui-text)]">{property.views_count || 0}</strong><span className="text-xs text-[var(--ui-text-muted)]">Page views</span></div><div className="rounded-xl bg-[var(--ui-surface-muted)] p-4"><UsersRound size={18} className="text-[var(--ui-brand-strong)]" /><strong className="mt-3 block text-2xl text-[var(--ui-text)]">{property.leads_count || 0}</strong><span className="text-xs text-[var(--ui-text-muted)]">Leads</span></div></div><p className="mt-3 text-xs leading-5 text-[var(--ui-text-muted)]">PropertyOS records page views, image views, WhatsApp clicks and phone clicks—no hidden buyer-intent score.</p></section>

          <section className="os-card p-5"><label htmlFor="status" className="os-input-label">Listing status</label><select id="status" value={property.status} onChange={(event) => void updateStatus(event.target.value as Property['status'])} className="os-input min-h-12">{STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select><p className="mt-2 text-xs text-[var(--ui-text-muted)]">Sold and inactive listings are removed from public access.</p></section>

          {property.location_address && <section className="os-card p-5"><p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-[var(--ui-text-muted)]"><ShieldCheck size={16} className="text-[var(--ui-success)]" />Private address</p><p className="mt-3 text-sm leading-6 text-[var(--ui-text)]">{property.location_address}</p><p className="mt-2 text-xs text-[var(--ui-text-muted)]">Not shown on the public page.</p></section>}

          <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => void openBrochure()} disabled={brochureLoading} className="os-btn-ghost px-3">{brochureLoading ? <LoaderCircle className="animate-spin" size={16} /> : <FileText size={16} />} Brochure</button>{publicUrl ? <button type="button" onClick={() => void navigator.clipboard.writeText(publicUrl)} className="os-btn-ghost px-3"><Copy size={16} /> Copy link</button> : <span />}</div>
          <button type="button" onClick={() => void remove()} disabled={deleting} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-xs font-bold text-[var(--ui-danger)] hover:bg-[color-mix(in_srgb,var(--ui-danger)_7%,transparent)]">{deleting ? <LoaderCircle className="animate-spin" size={16} /> : <Trash2 size={16} />} Delete listing</button>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-[var(--ui-border)] bg-[color-mix(in_srgb,var(--ui-surface-raised)_96%,transparent)] p-3 backdrop-blur-xl lg:hidden"><button type="button" onClick={() => void share()} disabled={sharing} className="os-btn-primary min-h-12 w-full"><MessageCircle size={18} /> Share this listing</button></div>
      {shareData && <ShareModal {...shareData} onClose={() => setShareData(null)} />}
    </div>
  );
}
