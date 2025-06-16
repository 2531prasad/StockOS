
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import MCCalculator from "@/components/apps/mc-calculator/mc-calculator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XIcon, MinusIcon } from "lucide-react";

interface AppInstance {
  id: string;
  title: string;
  component: React.ReactNode;
  isOpen: boolean;
  position: { x: number; y: number };
  zIndex: number;
  isMinimized?: boolean;
  size: { width: string; height: string; maxWidth: string; maxHeight: string };
  appType: 'system'; // Add more types like 'user', 'dialog' later
}

export default function Workspace() {
  const [apps, setApps] = useState<AppInstance[]>([
    {
      id: "mc-calculator",
      title: "Monte Carlo Calculator",
      component: <MCCalculator />,
      isOpen: true,
      position: { x: 50, y: 50 },
      zIndex: 901, // Initial z-index for system app
      isMinimized: false,
      size: { width: '90vw', height: 'calc(100vh - 100px)', maxWidth: '800px', maxHeight: '800px' },
      appType: 'system',
    },
  ]);

  const [activeDrag, setActiveDrag] = useState<{ appId: string; offsetX: number; offsetY: number } | null>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);

  const bringToFront = useCallback((id: string) => {
    setApps((prevApps) => {
      const appToFocus = prevApps.find(app => app.id === id);
      if (!appToFocus) return prevApps;

      let newZIndexForAppToFocus: number;

      if (appToFocus.appType === 'system') {
        const minSystemZ = 901;
        const maxSystemZ = 950;

        // Find the current highest z-index among OTHER system apps
        const maxZOfOtherSystemApps = prevApps
          .filter(app => app.appType === 'system' && app.id !== id)
          .reduce((max, app) => Math.max(max, app.zIndex), minSystemZ - 1); // Default to one less than min if no others
        
        let targetZ = maxZOfOtherSystemApps + 1;
        // Clamp the new z-index within the system app's defined range
        newZIndexForAppToFocus = Math.min(maxSystemZ, Math.max(minSystemZ, targetZ));

      } else {
        // Generic handling for other app types (if they are added in the future)
        // This simple global increment might need refinement if other types also have bands
        const globalMaxZOfOthers = prevApps
          .filter(app => app.id !== id) // Consider only other apps
          .reduce((max, app) => Math.max(max, app.zIndex), 0); // Default to 0 if no other apps
        newZIndexForAppToFocus = globalMaxZOfOthers + 1;
        // Example: If 'user' apps had a band of 1-100:
        // if (appToFocus.appType === 'user') {
        //   newZIndexForAppToFocus = Math.min(100, Math.max(1, newZIndexForAppToFocus));
        // }
      }

      // Optimization: If the app's zIndex isn't actually changing, don't cause a re-render.
      if (appToFocus.zIndex === newZIndexForAppToFocus) {
        return prevApps;
      }

      return prevApps.map((app) =>
        app.id === id ? { ...app, zIndex: newZIndexForAppToFocus } : app
      );
    });
  }, []);

  const toggleMinimize = (id: string) => {
    setApps(prevApps =>
      prevApps.map(app =>
        app.id === id ? { ...app, isMinimized: !app.isMinimized } : app
      )
    );
     // If un-minimizing, bring it to front
     if (!apps.find(app => app.id ===id)?.isMinimized) {
      bringToFront(id);
    }
  };

  const closeApp = (id: string) => {
    setApps(prevApps => prevApps.map(app => app.id === id ? { ...app, isOpen: false } : app));
  };

  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>, appId: string) => {
    e.preventDefault(); 
    bringToFront(appId);
    const appElement = document.getElementById(`app-${appId}`);
    if (appElement) {
      const currentApp = apps.find(app => app.id === appId);
      if(currentApp) {
        // Calculate offset from the element's current screen position, not its state.position
        const rect = appElement.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;
        setActiveDrag({ appId, offsetX, offsetY });
      }
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!activeDrag || !workspaceRef.current) return;

      const appElement = document.getElementById(`app-${activeDrag.appId}`);
      if (!appElement) return;

      const appRect = appElement.getBoundingClientRect(); // Current visual size of the app
      const workspaceRect = workspaceRef.current.getBoundingClientRect();

      // Desired new top-left corner in viewport coordinates
      let newViewportX = e.clientX - activeDrag.offsetX;
      let newViewportY = e.clientY - activeDrag.offsetY;

      // Convert to position relative to the workspace
      let newRelativeX = newViewportX - workspaceRect.left;
      let newRelativeY = newViewportY - workspaceRect.top;
      
      // Clamp position to workspace bounds
      newRelativeX = Math.max(0, Math.min(newRelativeX, workspaceRect.width - appRect.width));
      newRelativeY = Math.max(0, Math.min(newRelativeY, workspaceRect.height - appRect.height));
      
      setApps(prevApps =>
        prevApps.map(app =>
          app.id === activeDrag.appId
            ? { ...app, position: { x: newRelativeX, y: newRelativeY } }
            : app
        )
      );
    };

    const handleMouseUp = () => {
      setActiveDrag(null);
    };

    if (activeDrag) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activeDrag, apps]); // apps is needed here because handleDragStart uses it indirectly


  return (
    <div ref={workspaceRef} className="relative w-full h-screen bg-muted/40 overflow-hidden">
      {apps
        .filter((app) => app.isOpen)
        .map((app) => (
          <Card
            key={app.id}
            id={`app-${app.id}`}
            className="absolute shadow-2xl flex flex-col border border-border" // Added border for better visibility
            style={{
              left: `${app.position.x}px`,
              top: `${app.position.y}px`,
              zIndex: app.zIndex,
              width: app.isMinimized ? '250px': app.size.width,
              height: app.isMinimized ? 'auto' : app.size.height,
              maxWidth: app.isMinimized ? '250px': app.size.maxWidth,
              maxHeight: app.isMinimized ? 'auto' : app.size.maxHeight,
              userSelect: activeDrag?.appId === app.id ? 'none' : 'auto',
            }}
          >
            <CardHeader
              className="bg-muted/50 p-2 flex flex-row items-center justify-between cursor-grab border-b"
              onMouseDown={(e) => handleDragStart(e, app.id)}
              onClick={() => { 
                if(app.isMinimized) {
                  toggleMinimize(app.id); // This will also call bringToFront
                } else {
                  bringToFront(app.id);
                }
              }}
            >
              <CardTitle className="text-sm font-medium select-none">{app.title}</CardTitle>
              <div className="flex space-x-1">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); toggleMinimize(app.id);}}>
                  <MinusIcon className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-destructive/80" onClick={(e) => {e.stopPropagation(); closeApp(app.id);}}>
                  <XIcon className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            {!app.isMinimized && (
              <CardContent className="p-0 flex-grow overflow-y-auto bg-card"> {/* Ensure content bg is card like */}
                {app.component}
              </CardContent>
            )}
          </Card>
        ))}
    </div>
  );
}

    