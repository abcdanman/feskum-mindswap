import Link from 'next/link';
import { WifiOff, RotateCw } from 'lucide-react';

export const metadata = {
  title: "You're offline — MindSwap 2026",
};

export default function OfflinePage() {
  return (
    <div className="min-h-[70dvh] flex items-center justify-center px-4">
      <div className="card p-6 max-w-sm w-full text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-cream-200 border-2 border-ink flex items-center justify-center">
          <WifiOff className="w-6 h-6 text-ink" aria-hidden="true" />
        </div>
        <div>
          <h1 className="display text-2xl text-ink leading-none">You&apos;re offline</h1>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            This page needs a connection you don&apos;t have right now. Pages you&apos;ve already opened still work — try
            going back, or reconnect and reload.
          </p>
        </div>
        <a
          href="/"
          className="btn w-full py-3 bg-brand-500 hover:bg-brand-600 text-white text-xs inline-flex items-center justify-center gap-1.5"
        >
          <RotateCw className="w-3.5 h-3.5" aria-hidden="true" />
          Try again
        </a>
        <Link href="/" className="block text-[11px] text-slate-500 underline">
          Back to home
        </Link>
      </div>
    </div>
  );
}
