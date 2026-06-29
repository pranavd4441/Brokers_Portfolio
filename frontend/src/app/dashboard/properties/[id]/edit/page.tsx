'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { fetchApi } from '@/lib/api';
import AIAssistantModal from '@/components/AIAssistantModal';

// ─── Types ──────────────────────────────────────────────────────
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
  property_type: 'APARTMENT' | 'VILLA' | 'PLOT' | 'COMMERCIAL';
  status: 'AVAILABLE' | 'NEGOTIATION' | 'SITE_VISIT' | 'BOOKED' | 'SOLD';
  city: string;
  area: string;
  location_address: string;
  bhk: number | null;
  square_feet: number | null;
  amenities: string[];
  images: PropertyImage[];
  created_at: string;
  state?: string;
  pincode?: string;
}

interface PropertyFormData {
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
  newImages: File[];
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
  { value: 'SOLD',        label: 'Sold',        color: '#f43f5e' },
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
function WizardProgress({ currentStep }: { currentStep: number }) {
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
  newFiles,
  existingImages,
  onAddNew,
  onRemoveNew,
  onRemoveExisting,
}: {
  newFiles: File[];
  existingImages: PropertyImage[];
  onAddNew: (files: File[]) => void;
  onRemoveNew: (index: number) => void;
  onRemoveExisting: (id: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (dropped.length > 0) onAddNew(dropped);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []).filter(f => f.type.startsWith('image/'));
    if (selected.length > 0) onAddNew(selected);
    if (inputRef.current) inputRef.current.value = '';
  };

  const newPreviews = newFiles.map(f => URL.createObjectURL(f));

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

      {/* Image Previews Section */}
      {(existingImages.length > 0 || newPreviews.length > 0) && (
        <div className="space-y-4">
          {/* Existing images */}
          {existingImages.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Existing Photos</h4>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {existingImages.map((img) => (
                  <div key={img.id} className="relative group aspect-square rounded-xl overflow-hidden bg-[#0d1117]">
                    <img src={img.thumbnail_url || img.url} alt="Property image" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => onRemoveExisting(img.id)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 bg-[#07090f]/80 rounded-full flex items-center justify-center text-[#8892aa] hover:text-[#f43f5e] text-xs transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New images */}
          {newPreviews.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">New Photos to Upload</h4>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {newPreviews.map((src, idx) => (
                  <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden bg-[#0d1117]">
                    <img src={src} alt={`New Photo ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => onRemoveNew(idx)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 bg-[#07090f]/80 rounded-full flex items-center justify-center text-[#8892aa] hover:text-[#f43f5e] text-xs transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Edit Component ─────────────────────────────────────────
export default function EditPropertyPage() {
  const router = useRouter();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showAiModal, setShowAiModal] = useState(false);

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
    newImages: [],
  });

  const [existingImages, setExistingImages] = useState<PropertyImage[]>([]);

  // Fetch existing property details
  const { data: property, isLoading, error: fetchError } = useQuery<Property>({
    queryKey: ['property', id],
    queryFn: () => fetchApi(`/properties/${id}/`),
    enabled: !!id,
  });

  // Pre-populate form once details are loaded
  useEffect(() => {
    if (property) {
      setForm({
        title: property.title || '',
        property_type: property.property_type || 'APARTMENT',
        status: property.status || 'AVAILABLE',
        price: property.price ? String(property.price) : '',
        bhk: property.bhk ? String(property.bhk) : '',
        square_feet: property.square_feet ? String(property.square_feet) : '',
        address: property.location_address || '',
        area: property.area || '',
        city: property.city || '',
        state: property.state || '',
        pincode: property.pincode || '',
        description: property.description || '',
        amenities: property.amenities || [],
        newImages: [],
      });
      setExistingImages(property.images || []);
    }
  }, [property]);

  const updateField = useCallback(<K extends keyof PropertyFormData>(key: K, value: PropertyFormData[K]) => {
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

  const handleAddNewImages = (files: File[]) => {
    setForm(prev => ({ ...prev, newImages: [...prev.newImages, ...files] }));
  };

  const handleRemoveNewImage = (idx: number) => {
    setForm(prev => ({
      ...prev,
      newImages: prev.newImages.filter((_, i) => i !== idx),
    }));
  };

  const handleRemoveExistingImage = async (imageId: string) => {
    if (!confirm('Are you sure you want to delete this image permanently?')) return;
    try {
      await fetchApi(`/properties/${id}/images/${imageId}/`, {
        method: 'DELETE',
      });
      setExistingImages(prev => prev.filter(img => img.id !== imageId));
      toast.success('Image deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete image');
    }
  };

  const canAdvance = (): boolean => {
    if (step === 1) return !!(form.title && form.price && form.property_type);
    if (step === 2) return !!(form.area && form.city);
    if (step === 3) return form.description.length >= 20;
    return true;
  };

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
        location_address: form.address,
        area: form.area,
        city: form.city,
        state: form.state,
        pincode: form.pincode,
        description: form.description,
        amenities: form.amenities,
      };

      // 1. Update property fields
      await fetchApi(`/properties/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      // 2. Upload new images sequentially
      if (form.newImages.length > 0) {
        // Get current display order maximum
        const maxOrder = existingImages.reduce((max, img) => Math.max(max, img.display_order), -1);
        
        for (let i = 0; i < form.newImages.length; i++) {
          const fd = new FormData();
          fd.append('images', form.newImages[i]);
          fd.append('display_order', String(maxOrder + 1 + i));
          await fetchApi(`/properties/${id}/images/`, {
            method: 'POST',
            body: fd,
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['property', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      
      toast.success('Listing updated successfully');
      router.push('/dashboard');
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to update property. Please try again.');
      toast.error('Failed to update listing');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
        <span className="text-slate-400 text-sm">Loading listing details...</span>
      </div>
    );
  }

  if (fetchError || !property) {
    return (
      <div className="text-center py-12">
        <span className="text-3xl">⚠️</span>
        <h3 className="text-lg font-bold text-white mt-4">Listing Not Found</h3>
        <p className="text-slate-400 text-sm mt-1">This property listing does not exist or you do not have permission to edit it.</p>
        <button onClick={() => router.push('/dashboard')} className="os-btn-primary mt-6 text-sm">
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-16">
      {/* Page Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">Edit Listing</h1>
          <p className="text-slate-400 text-sm mt-1">Update details for "{property.title}"</p>
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700 bg-slate-950/40 rounded-xl transition-all"
        >
          Cancel
        </button>
      </div>

      {/* Progress Wizard */}
      <WizardProgress currentStep={step} />

      <div className="glass p-6 rounded-2xl border border-slate-800/60 space-y-6 relative overflow-hidden">
        {submitError && (
          <div className="rounded-lg bg-red-950/40 border border-red-800/30 p-4 text-sm text-red-300 flex items-center gap-2">
            <span>⚠️</span>
            <span>{submitError}</span>
          </div>
        )}

        {/* ─── STEP 1: BASICS ─── */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">Property Title *</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="e.g., Ultra Premium 3BHK Apartment in Bandra"
                className="mt-1 block w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-950/60 placeholder-slate-500 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">Property Type *</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {PROPERTY_TYPES.map(type => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => updateField('property_type', type.value)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all ${
                        form.property_type === type.value
                          ? 'border-emerald-500 bg-emerald-950/20 text-emerald-400'
                          : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-base">{type.icon}</span>
                      <span className="text-xs font-semibold">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">Current Status *</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {STATUSES.map(statusOpt => (
                    <button
                      key={statusOpt.value}
                      type="button"
                      onClick={() => updateField('status', statusOpt.value)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all ${
                        form.status === statusOpt.value
                          ? 'border-emerald-500 bg-emerald-950/20 text-emerald-400'
                          : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusOpt.color }} />
                      <span className="text-xs font-semibold">{statusOpt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">Price (INR) *</label>
                <input
                  type="text"
                  required
                  value={form.price}
                  onChange={(e) => updateField('price', e.target.value)}
                  placeholder="e.g., 25000000"
                  className="mt-1 block w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-950/60 placeholder-slate-500 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm"
                />
              </div>

              {form.property_type !== 'PLOT' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">BHK configuration</label>
                  <div className="flex gap-1.5 mt-1 overflow-x-auto py-1">
                    {BHK_OPTIONS.map(bhkOpt => (
                      <button
                        key={bhkOpt}
                        type="button"
                        onClick={() => updateField('bhk', bhkOpt)}
                        className={`h-9 w-9 shrink-0 rounded-lg border text-xs font-bold transition-all ${
                          form.bhk === bhkOpt
                            ? 'border-emerald-500 bg-emerald-950/20 text-emerald-400'
                            : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        {bhkOpt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">Square Feet</label>
                <input
                  type="text"
                  value={form.square_feet}
                  onChange={(e) => updateField('square_feet', e.target.value)}
                  placeholder="e.g., 1250"
                  className="mt-1 block w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-950/60 placeholder-slate-500 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* ─── STEP 2: LOCATION ─── */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">Locality / Area *</label>
              <input
                type="text"
                required
                value={form.area}
                onChange={(e) => updateField('area', e.target.value)}
                placeholder="e.g., Bandra West"
                className="mt-1 block w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-950/60 placeholder-slate-500 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">City *</label>
                <input
                  type="text"
                  required
                  value={form.city}
                  onChange={(e) => updateField('city', e.target.value)}
                  placeholder="e.g., Mumbai"
                  className="mt-1 block w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-950/60 placeholder-slate-500 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">State</label>
                <input
                  type="text"
                  value={form.state}
                  onChange={(e) => updateField('state', e.target.value)}
                  placeholder="e.g., Maharashtra"
                  className="mt-1 block w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-950/60 placeholder-slate-500 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">Complete Street Address</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  placeholder="e.g., Apt 12, Ocean View Apartments, Carter Road"
                  className="mt-1 block w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-950/60 placeholder-slate-500 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">Pincode</label>
                <input
                  type="text"
                  value={form.pincode}
                  onChange={(e) => updateField('pincode', e.target.value)}
                  placeholder="e.g., 400050"
                  className="mt-1 block w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-950/60 placeholder-slate-500 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* ─── STEP 3: DETAILS ─── */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <div className="flex justify-between items-end mb-1">
                <div className="flex items-center gap-3">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">Property Description *</label>
                  <button
                    type="button"
                    onClick={() => setShowAiModal(true)}
                    className="text-[10px] font-bold text-[#16c784] hover:text-[#19e098] transition-colors flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>✨</span> Generate with AI
                  </button>
                </div>
                <span className={`text-[10px] ${form.description.length >= 20 ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {form.description.length} / 20 chars min
                </span>
              </div>
              <textarea
                required
                rows={5}
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Describe key features, amenities, layouts, location advantages, and proximity to major hubs. (Min. 20 characters)"
                className="mt-1 block w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-950/60 placeholder-slate-500 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Amenities / Features</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {AMENITIES.map(amenity => {
                  const isChecked = form.amenities.includes(amenity.id);
                  return (
                    <button
                      key={amenity.id}
                      type="button"
                      onClick={() => toggleAmenity(amenity.id)}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all ${
                        isChecked
                          ? 'border-emerald-500 bg-emerald-950/20 text-emerald-400'
                          : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-base">{amenity.icon}</span>
                      <span className="text-xs font-semibold">{amenity.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ─── STEP 4: PHOTOS ─── */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Upload Media</label>
              <p className="text-xs text-slate-500 mb-3">Add premium high-quality photos. The first image will be the primary cover preview.</p>
              
              <ImageDropzone
                newFiles={form.newImages}
                existingImages={existingImages}
                onAddNew={handleAddNewImages}
                onRemoveNew={handleRemoveNewImage}
                onRemoveExisting={handleRemoveExistingImage}
              />
            </div>
          </div>
        )}

        {/* Navigation Actions */}
        <div className="flex justify-between items-center border-t border-slate-800/60 pt-5 mt-6">
          <button
            type="button"
            disabled={step === 1}
            onClick={() => setStep(prev => prev - 1)}
            className="px-5 py-2.5 text-xs font-semibold text-slate-400 hover:text-white bg-transparent border border-transparent disabled:opacity-0 disabled:pointer-events-none transition-all"
          >
            ← Back
          </button>

          {step < 4 ? (
            <button
              type="button"
              disabled={!canAdvance()}
              onClick={() => setStep(prev => prev + 1)}
              className="px-5 py-2.5 text-xs font-semibold text-[#07090f] bg-[#16c784] hover:bg-[#16c784]/90 disabled:opacity-50 disabled:pointer-events-none rounded-xl transition-all cursor-pointer"
            >
              Continue →
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="px-5 py-2.5 text-xs font-semibold text-[#07090f] bg-[#16c784] hover:bg-[#16c784]/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-[#07090f] border-t-transparent animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          )}
        </div>
      </div>

      {showAiModal && (
        <AIAssistantModal
          propertyType={form.property_type}
          price={form.price}
          bhk={form.bhk}
          area={form.area}
          city={form.city}
          onApplyTitle={(title) => updateField('title', title)}
          onApplyDescription={(desc) => updateField('description', desc)}
          onClose={() => setShowAiModal(false)}
        />
      )}
    </div>
  );
}
