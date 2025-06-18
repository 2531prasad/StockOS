
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import MCCalculator from "@/components/apps/mc-calculator/mc-calculator";
import HowItWorksContent from "@/components/apps/mc-calculator/components/HowItWorksContent";
import ImageViewer from "@/components/apps/image-viewer/ImageViewer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XIcon, MinusIcon, MoveDiagonal, HelpCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { DottedBackground } from "@/components/ui/dotted-background";
import { cn } from "@/lib/utils";


type AppType = 'system' | 'alertDialog';

interface AppInstance {
  id: string;
  title: string;
  component: (props: any) => React.ReactNode; // Props vary based on appType
  isOpen: boolean;
  position?: { x: number; y: number }; // Centered for dialogs, explicit for system apps
  zIndex: number;
  isMinimized?: boolean; // Only for system apps
  previousSize?: { width: string; height: string } | null; // Only for system apps
  size: {
    width: string;
    height: string;
    minWidth?: number;
    minHeight?: number;
    maxWidth: string;
    maxHeight: string;
  };
  appType: AppType;
  contentPadding?: string;
}

const SYSTEM_APP_Z_MIN = 901;
const SYSTEM_APP_Z_MAX = 920;
const ALERT_DIALOG_Z_MIN = 930;
const ALERT_DIALOG_Z_MAX = 950;

const dialogAppBlueprints: Omit<AppInstance, 'isOpen' | 'zIndex' | 'position' | 'component' | 'contentPadding'> & { contentComponent: React.FC<any> }[] = [
  {
    id: 'how-it-works-dialog',
    title: 'How This Calculator Works',
    contentComponent: HowItWorksContent,
    appType: 'alertDialog',
    size: { width: '550px', height: 'auto', minWidth: 300, minHeight: 200, maxWidth: '80vw', maxHeight: '70vh' },
  },
];


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

      const appToFocusPotentiallyOpened = { ...appToFocus, isOpen: true };

      const appsWithFocusedOnePotentiallyOpened = prevApps.map(app => app.id === id ? appToFocusPotentiallyOpened : app);


      const appTypeToFocus = appToFocusPotentiallyOpened.appType;
      let baseZIndexForType: number;
      let maxZForType: number;

      switch (appTypeToFocus) {
        case 'system':
          baseZIndexForType = SYSTEM_APP_Z_MIN;
          maxZForType = SYSTEM_APP_Z_MAX;
          break;
        case 'alertDialog':
          baseZIndexForType = ALERT_DIALOG_Z_MIN;
          maxZForType = ALERT_DIALOG_Z_MAX;
          break;
        default:
          return appsWithFocusedOnePotentiallyOpened;
      }

      const appsOfType = appsWithFocusedOnePotentiallyOpened.filter(app => app.appType === appTypeToFocus && app.isOpen);
      const otherAppsInType = appsOfType.filter(app => app.id !== id);
      otherAppsInType.sort((a, b) => a.zIndex - b.zIndex);

      const newlyOrderedAppsForType = [...otherAppsInType, appToFocusPotentiallyOpened];

      const newZIndexMap = new Map<string, number>();
      newlyOrderedAppsForType.forEach((app, index) => {
        newZIndexMap.set(app.id, Math.min(baseZIndexForType + index, maxZForType));
      });

      let changesMade = false;
      const updatedApps = appsWithFocusedOnePotentiallyOpened.map(app => {
        if (app.appType === appTypeToFocus && app.isOpen) {
          const newZ = newZIndexMap.get(app.id);
          if (newZ !== undefined && app.zIndex !== newZ) {
            changesMade = true;
            return { ...app, zIndex: newZ };
          }
        }
        return app;
      });

      return changesMade ? updatedApps : appsWithFocusedOnePotentiallyOpened;
    });
  }, []);


  const openDialogApp = useCallback((dialogId: string) => {
    setApps(prevApps => {
      const existingDialog = prevApps.find(app => app.id === dialogId && app.appType === 'alertDialog');
      const blueprint = dialogAppBlueprints.find(bp => bp.id === dialogId);

      if (!blueprint) {
        console.error(`Dialog blueprint not found for ID: ${dialogId}`);
        return prevApps;
      }

      if (existingDialog) {
        const updatedApps = prevApps.map(app => app.id === dialogId ? { ...app, isOpen: true } : app);
        return updatedApps;
      } else {
        const newDialogApp: AppInstance = {
          ...blueprint,
          isOpen: true,
          zIndex: ALERT_DIALOG_Z_MIN,
          position: undefined,
          component: (props: { closeDialog: () => void }) => (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{blueprint.title}</AlertDialogTitle>
              </AlertDialogHeader>
              <div className="flex-1 overflow-y-auto py-4">
                <blueprint.contentComponent />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={props.closeDialog}>Close</AlertDialogCancel>
              </AlertDialogFooter>
            </>
          ),
          contentPadding: 'p-0',
        };
        return [...prevApps, newDialogApp];
      }
    });
    bringToFront(dialogId);
  }, [bringToFront]);

  const closeDialogApp = useCallback((dialogId: string) => {
    setApps(prevApps => prevApps.map(app => (app.id === dialogId && app.appType === 'alertDialog') ? { ...app, isOpen: false } : app));
  }, []);


  useEffect(() => {
    const initialSystemApps: AppInstance[] = [
      {
        id: "mc-calculator",
        title: "Monte Carlo Calculator",
        component: (props) => <MCCalculator {...props} openDialogApp={openDialogApp} />,
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
    setApps(initialSystemApps);
  }, [openDialogApp]);


  const toggleMinimize = (id: string) => {
    setApps(prevApps =>
      prevApps.map(app => {
        if (app.id === id && app.appType === 'system') {
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
    setApps(prevApps => prevApps.map(app => (app.id === id && app.appType === 'system') ? { ...app, isOpen: false } : app));
  };

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

  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>, appId: string) => {
    e.preventDefault();

    const appToDrag = apps.find(app => app.id === appId);
    if (!appToDrag || appToDrag.appType !== 'system') return;

    const isAnyAlertDialogFocused = apps.some(
      (app) => app.appType === 'alertDialog' && app.isOpen && app.zIndex === topmostAlertDialogZ
    );
    if (isAnyAlertDialogFocused) return;

    bringToFront(appId);
    const appElement = document.getElementById(`app-${appId}`);
    if (appElement) {
        const rect = appElement.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;
        setActiveDrag({ appId, offsetX, offsetY });
    }
  };

 useEffect(() => {
    if (!activeDrag) return;
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
    const handleMouseUp = () => setActiveDrag(null);
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

    const appToResize = apps.find(app => app.id === appId);
    if (!appToResize || appToResize.appType !== 'system' || appToResize.isMinimized) return;

    const isAnyAlertDialogFocused = apps.some(
      (app) => app.appType === 'alertDialog' && app.isOpen && app.zIndex === topmostAlertDialogZ
    );
    if (isAnyAlertDialogFocused) return;

    bringToFront(appId);
    const appElement = document.getElementById(`app-${appId}`);
    if (appElement) {
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
    if (!activeResize) return;
    const handleMouseMoveResize = (e: MouseEvent) => {
      if (!workspaceRef.current || !activeResize) return;
      setApps(prevApps => {
        const currentApp = prevApps.find(app => app.id === activeResize.appId);
        if (!currentApp || currentApp.isMinimized || currentApp.appType !== 'system') {
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
        const appPos = currentApp.position!;
        if (appPos.x + newWidth > workspaceRect.width + scrollX) {
          newWidth = workspaceRect.width - appPos.x + scrollX;
        }
        if (appPos.y + newHeight > workspaceRect.height + scrollY) {
          newHeight = workspaceRect.height - appPos.y + scrollY;
        }
        return prevApps.map(app =>
          app.id === activeResize.appId
            ? { ...app, size: { ...app.size, width: `${newWidth}px`, height: `${newHeight}px` } }
            : app
        );
      });
    };
    const handleMouseUpResize = () => setActiveResize(null);
    window.addEventListener('mousemove', handleMouseMoveResize);
    window.addEventListener('mouseup', handleMouseUpResize);
    return () => {
      window.removeEventListener('mousemove', handleMouseMoveResize);
      window.removeEventListener('mouseup', handleMouseUpResize);
    };
  }, [activeResize, setActiveResize]);


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

            if (appInstance.appType === 'system') {
              const SystemAppComponent = appInstance.component;
              return (
                <Card
                  key={appInstance.id}
                  id={`app-${appInstance.id}`}
                  className={cn(
                      "absolute flex flex-col border-border rounded-xl overflow-hidden",
                      "transition-shadow duration-150",
                      isFocused
                        ? "bg-card backdrop-blur-[8px] shadow-2xl"
                        : "bg-popover shadow-lg hover:shadow-xl"
                    )}
                  style={{
                    left: `${appInstance.position!.x}px`,
                    top: `${appInstance.position!.y}px`,
                    zIndex: appInstance.zIndex,
                    width: appInstance.size.width,
                    height: appInstance.isMinimized ? 'auto' : appInstance.size.height,
                    maxWidth: appInstance.size.maxWidth,
                    maxHeight: appInstance.isMinimized ? 'auto' : appInstance.size.maxHeight,
                    minWidth: `${appInstance.size.minWidth || 0}px`,
                    minHeight: appInstance.isMinimized ? 'auto' : `${appInstance.size.minHeight || 0}px`,
                    userSelect: (activeDrag?.appId === appInstance.id || activeResize?.appId === appInstance.id) ? 'none' : 'auto',
                    transitionProperty: (activeDrag?.appId === appInstance.id || activeResize?.appId === appInstance.id) ? 'none' : 'opacity, box-shadow, background-color, border-color',
                    transitionDuration: '0.15s',
                    transitionTimingFunction: 'ease-out',
                  }}
                  onMouseDown={() => {
                    if (appInstance.appType === 'system') bringToFront(appInstance.id);
                  }}
                >
                  <CardHeader
                    className={cn(
                      "p-1 space-y-0 flex flex-row items-center justify-between cursor-grab border-b border-border/50 select-none",
                      isFocused ? "bg-card/80" : "bg-popover"
                    )}
                    onMouseDown={(e) => {
                      if ((e.target as HTMLElement).closest('.resize-handle') || (e.target as HTMLElement).closest('[role="button"]') || (e.target as HTMLElement).closest('input')) return;
                      if (appInstance.appType === 'system') handleDragStart(e, appInstance.id);
                    }}
                  >
                    <div className="flex items-center space-x-2">
                      <CardTitle className="text-sm font-medium select-none pl-1">{appInstance.title}</CardTitle>
                       {appInstance.id === "mc-calculator" && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); openDialogApp('how-it-works-dialog'); }}>
                          <HelpCircle className="h-4 w-4" />
                        </Button>
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
                      <SystemAppComponent isFocused={isFocused} isMinimized={appInstance.isMinimized} />
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
            } else if (appInstance.appType === 'alertDialog') {
              const DialogContentComponent = appInstance.component;
              return (
                <AlertDialog
                  key={appInstance.id}
                  open={appInstance.isOpen}
                  onOpenChange={(open) => {
                    if (!open) closeDialogApp(appInstance.id);
                  }}
                >
                  <AlertDialogContent
                    className={cn("flex flex-col")}
                    style={{
                        width: appInstance.size.width,
                        maxWidth: appInstance.size.maxWidth,
                        maxHeight: appInstance.size.maxHeight,
                        zIndex: appInstance.zIndex,
                    }}
                    onOpenAutoFocus={(e) => e.preventDefault()}
                    onCloseAutoFocus={(e) => e.preventDefault()}
                    onPointerDownOutside={(e) => {
                        if ((e.target as HTMLElement).closest('[data-radix-alert-dialog-content]') === null) {
                             e.preventDefault();
                        }
                    }}
                  >
                    <DialogContentComponent closeDialog={() => closeDialogApp(appInstance.id)} />
                  </AlertDialogContent>
                </AlertDialog>
              );
            }
            return null;
        })}
    </div>
  );
}

