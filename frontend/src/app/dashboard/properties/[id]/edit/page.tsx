'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { fetchApi } from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────
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
  location_address?: string;
  bhk: number | null;
  square_feet: number | null;
  amenities: string[];
  images: PropertyImage[];
  created_at: string;
}

interface EditForm {
  title: string;
  property_type: string;
  status: string;
  price: string;
  bhk: string;
  square_feet: string;
  address: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  description: string;
  amenities: string[];
}

// ─── Constants (mirrors create form) ─────────────────────────────────────────
const PROPERTY_TYPES = [
  { value: 'APARTMENT', label: 'Apartment', icon: '🏢' },
  { value: 'VILLA',     label: 'Villa',     icon: '🏡' },
  { value: 'PLOT',      label: 'Plot',      icon: '🌿' },
  { value: 'COMMERCIAL',label: 'Commercial',icon: '🏬' },
];

const STATUSES = [
  { value: 'AVAILABLE',   label: 'Available',   color: '#16c784' },
  { value: 'SITE_VISIT',  label: 'Site Visit',  color: '#38bdf8' },
  { value: 'NEGOTIATION', label: 'Negotiation', color: '#f59e0b' },
  { value: 'BOOKED',      label: 'Booked',      color: '#818cf8' },
  { value: 'SOLD',        label: 'Sold',        color: '#f43f5e' },
  { value: 'EXPIRED',     label: 'Expired',     color: '#4a5470' },
];

const BHK_OPTIONS = ['1', '2', '3', '4', '5', '6+'];

const AMENITIES = [
  { id: 'gym',          label: 'Gym',            icon: '🏋️' },
  { id: 'pool',         label: 'Swimming Pool',  icon: '🏊' },
  { id: 'parking',      label: 'Car Parking',    icon: '🚗' },
  { id: 'security',     label: '24/7 Security',  icon: '🔒' },
  { id: 'clubhouse',    label: 'Club House',     icon: '🏛️' },
  { id: 'garden',       label: 'Garden',         icon: '🌳' },
  { id: 'lift',         label: 'Lift/Elevator',  icon: '🛗' },
  { id: 'power_backup', label: 'Power Backup',   icon: '⚡' },
  { id: 'wifi',         label: 'High-Speed WiFi',icon: '📶' },
  { id: 'cctv',         label: 'CCTV',           icon: '📷' },
  { id: 'intercom',     label: 'Intercom',       icon: '📟' },
  { id: 'fire_safety',  label: 'Fire Safety',    icon: '🔥' },
];

const WIZARD_STEPS = [
  { id: 1, label: 'Basics',   icon: '⊕' },
  { id: 2, label: 'Location', icon: '📍' },
  { id: 3, label: 'Details',  icon: '✍' },
  { id: 4, label: 'Photos',   icon: '📷' },
];

// ─── Wizard progress ──────────────────────────────────────────────────────────
function WizardProgress({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {WIZARD_STEPS.map((step, idx) => {
        const done = currentStep > step.id;
        const active = currentStep === step.id;
        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                done    ? 'bg-[#16c784] text-[#07090f]' :
                active  ? 'bg-[#0d1117] border-2 border-[#16c784] text-[#16c784]' :
                          'bg-[#0d1117] border border-[rgba(255,255,255,0.06)] text-[#4a5470]'
              }`}>
                {done ? '✓' : step.icon}
              </div>
              <span className={`hidden sm:block text-[10px] font-semibold mt-1.5 transition-colors duration-200 ${
                active ? 'text-[#16c784]' : done ? 'text-[#8892aa]' : 'text-[#4a5470]'
              }`}>{step.label}</span>
            </div>
            {idx < WIZARD_STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 rounded-full transition-colors duration-300 ${
                currentStep > step.id ? 'bg-[#16c784]' : 'bg-[rgba(255,255,255,0.06)]'
              }`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Existing image strip (with delete) ──────────────────────────────────────
function ExistingImages({
  images,
  onDelete,
  deletingId,
}: {
  images: PropertyImage[];
  onDelete: (imgId: string) => void;
  deletingId: string | null;
}) {
  if (!images.length) return null;
  const sorted = [...images].sort((a, b) => a.display_order - b.display_order);
  return (
    <div>
      <p className="text-xs font-semibold text-[#8892aa] mb-2">Current photos</p>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {sorted.map((img, idx) => (
          <div key={img.id} className="relative group aspect-square rounded-xl overflow-hidden bg-[#0d1117]">
            <img src={img.thumbnail_url || img.url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
            {idx === 0 && (
              <div className="absolute top-1.5 left-1.5 bg-[#16c784] text-[#07090f] text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                Cover
              </div>
            )}
            <button
              type="button"
              onClick={() => onDelete(img.id)}
              disabled={deletingId === img.id}
              className="absolute top-1.5 right-1.5 w-6 h-6 bg-[#07090f]/80 rounded-full flex items-center justify-center text-[#8892aa] hover:text-[#f43f5e] text-xs transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
            >
              {deletingId === img.id
                ? <span className="w-3 h-3 border border-[#f43f5e]/40 border-t-[#f43f5e] rounded-full animate-spin" />
                : '✕'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── New image dropzone ───────────────────────────────────────────────────────
function NewImageDropzone({
  files, onAdd, onRemove,
}: { files: File[]; onAdd: (f: File[]) => void; onRemove: (i: number) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const dropped = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (dropped.length) onAdd(dropped);
  };
  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sel = Array.from(e.target.files ?? []).filter(f => f.type.startsWith('image/'));
    if (sel.length) onAdd(sel);
    if (inputRef.current) inputRef.current.value = '';
  };

  const previews = files.map(f => URL.createObjectURL(f));
  return (
    <div className="space-y-3">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-200 ${
          dragging
            ? 'border-[#16c784] bg-[#16c784]/8 scale-[1.01]'
            : 'border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)] hover:border-[rgba(255,255,255,0.2)]'
        }`}
      >
        <div className="w-10 h-10 rounded-xl bg-[#0d1117] border border-[rgba(255,255,255,0.06)] flex items-center justify-center text-xl">📷</div>
        <div className="text-center">
          <p className="text-sm font-semibold text-[#f0f4ff]">Add more photos</p>
          <p className="text-xs text-[#4a5470] mt-0.5">or click to browse</p>
        </div>
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleInput} />
      </div>

      {previews.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {previews.map((src, idx) => (
            <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden bg-[#0d1117]">
              <img src={src} alt={`new ${idx + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => onRemove(idx)}
                className="absolute top-1.5 right-1.5 w-6 h-6 bg-[#07090f]/80 rounded-full flex items-center justify-center text-[#8892aa] hover:text-[#f43f5e] text-xs opacity-0 group-hover:opacity-100 transition-all"
              >✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────
function EditSkeleton() {
  return (
    <div className="max-w-2xl mx-auto space-y-6 os-fade-in">
      <div className="os-skeleton h-5 w-28 rounded-lg" />
      <div className="os-skeleton h-8 w-56 rounded-xl" />
      <div className="flex gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="os-skeleton h-9 flex-1 rounded-xl" />)}
      </div>
      <div className="os-skeleton h-64 rounded-2xl" />
    </div>
  );
}

// ─── Main Edit Page ───────────────────────────────────────────────────────────
export default function EditPropertyPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<PropertyImage[]>([]);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const [form, setForm] = useState<EditForm>({
    title: '', property_type: 'APARTMENT', status: 'AVAILABLE',
    price: '', bhk: '2', square_feet: '',
    address: '', area: '', city: '', state: '', pincode: '',
    description: '', amenities: [],
  });

  const { data: property, isLoading } = useQuery<Property>({
    queryKey: ['property', id],
    queryFn: () => fetchApi(`/properties/${id}/`),
    enabled: !!id,
  });

  // Pre-populate form when data arrives
  useEffect(() => {
    if (property && !initialized) {
      setForm({
        title: property.title ?? '',
        property_type: property.property_type ?? 'APARTMENT',
        status: property.status ?? 'AVAILABLE',
        price: property.price ? String(property.price) : '',
        bhk: property.bhk ? String(property.bhk) : '2',
        square_feet: property.square_feet ? String(property.square_feet) : '',
        address: property.location_address ?? '',
        area: property.area ?? '',
        city: property.city ?? '',
        state: '',
        pincode: '',
        description: property.description ?? '',
        amenities: property.amenities ?? [],
      });
      setExistingImages(property.images ?? []);
      setInitialized(true);
    }
  }, [property, initialized]);

  const updateField = useCallback(<K extends keyof EditForm>(key: K, value: EditForm[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const toggleAmenity = (amenityId: string) => {
    setForm(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenityId)
        ? prev.amenities.filter(a => a !== amenityId)
        : [...prev.amenities, amenityId],
    }));
  };

  const canAdvance = () => {
    if (step === 1) return !!(form.title && form.price && form.property_type);
    if (step === 2) return !!(form.area && form.city);
    if (step === 3) return form.description.length >= 20;
    return true;
  };

  // ── Delete existing image ──
  const handleDeleteImage = async (imgId: string) => {
    setDeletingImageId(imgId);
    try {
      await fetchApi(`/properties/${id}/images/${imgId}/`, { method: 'DELETE' });
      setExistingImages(prev => prev.filter(img => img.id !== imgId));
      toast.success('Photo removed');
    } catch { toast.error('Failed to remove photo'); }
    finally { setDeletingImageId(null); }
  };

  // ── Save ──
  const handleSave = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const payload: Record<string, unknown> = {
        title: form.title,
        property_type: form.property_type,
        status: form.status,
        price: parseFloat(form.price.replace(/,/g, '')),
        bhk: form.bhk ? parseInt(form.bhk) : null,
        square_feet: form.square_feet ? parseFloat(form.square_feet) : null,
        location_address: form.address,
        area: form.area,
        city: form.city,
        description: form.description,
        amenities: form.amenities,
      };
      if (form.state) payload.state = form.state;

      await fetchApi(`/properties/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      // Upload new images if any
      for (let i = 0; i < newImages.length; i++) {
        const fd = new FormData();
        fd.append('images', newImages[i]);
        fd.append('display_order', String(existingImages.length + i));
        await fetchApi(`/properties/${id}/images/`, { method: 'POST', body: fd });
      }

      queryClient.invalidateQueries({ queryKey: ['property', id] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      toast.success('Listing updated!');
      router.push(`/dashboard/properties/${id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setSubmitError(msg);
      setIsSubmitting(false);
    }
  };

  if (isLoading || !initialized) return <EditSkeleton />;

  return (
    <div className="max-w-2xl mx-auto os-fade-in">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => step > 1 ? setStep(s => s - 1) : router.push(`/dashboard/properties/${id}`)}
          className="flex items-center gap-1.5 text-xs text-[#4a5470] hover:text-[#8892aa] transition-colors mb-4"
        >
          ← {step > 1 ? 'Back' : 'Cancel'}
        </button>
        <h1 className="text-2xl font-bold tracking-tight text-[#f0f4ff]">Edit Listing</h1>
        <p className="text-sm text-[#4a5470] mt-1">
          Step {step} of {WIZARD_STEPS.length} — {WIZARD_STEPS[step - 1].label}
        </p>
      </div>

      <WizardProgress currentStep={step} />

      {/* Step panels */}
      <div className="os-card p-6 os-fade-in" key={step}>

        {/* ── STEP 1: Basics ── */}
        {step === 1 && (
          <div className="space-y-6">
            {/* Type */}
            <div>
              <label className="os-input-label mb-3 block">Property Type</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PROPERTY_TYPES.map(type => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => updateField('property_type', type.value)}
                    className={`flex flex-col items-center gap-2 p-3.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                      form.property_type === type.value
                        ? 'bg-[#16c784]/10 border-[#16c784]/40 text-[#16c784]'
                        : 'bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.06)] text-[#8892aa] hover:border-[rgba(255,255,255,0.12)] hover:text-[#f0f4ff]'
                    }`}
                  >
                    <span className="text-xl">{type.icon}</span>
                    <span>{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label htmlFor="edit-title" className="os-input-label">Listing Title *</label>
              <input
                id="edit-title"
                type="text"
                value={form.title}
                onChange={e => updateField('title', e.target.value)}
                className="os-input"
                maxLength={120}
              />
              <div className="text-[10px] text-[#4a5470] mt-1.5 text-right">{form.title.length}/120</div>
            </div>

            {/* Price + Sqft */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="edit-price" className="os-input-label">Price (₹) *</label>
                <input
                  id="edit-price"
                  type="number"
                  value={form.price}
                  onChange={e => updateField('price', e.target.value)}
                  className="os-input"
                  min="0"
                />
                {form.price && parseFloat(form.price) > 0 && (
                  <p className="text-[11px] text-[#16c784] mt-1 font-medium">
                    {parseFloat(form.price) >= 10_000_000
                      ? `₹${(parseFloat(form.price) / 10_000_000).toFixed(2)} Cr`
                      : parseFloat(form.price) >= 100_000
                        ? `₹${(parseFloat(form.price) / 100_000).toFixed(2)} L`
                        : `₹${parseFloat(form.price).toLocaleString()}`}
                  </p>
                )}
              </div>
              <div>
                <label className="os-input-label">Square Feet</label>
                <input
                  type="number"
                  value={form.square_feet}
                  onChange={e => updateField('square_feet', e.target.value)}
                  className="os-input"
                  min="0"
                />
              </div>
            </div>

            {/* BHK */}
            {['APARTMENT', 'VILLA'].includes(form.property_type) && (
              <div>
                <label className="os-input-label mb-2 block">BHK Configuration</label>
                <div className="flex flex-wrap gap-2">
                  {BHK_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => updateField('bhk', opt)}
                      className={`h-9 px-4 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        form.bhk === opt
                          ? 'bg-[#16c784]/10 border-[#16c784]/40 text-[#16c784]'
                          : 'bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.06)] text-[#8892aa] hover:border-[rgba(255,255,255,0.12)]'
                      }`}
                    >{opt} BHK</button>
                  ))}
                </div>
              </div>
            )}

            {/* Status */}
            <div>
              <label className="os-input-label mb-2 block">Listing Status</label>
              <div className="flex flex-wrap gap-2">
                {STATUSES.map(s => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => updateField('status', s.value)}
                    className={`h-9 px-4 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      form.status === s.value
                        ? 'text-[#07090f] border-transparent'
                        : 'bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.06)] text-[#8892aa] hover:border-[rgba(255,255,255,0.12)]'
                    }`}
                    style={form.status === s.value ? { background: s.color } : {}}
                  >{s.label}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Location ── */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <label htmlFor="edit-address" className="os-input-label">Street Address</label>
              <input
                id="edit-address"
                type="text"
                value={form.address}
                onChange={e => updateField('address', e.target.value)}
                className="os-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="edit-area" className="os-input-label">Area / Locality *</label>
                <input id="edit-area" type="text" value={form.area} onChange={e => updateField('area', e.target.value)} className="os-input" />
              </div>
              <div>
                <label htmlFor="edit-city" className="os-input-label">City *</label>
                <input id="edit-city" type="text" value={form.city} onChange={e => updateField('city', e.target.value)} className="os-input" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="edit-state" className="os-input-label">State</label>
                <input id="edit-state" type="text" value={form.state} onChange={e => updateField('state', e.target.value)} className="os-input" />
              </div>
              <div>
                <label htmlFor="edit-pincode" className="os-input-label">Pincode</label>
                <input id="edit-pincode" type="text" value={form.pincode} onChange={e => updateField('pincode', e.target.value)} className="os-input" maxLength={6} />
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: Details ── */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <label htmlFor="edit-description" className="os-input-label">Description *</label>
              <textarea
                id="edit-description"
                value={form.description}
                onChange={e => updateField('description', e.target.value)}
                className="os-input min-h-[140px] resize-y leading-relaxed"
                minLength={20}
              />
              <div className={`text-[10px] mt-1.5 text-right ${form.description.length >= 20 ? 'text-[#16c784]' : 'text-[#4a5470]'}`}>
                {form.description.length} chars {form.description.length < 20 ? `(${20 - form.description.length} more required)` : '✓'}
              </div>
            </div>

            <div>
              <label className="os-input-label mb-3 block">Amenities</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {AMENITIES.map(a => {
                  const selected = form.amenities.includes(a.id);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => toggleAmenity(a.id)}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium border transition-all cursor-pointer text-left ${
                        selected
                          ? 'bg-[#16c784]/10 border-[#16c784]/30 text-[#16c784]'
                          : 'bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.06)] text-[#8892aa] hover:border-[rgba(255,255,255,0.12)] hover:text-[#f0f4ff]'
                      }`}
                    >
                      <span className="text-sm">{a.icon}</span>
                      <span className="truncate">{a.label}</span>
                      {selected && <span className="ml-auto text-[10px]">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 4: Photos ── */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <p className="text-sm text-[#f0f4ff] font-semibold mb-1">Manage Photos</p>
              <p className="text-xs text-[#4a5470]">Remove existing photos or add new ones. The first photo is your cover image.</p>
            </div>

            {/* Existing images */}
            <ExistingImages
              images={existingImages}
              onDelete={handleDeleteImage}
              deletingId={deletingImageId}
            />

            {/* New image uploader */}
            <NewImageDropzone
              files={newImages}
              onAdd={files => setNewImages(prev => [...prev, ...files])}
              onRemove={idx => setNewImages(prev => prev.filter((_, i) => i !== idx))}
            />

            <p className="text-[10px] text-[#4a5470]">
              {existingImages.length} existing · {newImages.length} new to upload
            </p>

            {/* Error */}
            {submitError && (
              <div className="flex items-start gap-2.5 p-3.5 bg-[rgba(244,63,94,0.08)] border border-[rgba(244,63,94,0.2)] rounded-xl">
                <span className="text-base">⚠️</span>
                <p className="text-xs text-[#f43f5e] leading-relaxed">{submitError}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer nav */}
      <div className="flex items-center justify-between mt-6">
        <button
          type="button"
          onClick={() => step > 1 ? setStep(s => s - 1) : router.push(`/dashboard/properties/${id}`)}
          className="os-btn-ghost text-sm"
        >
          {step > 1 ? '← Back' : 'Cancel'}
        </button>

        <div className="flex items-center gap-2">
          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep(s => s + 1)}
              disabled={!canAdvance()}
              className="os-btn-primary disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none text-sm"
            >
              Continue →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting}
              className="os-btn-primary text-sm min-w-[140px]"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-[#07090f]/30 border-t-[#07090f] rounded-full animate-spin" />
                  Saving…
                </span>
              ) : '💾 Save Changes'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
