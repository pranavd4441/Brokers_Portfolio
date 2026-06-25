'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { authTokens } from '@/lib/api';

export default function SignupPage() {
  const router = useRouter();
  const { signup, error, clearError } = useAuthStore();

  const [companyName, setCompanyName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  useEffect(() => {
    // Redirect if already logged in
    if (authTokens.getAccessToken()) {
      router.push('/dashboard');
    }
    clearError();
  }, [router, clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setClientError(null);
    clearError();

    if (!companyName || !name || !email || !password) {
      setClientError('Please fill in all fields.');
      return;
    }

    if (password.length < 8) {
      setClientError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    try {
      await signup(companyName, name, email, password);
      router.push('/dashboard');
    } catch (err: any) {
      // Error is handled in the store
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[#0b0f19] overflow-hidden">
      {/* Premium Background Decorative Orbs */}
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-900/15 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-teal-900/15 blur-[120px] pointer-events-none"></div>
      
      {/* Decorative Grid Lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Logo Icon */}
        <div className="flex justify-center">
          <div className="flex items-center gap-2 h-12 px-4 rounded-xl bg-emerald-950/40 border border-emerald-800/30 text-emerald-400 font-semibold tracking-wide text-lg glow-emerald">
            <span className="text-2xl">🏢</span> Property<span className="text-slate-200 font-bold">OS</span>
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-white">
          Create your broker workspace
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          Or{' '}
          <Link href="/auth/login" className="font-semibold text-emerald-400 hover:text-emerald-300 transition-colors">
            sign in to your existing account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="glass py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-800/55">
          <form className="space-y-5" onSubmit={handleSubmit}>
            
            {/* Display Errors */}
            {(clientError || error) && (
              <div className="rounded-lg bg-red-950/40 border border-red-800/30 p-4 text-sm text-red-300 flex items-center gap-2">
                <span>⚠️</span>
                <span>{clientError || error}</span>
              </div>
            )}

            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-slate-300">
                Brokerage / Agency Name
              </label>
              <div className="mt-1">
                <input
                  id="companyName"
                  name="companyName"
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="appearance-none block w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-950/60 placeholder-slate-500 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  placeholder="e.g., Prime Realtors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-300">
                Full Name
              </label>
              <div className="mt-1">
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="appearance-none block w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-950/60 placeholder-slate-500 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  placeholder="Rajesh Sharma"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-950/60 placeholder-slate-500 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  placeholder="rajesh@primerealtors.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-950/60 placeholder-slate-500 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  placeholder="Min. 8 characters"
                />
              </div>
            </div>

            <div className="text-xs text-slate-400">
              By registering, you agree to create a tenant workspace under the PropertyOS system architecture.
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                ) : (
                  'Create Workspace'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
