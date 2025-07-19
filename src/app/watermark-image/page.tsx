
"use client";

import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { FileUploadZone } from '@/components/feature/file-upload-zone';
import { Droplets, Download, Upload, Loader2, Info, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { readFileAsDataURL } from '@/lib/file-utils';
import { downloadDataUri } from '@/lib/download-utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

type WatermarkPosition =
  | 'top-left' | 'top-center' | 'top-right'
  | 'middle-left' | 'middle-center' | 'middle-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

export default function WatermarkImagePage() {
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [originalFileName, setOriginalFileName] = useState<string>('');
  const [watermarkedImageUrl, setWatermarkedImageUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Watermark settings
  const [text, setText] = useState('CONFIDENTIAL');
  const [fontSize, setFontSize] = useState(48);
  const [fontColor, setFontColor] = useState('#ffffff');
  const [opacity, setOpacity] = useState(0.5);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState<WatermarkPosition>('middle-center');

  const handleFileSelected = (files: File[]) => {
    if (files.length > 0) {
      const file = files[0];
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid File Type',
          description: 'Please upload a valid image file.',
          variant: 'destructive',
        });
        return;
      }
      setOriginalFileName(file.name);
      readFileAsDataURL(file).then((dataUrl) => {
        const img = new Image();
        img.src = dataUrl;
        img.onload = () => {
          setOriginalImage(img);
          setWatermarkedImageUrl(null);
        };
      });
    }
  };
  
  useEffect(() => {
    if (!originalImage || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas dimensions to image dimensions
    canvas.width = originalImage.naturalWidth;
    canvas.height = originalImage.naturalHeight;

    // Draw the original image
    ctx.drawImage(originalImage, 0, 0);

    // Prepare font and style
    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = fontColor;
    ctx.globalAlpha = opacity;

    // Watermark positioning
    const textMetrics = ctx.measureText(text);
    const textWidth = textMetrics.width;
    const textHeight = fontSize; // Approximation
    let x = 0, y = 0;
    const margin = 20;

    // Y positioning
    if (position.startsWith('top')) {
      y = margin + textHeight;
    } else if (position.startsWith('middle')) {
      y = canvas.height / 2 + textHeight / 4;
    } else { // bottom
      y = canvas.height - margin;
    }

    // X positioning
    if (position.endsWith('left')) {
      x = margin;
    } else if (position.endsWith('center')) {
      x = (canvas.width - textWidth) / 2;
    } else { // right
      x = canvas.width - textWidth - margin;
    }

    // Apply rotation
    ctx.save();
    ctx.translate(x + textWidth / 2, y - textHeight / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.textAlign = 'center';
    ctx.fillText(text, 0, 0);
    ctx.restore();

    // Set globalAlpha back to 1 for other operations
    ctx.globalAlpha = 1.0;
    
    setWatermarkedImageUrl(canvas.toDataURL('image/png'));

  }, [originalImage, text, fontSize, fontColor, opacity, rotation, position]);

  const handleDownload = () => {
    if (watermarkedImageUrl) {
        const baseName = originalFileName.split('.').slice(0, -1).join('.');
        downloadDataUri(watermarkedImageUrl, `${baseName}_watermarked.png`);
    } else {
        toast({ title: "No image to download", description: "Please apply a watermark first.", variant: "destructive" });
    }
  };
  
  const positionOptions: { value: WatermarkPosition; label: string; gridClass: string }[] = [
    { value: 'top-left', label: 'Top Left', gridClass: 'col-start-1 row-start-1' },
    { value: 'top-center', label: 'Top Center', gridClass: 'col-start-2 row-start-1' },
    { value: 'top-right', label: 'Top Right', gridClass: 'col-start-3 row-start-1' },
    { value: 'middle-left', label: 'Middle Left', gridClass: 'col-start-1 row-start-2' },
    { value: 'middle-center', label: 'Middle Center', gridClass: 'col-start-2 row-start-2' },
    { value: 'middle-right', label: 'Middle Right', gridClass: 'col-start-3 row-start-2' },
    { value: 'bottom-left', label: 'Bottom Left', gridClass: 'col-start-1 row-start-3' },
    { value: 'bottom-center', label: 'Bottom Center', gridClass: 'col-start-2 row-start-3' },
    { value: 'bottom-right', label: 'Bottom Right', gridClass: 'col-start-3 row-start-3' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="text-center py-8">
        <Droplets className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-bold tracking-tight">Watermark Image</h1>
        <p className="text-muted-foreground mt-2">
          Add a text watermark to your images with customizable options.
        </p>
      </header>
      
      {!originalImage && (
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
      
      {originalImage && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Preview</CardTitle>
                    </CardHeader>
                    <CardContent className="flex justify-center items-center bg-muted/20 p-4">
                       <canvas ref={canvasRef} className="max-w-full h-auto" style={{ maxHeight: '60vh' }} />
                       {/* The canvas shows the watermarked image */}
                    </CardContent>
                </Card>
            </div>
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Watermark Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="watermark-text">Text</Label>
                            <Input id="watermark-text" value={text} onChange={(e) => setText(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="font-size">Font Size: {fontSize}px</Label>
                            <Slider id="font-size" value={[fontSize]} onValueChange={(v) => setFontSize(v[0])} min={8} max={256} step={1} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="font-color">Color</Label>
                            <Input id="font-color" type="color" value={fontColor} onChange={(e) => setFontColor(e.target.value)} className="p-1 h-10" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="opacity">Opacity: {opacity.toFixed(2)}</Label>
                            <Slider id="opacity" value={[opacity]} onValueChange={(v) => setOpacity(v[0])} min={0} max={1} step={0.05} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="rotation">Rotation: {rotation}°</Label>
                            <Slider id="rotation" value={[rotation]} onValueChange={(v) => setRotation(v[0])} min={-90} max={90} step={1} />
                        </div>
                        <div>
                            <Label>Position</Label>
                            <div className="grid grid-cols-3 grid-rows-3 gap-1.5 w-24 h-24 bg-muted/50 p-1 rounded-md mt-1">
                                {positionOptions.map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => setPosition(opt.value)}
                                        className={cn('rounded-sm hover:bg-primary/20 transition-colors flex items-center justify-center', opt.gridClass, position === opt.value ? 'bg-primary/80' : 'bg-primary/10')}
                                        title={opt.label}
                                    >
                                        {position === opt.value && <Check className="h-4 w-4 text-primary-foreground" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex flex-col gap-2">
                    <Button onClick={handleDownload} size="lg" disabled={!watermarkedImageUrl}>
                        <Download className="mr-2 h-5 w-5" /> Download Watermarked Image
                    </Button>
                    <Button onClick={() => setOriginalImage(null)} variant="outline" size="lg">
                        <Upload className="mr-2 h-5 w-5" /> Start Over
                    </Button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
