
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import MCCalculator from "@/components/apps/mc-calculator/mc-calculator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XIcon, MinusIcon } from "lucide-react";

type AppType = 'system' | 'alertDialog';

interface AppInstance {
  id: string;
  title: string;
  component: React.ReactNode;
  isOpen: boolean;
  position: { x: number; y: number };
  zIndex: number;
  isMinimized?: boolean;
  size: { width: string; height: string; maxWidth: string; maxHeight: string };
  appType: AppType;
}

const SYSTEM_APP_Z_MIN = 901;
const SYSTEM_APP_Z_MAX = 920;
const ALERT_DIALOG_Z_MIN = 921; 
const ALERT_DIALOG_Z_MAX = 940; 


export default function Workspace() {
  const [apps, setApps] = useState<AppInstance[]>([]);
  const [activeDrag, setActiveDrag] = useState<{ appId: string; offsetX: number; offsetY: number } | null>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);

  const bringToFront = useCallback((id: string) => {
    setApps((prevApps) => {
      const appToFocus = prevApps.find(app => app.id === id);
      if (!appToFocus) return prevApps;

      let minZForType: number;
      let maxZForType: number;

      switch (appToFocus.appType) {
        case 'system':
          minZForType = SYSTEM_APP_Z_MIN;
          maxZForType = SYSTEM_APP_Z_MAX;
          break;
        case 'alertDialog': 
          minZForType = ALERT_DIALOG_Z_MIN;
          maxZForType = ALERT_DIALOG_Z_MAX;
          break;
        default: 
          // Fallback for unclassified app types (should not happen with current setup)
          const globalMaxZOfOthers = prevApps
            .filter(app => app.id !== id)
            .reduce((max, app) => Math.max(max, app.zIndex), 0);
          const newZIndexForAppToFocusDefault = globalMaxZOfOthers + 1;
          if (appToFocus.zIndex === newZIndexForAppToFocusDefault) return prevApps;
          return prevApps.map(app => app.id === id ? { ...app, zIndex: newZIndexForAppToFocusDefault } : app);
      }
      
      const maxZOfOtherSimilarApps = prevApps
        .filter(app => app.appType === appToFocus.appType && app.id !== id)
        .reduce((max, app) => Math.max(max, app.zIndex), minZForType - 1);
      
      let targetZ = maxZOfOtherSimilarApps + 1;
      const newZIndexForAppToFocus = Math.min(maxZForType, Math.max(minZForType, targetZ));

      // If already at the target z-index, no need to update (prevents unnecessary re-renders)
      if (appToFocus.zIndex === newZIndexForAppToFocus) {
        return prevApps;
      }

      return prevApps.map((app) =>
        app.id === id ? { ...app, zIndex: newZIndexForAppToFocus } : app
      );
    });
  }, []); // Removed setApps from deps, as it's stable


  useEffect(() => {
    const initialApps: AppInstance[] = [
      {
        id: "mc-calculator",
        title: "Monte Carlo Calculator",
        component: <MCCalculator />, 
        isOpen: true,
        position: { x: 50, y: 50 },
        zIndex: SYSTEM_APP_Z_MIN,
        isMinimized: false,
        size: { width: '90vw', height: 'calc(100vh - 100px)', maxWidth: '800px', maxHeight: '800px' },
        appType: 'system',
      },
    ];
    setApps(initialApps);
  }, []);


  const toggleMinimize = (id: string) => {
    const appToToggle = apps.find(app => app.id ===id);
    if (!appToToggle) return;

    setApps(prevApps =>
      prevApps.map(app =>
        app.id === id ? { ...app, isMinimized: !app.isMinimized } : app
      )
    );
     if (appToToggle.isMinimized) { 
      bringToFront(id);
    }
  };

  const closeApp = (id: string) => {
    setApps(prevApps => prevApps.map(app => app.id === id ? { ...app, isOpen: false } : app));
  };

  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>, appId: string) => {
    bringToFront(appId);
    const appElement = document.getElementById(`app-${appId}`);
    if (appElement) {
      const currentApp = apps.find(app => app.id === appId);
      // Only allow dragging if the app is not minimized
      if(currentApp && !currentApp.isMinimized) { 
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
      
      const appData = apps.find(app => app.id === activeDrag.appId);
      if (!appData || appData.isMinimized) { // Stop drag if app becomes minimized
        setActiveDrag(null); // Reset activeDrag state
        return;
      }

      const appRect = appElement.getBoundingClientRect(); // Get current app dimensions
      const workspaceRect = workspaceRef.current.getBoundingClientRect();

      // Calculate new position based on viewport coordinates
      let newViewportX = e.clientX - activeDrag.offsetX;
      let newViewportY = e.clientY - activeDrag.offsetY;

      // Convert viewport coordinates to be relative to the workspace
      let newRelativeX = newViewportX - workspaceRect.left;
      let newRelativeY = newViewportY - workspaceRect.top;
      
      // Constrain within workspace boundaries
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
  }, [activeDrag, apps]); // Removed bringToFront, setApps is stable and apps covers data changes


  return (
    <div ref={workspaceRef} className="relative w-full h-screen overflow-hidden">
      {/* The TextHoverEffect component has been removed from here */}
      {apps
        .filter((app) => app.isOpen)
        .map((app) => (
          <Card
            key={app.id}
            id={`app-${app.id}`}
            className="absolute shadow-2xl flex flex-col border border-border rounded-lg overflow-hidden bg-card" 
            style={{
              left: `${app.position.x}px`,
              top: `${app.position.y}px`,
              zIndex: app.zIndex,
              width: app.isMinimized ? '250px': app.size.width,
              height: app.isMinimized ? 'auto' : app.size.height,
              maxWidth: app.isMinimized ? '250px': app.size.maxWidth,
              maxHeight: app.isMinimized ? 'auto' : app.size.maxHeight,
              userSelect: activeDrag?.appId === app.id ? 'none' : 'auto',
              transition: activeDrag?.appId === app.id ? 'none' : 'width 0.2s ease-out, height 0.2s ease-out',
            }}
            onMouseDown={() => { // Bring to front on any click on the card
              bringToFront(app.id);
            }}
          >
            <CardHeader
              className="bg-card p-2 flex flex-row items-center justify-between cursor-grab border-b"
              onMouseDown={(e) => {
                // Prevent card's onMouseDown from firing if header is clicked for dragging,
                // but allow bringToFront to be called by handleDragStart itself.
                e.stopPropagation(); 
                handleDragStart(e, app.id);
              }}
            >
              <CardTitle className="text-sm font-medium select-none pl-1">{app.title}</CardTitle>
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
              <CardContent className="p-0 flex-grow overflow-hidden"> {/* Ensure content can grow and scroll if app has fixed height */}
                {app.component}
              </CardContent>
            )}
             {app.isMinimized && (
                // Add a small fixed height or padding to the minimized card body if needed, or just an empty div
                <div className="h-2"></div> // Minimal height for minimized state
             )}
          </Card>
        ))}
    </div>
  );
}
    
