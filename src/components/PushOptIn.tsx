'use client';

import React, { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { subscribeToPush } from '@/lib/supabase';

const DISMISS_KEY = 'mindswap_push_dismissed';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

export default function PushOptIn() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) return;
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (localStorage.getItem(DISMISS_KEY)) return;
    if (typeof Notification !== 'undefined' && Notification.permission !== 'default') return;
    setVisible(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
  };

  const enable = async () => {
    setBusy(true);
    setError('');
    try {
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) throw new Error('not configured');

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        dismiss();
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });

      const { error: saveError } = await subscribeToPush(subscription.toJSON());
      if (saveError) {
        setError(saveError);
        setBusy(false);
        return;
      }
      localStorage.setItem(DISMISS_KEY, '1');
      setVisible(false);
    } catch {
      setError('Could not enable notifications on this device.');
      setBusy(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="card p-3.5 flex items-start gap-3 bg-brand-50 border-brand-200">
      <div className="w-9 h-9 rounded-xl bg-brand-500 border-2 border-ink flex items-center justify-center text-white shrink-0">
        <Bell className="w-4 h-4" aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-xs font-extrabold text-ink">Don&apos;t miss Day 2</h4>
        <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
          Get notified when voting opens, your reward unlocks, or the programme changes.
        </p>
        {error && <p className="text-[10px] text-rose-600 mt-1">{error}</p>}
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={enable}
            disabled={busy}
            className="btn px-3 py-1.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-[11px]"
          >
            {busy ? 'Enabling…' : 'Enable notifications'}
          </button>
          <button onClick={dismiss} className="text-[11px] font-bold text-slate-500 hover:text-ink px-2">
            Not now
          </button>
        </div>
      </div>
      <button onClick={dismiss} aria-label="Dismiss" className="p-1 text-slate-400 hover:text-ink shrink-0">
        <X className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
