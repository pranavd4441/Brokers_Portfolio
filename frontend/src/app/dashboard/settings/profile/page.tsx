'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { fetchApi } from '@/lib/api';
import { toast } from 'sonner';

export default function ProfileSettingsPage() {
  const { user, loadUser } = useAuthStore();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load active user details
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name) {
      setError('Name is required.');
      return;
    }

    setLoading(true);

    try {
      // Send updates to backend profile endpoint
      await fetchApi('/auth/me/', {
        method: 'PATCH',
        body: JSON.stringify({
          name,
          phone,
        }),
      });

      // Reload user in Zustand store to propagate updates
      await loadUser();
      
      toast.success('Profile updated successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to update profile. Please try again.');
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-16">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">Profile Settings</h1>
        <p className="text-slate-400 text-sm mt-1">Manage your personal broker account details and contact information.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg bg-red-950/40 border border-red-800/30 p-4 text-sm text-red-300">
            ⚠️ {error}
          </div>
        )}

        {/* Profile Card */}
        <div className="glass p-5 rounded-2xl border border-slate-800/60 space-y-5">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-2 mb-4">
            Personal Information
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Email Address (Read-only)
            </label>
            <input
              type="email"
              disabled
              value={email}
              className="mt-1 block w-full px-4 py-3 rounded-xl border border-slate-900 bg-slate-950/20 text-slate-500 cursor-not-allowed text-sm focus:outline-none"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">
              To change your registered email, please contact workspace support.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Rajesh Sharma"
              className="mt-1 block w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-950/60 placeholder-slate-500 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Phone / WhatsApp Number
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g., +919876543210"
              className="mt-1 block w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-950/60 placeholder-slate-500 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-sm"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">
              Used for client inquiries and your direct contact info on shared listings.
            </span>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 text-sm font-semibold text-[#07090f] bg-[#16c784] hover:bg-[#16c784]/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all flex items-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-[#07090f] border-t-transparent animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Profile</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
