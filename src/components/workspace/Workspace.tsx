
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import MCCalculator from "@/components/apps/mc-calculator/mc-calculator";
import HowItWorksContent from "@/components/apps/mc-calculator/components/HowItWorksContent";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XIcon, MinusIcon, MoveDiagonal, HelpCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";


type AppType = 'system' | 'alertDialog';

interface AppInstance {
  id: string;
  title: string;
  component: React.ReactNode;
  isOpen: boolean;
  position: { x: number; y: number };
  zIndex: number;
  isMinimized?: boolean;
  previousSize?: { width: string; height: string } | null;
  size: {
    width: string;
    height: string;
    minWidth?: number;
    minHeight?: number;
    maxWidth: string; // Can be 'none' for no specific limit
    maxHeight: string; // Can be 'none' for no specific limit
  };
  appType: AppType;
}

const SYSTEM_APP_Z_MIN = 901;
const SYSTEM_APP_Z_MAX = 920;
const ALERT_DIALOG_Z_MIN = 921; 
const ALERT_DIALOG_Z_MAX = 940; 


export default function Workspace() {
  const [apps, setApps] = useState<AppInstance[]>([]);
  const [activeDrag, setActiveDrag] = useState<{ appId: string; offsetX: number; offsetY: number } | null>(null);
  const [activeResize, setActiveResize] = useState<{
    appId: string;
    initialMouseX: number;
    initialMouseY: number;
    initialWidth: number;
    initialHeight: number;
  } | null>(null);
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

      if (appToFocus.zIndex === newZIndexForAppToFocus) {
        return prevApps;
      }

      return prevApps.map((app) =>
        app.id === id ? { ...app, zIndex: newZIndexForAppToFocus } : app
      );
    });
  }, []);


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
        previousSize: null,
        size: {
            width: '450px', // Initial sensible width
            height: '172px', 
            minWidth: 400,
            minHeight: 172, 
            maxWidth: 'none', // Flexible max width
            maxHeight: 'none' // Flexible max height
        },
        appType: 'system',
      },
    ];
    setApps(initialApps);
  }, []);


  const toggleMinimize = (id: string) => {
    setApps(prevApps =>
      prevApps.map(app => {
        if (app.id === id) {
          const isCurrentlyMinimized = app.isMinimized;
          if (!isCurrentlyMinimized) { // Minimizing
            return {
              ...app,
              isMinimized: true,
              previousSize: { width: app.size.width, height: app.size.height },
              size: { ...app.size, width: '250px', height: 'auto' } // Minimized height is auto
            };
          } else { // Restoring
            bringToFront(id); 
            return {
              ...app,
              isMinimized: false,
              size: {
                ...app.size,
                width: app.previousSize?.width || (app.size.minWidth ? `${app.size.minWidth}px` : '400px'), 
                height: app.previousSize?.height || (app.size.minHeight ? `${app.size.minHeight}px` : '300px') 
              },
              previousSize: null
            };
          }
        }
        return app;
      })
    );
  };

  const closeApp = (id: string) => {
    setApps(prevApps => prevApps.map(app => app.id === id ? { ...app, isOpen: false } : app));
  };

  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>, appId: string) => {
    bringToFront(appId);
    const appElement = document.getElementById(`app-${appId}`);
    if (appElement) {
      const currentApp = apps.find(app => app.id === appId);
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
      if (!appData || appData.isMinimized) {
        setActiveDrag(null);
        return;
      }

      const appRect = appElement.getBoundingClientRect();
      const workspaceRect = workspaceRef.current.getBoundingClientRect();

      let newViewportX = e.clientX - activeDrag.offsetX;
      let newViewportY = e.clientY - activeDrag.offsetY;

      let newRelativeX = newViewportX - workspaceRect.left;
      let newRelativeY = newViewportY - workspaceRect.top;

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
  }, [activeDrag, apps]); 

  const handleResizeStart = (e: React.MouseEvent<HTMLDivElement>, appId: string) => {
    e.stopPropagation(); 
    bringToFront(appId);
    const appElement = document.getElementById(`app-${appId}`);
    const currentApp = apps.find(app => app.id === appId);
    if (appElement && currentApp && !currentApp.isMinimized) {
      const rect = appElement.getBoundingClientRect();
      setActiveResize({
        appId,
        initialMouseX: e.clientX,
        initialMouseY: e.clientY,
        initialWidth: rect.width, 
        initialHeight: rect.height, 
      });
    }
  };

  useEffect(() => {
    const handleMouseMoveResize = (e: MouseEvent) => {
      if (!activeResize || !workspaceRef.current) return;

      const currentApp = apps.find(app => app.id === activeResize.appId);
      if (!currentApp || currentApp.isMinimized) {
        setActiveResize(null);
        return;
      }

      const deltaX = e.clientX - activeResize.initialMouseX;
      const deltaY = e.clientY - activeResize.initialMouseY;

      let newWidth = activeResize.initialWidth + deltaX;
      let newHeight = activeResize.initialHeight + deltaY;

      newWidth = Math.max(currentApp.size.minWidth || 0, newWidth);
      newHeight = Math.max(currentApp.size.minHeight || 0, newHeight);
      
      const workspaceRect = workspaceRef.current.getBoundingClientRect();
      const appPos = currentApp.position;
      
      if (appPos.x + newWidth > workspaceRect.width) {
        newWidth = workspaceRect.width - appPos.x;
      }
      if (appPos.y + newHeight > workspaceRect.height) {
        newHeight = workspaceRect.height - appPos.y;
      }

      setApps(prevApps =>
        prevApps.map(app =>
          app.id === activeResize.appId
            ? {
                ...app,
                size: { 
                  ...app.size,
                  width: `${newWidth}px`, 
                  height: `${newHeight}px`,
                },
              }
            : app
        )
      );
    };

    const handleMouseUpResize = () => {
      setActiveResize(null);
    };

    if (activeResize) {
      window.addEventListener('mousemove', handleMouseMoveResize);
      window.addEventListener('mouseup', handleMouseUpResize);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMoveResize);
      window.removeEventListener('mouseup', handleMouseUpResize);
    };
  }, [activeResize, apps]);


  return (
    <div ref={workspaceRef} className="relative w-full h-screen overflow-hidden bg-background">
      {apps
        .filter((app) => app.isOpen)
        .map((appInstance) => {
            const componentToRender = appInstance.component;

            return (
          <Card
            key={appInstance.id}
            id={`app-${appInstance.id}`}
            className="absolute shadow-2xl flex flex-col border border-border rounded-lg overflow-hidden bg-card"
            style={{
              left: `${appInstance.position.x}px`,
              top: `${appInstance.position.y}px`,
              zIndex: appInstance.zIndex,
              width: appInstance.size.width,
              height: appInstance.isMinimized ? 'auto' : appInstance.size.height, // Minimized height is auto
              maxWidth: appInstance.size.maxWidth,
              maxHeight: appInstance.isMinimized ? 'auto' : appInstance.size.maxHeight, // Minimized maxHeight is auto
              minWidth: `${appInstance.size.minWidth || 0}px`,
              minHeight: appInstance.isMinimized ? 'auto' : `${appInstance.size.minHeight || 0}px`,
              userSelect: (activeDrag?.appId === appInstance.id || activeResize?.appId === appInstance.id) ? 'none' : 'auto',
              transition: (activeDrag?.appId === appInstance.id || activeResize?.appId === appInstance.id) ? 'none' : 'opacity 0.2s ease-out',
            }}
            onMouseDown={() => {
              bringToFront(appInstance.id);
            }}
          >
            <CardHeader
              className="bg-card p-2 flex flex-row items-center justify-between cursor-grab"
              onMouseDown={(e) => {
                if ((e.target as HTMLElement).closest('.resize-handle') || (e.target as HTMLElement).closest('[role="button"]')) return;
                e.stopPropagation();
                handleDragStart(e, appInstance.id);
              }}
            >
              <div className="flex items-center space-x-2">
                <CardTitle className="text-sm font-medium select-none pl-1">{appInstance.title}</CardTitle>
                {appInstance.id === "mc-calculator" && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => e.stopPropagation()}>
                        <HelpCircle className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="z-[930]">
                      <AlertDialogHeader>
                        <AlertDialogTitle>How This Calculator Works</AlertDialogTitle>
                      </AlertDialogHeader>
                      <HowItWorksContent />
                      <AlertDialogFooter>
                        <AlertDialogCancel>Close</AlertDialogCancel>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
              <div className="flex space-x-1">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); toggleMinimize(appInstance.id);}}>
                  <MinusIcon className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-destructive/80" onClick={(e) => {e.stopPropagation(); closeApp(appInstance.id);}}>
                  <XIcon className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            {!appInstance.isMinimized && (
              <CardContent className="p-0 flex-grow overflow-auto relative">
                {componentToRender}
                 {!appInstance.isMinimized && (
                    <div
                        className="resize-handle absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize opacity-50 hover:opacity-100 flex items-center justify-center"
                        onMouseDown={(e) => handleResizeStart(e, appInstance.id)}
                        title="Resize"
                    >
                        <MoveDiagonal size={12} className="text-muted-foreground" />
                    </div>
                )}
              </CardContent>
            )}
             {appInstance.isMinimized && (
                <div className="h-2"></div> 
             )}
          </Card>
        );
      })}
    </div>
  );
}

