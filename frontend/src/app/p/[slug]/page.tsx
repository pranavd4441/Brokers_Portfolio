import { Metadata } from 'next';
import { notFound } from 'next/navigation';
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
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://backend:8000/api';
  try {
    const res = await fetch(`${apiBase}/sharing/public/${slug}/`, {
      next: { revalidate: 60 }, // ISR — revalidate every 60s
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ─── Dynamic metadata ────────────────────────────────────────────
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const property = await getProperty(params.slug);
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
export default async function PublicPropertyPage({ params }: { params: { slug: string } }) {
  const property = await getProperty(params.slug);
  if (!property) notFound();

  return <PublicPropertyClient property={property} />;
}
