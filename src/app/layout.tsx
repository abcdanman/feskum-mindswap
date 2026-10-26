import type { Metadata } from 'next';
import { Anton, Space_Grotesk, Space_Mono } from 'next/font/google';
import './globals.css';
import IdentityGate from '@/components/IdentityGate';

const display = Anton({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-display',
  display: 'swap',
});

const grotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-grotesk',
  display: 'swap',
});

const mono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-mono',
  display: 'swap',
});

const SITE_URL = 'https://feskum-mindswap.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'MindSwap @ FESKUM 2026 — Interactive Event Web App',
  description:
    'Official Laluan Aspirasi digital passport, exhibition booth guide, and UM Talk People Choice voting web platform for MindSwap @ FESKUM 2026, Universiti Malaya.',
  keywords: ['MindSwap', 'FESKUM 2026', 'Laluan Aspirasi', 'Universiti Malaya', 'UM Talk', 'Digital Passport'],
  applicationName: 'MindSwap 2026',
  appleWebApp: {
    capable: true,
    title: 'MindSwap 2026',
    statusBarStyle: 'default',
  },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: 'MindSwap @ FESKUM 2026',
    title: 'MindSwap @ FESKUM 2026 — Interactive Event Web App',
    description:
      'Digital passport, exhibition booth guide and UM Talk People Choice voting for MindSwap @ FESKUM 2026, Universiti Malaya.',
    images: [{ url: '/icon-512.png', width: 512, height: 512, alt: 'MindSwap @ FESKUM 2026' }],
  },
  twitter: {
    card: 'summary',
    title: 'MindSwap @ FESKUM 2026',
    description:
      'Digital passport, exhibition booth guide and UM Talk People Choice voting for MindSwap @ FESKUM 2026, Universiti Malaya.',
    images: ['/icon-512.png'],
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#F8F6F0',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body
        className={`${display.variable} ${grotesk.variable} ${mono.variable} grain min-h-dvh bg-cream-50 text-ink antialiased flex flex-col pb-[calc(7rem+env(safe-area-inset-bottom))] font-sans`}
        suppressHydrationWarning={true}
      >
        <a href="#main-content" className="skip-link btn bg-brand-500 text-white px-4 py-2 text-xs uppercase">
          Skip to content
        </a>
        <IdentityGate>{children}</IdentityGate>
      </body>
    </html>
  );
}
