import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MindSwap @ FESKUM 2026',
    short_name: 'MindSwap 2026',
    description: 'Digital Passport & Exhibition Guide for MindSwap @ FESKUM 2026, Universiti Malaya',
    start_url: '/',
    display: 'standalone',
    background_color: '#070a12',
    theme_color: '#090d16',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}
