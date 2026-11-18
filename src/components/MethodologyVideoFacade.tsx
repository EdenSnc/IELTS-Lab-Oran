'use client';

import { useState } from 'react';
import Image from 'next/image';

interface MethodologyVideoFacadeProps {
  videoAriaLabel: string;
  videoAlt: string;
}

export default function MethodologyVideoFacade({
  videoAriaLabel,
  videoAlt,
}: MethodologyVideoFacadeProps) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <div className="mt-16 max-w-3xl mx-auto rounded-[2.5rem] overflow-hidden shadow-2xl relative aspect-video bg-charcoal border-4 border-surface">
        <iframe
          src="https://www.youtube-nocookie.com/embed/r5eiUU3EpHE?autoplay=1&rel=0"
          title={videoAlt}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label={videoAriaLabel}
      className="block w-full mt-16 max-w-3xl mx-auto rounded-[2.5rem] overflow-hidden shadow-2xl relative aspect-video bg-charcoal group cursor-pointer border-4 border-surface"
    >
      <Image
        src="https://img.youtube.com/vi/r5eiUU3EpHE/maxresdefault.jpg"
        alt={videoAlt}
        fill
        sizes="(max-width: 768px) 92vw, 768px"
        className="object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500"
        loading="lazy"
      />
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="w-20 h-20 bg-[#c4162c] rounded-[1.5rem] flex items-center justify-center shadow-glow group-hover:scale-110 transition-transform duration-300">
          <svg className="w-8 h-8 text-white ms-1.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M4 4l12 6-12 6z" />
          </svg>
        </span>
      </span>
    </button>
  );
}
