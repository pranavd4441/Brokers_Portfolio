'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getApiUrl } from '@/lib/api';
import { PublicProperty } from './page';

// ─── Helpers ────────────────────────────────────────────────────
function formatPrice(price: number): { main: string; sub: string } {
  if (price >= 10_000_000) {
    const val = price / 10_000_000;
    return { main: `₹${val.toFixed(2)}`, sub: 'Crore' };
  }
  if (price >= 100_000) {
    const val = price / 100_000;
    return { main: `₹${val.toFixed(2)}`, sub: 'Lakh' };
  }
  return { main: `₹${price.toLocaleString()}`, sub: '' };
}

const AMENITY_ICONS: Record<string, { icon: string; label: string }> = {
  gym:          { icon: '🏋️', label: 'Gym' },
  pool:         { icon: '🏊', label: 'Swimming Pool' },
  parking:      { icon: '🚗', label: 'Car Parking' },
  security:     { icon: '🔒', label: '24/7 Security' },
  clubhouse:    { icon: '🏛️', label: 'Club House' },
  garden:       { icon: '🌳', label: 'Garden' },
  lift:         { icon: '🛗', label: 'Elevator' },
  power_backup: { icon: '⚡', label: 'Power Backup' },
  wifi:         { icon: '📶', label: 'High-Speed WiFi' },
  cctv:         { icon: '📷', label: 'CCTV' },
  intercom:     { icon: '📟', label: 'Intercom' },
  fire_safety:  { icon: '🔥', label: 'Fire Safety' },
};

// ─── Gallery ─────────────────────────────────────────────────────
function Gallery({ images, title }: { images: PublicProperty['images']; title: string }) {
  const [active, setActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const prev = () => setActive(i => (i - 1 + images.length) % images.length);
  const next = () => setActive(i => (i + 1) % images.length);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'Escape') setLightboxOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxOpen]);

  if (images.length === 0) {
    return (
      <div className="w-full h-64 md:h-[480px] bg-[#0d1117] rounded-2xl flex flex-col items-center justify-center gap-3 text-[#4a5470]">
        <span className="text-5xl opacity-30">🏢</span>
        <span className="text-sm">No photos available</span>
      </div>
    );
  }

  return (
    <>
      {/* ── Main gallery ── */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] lg:grid-cols-[1fr_240px] gap-2">
        {/* Hero image */}
        <div
          className="relative h-64 md:h-[420px] rounded-2xl overflow-hidden cursor-pointer bg-[#0d1117] group"
          onClick={() => setLightboxOpen(true)}
          onTouchStart={e => setTouchStart(e.touches[0].clientX)}
          onTouchEnd={e => {
            if (touchStart === null) return;
            const diff = touchStart - e.changedTouches[0].clientX;
            if (Math.abs(diff) > 50) diff > 0 ? next() : prev();
            setTouchStart(null);
          }}
        >
          <img
            src={images[active].url}
            alt={`${title} — Photo ${active + 1}`}
            className="w-full h-full object-cover transition-transform duration-500"
          />
          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
          
          {/* Nav arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={e => { e.stopPropagation(); prev(); }}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl bg-black/50 backdrop-blur-sm text-white flex items-center justify-center text-sm hover:bg-black/70 transition-all opacity-0 group-hover:opacity-100"
              >
                ‹
              </button>
              <button
                onClick={e => { e.stopPropagation(); next(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl bg-black/50 backdrop-blur-sm text-white flex items-center justify-center text-sm hover:bg-black/70 transition-all opacity-0 group-hover:opacity-100"
              >
                ›
              </button>
            </>
          )}
          
          {/* Counter */}
          <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1 rounded-lg">
            {active + 1} / {images.length}
          </div>

          {/* Expand hint */}
          <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-white text-[10px] font-medium px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
            ⊕ View all
          </div>
        </div>

        {/* Thumbnail column — desktop only */}
        {images.length > 1 && (
          <div className="hidden md:flex flex-col gap-2 max-h-[420px] overflow-y-auto no-scrollbar">
            {images.map((img, idx) => (
              <button
                key={img.id}
                onClick={() => setActive(idx)}
                className={`relative flex-shrink-0 h-[calc(420px/4-6px)] rounded-xl overflow-hidden transition-all ${
                  active === idx ? 'ring-2 ring-[#16c784] ring-offset-2 ring-offset-[#07090f]' : 'opacity-60 hover:opacity-90'
                }`}
              >
                <img src={img.thumbnail_url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Mobile dot indicators ── */}
      {images.length > 1 && (
        <div className="flex md:hidden justify-center gap-1.5 mt-3">
          {images.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActive(idx)}
              className={`rounded-full transition-all ${active === idx ? 'w-4 h-1.5 bg-[#16c784]' : 'w-1.5 h-1.5 bg-[rgba(255,255,255,0.2)]'}`}
            />
          ))}
        </div>
      )}

      {/* ── Lightbox ── */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm"
          onClick={() => setLightboxOpen(false)}
        >
          <div className="relative max-w-5xl w-full px-4" onClick={e => e.stopPropagation()}>
            <img
              src={images[active].url}
              alt={`${title} — Photo ${active + 1}`}
              className="w-full max-h-[85vh] object-contain rounded-xl"
            />
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute top-2 right-6 w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white text-sm transition-all"
            >
              ✕
            </button>
            {images.length > 1 && (
              <>
                <button
                  onClick={prev}
                  className="absolute left-6 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white text-lg transition-all"
                >‹</button>
                <button
                  onClick={next}
                  className="absolute right-6 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white text-lg transition-all"
                >›</button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ─── Sticky CTA Bar ──────────────────────────────────────────────
function StickyCtaBar({
  phone,
  whatsapp,
  price,
  propertyTitle,
  brandColor,
  onWhatsApp,
  onCall,
  disabled = false,
}: {
  phone: string;
  whatsapp: string;
  price: number;
  propertyTitle: string;
  brandColor: string;
  onWhatsApp: () => void;
  onCall: () => void;
  disabled?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const formatted = formatPrice(price);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
      }`}
    >
      <div className="bg-[#0a0c14]/95 backdrop-blur-xl border-t border-[rgba(255,255,255,0.06)] px-4 py-3 pb-safe">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-[#4a5470] font-medium">Price</p>
            <p className="text-base font-bold text-[#f0f4ff] leading-tight">
              {formatted.main} <span className="text-sm text-[#8892aa]">{formatted.sub}</span>
            </p>
          </div>
          {disabled ? (
            <div className="flex-1 text-center py-2.5 px-4 text-[11px] font-bold text-[#f43f5e] bg-[#f43f5e]/10 border border-[#f43f5e]/20 rounded-xl whitespace-nowrap truncate">
              ⚠️ Listing Inactive (Off-Market)
            </div>
          ) : (
            <>
              <button
                id="cta-call-btn"
                onClick={onCall}
                className="flex items-center justify-center gap-2 h-11 px-4 rounded-xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.05)] text-[#f0f4ff] text-sm font-semibold hover:bg-[rgba(255,255,255,0.08)] transition-all cursor-pointer flex-shrink-0"
              >
                <span>📞</span>
                <span className="hidden sm:block">Call</span>
              </button>
              <button
                id="cta-whatsapp-btn"
                onClick={onWhatsApp}
                className="flex items-center justify-center gap-2 h-11 px-5 rounded-xl text-sm font-bold text-[#07090f] hover:opacity-90 active:scale-95 transition-all cursor-pointer flex-shrink-0"
                style={{ background: brandColor }}
              >
                <span>💬</span>
                <span>WhatsApp</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Client Component ───────────────────────────────────────
export default function PublicPropertyClient({ property: initialProperty }: { property: PublicProperty }) {
  // Ensure all media/avatar/logo URLs are absolute URLs pointing to the backend
  const getAbsoluteUrl = (url: string | null | undefined) => {
    if (!url) return '';
    const mediaIndex = url.indexOf('/media/');
    if (mediaIndex !== -1) {
      const mediaPath = url.substring(mediaIndex);
      const apiUrl = getApiUrl();
      const backendOrigin = apiUrl.startsWith('http')
        ? apiUrl.replace(/\/api$/, '')
        : window.location.origin.replace('-frontend', '-backend');
      return `${backendOrigin}${mediaPath}`;
    }
    return url;
  };

  const property = {
    ...initialProperty,
    images: (initialProperty.images ?? []).map(img => ({
      ...img,
      url: getAbsoluteUrl(img.url),
      thumbnail_url: getAbsoluteUrl(img.thumbnail_url),
    })),
    brand_logo_url: getAbsoluteUrl(initialProperty.brand_logo_url),
    broker: {
      ...initialProperty.broker,
      avatar_url: getAbsoluteUrl(initialProperty.broker.avatar_url),
    },
  };

  const brandColor = property.brand_color ?? '#16c784';
  const formatted = formatPrice(property.price);

  const typeLabel = property.bhk
    ? `${property.bhk} BHK ${property.property_type}`
    : property.property_type.replace('_', ' ');

  // Log view analytics (fire-and-forget)
  useEffect(() => {
    fetch(`${getApiUrl()}/analytics/log/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ property: property.id, event_type: 'PAGE_VIEW' }),
    }).catch(() => {});
  }, [property.id]);

  // State for gated lead modal
  const [showGatedModal, setShowGatedModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<'whatsapp' | 'call' | null>(null);
  const [modalName, setModalName] = useState('');
  const [modalPhone, setModalPhone] = useState('');
  const [modalError, setModalError] = useState('');

  // Initialize modal values from localStorage on mount (client-only safety)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setModalName(localStorage.getItem('buyer_name') || '');
      setModalPhone(localStorage.getItem('buyer_phone') || '');
    }
  }, []);

  // Function to execute the action after identification
  const executeAction = useCallback((action: 'whatsapp' | 'call', name: string, phone: string) => {
    if (action === 'whatsapp') {
      const siteUrl = window.location.origin;
      const shareUrl = `${siteUrl}/p/${property.slug}`;
      const text = encodeURIComponent(`Hi! I'm interested in: ${property.title}\n${shareUrl}`);
      const cleanedPhone = property.broker.whatsapp.replace(/\D/g, '');
      window.open(`https://wa.me/${cleanedPhone}?text=${text}`, '_blank');
      
      // Log click with buyer details
      fetch(`${getApiUrl()}/analytics/log/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property: property.id,
          event_type: 'WHATSAPP_CLICK',
          buyer_name: name,
          buyer_phone: phone
        }),
      }).catch(() => {});
    } else if (action === 'call') {
      window.location.href = `tel:${property.broker.phone}`;
      
      // Log click with buyer details
      fetch(`${getApiUrl()}/analytics/log/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property: property.id,
          event_type: 'PHONE_CLICK',
          buyer_name: name,
          buyer_phone: phone
        }),
      }).catch(() => {});
    }
  }, [property]);

  // Unified click handlers
  const handleWhatsAppClick = useCallback(() => {
    const savedName = localStorage.getItem('buyer_name');
    const savedPhone = localStorage.getItem('buyer_phone');

    if (savedName && savedPhone) {
      executeAction('whatsapp', savedName, savedPhone);
    } else {
      setPendingAction('whatsapp');
      setShowGatedModal(true);
    }
  }, [executeAction]);

  const handleCallClick = useCallback(() => {
    const savedName = localStorage.getItem('buyer_name');
    const savedPhone = localStorage.getItem('buyer_phone');

    if (savedName && savedPhone) {
      executeAction('call', savedName, savedPhone);
    } else {
      setPendingAction('call');
      setShowGatedModal(true);
    }
  }, [executeAction]);

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalName.trim()) {
      setModalError('Please enter your name');
      return;
    }
    if (!modalPhone.trim()) {
      setModalError('Please enter your phone number');
      return;
    }
    
    // Save to localStorage
    localStorage.setItem('buyer_name', modalName.trim());
    localStorage.setItem('buyer_phone', modalPhone.trim());
    
    // Execute pending action
    if (pendingAction) {
      executeAction(pendingAction, modalName.trim(), modalPhone.trim());
    }
    
    // Reset state
    setShowGatedModal(false);
    setPendingAction(null);
    setModalError('');
  };

  return (
    <>
      {/* ── Global styles for this page ── */}
      <style>{`
        :root { --brand: ${brandColor}; }
        .brand-text { color: ${brandColor}; }
        .brand-bg { background: ${brandColor}; }
        .brand-border { border-color: ${brandColor}; }
      `}</style>

      <div className="min-h-screen bg-[#07090f] pb-28">
        {/* ── Topbar ── */}
        <header className="sticky top-0 z-40 bg-[#07090f]/90 backdrop-blur-xl border-b border-[rgba(255,255,255,0.05)]">
          <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
            {/* Brand */}
            <div className="flex items-center gap-2.5">
              {property.brand_logo_url ? (
                <img src={property.brand_logo_url} alt="Agency logo" className="h-7 w-auto object-contain" />
              ) : (
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-[#07090f]"
                  style={{ background: brandColor }}
                >
                  {property.broker.name[0]?.toUpperCase()}
                </div>
              )}
              <span className="text-sm font-semibold text-[#f0f4ff] hidden sm:block truncate">
                {property.agency_name ?? property.broker.agency_name ?? 'PropertyOS'}
              </span>
            </div>

            {/* Share button */}
            <button
              onClick={() => {
                const siteUrl = window.location.origin;
                const shareUrl = `${siteUrl}/p/${property.slug}`;
                if (navigator.share) {
                  navigator.share({ title: property.title, url: shareUrl });
                } else {
                  navigator.clipboard.writeText(shareUrl);
                }
              }}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-[#8892aa] hover:text-[#f0f4ff] text-xs font-medium transition-all"
            >
              <span>⬆</span>
              <span className="hidden sm:block">Share</span>
            </button>
          </div>
        </header>

        {/* ── Main content ── */}
        <main className="max-w-4xl mx-auto px-4 pt-6 pb-12">
          {property.status === 'EXPIRED' && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3 text-rose-400 select-none">
              <span className="text-xl">⚠️</span>
              <div>
                <h4 className="text-sm font-bold">Listing Inactive</h4>
                <p className="text-xs text-[#8892aa] mt-0.5 leading-relaxed">
                  This property listing has expired or has been delisted by the broker. Inquiries are currently suspended.
                </p>
              </div>
            </div>
          )}

          {/* Gallery */}
          <Gallery images={property.images} title={property.title} />

          {/* ── Two-column layout ── */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
            {/* ── Left: property info ── */}
            <div className="space-y-8">
              {/* Title block */}
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <span
                    className="text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider"
                    style={{ background: `${brandColor}20`, color: brandColor }}
                  >
                    {property.status.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] font-medium text-[#4a5470] px-2.5 py-1 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)]">
                    {typeLabel}
                  </span>
                </div>

                <h1 className="text-xl md:text-2xl font-bold text-[#f0f4ff] leading-snug">
                  {property.title}
                </h1>

                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-sm">📍</span>
                  <span className="text-sm text-[#8892aa]">{property.area}, {property.city}</span>
                  {property.address && (
                    <span className="text-[#4a5470]">• {property.address}</span>
                  )}
                </div>

                {/* Price */}
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-3xl md:text-4xl font-bold tracking-tight" style={{ color: brandColor }}>
                    {formatted.main}
                  </span>
                  {formatted.sub && (
                    <span className="text-lg text-[#8892aa] font-medium">{formatted.sub}</span>
                  )}
                </div>
              </div>

              {/* Key specs */}
              {(property.bhk || property.square_feet) && (
                <div className="grid grid-cols-3 gap-3">
                  {property.bhk && (
                    <div className="os-card p-4 text-center">
                      <div className="text-xl mb-1">🛏</div>
                      <div className="text-base font-bold text-[#f0f4ff]">{property.bhk} BHK</div>
                      <div className="text-[10px] text-[#4a5470] mt-0.5">Bedrooms</div>
                    </div>
                  )}
                  {property.square_feet && (
                    <div className="os-card p-4 text-center">
                      <div className="text-xl mb-1">📐</div>
                      <div className="text-base font-bold text-[#f0f4ff]">{property.square_feet.toLocaleString()}</div>
                      <div className="text-[10px] text-[#4a5470] mt-0.5">Sq. ft.</div>
                    </div>
                  )}
                  <div className="os-card p-4 text-center">
                    <div className="text-xl mb-1">🏠</div>
                    <div className="text-sm font-bold text-[#f0f4ff] capitalize">
                      {property.property_type.replace('_', ' ')}
                    </div>
                    <div className="text-[10px] text-[#4a5470] mt-0.5">Type</div>
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <h2 className="text-sm font-bold text-[#f0f4ff] mb-3">About this property</h2>
                <p className="text-sm text-[#8892aa] leading-relaxed whitespace-pre-line">
                  {property.description}
                </p>
              </div>

              {/* Amenities */}
              {property.amenities.length > 0 && (
                <div>
                  <h2 className="text-sm font-bold text-[#f0f4ff] mb-3">Amenities</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {property.amenities.map(id => {
                      const a = AMENITY_ICONS[id];
                      if (!a) return null;
                      return (
                        <div
                          key={id}
                          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-xs text-[#8892aa]"
                        >
                          <span className="text-sm">{a.icon}</span>
                          <span>{a.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Location detail */}
              <div>
                <h2 className="text-sm font-bold text-[#f0f4ff] mb-3">Location</h2>
                <div className="h-48 rounded-2xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] flex flex-col items-center justify-center gap-2 text-[#4a5470]">
                  <span className="text-4xl opacity-30">🗺️</span>
                  <div className="text-center">
                    <p className="text-sm text-[#8892aa] font-medium">{property.area}, {property.city}</p>
                    {property.address && <p className="text-xs text-[#4a5470] mt-0.5">{property.address}</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Right: broker card ── */}
            <div className="space-y-4">
              {/* Sticky broker card (desktop) */}
              <div className="lg:sticky lg:top-20 space-y-4">
                <div className="os-card p-5">
                  <p className="text-xs text-[#4a5470] font-medium mb-4 uppercase tracking-wider">Listed by</p>

                  {/* Broker info */}
                  <div className="flex items-center gap-3 mb-5">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-base font-bold text-[#07090f] flex-shrink-0"
                      style={{ background: brandColor }}
                    >
                      {property.broker.avatar_url
                        ? <img src={property.broker.avatar_url} alt="Broker" className="w-full h-full object-cover rounded-xl" />
                        : property.broker.name[0]?.toUpperCase()
                      }
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-[#f0f4ff] truncate">{property.broker.name}</p>
                        {property.broker.verified && (
                          <span title="Verified Broker" className="text-[#16c784] text-xs">✓</span>
                        )}
                      </div>
                      {property.broker.agency_name && (
                        <p className="text-xs text-[#4a5470] truncate">{property.broker.agency_name}</p>
                      )}
                    </div>
                  </div>

                  {/* CTA buttons */}
                  <div className="space-y-2.5">
                    {property.status === 'EXPIRED' ? (
                      <div className="w-full text-center py-3 px-4 text-xs font-bold text-[#f43f5e] bg-[#f43f5e]/10 border border-[#f43f5e]/20 rounded-xl">
                        ⚠️ Inquiries Suspended
                      </div>
                    ) : (
                      <>
                        <button
                          id="detail-whatsapp-btn"
                          onClick={handleWhatsAppClick}
                          className="w-full flex items-center justify-center gap-2.5 h-12 rounded-xl text-sm font-bold text-[#07090f] hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
                          style={{ background: brandColor }}
                        >
                          <span className="text-base">💬</span>
                          Chat on WhatsApp
                        </button>
                        <button
                          id="detail-call-btn"
                          onClick={handleCallClick}
                          className="w-full flex items-center justify-center gap-2.5 h-12 rounded-xl text-sm font-semibold text-[#f0f4ff] bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.08)] transition-all cursor-pointer"
                        >
                          <span className="text-base">📞</span>
                          Call Broker
                        </button>
                      </>
                    )}
                  </div>

                  {/* Trust signals */}
                  <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.05)]">
                    <div className="flex items-center gap-2 text-[10px] text-[#4a5470]">
                      <span>🔒</span>
                      <span>Your details are safe. We don't share your contact.</span>
                    </div>
                  </div>
                </div>

                {/* Share this listing */}
                <div className="os-card p-4">
                  <p className="text-xs font-semibold text-[#8892aa] mb-3">Share this listing</p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleWhatsAppClick}
                      className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] text-xs font-semibold hover:bg-[#25D366]/20 transition-all cursor-pointer"
                    >
                      <span>💬</span> WhatsApp
                    </button>
                    <button
                      onClick={() => {
                        if (navigator.share) {
                          navigator.share({ title: property.title, url: window.location.href });
                        } else {
                          navigator.clipboard.writeText(window.location.href);
                        }
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] text-[#8892aa] text-xs font-semibold hover:bg-[rgba(255,255,255,0.08)] transition-all cursor-pointer"
                    >
                      <span>🔗</span> Copy Link
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Powered by footer */}
        <div className="max-w-4xl mx-auto px-4 pb-6">
          <p className="text-center text-[10px] text-[#4a5470]">
            Powered by <span className="text-[#16c784] font-semibold">PropertyOS</span>
          </p>
        </div>
      </div>

      {/* ── Gated Buyer Modal ── */}
      {showGatedModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 backdrop-blur-md px-4">
          <div className="relative w-full max-w-md bg-[#0a0c14] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 shadow-2xl">
            {/* Close Button */}
            <button
              onClick={() => {
                setShowGatedModal(false);
                setPendingAction(null);
                setModalError('');
              }}
              className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-[#4a5470] hover:text-[#f0f4ff] hover:bg-[rgba(255,255,255,0.05)] transition-all"
            >
              ✕
            </button>

            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] flex items-center justify-center text-xl mx-auto mb-4">
                🎯
              </div>
              <h3 className="text-lg font-bold text-[#f0f4ff]">Connect with Broker</h3>
              <p className="text-xs text-[#8892aa] mt-1.5 leading-relaxed">
                Please provide your contact details to connect with the broker instantly. Your details are secure and shared only with the listing broker.
              </p>
            </div>

            <form onSubmit={handleModalSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#4a5470] mb-1.5">
                  Your Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={modalName}
                  onChange={e => setModalName(e.target.value)}
                  className="w-full h-11 px-3.5 bg-[#07090f]/60 border border-[rgba(255,255,255,0.08)] rounded-xl text-sm text-[#f0f4ff] placeholder-[#4a5470] focus:outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#4a5470] mb-1.5">
                  Phone Number
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +91 99999 99999"
                  value={modalPhone}
                  onChange={e => setModalPhone(e.target.value)}
                  className="w-full h-11 px-3.5 bg-[#07090f]/60 border border-[rgba(255,255,255,0.08)] rounded-xl text-sm text-[#f0f4ff] placeholder-[#4a5470] focus:outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)] transition-all"
                />
              </div>

              {modalError && (
                <p className="text-xs font-medium text-[#f43f5e] text-center">{modalError}</p>
              )}

              <button
                type="submit"
                className="w-full h-11 rounded-xl text-sm font-bold text-[#07090f] hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer mt-2"
                style={{ background: brandColor }}
              >
                Continue to {pendingAction === 'whatsapp' ? 'WhatsApp' : 'Call'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Sticky bottom CTA (mobile + desktop) ── */}
      <StickyCtaBar
        phone={property.broker.phone}
        whatsapp={property.broker.whatsapp}
        price={property.price}
        propertyTitle={property.title}
        brandColor={brandColor}
        onWhatsApp={handleWhatsAppClick}
        onCall={handleCallClick}
        disabled={property.status === 'EXPIRED'}
      />
    </>
  );
}
