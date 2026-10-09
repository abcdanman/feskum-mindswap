'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Ticket, Compass, Mic, ShieldAlert } from 'lucide-react';
import { getOrInitVisitorId } from '@/lib/visitor';
import { getVisitorVisits } from '@/lib/supabase';

export default function Navbar() {
  const pathname = usePathname();
  const [stampCount, setStampCount] = useState<number>(0);

  useEffect(() => {
    async function loadStamps() {
      const visitorId = getOrInitVisitorId();
      const visits = await getVisitorVisits(visitorId);
      setStampCount(visits.length);
    }
    loadStamps();
    const interval = setInterval(loadStamps, 4000);
    return () => clearInterval(interval);
  }, [pathname]);

  const navItems = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Passport', href: '/passport', icon: Ticket, badge: stampCount },
    { label: 'Explore', href: '/exhibition', icon: Compass },
    { label: 'UM Talk', href: '/talks', icon: Mic },
    { label: 'Admin', href: '/admin', icon: ShieldAlert },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/80 px-2 py-2 shadow-lg">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center py-1.5 px-3 rounded-2xl transition-all ${
                isActive
                  ? 'text-brand-600 font-extrabold bg-brand-50/80 scale-105'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'text-brand-600' : ''}`} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-brand-500 text-white font-extrabold text-[10px] w-4 h-4 rounded-full flex items-center justify-center border border-white shadow-sm">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
