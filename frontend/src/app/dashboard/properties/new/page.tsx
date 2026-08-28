'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Dumbbell,
  House,
  ImagePlus,
  LandPlot,
  LoaderCircle,
  MapPin,
  ParkingCircle,
  ShieldCheck,
  Sparkles,
  Store,
  UploadCloud,
  X,
  Zap,
} from 'lucide-react';
import AIAssistantModal from '@/components/AIAssistantModal';
import { fetchApi } from '@/lib/api';

interface PropertyForm {
  title: string;
  property_type: 'APARTMENT' | 'VILLA' | 'PLOT' | 'COMMERCIAL';
  price: string;
  bhk: string;
  square_feet: string;
  area: string;
  city: string;
  location_address: string;
  description: string;
  amenities: string[];
  images: File[];
}

interface CreatedProperty {
  id: string;
}

const PROPERTY_TYPES = [
  { value: 'APARTMENT' as const, label: 'Apartment', Icon: Building2 },
  { value: 'VILLA' as const, label: 'Villa or house', Icon: House },
  { value: 'PLOT' as const, label: 'Land or plot', Icon: LandPlot },
  { value: 'COMMERCIAL' as const, label: 'Commercial', Icon: Store },
];

const AMENITIES = [
  { value: 'parking', label: 'Parking', Icon: ParkingCircle },
  { value: 'security', label: '24/7 security', Icon: ShieldCheck },
  { value: 'gym', label: 'Gym', Icon: Dumbbell },
  { value: 'power_backup', label: 'Power backup', Icon: Zap },
  { value: 'lift', label: 'Lift', Icon: Building2 },
  { value: 'garden', label: 'Garden', Icon: Sparkles },
];

const STEPS = [
  { number: 1, label: 'Essential facts' },
  { number: 2, label: 'Location and story' },
  { number: 3, label: 'Photos and publish' },
];

function formatPrice(value: string) {
  const number = Number(value.replace(/,/g, ''));
  if (!Number.isFinite(number) || number <= 0) return 'Add a price';
  if (number >= 10_000_000) return `₹${(number / 10_000_000).toFixed(2)} Cr`;
  if (number >= 100_000) return `₹${(number / 100_000).toFixed(2)} L`;
  return `₹${number.toLocaleString('en-IN')}`;
}

function Progress({ current }: { current: number }) {
  return (
    <div className="flex items-center rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-3 sm:p-4">
      {STEPS.map((item, index) => (
        <div key={item.number} className={`flex min-w-0 items-center ${index < STEPS.length - 1 ? 'flex-1' : ''}`}>
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border text-xs font-black ${current > item.number ? 'border-[var(--ui-success)] bg-[var(--ui-success)] text-white' : current === item.number ? 'border-[var(--ui-brand-strong)] bg-[var(--ui-surface)] text-[var(--ui-brand-strong)]' : 'border-[var(--ui-border)] bg-[var(--ui-surface-muted)] text-[var(--ui-text-muted)]'}`}>
              {current > item.number ? <Check size={16} /> : item.number}
            </span>
            <span className={`hidden whitespace-nowrap text-xs font-bold sm:block ${current === item.number ? 'text-[var(--ui-text)]' : 'text-[var(--ui-text-muted)]'}`}>{item.label}</span>
          </div>
          {index < STEPS.length - 1 && <span className={`mx-2 h-px min-w-4 flex-1 sm:mx-4 ${current > item.number ? 'bg-[var(--ui-success)]' : 'bg-[var(--ui-border)]'}`} />}
        </div>
      ))}
    </div>
  );
}

function PhotoPicker({ files, onChange, onError }: { files: File[]; onChange: (files: File[]) => void; onError: (message: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previews = useMemo(() => files.map((file) => ({ file, url: URL.createObjectURL(file) })), [files]);

  useEffect(() => () => previews.forEach((preview) => URL.revokeObjectURL(preview.url)), [previews]);

  const addFiles = (incoming: FileList | File[]) => {
    const candidates = Array.from(incoming);
    const invalid = candidates.find((file) => !file.type.startsWith('image/') || file.size > 10 * 1024 * 1024);
    if (invalid) {
      onError('Use JPG, PNG or WebP images smaller than 10 MB each.');
      return;
    }
    if (files.length + candidates.length > 12) {
      onError('You can publish up to 12 photos in this version.');
      return;
    }
    onError('');
    onChange([...files, ...candidates]);
  };

  return (
    <div className="space-y-4">
      <button type="button" onClick={() => inputRef.current?.click()} className="flex min-h-36 w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[var(--ui-border-strong)] bg-[var(--ui-surface-muted)] px-6 text-center hover:border-[var(--ui-brand-strong)]">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--ui-surface)] text-[var(--ui-brand-strong)]"><UploadCloud size={23} /></span>
        <span><strong className="block text-sm text-[var(--ui-text)]">Choose photos from your phone</strong><span className="mt-1 block text-xs text-[var(--ui-text-muted)]">The first photo becomes the cover · up to 12 images</span></span>
      </button>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={(event) => { if (event.target.files) addFiles(event.target.files); event.target.value = ''; }} />

      {previews.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {previews.map((preview, index) => (
            <div key={`${preview.file.name}-${preview.file.lastModified}`} className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface-muted)]">
              <Image src={preview.url} alt={`Property photo ${index + 1}`} fill unoptimized className="object-cover" />
              {index === 0 && <span className="absolute left-2 top-2 rounded-full bg-[var(--ui-brand)] px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-[var(--ui-brand-ink)]">Cover</span>}
              <button type="button" aria-label={`Remove photo ${index + 1}`} onClick={() => onChange(files.filter((_, fileIndex) => fileIndex !== index))} className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-black/65 text-white"><X size={16} /></button>
            </div>
          ))}
          <button type="button" onClick={() => inputRef.current?.click()} className="grid min-h-28 place-items-center rounded-2xl border-2 border-dashed border-[var(--ui-border)] text-[var(--ui-text-muted)] hover:border-[var(--ui-brand-strong)] hover:text-[var(--ui-brand-strong)]"><span className="flex items-center gap-2 text-xs font-bold"><ImagePlus size={18} /> Add more</span></button>
        </div>
      )}
    </div>
  );
}

export default function NewPropertyPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAi, setShowAi] = useState(false);
  const [form, setForm] = useState<PropertyForm>({
    title: '',
    property_type: 'APARTMENT',
    price: '',
    bhk: '2',
    square_feet: '',
    area: '',
    city: 'Pune',
    location_address: '',
    description: '',
    amenities: [],
    images: [],
  });

  const update = <Key extends keyof PropertyForm>(key: Key, value: PropertyForm[Key]) => setForm((current) => ({ ...current, [key]: value }));
  const residential = form.property_type === 'APARTMENT' || form.property_type === 'VILLA';

  const validateStep = () => {
    if (step === 1 && (!form.title.trim() || Number(form.price) <= 0)) return 'Add a clear title and asking price to continue.';
    if (step === 2 && (!form.area.trim() || !form.city.trim() || form.description.trim().length < 20)) return 'Add the locality, city and a description of at least 20 characters.';
    return null;
  };

  const continueForward = () => {
    const message = validateStep();
    setError(message);
    if (!message) setStep((current) => Math.min(3, current + 1));
  };

  const toggleAmenity = (amenity: string) => update('amenities', form.amenities.includes(amenity) ? form.amenities.filter((item) => item !== amenity) : [...form.amenities, amenity]);

  const publish = async () => {
    setError(null);
    const validation = validateStep();
    if (validation) { setError(validation); return; }
    setSubmitting(true);
    let propertyId: string | null = null;
    let uploadFailures = 0;
    try {
      const property = await fetchApi<CreatedProperty>('/properties/', {
        method: 'POST',
        body: JSON.stringify({
          title: form.title.trim(),
          property_type: form.property_type,
          status: 'AVAILABLE',
          price: Number(form.price.replace(/,/g, '')),
          bhk: residential && form.bhk ? Number.parseInt(form.bhk, 10) : null,
          square_feet: form.square_feet ? Number(form.square_feet) : null,
          area: form.area.trim(),
          city: form.city.trim(),
          location_address: form.location_address.trim() || null,
          description: form.description.trim(),
          amenities: form.amenities,
        }),
      });
      propertyId = property.id;

      for (let index = 0; index < form.images.length; index += 1) {
        const data = new FormData();
        data.append('images', form.images[index]);
        data.append('display_order', String(index));
        try {
          await fetchApi(`/properties/${property.id}/images/`, { method: 'POST', body: data });
        } catch {
          uploadFailures += 1;
        }
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['properties'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] }),
        queryClient.invalidateQueries({ queryKey: ['onboarding'] }),
      ]);
      const suffix = uploadFailures ? `?published=1&upload_failed=${uploadFailures}` : '?published=1';
      router.push(`/dashboard/properties/${property.id}${suffix}`);
    } catch (caught: unknown) {
      if (propertyId) {
        router.push(`/dashboard/properties/${propertyId}?published=1&upload_failed=${form.images.length}`);
        return;
      }
      setError(caught instanceof Error ? caught.message : 'The listing could not be published. Check your connection and try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl pb-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/dashboard/properties" className="mb-3 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[var(--ui-text-muted)] hover:text-[var(--ui-text)]"><ArrowLeft size={17} /> Listings</Link>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--ui-brand-strong)]">Listing studio</p>
          <h1 className="mt-2 text-2xl font-black tracking-[-0.035em] text-[var(--ui-text)] sm:text-3xl">Create a buyer-ready property page</h1>
          <p className="mt-2 text-sm text-[var(--ui-text-muted)]">Add broker-provided facts once, publish, then share one clean link.</p>
        </div>
        <span className="rounded-full border border-[var(--ui-border)] bg-[var(--ui-surface)] px-3 py-2 text-xs font-bold text-[var(--ui-text-muted)]">Step {step} of 3</span>
      </div>

      <Progress current={step} />

      {error && (
        <div role="alert" className="mt-5 flex items-start gap-3 rounded-xl border border-[color-mix(in_srgb,var(--ui-danger)_24%,var(--ui-border))] bg-[color-mix(in_srgb,var(--ui-danger)_7%,var(--ui-surface))] p-4 text-sm font-medium text-[var(--ui-danger)]"><AlertTriangle className="mt-0.5 shrink-0" size={18} /><span>{error}</span></div>
      )}

      <section className="os-card mt-5 p-5 sm:p-7">
        {step === 1 && (
          <div className="space-y-6">
            <div><p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--ui-brand-strong)]">Essential facts</p><h2 className="mt-2 text-xl font-black text-[var(--ui-text)]">What should buyers understand first?</h2></div>
            <fieldset><legend className="os-input-label mb-3">Property type</legend><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{PROPERTY_TYPES.map(({ value, label, Icon }) => <button key={value} type="button" onClick={() => update('property_type', value)} className={`flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border p-3 text-xs font-bold ${form.property_type === value ? 'border-[var(--ui-brand-strong)] bg-[color-mix(in_srgb,var(--ui-brand)_8%,var(--ui-surface))] text-[var(--ui-brand-strong)]' : 'border-[var(--ui-border)] bg-[var(--ui-surface-muted)] text-[var(--ui-text-muted)]'}`}><Icon size={22} /><span>{label}</span></button>)}</div></fieldset>
            <div><label htmlFor="title" className="os-input-label">Listing title</label><input id="title" value={form.title} onChange={(event) => update('title', event.target.value)} className="os-input" maxLength={120} placeholder="Sunlit 3 BHK near Balewadi High Street" /><p className="mt-2 text-xs text-[var(--ui-text-muted)]">Use the strongest real fact. Avoid all-caps and generic “premium property” wording.</p></div>
            <div className="grid gap-5 sm:grid-cols-2"><div><label htmlFor="price" className="os-input-label">Asking price in rupees</label><input id="price" type="number" inputMode="decimal" min="1" value={form.price} onChange={(event) => update('price', event.target.value)} className="os-input" placeholder="16500000" /><p className="mt-2 text-xs font-bold text-[var(--ui-success)]">{formatPrice(form.price)}</p></div><div><label htmlFor="square-feet" className="os-input-label">Carpet or usable area (ft²)</label><input id="square-feet" type="number" inputMode="decimal" min="1" value={form.square_feet} onChange={(event) => update('square_feet', event.target.value)} className="os-input" placeholder="1460" /></div></div>
            {residential && <fieldset><legend className="os-input-label mb-3">Configuration</legend><div className="flex flex-wrap gap-2">{['1', '2', '3', '4', '5', '6'].map((option) => <button key={option} type="button" onClick={() => update('bhk', option)} className={`min-h-11 rounded-xl border px-4 text-sm font-bold ${form.bhk === option ? 'border-[var(--ui-brand-strong)] bg-[var(--ui-brand)] text-[var(--ui-brand-ink)]' : 'border-[var(--ui-border)] text-[var(--ui-text-muted)]'}`}>{option} BHK</button>)}</div></fieldset>}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div><p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--ui-brand-strong)]">Location and story</p><h2 className="mt-2 text-xl font-black text-[var(--ui-text)]">Give buyers enough context to respond</h2></div>
            <div className="grid gap-5 sm:grid-cols-2"><div><label htmlFor="area" className="os-input-label">Locality</label><input id="area" value={form.area} onChange={(event) => update('area', event.target.value)} className="os-input" placeholder="Baner" /></div><div><label htmlFor="city" className="os-input-label">City</label><input id="city" value={form.city} onChange={(event) => update('city', event.target.value)} className="os-input" placeholder="Pune" /></div></div>
            <div><label htmlFor="address" className="os-input-label">Exact address for your private record</label><div className="relative"><MapPin className="absolute left-4 top-4 text-[var(--ui-text-muted)]" size={17} /><input id="address" value={form.location_address} onChange={(event) => update('location_address', event.target.value)} className="os-input pl-11" placeholder="Building, road or landmark (optional)" /></div><p className="mt-2 flex items-start gap-2 text-xs leading-5 text-[var(--ui-text-muted)]"><ShieldCheck className="mt-0.5 shrink-0 text-[var(--ui-success)]" size={15} />Public pages show only locality and city. You decide when to share exact directions.</p></div>
            <div><div className="mb-2 flex flex-wrap items-center justify-between gap-3"><label htmlFor="description" className="os-input-label mb-0">Property description</label><button type="button" onClick={() => setShowAi(true)} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-xs font-black text-[var(--ui-brand-strong)] hover:bg-[var(--ui-surface-muted)]"><Sparkles size={16} /> Help me write</button></div><textarea id="description" value={form.description} onChange={(event) => update('description', event.target.value)} className="os-input min-h-40 resize-y leading-7" placeholder="Describe the layout, condition, view, key convenience and who this property suits. Keep every claim factual." /><p className={`mt-2 text-right text-xs font-bold ${form.description.trim().length >= 20 ? 'text-[var(--ui-success)]' : 'text-[var(--ui-text-muted)]'}`}>{form.description.trim().length}/20 minimum</p></div>
            <fieldset><legend className="os-input-label mb-3">Amenities provided by broker</legend><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{AMENITIES.map(({ value, label, Icon }) => { const selected = form.amenities.includes(value); return <button key={value} type="button" onClick={() => toggleAmenity(value)} className={`flex min-h-12 items-center gap-2 rounded-xl border px-3 text-left text-xs font-bold ${selected ? 'border-[var(--ui-brand-strong)] bg-[color-mix(in_srgb,var(--ui-brand)_8%,var(--ui-surface))] text-[var(--ui-brand-strong)]' : 'border-[var(--ui-border)] text-[var(--ui-text-muted)]'}`}><Icon size={17} />{label}{selected && <Check className="ml-auto" size={15} />}</button>; })}</div></fieldset>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-7">
            <div><p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--ui-brand-strong)]">Photos and publish</p><h2 className="mt-2 text-xl font-black text-[var(--ui-text)]">Finish the page buyers will receive</h2><p className="mt-2 text-sm text-[var(--ui-text-muted)]">Photos are optional, but three or more make the first share much more useful.</p></div>
            <PhotoPicker files={form.images} onChange={(files) => update('images', files)} onError={(message) => setError(message || null)} />
            <div className="rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface-muted)] p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ui-text-muted)]">Ready to publish</p><h3 className="mt-2 text-lg font-black text-[var(--ui-text)]">{form.title || 'Your property title'}</h3><p className="mt-1 text-sm text-[var(--ui-text-muted)]">{[form.area, form.city].filter(Boolean).join(', ') || 'Locality and city'}</p></div><strong className="text-xl font-black text-[var(--ui-text)]">{formatPrice(form.price)}</strong></div><div className="mt-5 flex flex-wrap gap-2 text-xs font-bold text-[var(--ui-text-muted)]"><span className="rounded-full bg-[var(--ui-surface)] px-3 py-2">{PROPERTY_TYPES.find((item) => item.value === form.property_type)?.label}</span>{residential && <span className="rounded-full bg-[var(--ui-surface)] px-3 py-2">{form.bhk} BHK</span>}<span className="rounded-full bg-[var(--ui-surface)] px-3 py-2">{form.images.length} photos</span></div></div>
          </div>
        )}
      </section>

      <div className="sticky bottom-20 z-20 mt-5 flex items-center justify-between gap-3 rounded-2xl border border-[var(--ui-border)] bg-[color-mix(in_srgb,var(--ui-surface-raised)_94%,transparent)] p-3 shadow-[var(--ui-shadow)] backdrop-blur-xl lg:bottom-4">
        <button type="button" onClick={() => step === 1 ? router.push('/dashboard/properties') : setStep((current) => current - 1)} disabled={submitting} className="os-btn-ghost px-4"><ArrowLeft size={17} /><span className="hidden sm:inline">{step === 1 ? 'Cancel' : 'Back'}</span></button>
        {step < 3 ? <button type="button" onClick={continueForward} className="os-btn-primary min-w-32">Continue <ArrowRight size={17} /></button> : <button type="button" onClick={publish} disabled={submitting} className="os-btn-primary min-w-44 disabled:cursor-wait disabled:opacity-60">{submitting ? <><LoaderCircle className="animate-spin" size={18} />Publishing…</> : <><Check size={18} />Publish listing</>}</button>}
      </div>

      {showAi && <AIAssistantModal propertyType={form.property_type} price={form.price} bhk={form.bhk} area={form.area} city={form.city} onApplyTitle={(title) => update('title', title)} onApplyDescription={(description) => update('description', description)} onClose={() => setShowAi(false)} />}
    </div>
  );
}
