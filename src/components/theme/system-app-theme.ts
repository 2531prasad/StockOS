
// src/components/theme/system-app-theme.ts

export const systemAppTheme = {
  layout: {
    /**
     * Base layout for all system apps.
     * Uses oklch card background, subtle blur, border, shadow, and rounded container.
     */
    card: [
      "absolute",
      "flex",
      "flex-col",
      "rounded-xl",
      "overflow-hidden",
      "border",
      "border-border", // from globals.css
      "shadow-2xl",    // for focused state, managed in Workspace.tsx
      "backdrop-blur-sm",
      "bg-card", // from globals.css, e.g. oklch(0.205 0 0 / 0.77) in dark
      "text-card-foreground" // from globals.css
    ].join(" "),
  },

  typography: {
    fontFamily: "font-sans", // Assuming 'Inter' is set as font-sans in tailwind.config or globals.css
    monospace: "font-mono tabular-nums",
    baseText: "text-sm text-card-foreground", // Added text-card-foreground
    heading: "text-lg font-semibold text-card-foreground", // Added text-card-foreground
    statLabel: "text-xs text-muted-foreground",
    output: "text-2xl md:text-3xl font-bold text-primary",
  },

  effects: {
    shadow: "shadow-2xl", // for default window elevation
    shadowFocused: "shadow-[0_25px_50px_-12px_oklch(0.2_0_0_/0.9)]",
    shadowHovered: "hover:shadow-[0_20px_25px_-5px_oklch(0_0_0_/0.1),0_8px_10px_-6px_oklch(0_0_0_/0.1)]",
    transition: "transition-colors transition-shadow duration-150",
    blur: "backdrop-blur-sm", // This is applied by CardContent in Workspace for focused
  }
};
