'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Copy,
  ExternalLink,
  Eye,
  ImageOff,
  MapPin,
  MessageCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UsersRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAppPreferences } from '@/components/AppPreferencesProvider';
import ShareModal from '@/components/ShareModal';
import { fetchApi } from '@/lib/api';

interface PropertyImage {
  id: string;
  url: string;
  thumbnail_url: string;
}

interface Property {
  id: string;
  title: string;
  price: number;
  property_type: string;
  status: string;
  city: string;
  area: string;
  bhk: number | null;
  square_feet: number | null;
  images: PropertyImage[];
  expires_at?: string | null;
  views_count?: number;
  leads_count?: number;
  slug?: string;
}

interface ShareData {
  url: string;
  whatsappText: string;
  propertyTitle: string;
}

const STATUS_OPTIONS = ['ALL', 'AVAILABLE', 'NEGOTIATION', 'SITE_VISIT', 'BOOKED', 'SOLD', 'EXPIRED'];
const TYPE_OPTIONS = ['ALL', 'APARTMENT', 'VILLA', 'PLOT', 'COMMERCIAL'];

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Available',
  NEGOTIATION: 'In negotiation',
  SITE_VISIT: 'Site visit',
  BOOKED: 'Booked',
  SOLD: 'Sold',
  EXPIRED: 'Expired',
};

function formatPrice(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatFacts(property: Property): string {
  const facts = [];
  if (property.bhk) facts.push(`${property.bhk} BHK`);
  facts.push(property.property_type.replace('_', ' ').toLowerCase());
  if (property.square_feet) facts.push(`${Number(property.square_feet).toLocaleString('en-IN')} sq ft`);
  return facts.join(' · ');
}

export default function PropertiesPage() {
  const queryClient = useQueryClient();
  const { t } = useAppPreferences();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [propertyType, setPropertyType] = useState('ALL');
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);

  const propertiesQuery = useQuery<Property[]>({
    queryKey: ['properties'],
    queryFn: () => fetchApi('/properties/'),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => fetchApi(`/properties/${id}/duplicate/`, { method: 'POST' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['properties'] });
      toast.success('Listing duplicated');
    },
    onError: (error: Error) => toast.error(error.message || 'Could not duplicate the listing'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetchApi(`/properties/${id}/`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['properties'] });
      toast.success('Listing deleted');
    },
    onError: (error: Error) => toast.error(error.message || 'Could not delete the listing'),
  });

  const filteredProperties = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (propertiesQuery.data ?? []).filter((property) => {
      const matchesQuery = !query || [property.title, property.area, property.city]
        .some((value) => value.toLowerCase().includes(query));
      const matchesStatus = status === 'ALL' || property.status === status;
      const matchesType = propertyType === 'ALL' || property.property_type === propertyType;
      return matchesQuery && matchesStatus && matchesType;
    });
  }, [propertiesQuery.data, propertyType, search, status]);

  const shareProperty = async (property: Property) => {
    setSharingId(property.id);
    try {
      const response = await fetchApi<{ full_share_url: string; whatsapp_share_text: string }>('/sharing/links/', {
        method: 'POST',
        body: JSON.stringify({ property: property.id }),
      });
      setShareData({
        url: response.full_share_url,
        whatsappText: response.whatsapp_share_text,
        propertyTitle: property.title,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not prepare the share link');
    } finally {
      setSharingId(null);
    }
  };

  return (
    <div className="space-y-6 os-fade-in">
      {shareData && <ShareModal {...shareData} onClose={() => setShareData(null)} />}

      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--ui-brand-strong)]">Broker inventory</p>
          <h1 className="mt-1 text-3xl font-bold tracking-[-0.035em] text-[var(--ui-text)]">Listings</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--ui-text-muted)]">
            Manage the property pages you publish and share with buyers.
          </p>
        </div>
        <Link href="/dashboard/properties/new" className="os-btn-primary shrink-0">
          <Plus size={18} />
          {t('listing.new')}
        </Link>
      </header>

      <section className="os-surface p-3 sm:p-4" aria-label="Listing filters">
        <div className="grid gap-3 md:grid-cols-[minmax(240px,1fr)_190px_190px]">
          <label className="relative block">
            <span className="sr-only">Search listings</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ui-text-muted)]" size={18} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="os-input min-h-11 pl-10"
              placeholder="Search by property or locality"
            />
          </label>
          <label>
            <span className="sr-only">Filter by status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="os-input min-h-11">
              {STATUS_OPTIONS.map((value) => <option key={value} value={value}>{value === 'ALL' ? 'All statuses' : STATUS_LABELS[value]}</option>)}
            </select>
          </label>
          <label>
            <span className="sr-only">Filter by property type</span>
            <select value={propertyType} onChange={(event) => setPropertyType(event.target.value)} className="os-input min-h-11">
              {TYPE_OPTIONS.map((value) => <option key={value} value={value}>{value === 'ALL' ? 'All property types' : value.charAt(0) + value.slice(1).toLowerCase()}</option>)}
            </select>
          </label>
        </div>
      </section>

      {propertiesQuery.isLoading && (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-label="Loading listings">
          {[0, 1, 2].map((value) => <div key={value} className="os-surface h-[390px] os-skeleton" />)}
        </div>
      )}

      {propertiesQuery.isError && (
        <section className="os-surface flex flex-col items-center px-5 py-14 text-center">
          <RefreshCw size={30} className="text-[var(--ui-danger)]" />
          <h2 className="mt-4 text-lg font-bold text-[var(--ui-text)]">Listings could not be loaded</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-[var(--ui-text-muted)]">
            {propertiesQuery.error instanceof Error ? propertiesQuery.error.message : t('error.fetchFailed')}
          </p>
          <button type="button" onClick={() => void propertiesQuery.refetch()} className="os-btn-primary mt-5">
            <RefreshCw size={17} />
            {t('common.retry')}
          </button>
        </section>
      )}

      {!propertiesQuery.isLoading && !propertiesQuery.isError && filteredProperties.length === 0 && (
        <section className="os-surface flex flex-col items-center px-5 py-16 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-3xl bg-[var(--ui-surface-muted)] text-[var(--ui-brand-strong)]">
            <Building2 size={30} />
          </span>
          <h2 className="mt-5 text-xl font-bold text-[var(--ui-text)]">
            {(propertiesQuery.data?.length ?? 0) === 0 ? 'Create your first listing' : 'No listings match these filters'}
          </h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-[var(--ui-text-muted)]">
            {(propertiesQuery.data?.length ?? 0) === 0
              ? 'Add one real property and turn it into a professional page you can share.'
              : 'Change or clear the filters to see more of your inventory.'}
          </p>
          {(propertiesQuery.data?.length ?? 0) === 0 && (
            <Link href="/dashboard/properties/new" className="os-btn-primary mt-6">
              <Plus size={18} />
              {t('listing.new')}
            </Link>
          )}
        </section>
      )}

      {!propertiesQuery.isLoading && !propertiesQuery.isError && filteredProperties.length > 0 && (
        <>
          <p className="text-sm text-[var(--ui-text-muted)]">{filteredProperties.length} {filteredProperties.length === 1 ? 'listing' : 'listings'}</p>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filteredProperties.map((property) => {
              const cover = property.images?.[0]?.thumbnail_url || property.images?.[0]?.url;
              return (
                <article key={property.id} className="os-surface group overflow-hidden">
                  <div className="relative aspect-[16/10] overflow-hidden bg-[var(--ui-surface-muted)]">
                    {cover ? (
                      <Image src={cover} alt="" fill unoptimized sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw" className="object-cover transition-transform duration-300 group-hover:scale-[1.025]" />
                    ) : (
                      <div className="grid h-full place-items-center text-[var(--ui-text-muted)]">
                        <div className="text-center">
                          <ImageOff size={28} className="mx-auto" />
                          <p className="mt-2 text-xs font-medium">Needs photos</p>
                        </div>
                      </div>
                    )}
                    <span className="absolute left-3 top-3 rounded-full border border-white/60 bg-white/90 px-2.5 py-1 text-xs font-bold text-[#17211d] shadow-sm">
                      {STATUS_LABELS[property.status] ?? property.status}
                    </span>
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h2 className="line-clamp-2 text-lg font-bold leading-6 text-[var(--ui-text)]">{property.title}</h2>
                        <p className="mt-1 flex items-center gap-1 text-sm text-[var(--ui-text-muted)]">
                          <MapPin size={14} />
                          <span className="truncate">{property.area}, {property.city}</span>
                        </p>
                      </div>
                      <p className="shrink-0 text-base font-bold text-[var(--ui-text)]">{formatPrice(Number(property.price))}</p>
                    </div>
                    <p className="mt-3 text-sm capitalize text-[var(--ui-text-muted)]">{formatFacts(property)}</p>
                    <div className="mt-4 flex items-center gap-4 border-t border-[var(--ui-border)] pt-3 text-xs text-[var(--ui-text-muted)]">
                      <span className="flex items-center gap-1.5"><Eye size={14} />{property.views_count ?? 0} views</span>
                      <span className="flex items-center gap-1.5"><UsersRound size={14} />{property.leads_count ?? 0} leads</span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => void shareProperty(property)} disabled={sharingId === property.id} className="os-btn-primary px-3">
                        <MessageCircle size={17} />
                        {sharingId === property.id ? 'Preparing…' : 'Share'}
                      </button>
                      <Link href={`/dashboard/properties/${property.id}`} className="os-btn-ghost px-3">
                        <ExternalLink size={17} />
                        Open
                      </Link>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <Link href={`/dashboard/properties/${property.id}/edit`} className="flex min-h-11 items-center justify-center rounded-xl text-[var(--ui-text-muted)] hover:bg-[var(--ui-surface-muted)] hover:text-[var(--ui-text)]" aria-label={`Edit ${property.title}`}>
                        <Pencil size={17} />
                      </Link>
                      <button type="button" onClick={() => duplicateMutation.mutate(property.id)} className="flex min-h-11 items-center justify-center rounded-xl text-[var(--ui-text-muted)] hover:bg-[var(--ui-surface-muted)] hover:text-[var(--ui-text)]" aria-label={`Duplicate ${property.title}`}>
                        <Copy size={17} />
                      </button>
                      <button type="button" onClick={() => window.confirm(`Delete “${property.title}”? This cannot be undone.`) && deleteMutation.mutate(property.id)} className="flex min-h-11 items-center justify-center rounded-xl text-[var(--ui-danger)] hover:bg-[color-mix(in_srgb,var(--ui-danger)_8%,transparent)]" aria-label={`Delete ${property.title}`}>
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
