import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/Header';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'MindSwap @ FESKUM 2026 — Interactive Event Web App',
  description: 'Official Laluan Aspirasi digital passport, exhibition booth guide, and UM Talk People Choice voting web platform for MindSwap @ FESKUM 2026, Universiti Malaya.',
  keywords: ['MindSwap', 'FESKUM 2026', 'Laluan Aspirasi', 'Universiti Malaya', 'UM Talk', 'Digital Passport'],
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#FAF8F5',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Outfit:wght@600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#F8F6F0] text-slate-900 antialiased flex flex-col pb-24 select-none" suppressHydrationWarning={true}>
        <Header />
        <main className="flex-1 max-w-md w-full mx-auto px-4 py-4">{children}</main>
        <Navbar />
      </body>
    </html>
  );
}
