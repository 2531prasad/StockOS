
"use client";

import Image from 'next/image';
// Assuming the image will be placed here by the user:
import huskyImage from '@/components/images/image-husky.png'; 

interface ImageViewerProps {
  // Props could be added here in a real app if the image source were dynamic
}

export default function ImageViewer({}: ImageViewerProps) {
  const altText = "Cute Husky Dog";

  return (
    <div className="w-full h-full flex items-center justify-center bg-card overflow-hidden">
      <div className="relative w-full h-full">
        <Image
          src={huskyImage} 
          alt={altText}
          fill 
          style={{ objectFit: 'contain' }}
          data-ai-hint="husky dog" 
          priority // Good for LCP if this is the primary content of the window
        />
      </div>
    </div>
  );
}
