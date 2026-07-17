import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import PublicPropertyClient from './PublicPropertyClient';

// ─── Types ──────────────────────────────────────────────────────
export interface PropertyImage {
  id: string;
  url: string;
  thumbnail_url: string;
  display_order: number;
  caption?: string;
}

export interface Amenity {
  id: string;
  label: string;
  icon: string;
}

export interface BrokerProfile {
  name: string;
  phone: string;
  whatsapp: string;
  avatar_url?: string;
  agency_name?: string;
  verified: boolean;
}

export interface PublicProperty {
  id: string;
  slug: string;
  title: string;
  description: string;
  price: number;
  property_type: string;
  status: string;
  city: string;
  area: string;
  address?: string;
  bhk: number | null;
  square_feet: number | null;
  amenities: string[];
  images: PropertyImage[];
  broker: BrokerProfile;
  brand_color?: string;
  brand_logo_url?: string;
  agency_name?: string;
  views: number;
}

// ─── SSR: Fetch data ─────────────────────────────────────────────
async function getProperty(slug: string): Promise<PublicProperty | null> {
  // Use the backend URL directly for server-side fetches (avoids self-looping
  // through the Next.js proxy which is only available at request time, not build time).
  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8000';
  try {
    const res = await fetch(`${backendUrl}/api/sharing/public/${slug}/`, {
      next: { revalidate: 60 }, // ISR — revalidate every 60s
    });
    if (!res.ok) return null;

    // The API returns { property: {...}, branding: {...} }
    // We need to flatten these into the PublicProperty shape expected by the client.
    const data = await res.json();
    const prop = data.property ?? data;          // graceful fallback
    const branding = data.branding ?? {};

    return {
      id: prop.id,
      slug: prop.slug ?? slug,
      title: prop.title,
      description: prop.description,
      price: prop.price,
      property_type: prop.property_type,
      status: prop.status,
      city: prop.city,
      area: prop.area,
      address: prop.location_address,
      bhk: prop.bhk,
      square_feet: prop.square_feet,
      amenities: prop.amenities ?? [],
      images: prop.images ?? [],
      views: prop.views ?? 0,
      brand_color: branding.brand_color ?? '#16c784',
      brand_logo_url: branding.logo_url ?? null,
      agency_name: branding.name ?? null,
      broker: {
        name: branding.broker_name ?? branding.name ?? 'Broker',
        phone: branding.phone ?? branding.broker_phone ?? '',
        whatsapp: branding.whatsapp ?? branding.broker_whatsapp ?? branding.phone ?? '',
        avatar_url: branding.avatar_url ?? null,
        agency_name: branding.name ?? null,
        verified: branding.verified ?? false,
      },
    } as PublicProperty;
  } catch {
    return null;
  }
}

// ─── Dynamic metadata ────────────────────────────────────────────
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const property = await getProperty(slug);
  if (!property) {
    return { title: 'Property Not Found — PropertyOS' };
  }

  const priceStr = property.price >= 10_000_000
    ? `₹${(property.price / 10_000_000).toFixed(2)} Cr`
    : `₹${(property.price / 100_000).toFixed(2)} L`;

  const typeStr = property.bhk
    ? `${property.bhk} BHK ${property.property_type}`
    : property.property_type;

  const coverImage = property.images[0]?.url;

  return {
    title: `${property.title} — ${priceStr} | PropertyOS`,
    description: `${typeStr} in ${property.area}, ${property.city}. ${property.description.slice(0, 150)}`,
    openGraph: {
      title: property.title,
      description: `${typeStr} in ${property.area}, ${property.city} • ${priceStr}`,
      images: coverImage ? [{ url: coverImage, width: 1200, height: 630 }] : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: property.title,
      description: `${typeStr} • ${priceStr} • ${property.area}, ${property.city}`,
      images: coverImage ? [coverImage] : [],
    },
  };
}

// ─── Page component ──────────────────────────────────────────────
export default async function PublicPropertyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const property = await getProperty(slug);
  if (!property) notFound();

  if (property.slug !== slug) {
    redirect(`/p/${property.slug}`);
  }

  return <PublicPropertyClient property={property} />;
}
