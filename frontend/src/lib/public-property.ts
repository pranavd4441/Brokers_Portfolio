import type { ThemeMode } from '@/lib/theme';

export interface PublicPropertyImage {
  id: string;
  url: string;
  thumbnail_url?: string;
  display_order?: number;
  caption?: string;
}

export interface PublicBrokerProfile {
  name: string;
  phone: string;
  whatsapp: string;
  avatar_url?: string;
  agency_name?: string;
  professional_title?: string;
  public_slug?: string;
  public_bio?: string;
  service_areas?: string[];
}

export interface PublicProperty {
  id?: string;
  slug: string;
  title: string;
  description: string;
  price: number;
  property_type: string;
  status: string;
  city: string;
  area: string;
  bhk: number | null;
  square_feet: number | null;
  amenities: string[];
  images: PublicPropertyImage[];
  broker: PublicBrokerProfile;
  brand_color?: string;
  brand_logo_url?: string;
  agency_name?: string;
  theme_mode: ThemeMode;
  listing_attribution: 'BROKER_LISTED';
  updated_at?: string;
}

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as UnknownRecord
    : {};
}

function text(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return fallback;
}

function optionalText(value: unknown): string | undefined {
  const result = text(value).trim();
  return result || undefined;
}

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => text(item).trim()).filter(Boolean);
}

function normalizeImages(value: unknown): PublicPropertyImage[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((candidate, index) => {
    const image = asRecord(candidate);
    const url = text(image.url).trim();
    if (!url) return [];

    return [{
      id: text(image.id, `image-${index}`),
      url,
      thumbnail_url: optionalText(image.thumbnail_url),
      display_order: numberOrNull(image.display_order) ?? index,
      caption: optionalText(image.caption),
    }];
  }).sort((first, second) => (first.display_order ?? 0) - (second.display_order ?? 0));
}

function normalizeTheme(value: unknown): ThemeMode {
  return text(value).toUpperCase() === 'DARK' ? 'DARK' : 'LIGHT';
}

/**
 * Keeps the public display model intentionally narrower than the authenticated
 * Property serializer. In particular, location_address, verification flags,
 * private notes, and aggregate engagement are never copied into this object.
 */
export function normalizePublicProperty(payload: unknown, fallbackSlug: string): PublicProperty {
  const root = asRecord(payload);
  const property = asRecord(root.property ?? root);
  const branding = asRecord(root.branding);
  const tenant = asRecord(branding.tenant ?? branding);
  const brokerData = asRecord(root.broker ?? branding.broker ?? branding.primary_broker ?? branding);

  const agencyName = optionalText(tenant.name ?? branding.name ?? brokerData.agency_name);
  const brokerName = text(
    brokerData.broker_name ?? branding.broker_name ?? brokerData.name ?? agencyName,
    'Property advisor',
  );
  const brokerPhone = text(
    brokerData.phone ?? brokerData.broker_phone ?? branding.broker_phone ?? branding.phone,
  );
  const brokerWhatsapp = text(
    brokerData.whatsapp ?? brokerData.broker_whatsapp ?? branding.broker_whatsapp ?? branding.whatsapp ?? brokerPhone,
  );

  return {
    id: optionalText(property.id),
    slug: text(property.slug, fallbackSlug),
    title: text(property.title, 'Property listing'),
    description: text(property.description),
    price: numberOrNull(property.price) ?? 0,
    property_type: text(property.property_type, 'PROPERTY'),
    status: text(property.status, 'AVAILABLE'),
    city: text(property.city),
    area: text(property.area),
    bhk: numberOrNull(property.bhk),
    square_feet: numberOrNull(property.square_feet),
    amenities: stringList(property.amenities),
    images: normalizeImages(property.images),
    agency_name: agencyName,
    brand_color: optionalText(tenant.brand_color ?? branding.brand_color),
    brand_logo_url: optionalText(tenant.logo_url ?? branding.logo_url),
    theme_mode: normalizeTheme(tenant.theme_mode ?? branding.theme_mode),
    listing_attribution: 'BROKER_LISTED',
    updated_at: optionalText(property.updated_at),
    broker: {
      name: brokerName,
      phone: brokerPhone,
      whatsapp: brokerWhatsapp,
      avatar_url: optionalText(brokerData.avatar_url ?? branding.avatar_url),
      agency_name: agencyName,
      professional_title: optionalText(brokerData.professional_title),
      public_slug: optionalText(tenant.public_slug ?? branding.public_slug),
      public_bio: optionalText(tenant.public_bio ?? branding.public_bio),
      service_areas: stringList(tenant.service_areas ?? branding.service_areas),
    },
  };
}
