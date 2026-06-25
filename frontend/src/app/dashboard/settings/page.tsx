'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { fetchApi } from '@/lib/api';

export default function SettingsPage() {
  const { user, updateTenantBranding } = useAuthStore();
  
  const [name, setName] = useState('');
  const [brandColor, setBrandColor] = useState('#10b981');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.tenant) {
      setName(user.tenant.name || '');
      setBrandColor(user.tenant.brand_color || '#10b981');
      setWhatsappNumber(user.tenant.whatsapp_default_number || '');
      setLogoUrl(user.tenant.logo_url || '');
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);
    setError(null);

    if (!name) {
      setError('Workspace name is required.');
      return;
    }

    setLoading(true);

    try {
      const brandingData = {
        name,
        brand_color: brandColor,
        whatsapp_default_number: whatsappNumber || null,
        logo_url: logoUrl || null
      };

      // Call API to update database
      await fetchApi('/auth/tenant/branding/', {
        method: 'PATCH',
        body: JSON.stringify(brandingData),
      });

      // Update Zustand state in real-time
      updateTenantBranding(brandingData);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to save branding settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const presetColors = [
    '#10b981', // Emerald
    '#06b6d4', // Cyan
    '#3b82f6', // Blue
    '#6366f1', // Indigo
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#f43f5e', // Rose
    '#f59e0b', // Amber
  ];

  return (
    <div className="max-w-2xl mx-auto pb-16">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">Branding & Settings</h1>
        <p className="text-slate-400 text-sm mt-1">Customize your digital brand identity across all public property pages.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {success && (
          <div className="rounded-lg bg-emerald-950/40 border border-emerald-800/30 p-4 text-sm text-emerald-300">
            ✓ Branding settings updated successfully! Your public portfolio pages will reflect these updates immediately.
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-950/40 border border-red-800/30 p-4 text-sm text-red-300">
            ⚠️ {error}
          </div>
        )}

        {/* SECTION 1: Workspace branding */}
        <div className="glass p-5 rounded-2xl border border-slate-800/60 space-y-5">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-2 mb-4">Workspace Customization</h3>
          
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">Workspace / Agency Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Prime Realtors Ltd"
              className="mt-1 block w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-950/60 placeholder-slate-500 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">Default WhatsApp Number</label>
            <input
              type="text"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder="e.g., +919876543210 (Include country code without '+' or spaces)"
              className="mt-1 block w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-950/60 placeholder-slate-500 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">This is the default phone number used for the "Chat on WhatsApp" CTA on all property landing pages.</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">Brand Logo URL</label>
            <input
              type="text"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="e.g., https://domain.com/logo.png"
              className="mt-1 block w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-950/60 placeholder-slate-500 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">A high-quality transparent PNG logo URL that will be displayed in the header of all shared pages.</span>
          </div>
        </div>

        {/* SECTION 2: Color Palette Branding */}
        <div className="glass p-5 rounded-2xl border border-slate-800/60 space-y-4">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-2 mb-4">Brand Theme Color</h3>
          
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Select Theme Accent</label>
            <div className="flex flex-wrap gap-2.5">
              {presetColors.map((color) => (
                <button
                  type="button"
                  key={color}
                  onClick={() => setBrandColor(color)}
                  style={{ backgroundColor: color }}
                  className={`h-9 w-9 rounded-full border-2 transition-all cursor-pointer hover:scale-[1.08] ${
                    brandColor.toLowerCase() === color.toLowerCase()
                      ? 'border-white ring-2 ring-emerald-500 ring-offset-2 ring-offset-[#0b0f19]'
                      : 'border-transparent'
                  }`}
                />
              ))}
              
              {/* Custom Hex Picker Input */}
              <div className="flex items-center gap-2 border border-slate-800 bg-slate-950/60 px-3 py-1.5 rounded-xl">
                <input
                  type="color"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="h-6 w-6 border border-slate-800 bg-transparent rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="w-16 text-xs font-mono bg-transparent border-0 text-white p-0 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Theme Branding Preview Card */}
        <div className="glass p-5 rounded-2xl border border-slate-800/60 space-y-3">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Live Preview</h4>
          <p className="text-[11px] text-slate-500">Here is how your custom theme color looks on public landing page action buttons.</p>
          
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {logoUrl ? (
                <img src={logoUrl} alt="logo" className="h-6 w-6 object-contain" />
              ) : (
                <span className="text-base">🏢</span>
              )}
              <span className="text-xs font-bold text-white">{name || 'Agency Name'}</span>
            </div>
            
            <button
              type="button"
              style={{ backgroundColor: brandColor }}
              className="h-8 px-4 rounded-lg text-[10px] font-bold text-white hover:opacity-90 active:scale-[0.97] transition-all cursor-pointer"
            >
              Chat on WhatsApp
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end pt-2">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center h-11 px-8 rounded-xl text-sm font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg"
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-950 border-t-transparent"></div>
            ) : (
              'Save Branding Settings'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
