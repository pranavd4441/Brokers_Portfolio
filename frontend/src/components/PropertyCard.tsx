'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';
import { toast } from 'sonner';

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
  property_type: string;
  status: string;
  city: string;
  area: string;
  bhk: number | null;
  square_feet: number | null;
  images: PropertyImage[];
  created_at: string;
  slug?: string;
}

interface PropertyCardProps {
  property: Property;
  isGeneratingShare: boolean;
  onShare: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  isSelected?: boolean;
  onSelectToggle?: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; cssClass: string }> = {
  AVAILABLE:   { label: 'Available',   cssClass: 'os-status-available' },
  NEGOTIATION: { label: 'Negotiation', cssClass: 'os-status-negotiation' },
  SITE_VISIT:  { label: 'Site Visit',  cssClass: 'os-status-site_visit' },
  BOOKED:      { label: 'Booked',      cssClass: 'os-status-booked' },
  SOLD:        { label: 'Sold',        cssClass: 'os-status-sold' },
  EXPIRED:     { label: 'Expired',     cssClass: 'os-status-sold !bg-rose-500/20 !text-rose-400 !border-rose-500/30' },
};

function formatPrice(price: number): string {
  if (price >= 10_000_000) return `₹${(price / 10_000_000).toFixed(2)} Cr`;
  if (price >= 100_000)    return `₹${(price / 100_000).toFixed(2)} L`;
  return `₹${price.toLocaleString()}`;
}

export default function PropertyCard({
  property,
  isGeneratingShare,
  onShare,
  onDuplicate,
  onDelete,
  isSelected = false,
  onSelectToggle,
}: PropertyCardProps) {
  const [imageError, setImageError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadBrochure = async () => {
    setIsDownloading(true);
    try {
      const data = await fetchApi(`/properties/${property.id}/brochure/`);
      if (data && data.brochure_url) {
        window.open(data.brochure_url, '_blank');
        toast.success('Brochure compiled successfully!');
      } else {
        toast.error('Failed to generate brochure PDF.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error compiling PDF brochure.');
    } finally {
      setIsDownloading(false);
    }
  };

  const primaryImage = !imageError && property.images.length > 0
    ? property.images[0].thumbnail_url
    : null;

  const statusConfig = STATUS_CONFIG[property.status] ?? {
    label: property.status,
    cssClass: 'os-status-sold',
  };

  const typeLabel = property.bhk
    ? `${property.bhk} BHK ${property.property_type}`
    : property.property_type.replace('_', ' ');

  return (
    <article className={`os-card property-card flex flex-col overflow-hidden group transition-all duration-200 ${
      isSelected ? 'border-[#16c784]/40 ring-1 ring-[#16c784]/20' : ''
    }`}>
      {/* ── Image area ──────────────────────────────────────── */}
      <div className="relative h-52 bg-[#0d1117] overflow-hidden flex-shrink-0">
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={property.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImageError(true)}
          />
        ) : (
          /* Photo placeholder */
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#0d1117] to-[#111622]">
            <span className="text-5xl opacity-20">🏢</span>
            <span className="text-[11px] text-[#4a5470] font-medium">No photos yet</span>
          </div>
        )}

        {/* Scrim for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#07090f]/80 via-transparent to-transparent pointer-events-none" />

        {/* Bulk select checkbox */}
        {onSelectToggle && (
          <div className="absolute top-3 left-3 z-10">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onSelectToggle}
              className="w-4 h-4 rounded border-[rgba(255,255,255,0.2)] bg-[#07090f]/80 checked:bg-[#16c784] focus:ring-0 transition-all cursor-pointer accent-[#16c784]"
            />
          </div>
        )}

        {/* Status badge — top left */}
        <div className={`absolute top-3 transition-all duration-150 ${onSelectToggle ? 'left-9' : 'left-3'}`}>
          <span className={`os-status ${statusConfig.cssClass}`}>{statusConfig.label}</span>
        </div>

        {/* Context menu button — top right */}
        <div className="absolute top-2.5 right-2.5">
          <div className="relative">
            <button
              onClick={() => setMenuOpen(prev => !prev)}
              className="w-7 h-7 rounded-lg bg-[#07090f]/70 backdrop-blur-sm border border-[rgba(255,255,255,0.1)] flex items-center justify-center text-[#8892aa] hover:text-[#f0f4ff] text-xs transition-all opacity-0 group-hover:opacity-100"
              aria-label="More options"
            >
              ···
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute top-full right-0 mt-1.5 z-20 w-40 os-frosted rounded-xl overflow-hidden shadow-2xl py-1 os-slide-up">
                  <button
                    onClick={() => { setMenuOpen(false); onDuplicate(); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[#8892aa] hover:text-[#f0f4ff] hover:bg-[rgba(255,255,255,0.04)] transition-colors text-left"
                  >
                    <span>⊕</span> Duplicate
                  </button>
                  <Link
                    href={`/dashboard/properties/${property.id}/edit`}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[#8892aa] hover:text-[#f0f4ff] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
                    onClick={() => setMenuOpen(false)}
                  >
                    <span>✎</span> Edit
                  </Link>
                  <div className="h-px bg-[rgba(255,255,255,0.04)] my-1" />
                  <button
                    onClick={() => { setMenuOpen(false); onDelete(); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[#f43f5e] hover:bg-[rgba(244,63,94,0.08)] transition-colors text-left"
                  >
                    <span>⊗</span> Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Price — bottom left */}
        <div className="absolute bottom-3 left-3">
          <span className="text-sm font-bold text-[#f0f4ff] bg-[#07090f]/70 backdrop-blur-sm rounded-lg px-2.5 py-1 border border-[rgba(255,255,255,0.08)]">
            {formatPrice(property.price)}
          </span>
        </div>

        {/* Image count — bottom right */}
        {property.images.length > 1 && (
          <div className="absolute bottom-3 right-3">
            <span className="text-[10px] font-semibold text-[#8892aa] bg-[#07090f]/70 backdrop-blur-sm rounded-lg px-2 py-0.5 border border-[rgba(255,255,255,0.06)]">
              📷 {property.images.length}
            </span>
          </div>
        )}
      </div>

      {/* ── Card body ───────────────────────────────────────── */}
      <div className="flex flex-col flex-1 p-4">
        {/* Type label */}
        <div className="os-label mb-1.5">{typeLabel}</div>

        {/* Title */}
        <h3 className="text-sm font-semibold text-[#f0f4ff] leading-snug line-clamp-1">
          {property.title}
        </h3>

        {/* Location */}
        <div className="flex items-center gap-1 mt-1.5">
          <span className="text-xs">📍</span>
          <span className="text-xs text-[#4a5470] truncate">{property.area}, {property.city}</span>
        </div>

        {/* Spec pills */}
        {(property.bhk || property.square_feet) && (
          <div className="flex items-center flex-wrap gap-1.5 mt-3">
            {property.bhk && (
              <span className="text-[10px] font-medium text-[#8892aa] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] rounded-md px-2 py-0.5">
                {property.bhk} BHK
              </span>
            )}
            {property.square_feet && (
              <span className="text-[10px] font-medium text-[#8892aa] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] rounded-md px-2 py-0.5">
                {property.square_feet.toLocaleString()} sqft
              </span>
            )}
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Action row */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[rgba(255,255,255,0.05)]">
          {/* Share — primary CTA */}
          <button
            id={`share-btn-${property.id}`}
            onClick={onShare}
            disabled={isGeneratingShare}
            className="flex-1 flex items-center justify-center gap-2 h-9 rounded-xl text-xs font-bold bg-[#16c784] text-[#07090f] hover:bg-[#19e098] disabled:opacity-60 disabled:cursor-wait transition-all active:scale-95 cursor-pointer"
          >
            {isGeneratingShare ? (
              <>
                <span className="inline-block w-3 h-3 border-2 border-[#07090f]/30 border-t-[#07090f] rounded-full animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <span>💬</span> Share via WhatsApp
              </>
            )}
          </button>

          {/* View page */}
          <Link
            href={`/p/${property.slug || property.id}`}
            target="_blank"
            className="os-btn-icon shrink-0"
            title="Preview listing page"
          >
            <span className="text-sm">↗</span>
          </Link>

          {/* Download brochure */}
          <button
            onClick={handleDownloadBrochure}
            disabled={isDownloading}
            className="os-btn-icon shrink-0 text-[#38bdf8] hover:text-[#52d3ff] border-[#38bdf8]/10 hover:border-[#38bdf8]/30 bg-[#38bdf8]/5 disabled:opacity-50 disabled:cursor-wait"
            title="Download PDF Brochure"
          >
            {isDownloading ? (
              <span className="inline-block w-3.5 h-3.5 border-2 border-[#38bdf8]/30 border-t-[#38bdf8] rounded-full animate-spin" />
            ) : (
              <span className="text-xs">📄</span>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
