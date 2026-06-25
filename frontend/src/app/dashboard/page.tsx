'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import ShareModal from '@/components/ShareModal';
import PropertyCard from '@/components/PropertyCard';

// ─── Type definitions ──────────────────────────────────────────
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
  bhk: number | null;
  square_feet: number | null;
  amenities: string[];
  images: PropertyImage[];
  created_at: string;
}

interface DashboardMetrics {
  summary: {
    total_properties: number;
    total_views: number;
    whatsapp_clicks: number;
    phone_clicks: number;
    conversion_rate: number;
    total_clicks: number;
  };
  device_distribution: Record<string, number>;
  top_properties: Array<{ id: string; title: string; views: number; price: number; status: string }>;
  performance_chart: Array<{ date: string; views: number; clicks: number }>;
}

// ─── Stat Card ─────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  gradientClass: string;
  icon: string;
  trend?: { value: number; positive: boolean };
}

function StatCard({ label, value, sublabel, gradientClass, icon, trend }: StatCardProps) {
  return (
    <div className={`os-card ${gradientClass} p-5 flex flex-col gap-3 cursor-default select-none`}>
      <div className="flex items-center justify-between">
        <span className="os-label">{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <div>
        <div className="text-2xl lg:text-3xl font-bold tracking-tight text-[#f0f4ff]">{value}</div>
        {sublabel && <div className="text-xs text-[#4a5470] mt-0.5">{sublabel}</div>}
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-[11px] font-semibold ${trend.positive ? 'text-[#16c784]' : 'text-[#f43f5e]'}`}>
          <span>{trend.positive ? '↑' : '↓'}</span>
          <span>{trend.value}% vs last week</span>
        </div>
      )}
    </div>
  );
}

// ─── Micro Bar Chart ────────────────────────────────────────────
function MiniBarChart({ data }: { data: Array<{ date: string; views: number; clicks: number }> }) {
  const maxViews = Math.max(...data.map(d => d.views), 1);

  return (
    <div className="flex items-end gap-1.5 h-20">
      {data.map((item, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
          {/* Tooltip */}
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#0d1117] border border-[rgba(255,255,255,0.08)] rounded-lg px-2.5 py-1.5 text-[10px] text-[#f0f4ff] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 shadow-xl">
            <div className="font-semibold">{item.date}</div>
            <div className="text-[#38bdf8]">{item.views} views</div>
            <div className="text-[#16c784]">{item.clicks} clicks</div>
          </div>
          {/* Bar */}
          <div
            className="w-full rounded-t-sm bg-[rgba(56,189,248,0.15)] hover:bg-[rgba(56,189,248,0.3)] transition-all relative overflow-hidden"
            style={{ height: `${Math.max((item.views / maxViews) * 100, 8)}%` }}
          >
            {/* Click fill overlay */}
            <div
              className="absolute bottom-0 left-0 right-0 bg-[#16c784]/60"
              style={{ height: item.views > 0 ? `${(item.clicks / item.views) * 100}%` : '0%' }}
            />
          </div>
          {/* Label */}
          <span className="text-[9px] text-[#4a5470] mt-1">{item.date.split(' ')[0]}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Empty State ────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-3xl bg-[#0d1117] border border-[rgba(255,255,255,0.06)] flex items-center justify-center text-4xl">
          🏡
        </div>
        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#16c784] flex items-center justify-center text-[#07090f] text-xs font-bold">
          +
        </div>
      </div>
      <h3 className="text-base font-bold text-[#f0f4ff] mb-2">No listings yet</h3>
      <p className="text-sm text-[#4a5470] max-w-xs leading-relaxed">
        Create your first premium property listing and start sharing with prospects in under 60 seconds.
      </p>
      <Link href="/dashboard/properties/new" className="os-btn-primary mt-6 text-sm">
        <span>+</span>
        <span>Create First Listing</span>
      </Link>
    </div>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────────
export default function DashboardPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [shareData, setShareData] = useState<{
    url: string;
    whatsappText: string;
    propertyTitle: string;
  } | null>(null);

  const [generatingShareId, setGeneratingShareId] = useState<string | null>(null);

  // Fetch analytics metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery<DashboardMetrics>({
    queryKey: ['dashboardMetrics'],
    queryFn: () => fetchApi('/analytics/dashboard/'),
    staleTime: 30_000,
  });

  // Fetch properties
  const { data: properties, isLoading: propertiesLoading } = useQuery<Property[]>({
    queryKey: ['properties'],
    queryFn: () => fetchApi('/properties/'),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => fetchApi(`/properties/${id}/duplicate/`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetchApi(`/properties/${id}/`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
    },
  });

  const handleShare = useCallback(async (property: Property) => {
    setGeneratingShareId(property.id);
    try {
      const res = await fetchApi('/sharing/links/', {
        method: 'POST',
        body: JSON.stringify({ property: property.id }),
      });
      setShareData({
        url: res.full_share_url,
        whatsappText: res.whatsapp_share_text,
        propertyTitle: property.title,
      });
    } catch {
      // could show toast
    } finally {
      setGeneratingShareId(null);
    }
  }, []);

  const isLoading = metricsLoading || propertiesLoading;
  const summary = metrics?.summary;
  const totalMobile = Object.values(metrics?.device_distribution ?? {}).reduce((a, b) => a + b, 0);
  const mobilePercent = totalMobile > 0
    ? Math.round(((metrics?.device_distribution?.MOBILE ?? 0) / totalMobile) * 100)
    : 0;

  return (
    <>
      {/* ── Share Modal ── */}
      {shareData && (
        <ShareModal
          url={shareData.url}
          whatsappText={shareData.whatsappText}
          propertyTitle={shareData.propertyTitle}
          onClose={() => setShareData(null)}
        />
      )}

      <div className="space-y-8 os-fade-in">
        {/* ── Page header ── */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <p className="os-label mb-1">Good morning, {user?.name?.split(' ')[0] ?? 'Broker'}</p>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#f0f4ff]">
              Workspace Overview
            </h1>
          </div>
          <Link href="/dashboard/properties/new" className="os-btn-primary shrink-0">
            <span className="text-base leading-none">+</span>
            <span>New Listing</span>
          </Link>
        </div>

        {/* ── Stats grid ── */}
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="os-skeleton h-28 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Listings"
              value={summary?.total_properties ?? 0}
              sublabel="Active inventory"
              gradientClass="grad-blue"
              icon="🏠"
            />
            <StatCard
              label="Page Views"
              value={(summary?.total_views ?? 0).toLocaleString()}
              sublabel="Cumulative"
              gradientClass="grad-purple"
              icon="👁"
            />
            <StatCard
              label="WhatsApp Clicks"
              value={summary?.whatsapp_clicks ?? 0}
              sublabel="Leads captured"
              gradientClass="grad-emerald"
              icon="💬"
            />
            <StatCard
              label="Conversion Rate"
              value={`${(summary?.conversion_rate ?? 0).toFixed(1)}%`}
              sublabel={`${mobilePercent}% mobile traffic`}
              gradientClass="grad-amber"
              icon="📈"
            />
          </div>
        )}

        {/* ── Analytics row ── */}
        {!isLoading && metrics && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* 7-day chart */}
            <div className="lg:col-span-2 os-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-[#f0f4ff]">Performance</h3>
                  <p className="text-xs text-[#4a5470] mt-0.5">Views vs WhatsApp clicks, last 7 days</p>
                </div>
                <div className="flex items-center gap-4 text-[10px] text-[#4a5470] font-medium">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-sm inline-block bg-[rgba(56,189,248,0.3)]" /> Views
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-sm inline-block bg-[#16c784]/60" /> Clicks
                  </span>
                </div>
              </div>
              <MiniBarChart data={metrics.performance_chart} />
            </div>

            {/* Top performers */}
            <div className="os-card p-5 flex flex-col">
              <h3 className="text-sm font-semibold text-[#f0f4ff] mb-4">Top Properties</h3>
              <div className="flex-1 space-y-3">
                {metrics.top_properties.length > 0 ? (
                  metrics.top_properties.slice(0, 5).map((item, rank) => {
                    const maxViews = Math.max(...metrics.top_properties.map(p => p.views), 1);
                    return (
                      <div key={item.id} className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-[#4a5470] w-4 text-center">
                          {rank + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-[#c8d0e0] truncate">{item.title}</div>
                          {/* Progress bar */}
                          <div className="mt-1 h-1 bg-[rgba(255,255,255,0.04)] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#16c784] rounded-full transition-all"
                              style={{ width: `${(item.views / maxViews) * 100}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-[10px] font-semibold text-[#4a5470] shrink-0">
                          {item.views}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex-1 flex items-center justify-center text-xs text-[#4a5470] py-8">
                    Share a listing to see analytics
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Inventory section ── */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-[#f0f4ff]">Property Inventory</h2>
              {properties && properties.length > 0 && (
                <p className="text-xs text-[#4a5470] mt-0.5">
                  {properties.length} listing{properties.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="os-skeleton rounded-2xl h-80" />
              ))}
            </div>
          ) : !properties || properties.length === 0 ? (
            <div className="os-card">
              <EmptyState />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {properties.map(property => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  isGeneratingShare={generatingShareId === property.id}
                  onShare={() => handleShare(property)}
                  onDuplicate={() => duplicateMutation.mutate(property.id)}
                  onDelete={() => {
                    if (confirm(`Delete "${property.title}"? This cannot be undone.`)) {
                      deleteMutation.mutate(property.id);
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
