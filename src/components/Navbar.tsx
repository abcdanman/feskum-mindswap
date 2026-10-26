'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Ticket, Compass, Mic, ScanLine } from 'lucide-react';
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

  const leftItems = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Passport', href: '/passport', icon: Ticket, badge: stampCount },
  ];
  const centerItem = { label: 'Scan', href: '/scan', icon: ScanLine };
  const rightItems = [
    { label: 'Booths', href: '/exhibition', icon: Compass },
    { label: 'UM Talk', href: '/talks', icon: Mic },
  ];

  const isActive = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(href));

  const NavItem = ({
    item,
  }: {
    item: { label: string; href: string; icon: React.ElementType; badge?: number };
  }) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    return (
      <Link
        href={item.href}
        aria-current={active ? 'page' : undefined}
        className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-xl transition-colors ${
          active ? 'text-brand-600' : 'text-slate-500 hover:text-ink'
        }`}
      >
        <div className="relative">
          <Icon className={`w-5 h-5 ${active ? 'text-brand-600' : ''}`} aria-hidden="true" />
          {item.badge !== undefined && item.badge > 0 && (
            <span className="absolute -top-1.5 -right-2.5 bg-brand-500 text-white font-extrabold text-[9px] min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center border-2 border-ink">
              {item.badge}
            </span>
          )}
        </div>
        <span className="text-[10px] font-bold tracking-tight">{item.label}</span>
      </Link>
    );
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 glass-nav safe-bottom" aria-label="Primary">
      <div className="max-w-md mx-auto px-3 pb-2 pt-2">
        <div className="relative flex items-end justify-between">
          <NavItem item={leftItems[0]} />
          <NavItem item={leftItems[1]} />

          <NavItem item={centerItem} />

          <NavItem item={rightItems[0]} />
          <NavItem item={rightItems[1]} />
        </div>
      </div>
    </nav>
  );
}
