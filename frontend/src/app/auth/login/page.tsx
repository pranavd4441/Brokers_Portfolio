'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowRight, Building2, LoaderCircle } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isNotRegistered = error ? (
    error.toLowerCase().includes('register') || 
    error.toLowerCase().includes('not register') || 
    error.toLowerCase().includes('accoount')
  ) : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid credentials. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="os-page-shell relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      {/* Background grid */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.045]"
        style={{
          backgroundImage: `linear-gradient(var(--ui-text) 1px, transparent 1px), linear-gradient(90deg, var(--ui-text) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />
      <div className="pointer-events-none fixed -right-28 -top-28 h-80 w-80 rounded-full bg-[color-mix(in_srgb,var(--ui-brand)_13%,transparent)] blur-3xl" />

      <div className="relative w-full max-w-sm os-slide-up">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-[var(--ui-brand)] text-[var(--ui-brand-ink)]">
            <Building2 size={23} />
          </div>
          <h1 className="text-2xl font-bold text-[var(--ui-text)] tracking-tight">Welcome back</h1>
          <p className="mt-1 text-sm text-[var(--ui-text-muted)]">Sign in to your PropertyOS workspace</p>
        </div>

        {/* Card */}
        <div className="os-card p-6 shadow-[var(--ui-shadow)]">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="os-input-label">Email address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="os-input"
                autoComplete="email"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="os-input-label">Password</label>
                <Link href="/support" className="text-xs font-semibold text-[var(--ui-brand-strong)] hover:underline">
                  Can&apos;t sign in? Get help
                </Link>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="os-input"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="flex flex-col gap-3 rounded-xl border border-[color-mix(in_srgb,var(--ui-danger)_24%,var(--ui-border))] bg-[color-mix(in_srgb,var(--ui-danger)_7%,var(--ui-surface))] p-4" role="alert">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle size={17} className="mt-0.5 shrink-0 text-[var(--ui-danger)]" />
                  <p className="text-xs font-medium leading-relaxed text-[var(--ui-danger)]">{error}</p>
                </div>
                {isNotRegistered && (
                  <Link
                    id="highlighted-signup-btn"
                    href="/auth/signup"
                    className="os-btn-primary min-h-11 w-full px-4 text-center text-xs font-bold"
                  >
                    <span>Create a new account</span>
                    <ArrowRight size={15} />
                  </Link>
                )}
              </div>
            )}

            <button
              id="login-submit-btn"
              type="submit"
              disabled={loading}
              className="os-btn-primary w-full disabled:opacity-60 disabled:cursor-wait"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <LoaderCircle className="animate-spin" size={17} />
                  Signing in…
                </span>
              ) : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Sign up link */}
        <p className="mt-5 text-center text-xs text-[var(--ui-text-muted)]">
          New to PropertyOS?{' '}
          <Link
            id="register-link"
            href="/auth/signup"
            className="font-bold text-[var(--ui-brand-strong)] hover:underline"
          >
            Create free account →
          </Link>
        </p>
      </div>
    </main>
  );
}
