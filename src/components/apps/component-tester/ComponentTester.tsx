
"use client";

import React, { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import ImageViewer from "@/components/apps/image-viewer/ImageViewer";
import DummyChart from "./DummyChart";
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { systemAppTheme } from '@/components/theme/system-app-theme';

type ContentType = 'image' | 'chart';

interface ComponentTesterProps {
  isFocused: boolean;
}

export default function ComponentTester({ isFocused }: ComponentTesterProps) {
  const [contentType, setContentType] = useState<ContentType>('image');
  const [numberOfItems, setNumberOfItems] = useState<number>(10);

  const renderContent = () => {
    const items = [];
    for (let i = 0; i < numberOfItems; i++) {
      items.push(
        <div
          key={i}
          className="aspect-square bg-muted/30 p-1 rounded-md border border-border/50 flex items-center justify-center overflow-hidden"
        >
          {contentType === 'image' ? <ImageViewer /> : <DummyChart />}
        </div>
      );
    }
    return items;
  };

  return (
    <div className={cn("w-full h-full flex flex-col", systemAppTheme.typography.baseText)}>
      <div className="p-3 border-b border-border space-y-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="contentTypeSelect" className="text-xs">Content Type</Label>
            <Select
              value={contentType}
              onValueChange={(value: ContentType) => setContentType(value)}
            >
              <SelectTrigger id="contentTypeSelect" className="h-9 text-xs">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="image" className="text-xs">Husky Image</SelectItem>
                <SelectItem value="chart" className="text-xs">Dummy Chart</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="numberOfItemsSlider" className="text-xs">
              Number of Items: {numberOfItems}
            </Label>
            <Slider
              id="numberOfItemsSlider"
              min={1}
              max={100} // Increased max to 100 for more stress testing
              step={1}
              value={[numberOfItems]}
              onValueChange={(value) => setNumberOfItems(value[0])}
              className="w-full"
            />
          </div>
        </div>
      </div>
      <ScrollArea className="flex-1 p-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {renderContent()}
        </div>
      </ScrollArea>
    </div>
  );
}
