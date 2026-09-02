import type { InventoryMessageKey } from '@/i18n/inventory';

export interface DraftProperty {
  id: string; title: string; description: string; price: number | string;
  property_type: string; status: string; source: 'MANUAL' | 'WHATSAPP';
  area: string; city: string; bhk: number | null; square_feet: number | string | null;
  images: { id: string; url: string; thumbnail_url: string }[];
  intake_metadata?: { extraction_source?: string; missing_fields?: string[]; raw_details?: string; reviewed?: boolean };
}

export type DraftForm = Record<'title' | 'description' | 'price' | 'property_type' | 'area' | 'city' | 'bhk' | 'square_feet', string>;
export type DraftErrors = Partial<Record<keyof DraftForm, InventoryMessageKey>>;

export function draftForm(property: DraftProperty): DraftForm {
  return {
    title: property.title ?? '', description: property.description ?? '',
    price: property.price == null ? '' : String(property.price), property_type: property.property_type,
    area: property.area ?? '', city: property.city ?? '',
    bhk: property.bhk == null ? '' : String(property.bhk),
    square_feet: property.square_feet == null ? '' : String(property.square_feet),
  };
}

export function validateDraft(form: DraftForm): DraftErrors {
  const errors: DraftErrors = {};
  for (const key of ['title', 'description', 'price', 'area', 'city'] as const) {
    if (!form[key].trim()) errors[key] = 'requiredError';
  }
  if (form.title.trim().toLowerCase() === 'whatsapp property draft') errors.title = 'placeholderError';
  if (form.description.trim().toLowerCase().startsWith('property details received through whatsapp')) errors.description = 'placeholderError';
  if (form.price && (!/^\d+(\.\d{1,2})?$/.test(form.price) || Number(form.price) <= 0 || Number(form.price) >= 1e13)) errors.price = 'numberError';
  if (form.bhk && (!/^\d+$/.test(form.bhk) || Number(form.bhk) > 99)) errors.bhk = 'numberError';
  if (form.square_feet && (!/^\d+(\.\d{1,2})?$/.test(form.square_feet) || Number(form.square_feet) <= 0 || Number(form.square_feet) >= 1e8)) errors.square_feet = 'numberError';
  return errors;
}

export function draftPayload(form: DraftForm) {
  return { ...form, title: form.title.trim(), description: form.description.trim(), area: form.area.trim(), city: form.city.trim(), bhk: form.bhk === '' ? null : Number(form.bhk), square_feet: form.square_feet === '' ? null : form.square_feet };
}
