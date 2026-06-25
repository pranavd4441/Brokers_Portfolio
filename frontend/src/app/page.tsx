'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authTokens } from '@/lib/api';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const token = authTokens.getAccessToken();
    if (token) {
      router.push('/dashboard');
    } else {
      router.push('/auth/login');
    }
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b0f19]">
      <div className="flex flex-col items-center gap-4">
        {/* Sleek premium spinner */}
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
        <p className="text-sm font-medium text-slate-400">Loading PropertyOS...</p>
      </div>
    </div>
  );
}
