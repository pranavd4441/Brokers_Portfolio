'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Check,
  Languages,
  LoaderCircle,
  MessageCircle,
  ShieldCheck,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

type SignupLocale = 'en' | 'hi' | 'mr';

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signup, error, clearError } = useAuthStore();
  const [companyName, setCompanyName] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [locale, setLocale] = useState<SignupLocale>('en');
  const [referralCode, setReferralCode] = useState(searchParams.get('ref') || '');
  const [marketingConsent, setMarketingConsent] = useState(true);
  const [termsConsent, setTermsConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setClientError(null);
    clearError();

    if (!companyName.trim() || !name.trim() || !phone.trim() || !email.trim() || !password) {
      setClientError('Complete all required fields to create your workspace.');
      return;
    }
    if (!termsConsent) {
      setClientError('Accept the Terms and Privacy Notice to continue.');
      return;
    }
    if (password.length < 8) {
      setClientError('Use a password with at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      await signup(companyName.trim(), name.trim(), email.trim(), password, phone.trim(), {
        source: searchParams.get('source') || 'direct',
        referralCode: referralCode.trim(),
        locale,
        marketingConsent,
      });
      router.push('/dashboard/onboarding');
    } catch {
      // The auth store exposes the API message above the form.
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="os-page-shell min-h-screen px-4 py-8 sm:py-12">
      <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-[28px] border border-[var(--ui-border)] bg-[var(--ui-surface)] shadow-[var(--ui-shadow)] lg:grid-cols-[0.85fr_1.15fr]">
        <section className="relative overflow-hidden bg-[var(--ui-brand)] p-7 text-[var(--ui-brand-ink)] sm:p-10">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full border border-current opacity-10" />
          <Link href="/" className="relative flex items-center gap-3 text-lg font-black">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--ui-brand-ink)] text-[var(--ui-brand)]">
              <Building2 size={22} />
            </span>
            PropertyOS
          </Link>

          <div className="relative mt-14 max-w-md">
            <p className="text-xs font-black uppercase tracking-[0.16em] opacity-70">Founding Broker Program</p>
            <h1 className="mt-4 text-3xl font-black leading-tight tracking-[-0.04em] sm:text-4xl">
              Publish your first professional property page today.
            </h1>
            <p className="mt-4 text-sm leading-7 opacity-75">
              Start with your real brokerage identity. We will guide you through branding, your first listing and the first WhatsApp share.
            </p>
          </div>

          <div className="relative mt-10 space-y-4 text-sm font-semibold">
            {[
              '14-day assisted pilot with no card',
              'Your branding on every property page',
              'Buyer actions visible in your workspace',
            ].map((benefit) => (
              <div key={benefit} className="flex items-center gap-3">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-[color-mix(in_srgb,var(--ui-brand-ink)_14%,transparent)]"><Check size={15} /></span>
                {benefit}
              </div>
            ))}
          </div>
        </section>

        <section className="p-5 sm:p-8 lg:p-10">
          <div className="mb-7">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--ui-brand-strong)]">Create broker workspace</p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-[var(--ui-text)]">Start your assisted pilot</h2>
            <p className="mt-2 text-sm text-[var(--ui-text-muted)]">
              Already registered? <Link href="/auth/login" className="font-bold text-[var(--ui-brand-strong)] hover:underline">Sign in</Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {(clientError || error) && (
              <div role="alert" className="flex items-start gap-3 rounded-xl border border-[color-mix(in_srgb,var(--ui-danger)_25%,var(--ui-border))] bg-[color-mix(in_srgb,var(--ui-danger)_7%,var(--ui-surface))] p-4 text-sm font-medium text-[var(--ui-danger)]">
                <AlertTriangle className="mt-0.5 shrink-0" size={18} />
                <span>{clientError || error}</span>
              </div>
            )}

            <div>
              <label htmlFor="companyName" className="os-input-label">Brokerage or agency name</label>
              <input id="companyName" autoComplete="organization" value={companyName} onChange={(event) => setCompanyName(event.target.value)} className="os-input" placeholder="Prime Realty Pune" required />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className="os-input-label">Your full name</label>
                <input id="name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className="os-input" placeholder="Aakash Kulkarni" required />
              </div>
              <div>
                <label htmlFor="phone" className="os-input-label">Phone and WhatsApp</label>
                <input id="phone" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className="os-input" placeholder="+91 98765 43210" required />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="email" className="os-input-label">Email address</label>
                <input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="os-input" placeholder="you@example.com" required />
              </div>
              <div>
                <label htmlFor="password" className="os-input-label">Password</label>
                <input id="password" type="password" autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} className="os-input" placeholder="At least 8 characters" required />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="os-input-label flex items-center gap-2"><Languages size={15} /> Support language</span>
                <select value={locale} onChange={(event) => setLocale(event.target.value as SignupLocale)} className="os-input min-h-12">
                  <option value="en">English</option>
                  <option value="hi">हिंदी</option>
                  <option value="mr">मराठी</option>
                </select>
              </label>
              <label className="block">
                <span className="os-input-label">Referral code</span>
                <input value={referralCode} onChange={(event) => setReferralCode(event.target.value.toUpperCase())} className="os-input" placeholder="Optional" />
              </label>
            </div>

            <label className="flex min-h-11 items-start gap-3 text-xs leading-5 text-[var(--ui-text-muted)]">
              <input type="checkbox" checked={termsConsent} onChange={(event) => setTermsConsent(event.target.checked)} className="mt-1 h-4 w-4 accent-[var(--ui-brand-strong)]" />
              <span>I agree to the <Link href="/terms" className="font-bold text-[var(--ui-brand-strong)]">Terms</Link> and <Link href="/privacy" className="font-bold text-[var(--ui-brand-strong)]">Privacy Notice</Link> required to operate my workspace.</span>
            </label>
            <label className="flex min-h-11 items-start gap-3 text-xs leading-5 text-[var(--ui-text-muted)]">
              <input type="checkbox" checked={marketingConsent} onChange={(event) => setMarketingConsent(event.target.checked)} className="mt-1 h-4 w-4 accent-[var(--ui-brand-strong)]" />
              <span>Send pilot guidance and demo reminders on WhatsApp. I can opt out anytime.</span>
            </label>

            <button type="submit" disabled={loading} className="os-btn-primary min-h-12 w-full disabled:cursor-wait disabled:opacity-60">
              {loading ? <><LoaderCircle className="animate-spin" size={18} />Creating workspace…</> : <>Create workspace <ArrowRight size={17} /></>}
            </button>

            <div className="grid gap-2 border-t border-[var(--ui-border)] pt-5 text-xs text-[var(--ui-text-muted)] sm:grid-cols-2">
              <p className="flex items-center gap-2"><ShieldCheck size={15} className="text-[var(--ui-success)]" /> Account data stays private</p>
              <p className="flex items-center gap-2"><MessageCircle size={15} className="text-[var(--ui-success)]" /> WhatsApp-first setup support</p>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<main className="os-page-shell grid min-h-screen place-items-center"><LoaderCircle className="animate-spin text-[var(--ui-brand-strong)]" /></main>}>
      <SignupForm />
    </Suspense>
  );
}
