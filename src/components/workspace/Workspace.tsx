
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
  component: (props: { isFocused: boolean; isMinimized?: boolean }) => React.ReactNode;
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
          const maxZOfAllOtherApps = prevApps
            .filter(app => app.id !== id && app.isOpen)
            .reduce((max, app) => Math.max(max, app.zIndex), 0);
          const newZForUnmanagedType = maxZOfAllOtherApps + 1;
          if (appToFocus.zIndex === newZForUnmanagedType) return prevApps;
          return prevApps.map(app => app.id === id ? { ...app, zIndex: newZForUnmanagedType } : app);
      }

      const appsOfType = prevApps.filter(app => app.appType === appTypeToFocus && app.isOpen);
      const otherAppsInType = appsOfType.filter(app => app.id !== id);
      otherAppsInType.sort((a, b) => a.zIndex - b.zIndex);

      const newlyOrderedAppsForType = [...otherAppsInType, appToFocus];
      const newZIndexMap = new Map<string, number>();
      newlyOrderedAppsForType.forEach((app, index) => {
        let maxZForType = appTypeToFocus === 'system' ? SYSTEM_APP_Z_MAX : ALERT_DIALOG_Z_MAX;
        newZIndexMap.set(app.id, Math.min(baseZIndexForType + index, maxZForType));
      });

      let changesMade = false;
      const updatedApps = prevApps.map(app => {
        if (app.appType === appTypeToFocus && app.isOpen) {
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
        component: (props) => <MCCalculator {...props} />,
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
            maxHeight: '625px'
        },
        appType: 'system',
        contentPadding: 'p-0',
      },
      {
        id: "husky-image-viewer",
        title: "Husky",
        component: (props) => <ImageViewer {...props} />,
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
                maxHeight: app.id === "mc-calculator" ? '625px' : 'none'
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
    e.preventDefault();
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
    if (!activeDrag) {
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!workspaceRef.current || !activeDrag) return;

      const appElement = document.getElementById(`app-${activeDrag.appId}`);
      if (!appElement) return;

      const appRect = appElement.getBoundingClientRect();
      const workspaceRect = workspaceRef.current.getBoundingClientRect();
      const scrollX = workspaceRef.current.scrollLeft;
      const scrollY = workspaceRef.current.scrollTop;

      let newViewportX = e.clientX - activeDrag.offsetX;
      let newViewportY = e.clientY - activeDrag.offsetY;

      let newRelativeX = newViewportX - workspaceRect.left + scrollX;
      let newRelativeY = newViewportY - workspaceRect.top + scrollY;

      newRelativeX = Math.max(0, Math.min(newRelativeX, workspaceRect.width - appRect.width + scrollX));
      newRelativeY = Math.max(0, Math.min(newRelativeY, workspaceRect.height - appRect.height + scrollY));

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

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activeDrag, setActiveDrag]);


  const handleResizeStart = (e: React.MouseEvent<HTMLDivElement>, appId: string) => {
    e.preventDefault();
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
    if (!activeResize) {
      return;
    }
    const handleMouseMoveResize = (e: MouseEvent) => {
      if (!workspaceRef.current || !activeResize) return;

      setApps(prevApps => {
        const currentApp = prevApps.find(app => app.id === activeResize.appId);
        if (!currentApp || currentApp.isMinimized) {
          return prevApps;
        }

        const deltaX = e.clientX - activeResize.initialMouseX;
        const deltaY = e.clientY - activeResize.initialMouseY;

        let newWidth = activeResize.initialWidth + deltaX;
        let newHeight = activeResize.initialHeight + deltaY;

        newWidth = Math.max(currentApp.size.minWidth || 0, newWidth);
        newHeight = Math.max(currentApp.size.minHeight || 0, newHeight);

        const workspaceRect = workspaceRef.current.getBoundingClientRect();
        const scrollX = workspaceRef.current.scrollLeft;
        const scrollY = workspaceRef.current.scrollTop;
        const appPos = currentApp.position;

        if (appPos.x + newWidth > workspaceRect.width + scrollX) {
          newWidth = workspaceRect.width - appPos.x + scrollX;
        }
        if (appPos.y + newHeight > workspaceRect.height + scrollY) {
          newHeight = workspaceRect.height - appPos.y + scrollY;
        }

        return prevApps.map(app =>
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
        );
      });
    };

    const handleMouseUpResize = () => {
      setActiveResize(null);
    };

    window.addEventListener('mousemove', handleMouseMoveResize);
    window.addEventListener('mouseup', handleMouseUpResize);
    return () => {
      window.removeEventListener('mousemove', handleMouseMoveResize);
      window.removeEventListener('mouseup', handleMouseUpResize);
    };
  }, [activeResize, setActiveResize]);

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
    <div ref={workspaceRef} className="relative w-full h-screen overflow-hidden bg-background">
      <DottedBackground />
      {apps
        .filter((appInstance) => appInstance.isOpen)
        .map((appInstance) => {
            let isFocused = false;
            if (appInstance.appType === 'system') {
                isFocused = appInstance.zIndex === topmostSystemZ;
            } else if (appInstance.appType === 'alertDialog') {
                isFocused = appInstance.zIndex === topmostAlertDialogZ;
            }

            const componentToRender = appInstance.component({ isFocused, isMinimized: appInstance.isMinimized });


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
                  "flex-1 relative overflow-y-auto",
                  appInstance.contentPadding || "p-4",
                  isFocused ? "bg-card/80" : "bg-popover"
                )}>
                {componentToRender}
                 {!appInstance.isMinimized && (
                    <div
                        className="resize-handle absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize opacity-50 hover:opacity-100 flex items-center justify-center select-none z-10"
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
