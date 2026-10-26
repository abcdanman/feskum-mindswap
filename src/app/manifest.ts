import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MindSwap @ FESKUM 2026',
    short_name: 'MindSwap 2026',
    description: 'Digital Passport & Exhibition Guide for MindSwap @ FESKUM 2026, Universiti Malaya',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8f6f0',
    theme_color: '#0f172a',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
