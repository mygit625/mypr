
"use client";

import { useState, useRef, MouseEvent, TouchEvent, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { FileUploadZone } from '@/components/feature/file-upload-zone';
import { CircleEllipsis, Crop, Download, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { readFileAsDataURL } from '@/lib/file-utils';
import { downloadDataUri } from '@/lib/download-utils';
import { cn } from '@/lib/utils';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface CropArea {
  x: number;
  y: number;
  size: number;
}

export default function CircleCropPage() {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState<CropArea>({ x: 50, y: 50, size: 200 });
  const [croppedImageUrl, setCroppedImageUrl] = useState<string | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const { toast } = useToast();

  const handleFileSelected = (files: File[]) => {
    if (files.length > 0) {
      const file = files[0];
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid File Type',
          description: 'Please upload a valid image file (e.g., JPG, PNG).',
          variant: 'destructive',
        });
        return;
      }
      readFileAsDataURL(file).then((dataUrl) => {
        const img = new Image();
        img.src = dataUrl;
        img.onload = () => {
            setImage(img);
            setCroppedImageUrl(null);
            // Reset crop position
            const container = containerRef.current;
            if (container) {
                const initialSize = Math.min(container.clientWidth, container.clientHeight, 300) * 0.8;
                setCrop({
                    x: (container.clientWidth - initialSize) / 2,
                    y: (container.clientHeight - initialSize) / 2,
                    size: initialSize,
                });
            }
        };
      });
    }
  };

  const startInteraction = (clientX: number, clientY: number, target: HTMLElement) => {
    const container = containerRef.current;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;

    if (target.dataset.resizeHandle) {
      setIsResizing(true);
    } else {
      // Check if click is inside the crop area
      const isInside = (
        localX >= crop.x &&
        localX <= crop.x + crop.size &&
        localY >= crop.y &&
        localY <= crop.y + crop.size
      );
      if (isInside) {
        setIsDragging(true);
        setDragStart({ x: localX - crop.x, y: localY - crop.y });
      }
    }
  }

  const handleInteractionMove = (clientX: number, clientY: number) => {
     const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;
    
    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

    if (isDragging) {
      const newX = clamp(mouseX - dragStart.x, 0, container.clientWidth - crop.size);
      const newY = clamp(mouseY - dragStart.y, 0, container.clientHeight - crop.size);
      setCrop(c => ({ ...c, x: newX, y: newY }));
    } else if (isResizing) {
      const newSize = clamp(Math.max(mouseX - crop.x, mouseY - crop.y), 50, Math.min(container.clientWidth - crop.x, container.clientHeight - crop.y));
      setCrop(c => ({ ...c, size: newSize }));
    }
  }

  const endInteraction = () => {
    setIsDragging(false);
    setIsResizing(false);
  }

  // Mouse Handlers
  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    startInteraction(e.clientX, e.clientY, e.target as HTMLElement);
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    if(isDragging || isResizing) {
        handleInteractionMove(e.clientX, e.clientY);
    }
  };

  const handleMouseUp = () => {
    endInteraction();
  };
  
  const handleMouseLeave = () => {
    endInteraction();
  };
  
  // Touch Handlers
  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      // e.preventDefault(); // This can sometimes prevent desired behaviors like scrolling. Use with caution.
      startInteraction(e.touches[0].clientX, e.touches[0].clientY, e.target as HTMLElement);
    }
  };
  
  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if ((isDragging || isResizing) && e.touches.length === 1) {
      e.preventDefault(); // Prevent scrolling while dragging/resizing
      handleInteractionMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  };
  
  const handleTouchEnd = () => {
    endInteraction();
  };

  const handleCrop = () => {
    if (!imageRef.current || !containerRef.current) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const container = containerRef.current;
    const img = imageRef.current;
    
    // Calculate scale factor
    const scaleX = img.naturalWidth / container.clientWidth;
    const scaleY = img.naturalHeight / container.clientHeight;

    const sourceX = crop.x * scaleX;
    const sourceY = crop.y * scaleY;
    const sourceSize = crop.size * Math.min(scaleX, scaleY); // Use min scale to be safe
    
    canvas.width = sourceSize;
    canvas.height = sourceSize;
    
    // Fill the canvas with a transparent background first.
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.beginPath();
    ctx.arc(sourceSize / 2, sourceSize / 2, sourceSize / 2, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    
    ctx.drawImage(
      img,
      sourceX, sourceY, sourceSize, sourceSize, // Source rectangle
      0, 0, sourceSize, sourceSize // Destination rectangle
    );
    
    setCroppedImageUrl(canvas.toDataURL('image/png'));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="text-center py-8">
        <CircleEllipsis className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-bold tracking-tight">Circle Crop Image</h1>
        <p className="text-muted-foreground mt-2">
          Upload an image and use the frame to select the area you want to crop into a circle.
        </p>
      </header>
      
      {!image && (
          <Card>
              <CardHeader>
                  <CardTitle>Upload Your Image</CardTitle>
                  <CardDescription>Select or drag an image file to begin.</CardDescription>
              </CardHeader>
              <CardContent>
                  <FileUploadZone onFilesSelected={handleFileSelected} multiple={false} accept="image/*" />
              </CardContent>
          </Card>
      )}

      {image && !croppedImageUrl && (
        <Card>
            <CardContent className="p-4">
                <div
                    ref={containerRef}
                    className="relative w-full max-w-full mx-auto touch-none select-none overflow-hidden"
                    style={{ aspectRatio: `${image.width} / ${image.height}`}}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseLeave}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onTouchCancel={handleTouchEnd}
                >
                    <img
                        ref={imageRef}
                        src={image.src}
                        alt="Upload for cropping"
                        className="absolute top-0 left-0 w-full h-full pointer-events-none"
                    />
                    <div
                        className="absolute border-2 border-dashed border-green-400 pointer-events-none"
                        style={{
                            left: crop.x,
                            top: crop.y,
                            width: crop.size,
                            height: crop.size,
                        }}
                    >
                         {/* This div creates the circular clipping mask appearance */}
                        <div
                            className="absolute inset-0 rounded-full shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
                        />
                        {/* Corner handles */}
                        <div className="absolute -top-1 -left-1 w-2 h-2 bg-green-400 border border-background"></div>
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 border border-background"></div>
                        <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-green-400 border border-background"></div>
                        {/* Resize Handle */}
                        <div
                            data-resize-handle="true"
                            className="absolute -bottom-2 -right-2 w-4 h-4 bg-green-400 border-2 border-background cursor-nwse-resize pointer-events-auto"
                        />
                    </div>
                </div>
            </CardContent>
            <CardFooter className="flex-col gap-4">
                <Button onClick={handleCrop} className="w-full" size="lg">
                    <Crop className="mr-2 h-5 w-5" /> Crop Circle
                </Button>
                <Button onClick={() => setImage(null)} className="w-full" variant="outline">
                    <Upload className="mr-2 h-5 w-5" /> Upload a Different Image
                </Button>
            </CardFooter>
        </Card>
      )}

      {croppedImageUrl && (
        <Card className="text-center">
            <CardHeader>
                <CardTitle>Your Cropped Image</CardTitle>
                <CardDescription>Download your new circular image or start over.</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
                <img src={croppedImageUrl} alt="Cropped result" className="rounded-full max-w-xs shadow-lg" />
            </CardContent>
            <CardFooter className="flex-col sm:flex-row gap-4">
                <Button onClick={() => downloadDataUri(croppedImageUrl, 'circle-crop.png')} className="w-full" size="lg">
                    <Download className="mr-2 h-5 w-5" /> Download
                </Button>
                <Button onClick={() => { setImage(null); setCroppedImageUrl(null); }} className="w-full" variant="outline" size="lg">
                    <Upload className="mr-2 h-5 w-5" /> Start Over
                </Button>
            </CardFooter>
        </Card>
      )}

    </div>
  );
}
