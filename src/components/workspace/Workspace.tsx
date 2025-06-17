
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import MCCalculator from "@/components/apps/mc-calculator/mc-calculator";
import HowItWorksContent from "@/components/apps/mc-calculator/components/HowItWorksContent";
import ImageViewer from "@/components/apps/image-viewer/ImageViewer"; // Import the new component
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
import { DottedBackground } from "@/components/ui/dotted-background";
import { cn } from "@/lib/utils";


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
    maxWidth: string; 
    maxHeight: string; 
  };
  appType: AppType;
  contentPadding?: string; // Optional: to control padding for CardContent
}

const SYSTEM_APP_Z_MIN = 901;
const SYSTEM_APP_Z_MAX = 920; // Max z-index for system apps
const ALERT_DIALOG_Z_MIN = 921; 
const ALERT_DIALOG_Z_MAX = 940; // Max z-index for alert dialogs


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
      if (!appToFocus || !appToFocus.isOpen) return prevApps;

      const appTypeToFocus = appToFocus.appType;
      let baseZIndexForType: number;

      switch (appTypeToFocus) {
        case 'system':
          baseZIndexForType = SYSTEM_APP_Z_MIN;
          break;
        case 'alertDialog':
          baseZIndexForType = ALERT_DIALOG_Z_MIN;
          break;
        default:
          // Fallback for unmanaged types: simple increment to bring to very top
          const maxZOfAllOtherApps = prevApps
            .filter(app => app.id !== id && app.isOpen)
            .reduce((max, app) => Math.max(max, app.zIndex), 0);
          const newZForUnmanagedType = maxZOfAllOtherApps + 1;
          if (appToFocus.zIndex === newZForUnmanagedType) return prevApps; // Already at the top
          return prevApps.map(app => app.id === id ? { ...app, zIndex: newZForUnmanagedType } : app);
      }

      // Get all open apps of the same type as the one being focused
      const appsOfType = prevApps.filter(app => app.appType === appTypeToFocus && app.isOpen);

      // Separate the app to be focused from the others of its type
      const otherAppsInType = appsOfType.filter(app => app.id !== id);

      // Sort the other apps by their current zIndex to maintain relative order among them
      otherAppsInType.sort((a, b) => a.zIndex - b.zIndex);

      // The new stacking order for this type: other apps, then the focused app on top
      const newlyOrderedAppsForType = [...otherAppsInType, appToFocus];

      // Create a map for quick lookup of new z-indexes for the affected type
      const newZIndexMap = new Map<string, number>();
      newlyOrderedAppsForType.forEach((app, index) => {
        // Ensure z-index stays within defined max for the type
        let maxZForType = appTypeToFocus === 'system' ? SYSTEM_APP_Z_MAX : ALERT_DIALOG_Z_MAX;
        newZIndexMap.set(app.id, Math.min(baseZIndexForType + index, maxZForType));
      });

      let changesMade = false;
      const updatedApps = prevApps.map(app => {
        if (app.appType === appTypeToFocus && app.isOpen) { // Ensure we only modify open apps of the current type
          const newZ = newZIndexMap.get(app.id);
          if (newZ !== undefined && app.zIndex !== newZ) {
            changesMade = true;
            return { ...app, zIndex: newZ };
          }
        }
        return app;
      });

      return changesMade ? updatedApps : prevApps;
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
            width: '450px', 
            height: '175px', 
            minWidth: 400,
            minHeight: 175, 
            maxWidth: 'none', 
            maxHeight: 'none'
        },
        appType: 'system',
        contentPadding: 'p-0', 
      },
      {
        id: "husky-image-viewer",
        title: "Husky",
        component: <ImageViewer />,
        isOpen: true,
        position: { x: 550, y: 50 },
        zIndex: SYSTEM_APP_Z_MIN + 1,
        isMinimized: false,
        previousSize: null,
        size: {
            width: '300px', 
            height: '300px', 
            minWidth: 150,
            minHeight: 150, 
            maxWidth: 'none', 
            maxHeight: 'none'
        },
        appType: 'system',
        contentPadding: 'p-0', 
      },
    ];
    setApps(initialApps);
  }, []);


  const toggleMinimize = (id: string) => {
    setApps(prevApps =>
      prevApps.map(app => {
        if (app.id === id) {
          const isCurrentlyMinimized = app.isMinimized;
          if (!isCurrentlyMinimized) { 
            return {
              ...app,
              isMinimized: true,
              previousSize: { width: app.size.width, height: app.size.height },
              size: { ...app.size, width: '250px', height: 'auto', maxHeight: 'auto' } 
            };
          } else { 
            bringToFront(id); 
            return {
              ...app,
              isMinimized: false,
              size: {
                ...app.size,
                width: app.previousSize?.width || (app.size.minWidth ? `${app.size.minWidth}px` : '400px'), 
                height: app.previousSize?.height || (app.size.minHeight ? `${app.size.minHeight}px` : '300px'),
                maxHeight: 'none' 
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
    e.preventDefault(); // Prevent text selection
    bringToFront(appId);
    const appElement = document.getElementById(`app-${appId}`);
    if (appElement) {
      const currentApp = apps.find(app => app.id === appId);
      if(currentApp) { 
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
      if (!appData) { 
        setActiveDrag(null);
        return;
      }

      const appRect = appElement.getBoundingClientRect();
      const workspaceRect = workspaceRef.current.getBoundingClientRect();

      let newViewportX = e.clientX - activeDrag.offsetX;
      let newViewportY = e.clientY - activeDrag.offsetY;

      let newRelativeX = newViewportX - workspaceRect.left + workspaceRef.current.scrollLeft;
      let newRelativeY = newViewportY - workspaceRect.top + workspaceRef.current.scrollTop;


      newRelativeX = Math.max(0, Math.min(newRelativeX, workspaceRef.current.scrollWidth - appRect.width));
      newRelativeY = Math.max(0, Math.min(newRelativeY, workspaceRef.current.scrollHeight - appRect.height));


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
  }, [activeDrag, apps, bringToFront]); 

  const handleResizeStart = (e: React.MouseEvent<HTMLDivElement>, appId: string) => {
    e.preventDefault(); // Prevent text selection during resize
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
      
      const appPos = currentApp.position;
      
      if (appPos.x + newWidth > workspaceRef.current.scrollWidth) {
        newWidth = workspaceRef.current.scrollWidth - appPos.x;
      }
      if (appPos.y + newHeight > workspaceRef.current.scrollHeight) {
        newHeight = workspaceRef.current.scrollHeight - appPos.y;
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
  }, [activeResize, apps, bringToFront]);

  const findTopmostZByType = (appsList: AppInstance[], type: AppType): number => {
    let initialZ = 0;
    if (type === 'system') initialZ = SYSTEM_APP_Z_MIN - 1;
    else if (type === 'alertDialog') initialZ = ALERT_DIALOG_Z_MIN - 1;

    return appsList
      .filter(app => app.isOpen && app.appType === type)
      .reduce((maxZ, app) => Math.max(maxZ, app.zIndex), initialZ);
  };

  const topmostSystemZ = findTopmostZByType(apps, 'system');
  const topmostAlertDialogZ = findTopmostZByType(apps, 'alertDialog');


  return (
    <div ref={workspaceRef} className="relative w-full h-screen overflow-auto bg-background">
      <DottedBackground />
      {apps
        .filter((app) => app.isOpen)
        .map((appInstance) => {
            const componentToRender = appInstance.component;

            let isFocused = false;
            if (appInstance.appType === 'system') {
                isFocused = appInstance.zIndex === topmostSystemZ;
            } else if (appInstance.appType === 'alertDialog') {
                isFocused = appInstance.zIndex === topmostAlertDialogZ;
            }

            return (
          <Card
            key={appInstance.id}
            id={`app-${appInstance.id}`}
            className={cn(
                "absolute shadow-2xl flex flex-col border-border rounded-lg overflow-hidden", 
                isFocused ? "bg-card backdrop-blur-[8px]" : "bg-popover" 
              )}
            style={{
              left: `${appInstance.position.x}px`,
              top: `${appInstance.position.y}px`,
              zIndex: appInstance.zIndex,
              width: appInstance.size.width,
              height: appInstance.isMinimized ? 'auto' : appInstance.size.height, 
              maxWidth: appInstance.size.maxWidth,
              maxHeight: appInstance.isMinimized ? 'auto' : appInstance.size.maxHeight, 
              minWidth: `${appInstance.size.minWidth || 0}px`,
              minHeight: appInstance.isMinimized ? 'auto' : `${appInstance.size.minHeight || 0}px`,
              userSelect: (activeDrag?.appId === appInstance.id || activeResize?.appId === appInstance.id) ? 'none' : 'auto',
              transition: (activeDrag?.appId === appInstance.id || activeResize?.appId === appInstance.id) ? 'none' : 'opacity 0.2s ease-out, box-shadow 0.2s ease-out, background-color 0.2s ease-out',
            }}
            onMouseDown={() => {
              bringToFront(appInstance.id);
            }}
          >
            <CardHeader
              className={cn(
                "p-2 flex flex-row items-center justify-between cursor-grab border-b border-border/50 select-none",
                isFocused ? "bg-card/80" : "bg-popover"
              )}
              onMouseDown={(e) => {
                if ((e.target as HTMLElement).closest('.resize-handle') || (e.target as HTMLElement).closest('[role="button"]')) return;
                handleDragStart(e, appInstance.id);
              }}
            >
              <div className="flex items-center space-x-2">
                <CardTitle className="text-sm font-medium select-none pl-1">{appInstance.title}</CardTitle>
                 {appInstance.id === "mc-calculator" && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); bringToFront(appInstance.id)}}>
                        <HelpCircle className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent 
                        className="z-[930]" 
                        onOpenAutoFocus={(e) => e.preventDefault()}
                        onCloseAutoFocus={(e) => e.preventDefault()}
                        onPointerDownOutside={(e) => e.preventDefault()}
                    >
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
              <CardContent className={cn(
                  "flex-grow relative overflow-hidden", 
                  appInstance.contentPadding || "p-4",
                  isFocused ? "bg-card/80" : "bg-popover"
                )}>
                {componentToRender}
                 {!appInstance.isMinimized && (
                    <div
                        className="resize-handle absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize opacity-50 hover:opacity-100 flex items-center justify-center select-none"
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

