
"use client";

import { useState, useRef, MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent, useEffect, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { FileUploadZone } from '@/components/feature/file-upload-zone';
import { Crop, Download, Upload, AspectRatio, RotateCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { readFileAsDataURL } from '@/lib/file-utils';
import { downloadDataUri } from '@/lib/download-utils';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

type AspectRatioType = 'free' | '1:1' | '4:3' | '16:9';

export default function CropImagePage() {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState<CropArea>({ x: 0, y: 0, width: 100, height: 100 });
  const [croppedImageUrl, setCroppedImageUrl] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatioType>('free');

  const { toast } = useToast();

  const handleFileSelected = (files: File[]) => {
    if (files.length > 0) {
      const file = files[0];
      if (!file.type.startsWith('image/')) {
        toast({ title: 'Invalid File Type', description: 'Please upload a valid image file.', variant: 'destructive' });
        return;
      }
      readFileAsDataURL(file).then((dataUrl) => {
        const img = new Image();
        img.src = dataUrl;
        img.onload = () => {
          setImage(img);
          setCroppedImageUrl(null);
          setRotation(0);
          
          setTimeout(() => {
            const container = containerRef.current;
            if (container) {
              const { clientWidth: cWidth, clientHeight: cHeight } = container;
              const imgAspectRatio = img.naturalWidth / img.naturalHeight;
              const containerAspectRatio = cWidth / cHeight;
              
              let iWidth, iHeight;
              if (imgAspectRatio > containerAspectRatio) {
                iWidth = cWidth;
                iHeight = cWidth / imgAspectRatio;
              } else {
                iHeight = cHeight;
                iWidth = cHeight * imgAspectRatio;
              }

              const initialWidth = iWidth * 0.8;
              const initialHeight = iHeight * 0.8;
              setCrop({
                x: (iWidth - initialWidth) / 2 + (cWidth - iWidth) / 2,
                y: (iHeight - initialHeight) / 2 + (cHeight - iHeight) / 2,
                width: initialWidth,
                height: initialHeight,
              });
            }
          }, 0);
        };
      });
    }
  };

  const startDrag = (clientX: number, clientY: number, target: EventTarget) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;

    if ((target as HTMLElement).dataset.resizeHandle) {
      // Resize logic would go here, for simplicity we are only implementing drag
    } else {
      const isInside = (localX >= crop.x && localX <= crop.x + crop.width && localY >= crop.y && localY <= crop.y + crop.height);
      if (isInside) {
        setIsDragging(true);
        setDragStart({ x: localX - crop.x, y: localY - crop.y });
      }
    }
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!isDragging || !containerRef.current) return;
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;

    const newX = Math.max(0, Math.min(mouseX - dragStart.x, container.clientWidth - crop.width));
    const newY = Math.max(0, Math.min(mouseY - dragStart.y, container.clientHeight - crop.height));
    setCrop(c => ({ ...c, x: newX, y: newY }));
  };

  const endDrag = () => setIsDragging(false);
  
  // Mouse Events
  const handleMouseDown = (e: ReactMouseEvent) => { e.preventDefault(); startDrag(e.clientX, e.clientY, e.target); };
  const handleMouseMove = (e: ReactMouseEvent) => { e.preventDefault(); handleDragMove(e.clientX, e.clientY); };
  
  // Touch Events
  const handleTouchStart = (e: ReactTouchEvent) => { if (e.touches.length === 1) startDrag(e.touches[0].clientX, e.touches[0].clientY, e.target); };
  const handleTouchMove = (e: ReactTouchEvent) => { if (e.touches.length === 1) handleDragMove(e.touches[0].clientX, e.touches[0].clientY); };
  

  const handleCrop = () => {
    if (!imageRef.current || !containerRef.current || !image) return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const { containerWidth, containerHeight, imageWidth, imageHeight, imageX, imageY } = getDisplayDimensions();
    const scaleX = image.naturalWidth / imageWidth;
    const scaleY = image.naturalHeight / imageHeight;

    const sourceX = (crop.x - imageX) * scaleX;
    const sourceY = (crop.y - imageY) * scaleY;
    const sourceWidth = crop.width * scaleX;
    const sourceHeight = crop.height * scaleY;

    canvas.width = sourceWidth;
    canvas.height = sourceHeight;
    
    // Handle rotation
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(rotation * Math.PI / 180);
    ctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
    
    // Create a new canvas to draw the cropped and rotated image
    const finalCanvas = document.createElement('canvas');
    const finalCtx = finalCanvas.getContext('2d');
    if (!finalCtx) return;
    
    finalCanvas.width = sourceWidth;
    finalCanvas.height = sourceHeight;
    
    finalCtx.drawImage(
      canvas,
      sourceX - (canvas.width / 2),
      sourceY - (canvas.height / 2),
      sourceWidth,
      sourceHeight,
      0, 0, sourceWidth, sourceHeight
    );


    setCroppedImageUrl(finalCanvas.toDataURL('image/png'));
  };
  
  const getDisplayDimensions = () => {
    if (!containerRef.current || !image) return { containerWidth: 0, containerHeight: 0, imageWidth: 0, imageHeight: 0, imageX: 0, imageY: 0 };
    const { clientWidth: cWidth, clientHeight: cHeight } = containerRef.current;
    const imgAspectRatio = image.naturalWidth / image.naturalHeight;
    const containerAspectRatio = cWidth / cHeight;
    
    let iWidth, iHeight, iX, iY;
    if (imgAspectRatio > containerAspectRatio) {
      iWidth = cWidth;
      iHeight = cWidth / imgAspectRatio;
      iX = 0;
      iY = (cHeight - iHeight) / 2;
    } else {
      iHeight = cHeight;
      iWidth = cHeight * imgAspectRatio;
      iY = 0;
      iX = (cWidth - iWidth) / 2;
    }
    return { containerWidth: cWidth, containerHeight: cHeight, imageWidth: iWidth, imageHeight: iHeight, imageX: iX, imageY: iY };
  }

  const handleAspectRatioChange = (ar: AspectRatioType) => {
    setAspectRatio(ar);
    if (!containerRef.current || ar === 'free') return;
    
    const { imageWidth, imageHeight, imageX, imageY } = getDisplayDimensions();
    const arValue = ar === '1:1' ? 1 : ar === '4:3' ? 4/3 : 16/9;
    
    let newWidth = crop.width;
    let newHeight = newWidth / arValue;
    
    if (newHeight > imageHeight) {
      newHeight = imageHeight;
      newWidth = newHeight * arValue;
    }
    if (newWidth > imageWidth) {
      newWidth = imageWidth;
      newHeight = newWidth / arValue;
    }

    setCrop(c => ({
      ...c,
      width: newWidth,
      height: newHeight
    }));
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="text-center py-8">
        <Crop className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-bold tracking-tight">Crop Image</h1>
        <p className="text-muted-foreground mt-2">Upload an image, select the area, and crop.</p>
      </header>
      
      {!image && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Your Image</CardTitle>
            <CardDescription>Select or drag an image file to start cropping.</CardDescription>
          </CardHeader>
          <CardContent>
            <FileUploadZone onFilesSelected={handleFileSelected} multiple={false} accept="image/*" />
          </CardContent>
        </Card>
      )}

      {image && !croppedImageUrl && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-4">
                <div
                  ref={containerRef}
                  className="relative w-full aspect-video bg-muted/30 overflow-hidden touch-none select-none"
                  onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={endDrag} onMouseLeave={endDrag}
                  onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={endDrag}
                >
                  <img
                    ref={imageRef}
                    src={image.src}
                    alt="For cropping"
                    className="absolute max-w-full max-h-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ transform: `translate(-50%, -50%) rotate(${rotation}deg)` }}
                  />
                  <div
                    className="absolute border-2 border-dashed border-primary bg-black/20 cursor-move"
                    style={{ left: crop.x, top: crop.y, width: crop.width, height: crop.height }}
                  >
                    <div data-resize-handle="true" className="absolute -bottom-1 -right-1 w-3 h-3 bg-primary cursor-nwse-resize" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Controls</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                    <Label>Aspect Ratio</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                        {(['free', '1:1', '4:3', '16:9'] as AspectRatioType[]).map(ar => (
                            <Button key={ar} variant={aspectRatio === ar ? 'default' : 'outline'} onClick={() => handleAspectRatioChange(ar)}>{ar}</Button>
                        ))}
                    </div>
                </div>
                <div>
                  <Label>Rotation: {rotation}°</Label>
                  <div className="flex items-center gap-2">
                    <Slider min={-180} max={180} step={1} value={[rotation]} onValueChange={([val]) => setRotation(val)} />
                    <Button variant="outline" size="icon" onClick={() => setRotation(0)}><RotateCw className="h-4 w-4" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Button onClick={handleCrop} className="w-full" size="lg"><Crop className="mr-2 h-5 w-5" /> Crop Image</Button>
            <Button onClick={() => setImage(null)} className="w-full" variant="outline"><Upload className="mr-2 h-5 w-5" /> New Image</Button>
          </div>
        </div>
      )}

      {croppedImageUrl && (
        <Card className="text-center">
          <CardHeader><CardTitle>Your Cropped Image</CardTitle></CardHeader>
          <CardContent className="flex justify-center">
            <img src={croppedImageUrl} alt="Cropped result" className="max-w-full max-h-96 shadow-lg" />
          </CardContent>
          <CardFooter className="flex-col sm:flex-row gap-4">
            <Button onClick={() => downloadDataUri(croppedImageUrl, 'cropped-image.png')} className="w-full" size="lg"><Download className="mr-2 h-5 w-5" /> Download</Button>
            <Button onClick={() => { setImage(null); setCroppedImageUrl(null); }} className="w-full" variant="outline" size="lg"><Upload className="mr-2 h-5 w-5" /> Start Over</Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
