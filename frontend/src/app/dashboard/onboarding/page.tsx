'use client';

import { useState } from 'react';
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
  ImagePlus,
  LoaderCircle,
  MessageCircle,
  Palette,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { useAuthStore, type UserSession } from '@/store/useAuthStore';

const ACCENT_OPTIONS = ['#174d3c', '#315f2b', '#1769aa', '#8a5b0b', '#9f4637'];

function StepMarker({ number, label, current, complete }: { number: number; label: string; current: boolean; complete: boolean }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border text-xs font-black ${complete ? 'border-[var(--ui-success)] bg-[var(--ui-success)] text-white' : current ? 'border-[var(--ui-brand-strong)] bg-[var(--ui-surface)] text-[var(--ui-brand-strong)]' : 'border-[var(--ui-border)] bg-[var(--ui-surface-muted)] text-[var(--ui-text-muted)]'}`}>
        {complete ? <Check size={16} /> : number}
      </span>
      <span className={`hidden text-xs font-bold sm:block ${current ? 'text-[var(--ui-text)]' : 'text-[var(--ui-text-muted)]'}`}>{label}</span>
    </div>
  );
}

function OnboardingForm({ initialUser }: { initialUser: UserSession }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { updateTenantBranding, updateUserProfile } = useAuthStore();
  const [step, setStep] = useState(1);
  const [name, setName] = useState(initialUser.name || '');
  const [phone, setPhone] = useState(initialUser.phone || '');
  const [workspaceName, setWorkspaceName] = useState(initialUser.tenant.name || '');
  const [whatsapp, setWhatsapp] = useState(initialUser.tenant.whatsapp_default_number || initialUser.phone || '');
  const [logoUrl, setLogoUrl] = useState(initialUser.tenant.logo_url || '');
  const [brandColor, setBrandColor] = useState(initialUser.tenant.brand_color || '#174d3c');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveProfile = async () => {
    setError(null);
    if (!name.trim() || !phone.trim()) {
      setError('Add your name and phone number before continuing.');
      return;
    }
    setSaving(true);
    try {
      const updated = await fetchApi<UserSession>('/auth/me/', { method: 'PATCH', body: JSON.stringify({ name: name.trim(), phone: phone.trim() }) });
      updateUserProfile({ name: updated.name, phone: updated.phone });
      setStep(2);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Profile could not be saved. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const uploadLogo = async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      const data = new FormData();
      data.append('logo', file);
      const result = await fetchApi<{ logo_url: string }>('/auth/tenant/logo/', { method: 'POST', body: data });
      setLogoUrl(result.logo_url);
      updateTenantBranding({ logo_url: result.logo_url });
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Logo upload failed. Try a PNG, JPEG or WebP under 2 MB.');
    } finally {
      setUploading(false);
    }
  };

  const saveBranding = async () => {
    setError(null);
    if (!workspaceName.trim() || !whatsapp.trim()) {
      setError('Add your brokerage name and WhatsApp number before continuing.');
      return;
    }
    if (!logoUrl) {
      setError('Upload your logo so buyers can recognize your property pages.');
      return;
    }
    setSaving(true);
    try {
      const branding = {
        name: workspaceName.trim(),
        whatsapp_default_number: whatsapp.trim(),
        brand_color: brandColor,
        logo_url: logoUrl,
      };
      await fetchApi('/auth/tenant/branding/', { method: 'PATCH', body: JSON.stringify(branding) });
      updateTenantBranding(branding);
      await queryClient.invalidateQueries({ queryKey: ['onboarding'] });
      setStep(3);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Branding could not be saved. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl pb-10">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--ui-brand-strong)]">Guided setup</p>
          <h1 className="mt-2 text-2xl font-black tracking-[-0.035em] text-[var(--ui-text)] sm:text-3xl">Prepare your first buyer-ready page</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ui-text-muted)]">Confirm how buyers should see and contact you. Your exact property address stays private on public pages.</p>
        </div>
        <Link href="/dashboard" className="os-btn-ghost"><ArrowLeft size={17} /> Today</Link>
      </div>

      <div className="mb-6 flex items-center rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-3 sm:p-4">
        <StepMarker number={1} label="Broker profile" current={step === 1} complete={step > 1} />
        <span className="mx-1 h-px w-5 bg-[var(--ui-border)] sm:mx-3 sm:w-10" />
        <StepMarker number={2} label="Brand and contact" current={step === 2} complete={step > 2} />
        <span className="mx-1 h-px w-5 bg-[var(--ui-border)] sm:mx-3 sm:w-10" />
        <StepMarker number={3} label="First listing" current={step === 3} complete={false} />
      </div>

      {error && (
        <div role="alert" className="mb-5 flex items-start gap-3 rounded-xl border border-[color-mix(in_srgb,var(--ui-danger)_24%,var(--ui-border))] bg-[color-mix(in_srgb,var(--ui-danger)_7%,var(--ui-surface))] p-4 text-sm font-medium text-[var(--ui-danger)]">
          <AlertTriangle className="mt-0.5 shrink-0" size={18} /> {error}
        </div>
      )}

      {step === 1 && (
        <section className="os-card overflow-hidden">
          <div className="border-b border-[var(--ui-border)] p-5 sm:p-6">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--ui-surface-muted)] text-[var(--ui-brand-strong)]"><UserRound size={21} /></span>
            <h2 className="mt-4 text-xl font-black text-[var(--ui-text)]">Confirm your broker identity</h2>
            <p className="mt-1 text-sm text-[var(--ui-text-muted)]">This name and number will appear as the direct contact on your listings.</p>
          </div>
          <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
            <div><label htmlFor="broker-name" className="os-input-label">Broker name</label><input id="broker-name" value={name} onChange={(event) => setName(event.target.value)} className="os-input" autoComplete="name" /></div>
            <div><label htmlFor="broker-phone" className="os-input-label">Phone number</label><input id="broker-phone" value={phone} onChange={(event) => setPhone(event.target.value)} className="os-input" type="tel" inputMode="tel" autoComplete="tel" placeholder="+91 98765 43210" /></div>
          </div>
          <div className="flex justify-end border-t border-[var(--ui-border)] p-4 sm:p-5"><button type="button" onClick={saveProfile} disabled={saving} className="os-btn-primary min-w-36 disabled:opacity-60">{saving ? <LoaderCircle className="animate-spin" size={17} /> : <>Save and continue <ArrowRight size={17} /></>}</button></div>
        </section>
      )}

      {step === 2 && (
        <section className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
          <div className="os-card p-5 sm:p-6">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--ui-surface-muted)] text-[var(--ui-brand-strong)]"><Palette size={21} /></span>
            <h2 className="mt-4 text-xl font-black text-[var(--ui-text)]">Add your brand</h2>
            <p className="mt-1 text-sm text-[var(--ui-text-muted)]">Buyers should recognize you before they notice PropertyOS.</p>

            <div className="mt-6 space-y-5">
              <div><label htmlFor="workspace-name" className="os-input-label">Brokerage or agency name</label><input id="workspace-name" value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} className="os-input" /></div>
              <div><label htmlFor="whatsapp" className="os-input-label">WhatsApp number</label><input id="whatsapp" value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} className="os-input" type="tel" inputMode="tel" placeholder="Include country code" /><p className="mt-2 text-xs text-[var(--ui-text-muted)]">This receives buyer enquiries from your public pages.</p></div>
              <div>
                <span className="os-input-label">Brand accent</span>
                <div className="flex flex-wrap gap-3">
                  {ACCENT_OPTIONS.map((color) => <button key={color} type="button" aria-label={`Use ${color}`} onClick={() => setBrandColor(color)} className={`h-11 w-11 rounded-full border-4 ${brandColor === color ? 'border-[var(--ui-text)]' : 'border-[var(--ui-surface)] ring-1 ring-[var(--ui-border)]'}`} style={{ backgroundColor: color }} />)}
                  <input aria-label="Custom brand colour" type="color" value={brandColor} onChange={(event) => setBrandColor(event.target.value)} className="h-11 w-14 cursor-pointer rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface-muted)] p-1" />
                </div>
              </div>
              <label className="flex min-h-24 cursor-pointer items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[var(--ui-border-strong)] bg-[var(--ui-surface-muted)] px-5 text-sm font-bold text-[var(--ui-brand-strong)] hover:border-[var(--ui-brand-strong)]">
                {uploading ? <LoaderCircle className="animate-spin" size={20} /> : <ImagePlus size={20} />}
                {uploading ? 'Uploading logo…' : logoUrl ? 'Replace logo' : 'Upload logo from phone'}
                <input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadLogo(file); }} />
              </label>
            </div>

            <div className="mt-6 flex flex-wrap justify-between gap-3 border-t border-[var(--ui-border)] pt-5"><button type="button" onClick={() => setStep(1)} className="os-btn-ghost"><ArrowLeft size={17} /> Back</button><button type="button" onClick={saveBranding} disabled={saving || uploading} className="os-btn-primary min-w-36 disabled:opacity-60">{saving ? <LoaderCircle className="animate-spin" size={17} /> : <>Save brand <ArrowRight size={17} /></>}</button></div>
          </div>

          <aside className="os-card self-start overflow-hidden lg:sticky lg:top-24">
            <div className="p-5 text-white" style={{ backgroundColor: brandColor }}>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] opacity-70">Buyer page preview</p>
              <div className="mt-5 flex items-center gap-3">
                <span className="relative grid h-12 w-12 place-items-center overflow-hidden rounded-2xl bg-white/90 font-black text-[#173b30]">
                  {workspaceName.trim()[0]?.toUpperCase() || 'B'}
                  {logoUrl && <Image src={logoUrl} alt="Uploaded logo preview" fill unoptimized className="object-contain p-1" />}
                </span>
                <div className="min-w-0"><p className="truncate font-black">{workspaceName || 'Your brokerage'}</p><p className="truncate text-xs opacity-70">Presented by {name}</p></div>
              </div>
              <div className="mt-8 rounded-2xl bg-white/95 p-4 text-[#17211d]"><p className="text-xs font-bold text-[#66716b]">3 BHK · Baner, Pune</p><p className="mt-2 text-lg font-black">A clear property presentation</p><button type="button" className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#17211d] text-xs font-black text-white"><MessageCircle size={16} /> Ask on WhatsApp</button></div>
            </div>
            <div className="p-5 text-xs leading-5 text-[var(--ui-text-muted)]"><p className="flex gap-2"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-[var(--ui-success)]" />Broker identity leads the page. PropertyOS remains a small powered-by label.</p></div>
          </aside>
        </section>
      )}

      {step === 3 && (
        <section className="os-card p-6 text-center sm:p-10">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-[22px] bg-[color-mix(in_srgb,var(--ui-success)_12%,var(--ui-surface))] text-[var(--ui-success)]"><Check size={30} /></span>
          <p className="mt-6 text-xs font-black uppercase tracking-[0.15em] text-[var(--ui-success)]">Brand ready</p>
          <h2 className="mx-auto mt-2 max-w-xl text-2xl font-black tracking-[-0.035em] text-[var(--ui-text)] sm:text-3xl">Now turn one real property into a page you can share.</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--ui-text-muted)]">Have the price, locality, description and a few photos ready. You can finish the listing from your phone.</p>
          <div className="mx-auto mt-7 flex max-w-md flex-col gap-3 sm:flex-row sm:justify-center"><button type="button" onClick={() => router.push('/dashboard/properties/new?onboarding=1')} className="os-btn-primary min-h-12 flex-1"><Building2 size={17} /> Create first listing</button><Link href="/dashboard" className="os-btn-ghost min-h-12 flex-1">Do this later</Link></div>
        </section>
      )}
    </div>
  );
}

export default function OnboardingPage() {
  const { user } = useAuthStore();
  if (!user) return <div className="grid min-h-72 place-items-center"><LoaderCircle className="animate-spin text-[var(--ui-brand-strong)]" /></div>;
  return <OnboardingForm key={user.id} initialUser={user} />;
}
