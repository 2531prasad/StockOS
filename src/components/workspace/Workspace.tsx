
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
}

export default function Workspace() {
  const [apps, setApps] = useState<AppInstance[]>([
    {
      id: "mc-calculator",
      title: "Monte Carlo Calculator",
      component: <MCCalculator />,
      isOpen: true,
      position: { x: 50, y: 50 },
      zIndex: 1,
      isMinimized: false,
      size: { width: '90vw', height: 'calc(100vh - 100px)', maxWidth: '800px', maxHeight: '800px' }
    },
  ]);

  const [activeDrag, setActiveDrag] = useState<{ appId: string; offsetX: number; offsetY: number } | null>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);

  const bringToFront = useCallback((id: string) => {
    setApps((prevApps) => {
      const maxZIndex = prevApps.reduce((max, app) => Math.max(max, app.zIndex), 0);
      if (prevApps.find(app => app.id === id)?.zIndex === maxZIndex && maxZIndex > 0) { // Already in front or only app
        return prevApps;
      }
      return prevApps.map((app) =>
        app.id === id ? { ...app, zIndex: maxZIndex + 1 } : app
      );
    });
  }, []);

  const toggleMinimize = (id: string) => {
    setApps(prevApps =>
      prevApps.map(app =>
        app.id === id ? { ...app, isMinimized: !app.isMinimized } : app
      )
    );
     if (!apps.find(app => app.id ===id)?.isMinimized) {
      bringToFront(id);
    }
  };

  const closeApp = (id: string) => {
    setApps(prevApps => prevApps.map(app => app.id === id ? { ...app, isOpen: false } : app));
  };

  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>, appId: string) => {
    e.preventDefault(); // Prevent text selection, etc.
    bringToFront(appId);
    const appElement = document.getElementById(`app-${appId}`);
    if (appElement) {
      const rect = appElement.getBoundingClientRect();
      const workspaceRect = workspaceRef.current?.getBoundingClientRect();
      
      let startX = e.clientX;
      let startY = e.clientY;

      // Adjust for workspace offset if workspace isn't at (0,0) of viewport
      if (workspaceRect) {
          startX -= workspaceRect.left;
          startY -= workspaceRect.top;
      }
      
      const currentApp = apps.find(app => app.id === appId);
      if(currentApp) {
        const offsetX = e.clientX - currentApp.position.x;
        const offsetY = e.clientY - currentApp.position.y;
        setActiveDrag({ appId, offsetX, offsetY });
      }
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!activeDrag) return;

      let newX = e.clientX - activeDrag.offsetX;
      let newY = e.clientY - activeDrag.offsetY;

      // Optional: Clamp position to workspace bounds
      if (workspaceRef.current) {
        const workspaceRect = workspaceRef.current.getBoundingClientRect();
        const appElement = document.getElementById(`app-${activeDrag.appId}`);
        if (appElement) {
          const appRect = appElement.getBoundingClientRect();
           // Relative to viewport, so subtract workspaceRect.left/top for relative clamping
          const relativeAppWidth = appRect.width;
          const relativeAppHeight = appRect.height;

          newX = Math.max(0, Math.min(newX, workspaceRect.width - relativeAppWidth));
          newY = Math.max(0, Math.min(newY, workspaceRect.height - relativeAppHeight));
        }
      }
      
      setApps(prevApps =>
        prevApps.map(app =>
          app.id === activeDrag.appId
            ? { ...app, position: { x: newX, y: newY } }
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
  }, [activeDrag, apps]);


  return (
    <div ref={workspaceRef} className="relative w-full h-screen bg-muted/40 overflow-hidden">
      {apps
        .filter((app) => app.isOpen)
        .map((app) => (
          <Card
            key={app.id}
            id={`app-${app.id}`}
            className="absolute shadow-2xl flex flex-col"
            style={{
              left: `${app.position.x}px`,
              top: `${app.position.y}px`,
              zIndex: app.zIndex,
              width: app.isMinimized ? '250px': app.size.width, // Minimized width
              height: app.isMinimized ? 'auto' : app.size.height,
              maxWidth: app.isMinimized ? '250px': app.size.maxWidth,
              maxHeight: app.isMinimized ? 'auto' : app.size.maxHeight,
              userSelect: activeDrag?.appId === app.id ? 'none' : 'auto',
            }}
            // onMouseDown for card itself (not header) is removed for drag to avoid conflicts
          >
            <CardHeader
              className="bg-muted/50 p-2 flex flex-row items-center justify-between cursor-grab border-b"
              onMouseDown={(e) => handleDragStart(e, app.id)}
              onClick={() => { if(app.isMinimized) toggleMinimize(app.id); else bringToFront(app.id);}} // Also bring to front on header click if not dragging
            >
              <CardTitle className="text-sm font-medium">{app.title}</CardTitle>
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
              <CardContent className="p-0 flex-grow overflow-y-auto">
                {app.component}
              </CardContent>
            )}
          </Card>
        ))}
    </div>
  );
}
