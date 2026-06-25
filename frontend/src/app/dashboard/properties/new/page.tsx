'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '@/lib/api';

// ─── Types ──────────────────────────────────────────────────────
interface PropertyFormData {
  // Step 1: Property basics
  title: string;
  property_type: string;
  status: string;
  price: string;
  bhk: string;
  square_feet: string;
  
  // Step 2: Location
  address: string;
  area: string;
  city: string;
  state: string;
  pincode: string;

  // Step 3: Details
  description: string;
  amenities: string[];

  // Step 4: Media (handled separately)
  images: File[];
}

// ─── Constants ──────────────────────────────────────────────────
const PROPERTY_TYPES = [
  { value: 'APARTMENT', label: 'Apartment', icon: '🏢' },
  { value: 'VILLA',     label: 'Villa',     icon: '🏡' },
  { value: 'PLOT',      label: 'Plot',      icon: '🌿' },
  { value: 'COMMERCIAL',label: 'Commercial',icon: '🏬' },
];

const STATUSES = [
  { value: 'AVAILABLE',   label: 'Available',   color: '#16c784' },
  { value: 'NEGOTIATION', label: 'Negotiation', color: '#f59e0b' },
  { value: 'SITE_VISIT',  label: 'Site Visit',  color: '#38bdf8' },
  { value: 'BOOKED',      label: 'Booked',      color: '#818cf8' },
];

const BHK_OPTIONS = ['1', '2', '3', '4', '5', '6+'];

const AMENITIES = [
  { id: 'gym',         label: 'Gym',           icon: '🏋️' },
  { id: 'pool',        label: 'Swimming Pool',  icon: '🏊' },
  { id: 'parking',     label: 'Car Parking',    icon: '🚗' },
  { id: 'security',    label: '24/7 Security',  icon: '🔒' },
  { id: 'clubhouse',   label: 'Club House',     icon: '🏛️' },
  { id: 'garden',      label: 'Garden',         icon: '🌳' },
  { id: 'lift',        label: 'Lift/Elevator',  icon: '🛗' },
  { id: 'power_backup',label: 'Power Backup',   icon: '⚡' },
  { id: 'wifi',        label: 'High-Speed WiFi',icon: '📶' },
  { id: 'cctv',        label: 'CCTV',           icon: '📷' },
  { id: 'intercom',    label: 'Intercom',       icon: '📟' },
  { id: 'fire_safety', label: 'Fire Safety',    icon: '🔥' },
];

const WIZARD_STEPS = [
  { id: 1, label: 'Basics',   icon: '⊕' },
  { id: 2, label: 'Location', icon: '📍' },
  { id: 3, label: 'Details',  icon: '✍' },
  { id: 4, label: 'Photos',   icon: '📷' },
];

// ─── Step progress indicator ────────────────────────────────────
function WizardProgress({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {WIZARD_STEPS.map((step, idx) => {
        const isCompleted = currentStep > step.id;
        const isCurrent   = currentStep === step.id;
        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center">
              <div
                className={`
                  w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold
                  transition-all duration-300
                  ${isCompleted
                    ? 'bg-[#16c784] text-[#07090f]'
                    : isCurrent
                      ? 'bg-[#0d1117] border-2 border-[#16c784] text-[#16c784]'
                      : 'bg-[#0d1117] border border-[rgba(255,255,255,0.06)] text-[#4a5470]'
                  }
                `}
              >
                {isCompleted ? '✓' : step.icon}
              </div>
              <span
                className={`hidden sm:block text-[10px] font-semibold mt-1.5 transition-colors duration-200 ${
                  isCurrent ? 'text-[#16c784]' : isCompleted ? 'text-[#8892aa]' : 'text-[#4a5470]'
                }`}
              >
                {step.label}
              </span>
            </div>
            {idx < WIZARD_STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 rounded-full transition-colors duration-300 ${
                  currentStep > step.id ? 'bg-[#16c784]' : 'bg-[rgba(255,255,255,0.06)]'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Image dropzone ─────────────────────────────────────────────
function ImageDropzone({
  files,
  onAdd,
  onRemove,
}: {
  files: File[];
  onAdd: (files: File[]) => void;
  onRemove: (index: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (dropped.length > 0) onAdd(dropped);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []).filter(f => f.type.startsWith('image/'));
    if (selected.length > 0) onAdd(selected);
    if (inputRef.current) inputRef.current.value = '';
  };

  const previews = files.map(f => URL.createObjectURL(f));

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`
          relative flex flex-col items-center justify-center gap-3 p-10
          border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-200
          ${dragging
            ? 'border-[#16c784] bg-[#16c784]/8 scale-[1.01]'
            : 'border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)] hover:border-[rgba(255,255,255,0.2)] hover:bg-[rgba(255,255,255,0.03)]'
          }
        `}
      >
        <div className="w-12 h-12 rounded-2xl bg-[#0d1117] border border-[rgba(255,255,255,0.06)] flex items-center justify-center text-2xl">
          📷
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-[#f0f4ff]">Drop photos here</p>
          <p className="text-xs text-[#4a5470] mt-1">or click to browse • JPG, PNG, WebP up to 10MB each</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileInput}
        />
      </div>

      {/* Preview grid */}
      {previews.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {previews.map((src, idx) => (
            <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden bg-[#0d1117]">
              <img src={src} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
              {idx === 0 && (
                <div className="absolute top-1.5 left-1.5 bg-[#16c784] text-[#07090f] text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                  Cover
                </div>
              )}
              <button
                type="button"
                onClick={() => onRemove(idx)}
                className="absolute top-1.5 right-1.5 w-6 h-6 bg-[#07090f]/80 rounded-full flex items-center justify-center text-[#8892aa] hover:text-[#f43f5e] text-xs transition-all opacity-0 group-hover:opacity-100"
              >
                ✕
              </button>
            </div>
          ))}
          {/* Add more */}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="aspect-square rounded-xl border-2 border-dashed border-[rgba(255,255,255,0.08)] flex items-center justify-center text-[#4a5470] hover:text-[#8892aa] hover:border-[rgba(255,255,255,0.14)] transition-all text-xl"
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main wizard ─────────────────────────────────────────────────
export default function NewPropertyPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [form, setForm] = useState<PropertyFormData>({
    title: '',
    property_type: 'APARTMENT',
    status: 'AVAILABLE',
    price: '',
    bhk: '2',
    square_feet: '',
    address: '',
    area: '',
    city: '',
    state: '',
    pincode: '',
    description: '',
    amenities: [],
    images: [],
  });

  const updateField = useCallback(<K extends keyof PropertyFormData>(key: K, value: PropertyFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const toggleAmenity = (id: string) => {
    setForm(prev => ({
      ...prev,
      amenities: prev.amenities.includes(id)
        ? prev.amenities.filter(a => a !== id)
        : [...prev.amenities, id],
    }));
  };

  // ── Validation per step ──
  const canAdvance = (): boolean => {
    if (step === 1) return !!(form.title && form.price && form.property_type);
    if (step === 2) return !!(form.area && form.city);
    if (step === 3) return form.description.length >= 20;
    return true;
  };

  // ── Submit ──
  const handleSubmit = async () => {
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
        address: form.address,
        area: form.area,
        city: form.city,
        state: form.state,
        pincode: form.pincode,
        description: form.description,
        amenities: form.amenities,
      };

      const property = await fetchApi('/properties/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // Upload images sequentially
      if (form.images.length > 0) {
        for (let i = 0; i < form.images.length; i++) {
          const fd = new FormData();
          fd.append('images', form.images[i]);
          fd.append('display_order', String(i));
          await fetchApi(`/properties/${property.id}/images/`, {
            method: 'POST',
            body: fd,
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });

      // Redirect to dashboard with success
      router.push('/dashboard?created=1');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setSubmitError(message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto os-fade-in">
      {/* Page header */}
      <div className="mb-8">
        <button
          onClick={() => step > 1 ? setStep(s => s - 1) : router.push('/dashboard')}
          className="flex items-center gap-1.5 text-xs text-[#4a5470] hover:text-[#8892aa] transition-colors mb-4"
        >
          ← {step > 1 ? 'Back' : 'Dashboard'}
        </button>
        <h1 className="text-2xl font-bold tracking-tight text-[#f0f4ff]">New Listing</h1>
        <p className="text-sm text-[#4a5470] mt-1">
          Step {step} of {WIZARD_STEPS.length} — {WIZARD_STEPS[step - 1].label}
        </p>
      </div>

      {/* Progress */}
      <WizardProgress currentStep={step} totalSteps={WIZARD_STEPS.length} />

      {/* Step panels */}
      <div className="os-card p-6 os-fade-in" key={step}>
        {/* ── STEP 1: Basics ──────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-6">
            {/* Type selector */}
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
              <label htmlFor="title" className="os-input-label">Listing Title *</label>
              <input
                id="title"
                type="text"
                placeholder="e.g. Spacious 3BHK with Sea View in Bandra"
                value={form.title}
                onChange={e => updateField('title', e.target.value)}
                className="os-input"
                maxLength={120}
              />
              <div className="text-[10px] text-[#4a5470] mt-1.5 text-right">{form.title.length}/120</div>
            </div>

            {/* Price + BHK row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="price" className="os-input-label">Price (₹) *</label>
                <input
                  id="price"
                  type="number"
                  placeholder="5000000"
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
                  placeholder="1200"
                  value={form.square_feet}
                  onChange={e => updateField('square_feet', e.target.value)}
                  className="os-input"
                  min="0"
                />
              </div>
            </div>

            {/* BHK chips (only for residential) */}
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
                    >
                      {opt} BHK
                    </button>
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
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Location ─────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <label htmlFor="address" className="os-input-label">Street Address</label>
              <input
                id="address"
                type="text"
                placeholder="Flat 12, Sea Pearl, Versova Road"
                value={form.address}
                onChange={e => updateField('address', e.target.value)}
                className="os-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="area" className="os-input-label">Area / Locality *</label>
                <input
                  id="area"
                  type="text"
                  placeholder="Bandra West"
                  value={form.area}
                  onChange={e => updateField('area', e.target.value)}
                  className="os-input"
                />
              </div>
              <div>
                <label htmlFor="city" className="os-input-label">City *</label>
                <input
                  id="city"
                  type="text"
                  placeholder="Mumbai"
                  value={form.city}
                  onChange={e => updateField('city', e.target.value)}
                  className="os-input"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="state" className="os-input-label">State</label>
                <input
                  id="state"
                  type="text"
                  placeholder="Maharashtra"
                  value={form.state}
                  onChange={e => updateField('state', e.target.value)}
                  className="os-input"
                />
              </div>
              <div>
                <label htmlFor="pincode" className="os-input-label">Pincode</label>
                <input
                  id="pincode"
                  type="text"
                  placeholder="400050"
                  value={form.pincode}
                  onChange={e => updateField('pincode', e.target.value)}
                  className="os-input"
                  maxLength={6}
                />
              </div>
            </div>

            {/* Map placeholder */}
            <div className="h-28 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] flex items-center justify-center gap-2 text-[#4a5470]">
              <span className="text-lg">🗺️</span>
              <span className="text-xs">Map preview will appear after publishing</span>
            </div>
          </div>
        )}

        {/* ── STEP 3: Details ───────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <label htmlFor="description" className="os-input-label">Description *</label>
              <textarea
                id="description"
                placeholder="Describe the property — mention highlights, unique features, nearby landmarks, and what makes this a great investment or home…"
                value={form.description}
                onChange={e => updateField('description', e.target.value)}
                className="os-input min-h-[140px] resize-y leading-relaxed"
                minLength={20}
              />
              <div className={`text-[10px] mt-1.5 text-right ${form.description.length >= 20 ? 'text-[#16c784]' : 'text-[#4a5470]'}`}>
                {form.description.length} chars {form.description.length < 20 ? `(${20 - form.description.length} more required)` : '✓'}
              </div>
            </div>

            {/* Amenities */}
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

        {/* ── STEP 4: Photos ───────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-[#f0f4ff] font-semibold mb-1">Add Property Photos</p>
              <p className="text-xs text-[#4a5470]">
                Listings with 5+ photos get 3× more views. The first photo is your cover image.
              </p>
            </div>
            <ImageDropzone
              files={form.images}
              onAdd={files => updateField('images', [...form.images, ...files])}
              onRemove={idx => updateField('images', form.images.filter((_, i) => i !== idx))}
            />
            <p className="text-[10px] text-[#4a5470]">
              {form.images.length} photo{form.images.length !== 1 ? 's' : ''} selected
              {form.images.length === 0 && ' — you can add photos later too'}
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

      {/* ── Footer actions ── */}
      <div className="flex items-center justify-between mt-6">
        <button
          type="button"
          onClick={() => step > 1 ? setStep(s => s - 1) : router.push('/dashboard')}
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
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="os-btn-primary text-sm min-w-[140px]"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-[#07090f]/30 border-t-[#07090f] rounded-full animate-spin" />
                  Publishing…
                </span>
              ) : (
                '🚀 Publish Listing'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
