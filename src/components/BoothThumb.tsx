'use client';

import React, { useState } from 'react';
import { Compass } from 'lucide-react';

interface BoothThumbProps {
  src?: string | null;
  alt: string;
  className?: string;
  iconClassName?: string;
}

export default function BoothThumb({
  src,
  alt,
  className = '',
  iconClassName = 'w-2/5 h-2/5',
}: BoothThumbProps) {
  const [failed, setFailed] = useState(false);
  const show = Boolean(src) && !failed;

  if (!show) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`w-full h-full flex items-center justify-center bg-ink text-cream-200/70 blueprint-grid-dark ${className}`}
      >
        <Compass className={iconClassName} strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <img
      src={src as string}
      alt={alt}
      width={800}
      height={600}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`w-full h-full object-cover ${className}`}
    />
  );
}
