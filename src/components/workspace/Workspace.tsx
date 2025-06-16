
"use client";

import React, { useState }
from "react";
import MCCalculator from "@/components/apps/mc-calculator/mc-calculator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XIcon, MinusIcon, SquareIcon } from "lucide-react"; // Placeholder icons

interface AppInstance {
  id: string;
  title: string;
  component: React.ReactNode;
  isOpen: boolean;
  position: { x: number; y: number };
  zIndex: number;
  isMinimized?: boolean;
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
    },
  ]);

  const bringToFront = (id: string) => {
    setApps((prevApps) => {
      const maxZIndex = prevApps.reduce((max, app) => Math.max(max, app.zIndex), 0);
      return prevApps.map((app) =>
        app.id === id ? { ...app, zIndex: maxZIndex + 1 } : app
      );
    });
  };

  const toggleMinimize = (id: string) => {
    setApps(prevApps => 
      prevApps.map(app => 
        app.id === id ? {...app, isMinimized: !app.isMinimized} : app
      )
    );
  };
  
  const closeApp = (id: string) => {
     setApps(prevApps => prevApps.map(app => app.id === id ? {...app, isOpen: false} : app));
  };


  return (
    <div className="relative w-full h-screen bg-muted/40 overflow-hidden">
      {/* Placeholder for a dock or app launcher */}
      {/* <div className="absolute bottom-4 left-1/2 -translate-x-1/2 p-2 bg-card rounded-lg shadow-lg flex space-x-2">
        <Button onClick={() => {
          // Logic to open calculator if closed or focus if open
          const calcApp = apps.find(a => a.id === 'mc-calculator');
          if (calcApp && !calcApp.isOpen) {
            setApps(prev => prev.map(a => a.id === 'mc-calculator' ? {...a, isOpen: true, zIndex: Math.max(...prev.map(ap => ap.zIndex), 0) + 1} : a));
          } else if (calcApp) {
            bringToFront('mc-calculator');
          }
        }}>Calculator</Button>
      </div> */}
      
      {apps
        .filter((app) => app.isOpen)
        .map((app) => (
          <Card
            key={app.id}
            className="absolute shadow-2xl w-[90vw] max-w-4xl flex flex-col" // Added flex flex-col
            style={{
              left: `${app.position.x}px`,
              top: `${app.position.y}px`,
              zIndex: app.zIndex,
              height: app.isMinimized ? 'auto' : 'calc(100vh - 100px)', // Adjust height
              maxHeight: app.isMinimized ? 'auto' : '800px', // Max height for open apps
            }}
            onMouseDown={() => bringToFront(app.id)} // Bring to front on click
          >
            <CardHeader className="bg-muted/50 p-2 flex flex-row items-center justify-between cursor-grab border-b">
              <CardTitle className="text-sm font-medium">{app.title}</CardTitle>
              <div className="flex space-x-1">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleMinimize(app.id)}>
                  <MinusIcon className="h-3 w-3" />
                </Button>
                {/* <Button variant="ghost" size="icon" className="h-6 w-6">
                  <SquareIcon className="h-3 w-3" />
                </Button> */}
                <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-destructive/80" onClick={() => closeApp(app.id)}>
                  <XIcon className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            {!app.isMinimized && (
              <CardContent className="p-0 flex-grow overflow-y-auto"> {/* Ensure content can scroll */}
                {app.component}
              </CardContent>
            )}
          </Card>
        ))}
    </div>
  );
}
