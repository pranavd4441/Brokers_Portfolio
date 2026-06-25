import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import AnalyticsTracker from './AnalyticsTracker';

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
  price: string; // returns decimal as string
  property_type: 'APARTMENT' | 'VILLA' | 'PLOT' | 'COMMERCIAL';
  status: 'AVAILABLE' | 'NEGOTIATION' | 'SITE_VISIT' | 'BOOKED' | 'SOLD';
  city: string;
  area: string;
  location_address: string | null;
  bhk: number | null;
  square_feet: number | null;
  amenities: string[];
  images: PropertyImage[];
}

interface Branding {
  id: string;
  name: string;
  logo_url: string | null;
  brand_color: string;
  whatsapp_default_number: string | null;
  subscription_plan: string;
}

interface ListingPayload {
  property: Property;
  branding: Branding;
}

// Fetch listing details directly on the server for maximum performance (<2s load time)
async function getListingData(slug: string): Promise<ListingPayload | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://backend:8000/api';
  
  try {
    const res = await fetch(`${apiUrl}/sharing/resolve/${slug}/`, {
      cache: 'no-store', // Avoid stale cache, fetch fresh
    });
    
    if (!res.ok) return null;
    return res.json();
  } catch (error) {
    console.error('[NextJS Server] Fetch listing error:', error);
    return null;
  }
}

// Generate dynamic SEO metadata on the server
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getListingData(slug);
  if (!data) return { title: 'Property Not Found - PropertyOS' };

  const prop = data.property;
  const priceVal = parseFloat(prop.price);
  const formattedPrice = priceVal >= 10000000 
    ? `₹${(priceVal / 10000000).toFixed(2)} Cr` 
    : priceVal >= 100000 
      ? `₹${(priceVal / 100000).toFixed(2)} Lakh` 
      : `₹${priceVal.toLocaleString()}`;

  return {
    title: `${prop.title} | ${prop.area}, ${prop.city}`,
    description: `Price: ${formattedPrice}. ${prop.description.substring(0, 150)}...`,
    openGraph: {
      title: prop.title,
      description: prop.description.substring(0, 150),
      images: prop.images.length > 0 ? [{ url: prop.images[0].url }] : [],
    }
  };
}

export default async function PublicPropertyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getListingData(slug);
  
  if (!data) {
    notFound();
  }

  const { property, branding } = data;
  const priceVal = parseFloat(property.price);
  
  const formatPrice = (price: number) => {
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
    if (price >= 100000) return `₹${(price / 100000).toFixed(2)} L`;
    return `₹${price.toLocaleString()}`;
  };

  const getPropertyTypeLabel = (type: string) => {
    switch (type) {
      case 'APARTMENT': return 'Apartment / Flat';
      case 'VILLA': return 'Premium Villa';
      case 'PLOT': return 'Land / Plot';
      case 'COMMERCIAL': return 'Commercial Space';
      default: return type;
    }
  };

  const brandPrimary = branding.brand_color || '#10b981';
  const whatsappNumber = branding.whatsapp_default_number || '';
  
  // Construct the pre-filled WhatsApp message for the lead
  const leadMessage = encodeURIComponent(
    `Hi! I saw your listing for "${property.title}" in ${property.area}, ${property.city} (Price: ${formatPrice(priceVal)}) on your website. I am interested and would like to know more details. Please share availability.`
  );
  
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${leadMessage}`;
  const phoneUrl = `tel:${whatsappNumber}`;

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 pb-24 selection:bg-emerald-500 selection:text-white">
      {/* 1. Client-Side Analytics Ingestion Tracker */}
      <AnalyticsTracker propertyId={property.id} />

      {/* 2. Branded Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800/60 bg-[#0c1220]/80 backdrop-blur-md px-4 py-3.5 flex items-center justify-between">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {branding.logo_url ? (
              <img 
                src={branding.logo_url} 
                alt={branding.name} 
                className="h-8 w-8 rounded-lg object-contain bg-slate-900 border border-slate-800"
              />
            ) : (
              <span className="text-2xl">🏢</span>
            )}
            <span className="font-bold text-slate-100 text-sm tracking-tight">{branding.name}</span>
          </div>
          
          <a 
            href={whatsappUrl}
            id="whatsapp-header-cta"
            style={{ backgroundColor: brandPrimary }}
            className="h-8.5 px-4 rounded-lg text-slate-950 text-xs font-bold hover:opacity-90 active:scale-[0.97] transition-all flex items-center justify-center cursor-pointer"
          >
            Contact Office
          </a>
        </div>
      </header>

      {/* 3. Central Landing Page Container */}
      <main className="max-w-6xl mx-auto px-4 mt-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Columns (Gallery + Description) */}
        <section className="lg:col-span-2 space-y-6">
          
          {/* horizontal Swipeable Image Gallery */}
          <div className="glass rounded-2xl overflow-hidden border border-slate-800/60">
            {property.images.length > 0 ? (
              <div className="flex flex-col">
                {/* Main Active Image Box (Hero) */}
                <div className="relative aspect-video w-full bg-slate-900">
                  <img 
                    src={property.images[0].url} 
                    alt={property.title} 
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute bottom-4 left-4 bg-slate-950/85 text-white font-bold text-sm px-3.5 py-1.5 rounded-xl border border-slate-800">
                    {formatPrice(priceVal)}
                  </span>
                </div>
                
                {/* Horizontal Swipeable list for previews */}
                {property.images.length > 1 && (
                  <div className="flex gap-3 overflow-x-auto p-4 no-scrollbar border-t border-slate-800/60 bg-slate-950/25">
                    {property.images.map((img, idx) => (
                      <div 
                        key={img.id} 
                        className="h-16 w-24 rounded-lg overflow-hidden border border-slate-800 flex-shrink-0 cursor-pointer hover:border-slate-500 transition-all"
                      >
                        <img src={img.thumbnail_url} alt="thumbnail" className="h-full w-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="aspect-video w-full flex flex-col items-center justify-center text-slate-600 bg-slate-950/30">
                <span className="text-6xl mb-2">🏢</span>
                <span className="text-sm font-bold">Images arriving soon</span>
              </div>
            )}
          </div>

          {/* highlights Cards Grid */}
          <div className="glass p-5 rounded-2xl border border-slate-800/60 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="border-r border-slate-800/50 last:border-0 pr-2">
              <span className="text-slate-500 text-[10px] uppercase font-semibold tracking-wider">Type</span>
              <div className="text-sm font-bold text-slate-200 mt-0.5">{getPropertyTypeLabel(property.property_type)}</div>
            </div>
            {property.bhk && (
              <div className="sm:border-r border-slate-800/50 pr-2">
                <span className="text-slate-500 text-[10px] uppercase font-semibold tracking-wider">Config</span>
                <div className="text-sm font-bold text-slate-200 mt-0.5">{property.bhk} BHK</div>
              </div>
            )}
            {property.square_feet && (
              <div className="border-r border-slate-800/50 pr-2">
                <span className="text-slate-500 text-[10px] uppercase font-semibold tracking-wider">Super Area</span>
                <div className="text-sm font-bold text-slate-200 mt-0.5">{property.square_feet} Sq.Ft</div>
              </div>
            )}
            <div>
              <span className="text-slate-500 text-[10px] uppercase font-semibold tracking-wider">Location</span>
              <div className="text-sm font-bold text-slate-200 mt-0.5 truncate" title={`${property.area}, ${property.city}`}>{property.area}</div>
            </div>
          </div>

          {/* narrative Description */}
          <div className="glass p-6 rounded-2xl border border-slate-800/60 space-y-4">
            <h2 className="text-lg font-bold text-white tracking-tight border-b border-slate-800 pb-2">Listing Description</h2>
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{property.description}</p>
          </div>

          {/* key Amenities Grid */}
          {property.amenities && property.amenities.length > 0 && (
            <div className="glass p-6 rounded-2xl border border-slate-800/60 space-y-4">
              <h2 className="text-lg font-bold text-white tracking-tight border-b border-slate-800 pb-2">Amenities & Facilities</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {property.amenities.map((amenity, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-slate-300 text-xs py-1">
                    <span className="text-emerald-400">✓</span>
                    <span>{amenity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Right Sticky Sidebar (Branded CTA Card + Map) */}
        <aside className="space-y-6">
          
          {/* Sticky CTA Card */}
          <div className="glass p-6 rounded-2xl border border-slate-800/60 sticky top-24 space-y-6">
            <div>
              <span className="text-slate-500 text-[10px] uppercase font-semibold tracking-wider">Asking Price</span>
              <div className="text-2xl md:text-3xl font-extrabold text-white mt-1 tracking-tight">{formatPrice(priceVal)}</div>
              <div className="text-xs font-semibold text-emerald-400 mt-1 uppercase tracking-wider">{property.status}</div>
            </div>

            {/* Address */}
            {property.location_address && (
              <div className="border-t border-slate-800/50 pt-4">
                <span className="text-slate-500 text-[10px] uppercase font-semibold tracking-wider">Address</span>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">{property.location_address}</p>
              </div>
            )}

            {/* Broker profile summary */}
            <div className="border-t border-slate-800/50 pt-4 flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-lg font-bold shrink-0">
                👤
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-200">Contact Listing Representative</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Verified Professional Broker</div>
              </div>
            </div>

            {/* Core CTA Actions */}
            <div className="space-y-2.5">
              <a 
                href={whatsappUrl}
                id="whatsapp-main-cta"
                style={{ backgroundColor: brandPrimary }}
                className="w-full flex items-center justify-center gap-2 h-12 rounded-xl text-slate-950 font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer shadow-lg"
              >
                <span>💬</span> Chat on WhatsApp
              </a>
              <a 
                href={phoneUrl}
                id="phone-main-cta"
                className="w-full flex items-center justify-center gap-2 h-12 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 font-semibold text-sm transition-all cursor-pointer"
              >
                <span>📞</span> Call Agent
              </a>
            </div>
          </div>
        </aside>
      </main>

      {/* 4. Mobile Bottom Sticky Sticky Floating CTA Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0c1220]/95 backdrop-blur-md border-t border-slate-800/60 p-4 flex gap-3 shadow-2xl">
        <a 
          href={phoneUrl}
          id="phone-mobile-cta"
          className="flex-1 flex items-center justify-center gap-1.5 h-12 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 font-semibold text-sm cursor-pointer"
        >
          <span>📞</span> Call
        </a>
        <a 
          href={whatsappUrl}
          id="whatsapp-mobile-cta"
          style={{ backgroundColor: brandPrimary }}
          className="flex-[2] flex items-center justify-center gap-1.5 h-12 rounded-xl text-slate-950 font-extrabold text-sm cursor-pointer shadow-lg"
        >
          <span>💬</span> Chat on WhatsApp
        </a>
      </div>
    </div>
  );
}
