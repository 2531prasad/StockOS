
"use client";

import Image from 'next/image';
import type { StaticImageData } from 'next/image';

interface ImageViewerProps {
  // In a real app, you might pass these as props
  // imageUrl: string | StaticImageData;
  // altText: string;
}

export default function ImageViewer({}: ImageViewerProps) {
  // For this prototype, we'll use a placeholder
  const placeholderUrl = "https://placehold.co/400x400.png";
  const altText = "Cute Husky Dog";

  return (
    <div className="w-full h-full flex items-center justify-center bg-card overflow-hidden">
      <div className="relative w-full h-full">
        <Image
          src={placeholderUrl}
          alt={altText}
          layout="fill"
          objectFit="contain"
          data-ai-hint="husky dog"
          priority // Good for LCP if this is the primary content of the window
        />
      </div>
    </div>
  );
}
