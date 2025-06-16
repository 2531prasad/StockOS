import { cn } from "@/lib/utils";
import React from "react";

interface DottedBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {}

export function DottedBackground({ className, ...props }: DottedBackgroundProps) {
  return (
    <div
      className={cn(
        "absolute inset-0 z-0", // z-0 to be behind other workspace content
        // Dotted pattern:
        // Light theme dots are neutral-300 on a white effective background (from mask)
        // Dark theme dots are neutral-700 on a black effective background (from mask)
        "[background-size:20px_20px]",
        "bg-transparent [background-image:radial-gradient(theme(colors.neutral.300)_1px,transparent_1px)] dark:[background-image:radial-gradient(theme(colors.neutral.700)_1px,transparent_1px)]",
        
        // Radial gradient mask for faded look.
        // This div itself becomes the mask for the underlying background color of the Workspace.
        // The colors here define what part of the dots are visible vs. what part shows the Workspace's `bg-background`.
        "pointer-events-none",
        className
      )}
      {...props}
    >
      {/* This inner div creates the fade effect by masking the dots themselves */}
      <div className="absolute inset-0 bg-background [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
    </div>
  );
}
