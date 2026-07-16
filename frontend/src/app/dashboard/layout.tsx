'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';

interface NavItemProps {
  href: string;
  label: string;
  isActive: boolean;
  icon: React.ReactNode;
  badge?: number;
}

function NavItem({ href, label, isActive, icon, badge }: NavItemProps) {
  return (
    <Link
      href={href}
      className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
        isActive
          ? 'bg-[#0d1117] text-[#f0f4ff] shadow-sm'
          : 'text-[#8892aa] hover:text-[#c8d0e0] hover:bg-[#0d1117]/60'
      }`}
    >
      {/* Active accent bar */}
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-[#16c784]" />
      )}
      <span className={`text-[18px] transition-transform duration-150 ${!isActive && 'group-hover:scale-110'}`}>
        {icon}
      </span>
      <span className="hidden lg:block truncate">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="ml-auto hidden lg:flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#16c784]/15 text-[#16c784] text-[10px] font-bold">
          {badge}
        </span>
      )}
    </Link>
  );
}

function MobileNavItem({ href, label, isActive, icon }: NavItemProps) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center flex-1 py-2 gap-1 text-[10px] font-semibold transition-colors duration-150 ${
        isActive ? 'text-[#16c784]' : 'text-[#4a5470] hover:text-[#8892aa]'
      }`}
    >
      <span className="text-[20px]">{icon}</span>
      <span>{label}</span>
      {isActive && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-[#16c784]" />}
    </Link>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, loadUser, logout } = useAuthStore();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      const activeUser = await loadUser();
      if (!activeUser) {
        router.push('/auth/login');
      } else {
        setAuthChecked(true);
      }
    };
    initAuth();
  }, [loadUser, router]);

  if (isLoading || !authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07090f]">
        <div className="flex flex-col items-center gap-5">
          {/* PropertyOS Logo Mark */}
          <div className="w-12 h-12 rounded-2xl bg-[#0d1117] border border-[rgba(255,255,255,0.08)] flex items-center justify-center">
            <span className="text-2xl">🏢</span>
          </div>
          {/* Loading indicator */}
          <div className="flex gap-1.5">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-[#16c784]"
                style={{
                  animation: `bounce 0.8s ease-in-out ${i * 0.15}s infinite alternate`,
                }}
              />
            ))}
          </div>
          <style>{`
            @keyframes bounce {
              from { opacity: 0.2; transform: scale(0.8); }
              to   { opacity: 1;   transform: scale(1.2); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  const navItems = [
    { href: '/dashboard', label: 'Overview', icon: <span>⊞</span> },
    { href: '/dashboard/properties/new', label: 'New Listing', icon: <span>＋</span> },
    { href: '/dashboard/chats', label: 'Chats', icon: <span>💬</span> },
    { href: '/dashboard/leads', label: 'Leads', icon: <span>🎯</span> },
    { href: '/dashboard/settings', label: 'Branding', icon: <span>✦</span> },
    { href: '/dashboard/settings/profile', label: 'Profile', icon: <span>👤</span> },
  ];

  const workspaceName = user?.tenant?.name || 'My Workspace';
  const workspaceLogo = user?.tenant?.logo_url;
  const brandColor = user?.tenant?.brand_color || '#16c784';
  const userInitial = user?.name?.[0]?.toUpperCase() || 'B';

  return (
    <div className="flex min-h-screen bg-[#07090f] flex-col md:flex-row">
      {/* ─── DESKTOP SIDEBAR ─────────────────────────────────── */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-full w-[64px] lg:w-[220px] z-30 border-r border-[rgba(255,255,255,0.05)] bg-[#0a0c14]">
        {/* Logo area */}
        <div className="flex items-center gap-3 px-3 lg:px-4 h-16 border-b border-[rgba(255,255,255,0.05)]">
          <div
            className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center text-base font-bold text-[#07090f]"
            style={{ background: brandColor }}
          >
            {workspaceLogo
              ? <img src={workspaceLogo} alt="logo" className="w-full h-full object-cover rounded-xl" />
              : <span style={{ color: '#07090f' }}>{userInitial}</span>
            }
          </div>
          <div className="hidden lg:block min-w-0">
            <p className="text-sm font-semibold text-[#f0f4ff] truncate leading-tight">{workspaceName}</p>
            <p className="text-[10px] text-[#16c784] font-medium tracking-wide">Broker Suite</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 flex flex-col gap-1 p-2 lg:p-3 mt-2">
          {navItems.map(item => (
            <NavItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              isActive={pathname === item.href}
            />
          ))}
        </nav>

        {/* User profile footer */}
        <div className="border-t border-[rgba(255,255,255,0.05)] p-2 lg:p-3">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-[#0d1117]/60 group cursor-pointer transition-all">
            <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-bold bg-[#16c784]/15 text-[#16c784] border border-[#16c784]/20">
              {userInitial}
            </div>
            <div className="hidden lg:block min-w-0 flex-1">
              <p className="text-xs font-semibold text-[#c8d0e0] truncate">{user?.name}</p>
              <p className="text-[10px] text-[#4a5470] truncate">{user?.role}</p>
            </div>
            <button
              onClick={logout}
              className="hidden lg:flex items-center justify-center w-6 h-6 rounded-lg text-[#4a5470] hover:text-[#f43f5e] hover:bg-[#f43f5e]/10 transition-all opacity-0 group-hover:opacity-100 text-xs ml-auto"
              title="Sign out"
            >
              ⎋
            </button>
          </div>
        </div>
      </aside>

      {/* ─── MOBILE TOPBAR ───────────────────────────────────── */}
      <header className="md:hidden flex items-center justify-between px-4 h-14 border-b border-[rgba(255,255,255,0.05)] bg-[#0a0c14] sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-bold"
            style={{ background: brandColor, color: '#07090f' }}
          >
            {workspaceLogo
              ? <img src={workspaceLogo} alt="logo" className="w-full h-full object-cover rounded-lg" />
              : userInitial
            }
          </div>
          <span className="text-sm font-semibold text-[#f0f4ff] truncate max-w-[160px]">{workspaceName}</span>
        </div>
        <button
          onClick={logout}
          className="text-[#4a5470] hover:text-[#8892aa] text-sm p-1.5 rounded-lg hover:bg-[#0d1117] transition-all"
          title="Sign out"
        >
          ⎋
        </button>
      </header>

      {/* ─── MAIN CONTENT ────────────────────────────────────── */}
      <main className="flex-1 md:ml-[64px] lg:ml-[220px] min-h-screen">
        <div className="max-w-[1280px] mx-auto px-4 md:px-6 lg:px-10 py-6 md:py-10 pb-24 md:pb-10">
          {children}
        </div>
      </main>

      {/* ─── MOBILE BOTTOM NAV ──────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-stretch border-t border-[rgba(255,255,255,0.05)] bg-[#07090f]/95 backdrop-blur-xl safe-area-pb">
        {navItems.map(item => (
          <MobileNavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            isActive={pathname === item.href}
          />
        ))}
      </nav>
    </div>
  );
}
