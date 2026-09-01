import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { normalizePublicProperty, type PublicProperty } from '@/lib/public-property';
import PublicPropertyClient from './PublicPropertyClient';

// ─── SSR: Fetch data ─────────────────────────────────────────────
const getProperty = cache(async (slug: string): Promise<PublicProperty | null> => {
  // Use the backend URL directly for server-side fetches (avoids self-looping
  // through the Next.js proxy which is only available at request time, not build time).
  const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8000';
  try {
    const res = await fetch(`${backendUrl}/api/sharing/public/${slug}/`, {
      next: { revalidate: 60 }, // ISR — revalidate every 60s
    });
    if (!res.ok) return null;

    return normalizePublicProperty(await res.json(), slug);
  } catch {
    return null;
  }
});

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

  const presenter = property.agency_name || property.broker.name;

  return {
    title: `${property.title} — ${priceStr} | ${presenter}`,
    description: `${typeStr} in ${property.area}, ${property.city}. ${property.description.slice(0, 150)}`,
    openGraph: {
      title: `${property.title} | ${presenter}`,
      description: `${typeStr} in ${property.area}, ${property.city} • ${priceStr} • Presented by ${presenter}`,
      images: coverImage ? [{ url: coverImage, width: 1200, height: 630 }] : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${property.title} | ${presenter}`,
      description: `${typeStr} • ${priceStr} • ${property.area}, ${property.city}`,
      images: coverImage ? [coverImage] : [],
    },
  };
}

// ─── Page component ──────────────────────────────────────────────
export default async function PublicPropertyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const property = await getProperty(slug);

  if (property && property.slug !== slug) {
    redirect(`/p/${property.slug}`);
  }

  return <PublicPropertyClient property={property} slug={slug} />;
}
