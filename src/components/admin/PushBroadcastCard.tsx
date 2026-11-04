'use client';

import React, { useState } from 'react';
import { Megaphone, Send, CheckCircle2, AlertTriangle } from 'lucide-react';
import { broadcastPushNotification } from '@/lib/supabase';

const PRESETS = [
  { title: 'Voting is now open!', body: "Cast your vote for UM Talk's People's Choice Award." },
  { title: "You're so close!", body: 'A few more booths and your reward is unlocked.' },
  { title: 'Day 2 starts soon', body: "See you back at the Marquee Tent — don't forget to scan in." },
];

export default function PushBroadcastCard() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number; error: string | null } | null>(null);

  const send = async () => {
    if (!title.trim()) return;
    setSending(true);
    setResult(null);
    const res = await broadcastPushNotification(title.trim(), body.trim(), url.trim() || undefined);
    setResult(res);
    setSending(false);
    if (!res.error) {
      setTitle('');
      setBody('');
      setUrl('');
    }
  };

  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-center gap-2 border-b-2 border-ink/10 pb-3">
        <Megaphone className="w-5 h-5 text-brand-600" aria-hidden="true" />
        <div>
          <h3 className="display text-xl text-ink leading-none">Send announcement</h3>
          <p className="text-[11px] text-slate-500">Push notification to every opted-in visitor's device</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map(preset => (
          <button
            key={preset.title}
            type="button"
            onClick={() => {
              setTitle(preset.title);
              setBody(preset.body);
            }}
            className="px-2.5 py-1 rounded-full bg-cream-100 border-2 border-ink/15 text-[10px] font-bold text-slate-600 hover:border-ink/40"
          >
            {preset.title}
          </button>
        ))}
      </div>

      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Title — e.g. Voting is now open!"
        maxLength={80}
        className="w-full px-3 py-2.5 rounded-xl border-2 border-ink text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-400"
      />
      <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        placeholder="Message (optional)"
        rows={2}
        maxLength={160}
        className="w-full px-3 py-2.5 rounded-xl border-2 border-ink text-xs resize-none focus:outline-none focus:ring-2 focus:ring-brand-400"
      />
      <input
        value={url}
        onChange={e => setUrl(e.target.value)}
        placeholder="Link on tap (optional) — e.g. /talks/vote"
        className="w-full px-3 py-2.5 rounded-xl border-2 border-ink/20 text-xs focus:outline-none focus:ring-2 focus:ring-brand-400"
      />

      <button
        onClick={send}
        disabled={sending || !title.trim()}
        className="btn w-full py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-xs flex items-center justify-center gap-1.5"
      >
        <Send className="w-3.5 h-3.5" aria-hidden="true" />
        {sending ? 'Sending…' : 'Send now'}
      </button>

      {result && (
        <div
          className={`p-2.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 border-2 border-ink ${
            result.error ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-800'
          }`}
        >
          {result.error ? (
            <>
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {result.error}
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Sent to {result.sent} device{result.sent === 1 ? '' : 's'}
              {result.failed ? ` · ${result.failed} failed (stale, removed)` : ''}
            </>
          )}
        </div>
      )}
    </div>
  );
}
