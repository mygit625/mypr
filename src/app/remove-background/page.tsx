
"use client";

import { useState } from 'react';
import Image from 'next/image';
import { FileUploadZone } from '@/components/feature/file-upload-zone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ImageIcon, Loader2, Wand2, Download, Info, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { readFileAsDataURL } from '@/lib/file-utils';
import { downloadDataUri } from '@/lib/download-utils';
import { removeBackgroundAction } from './actions';
import { Badge } from '@/components/ui/badge';

export default function RemoveBackgroundPage() {
  const [originalImageFile, setOriginalImageFile] = useState<File | null>(null);
  const [originalImageDataUrl, setOriginalImageDataUrl] = useState<string | null>(null);
  const [resultImageDataUrl, setResultImageDataUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      setOriginalImageFile(file);
      setResultImageDataUrl(null);
      setError(null);
      readFileAsDataURL(file).then(setOriginalImageDataUrl);
    } else {
      setOriginalImageFile(null);
      setOriginalImageDataUrl(null);
      setResultImageDataUrl(null);
    }
  };

  const handleRemoveBackground = async () => {
    if (!originalImageDataUrl) {
      toast({ title: "No image selected", description: "Please upload an image file.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResultImageDataUrl(null);

    try {
      const result = await removeBackgroundAction({ imageDataUri: originalImageDataUrl });
      if (result.error) {
        throw new Error(result.error);
      }
      setResultImageDataUrl(result.resultImageDataUri);
      toast({ title: "Background Removed!", description: "Your new image is ready below." });
    } catch (e: any) {
      setError(e.message || "An unexpected error occurred.");
      toast({ title: "Processing Failed", description: e.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="text-center py-8">
        <ImageIcon className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-bold tracking-tight">AI Background Remover</h1>
        <p className="text-muted-foreground mt-2">
          Automatically remove the background from any image with a single click.
        </p>
      </header>

      {!resultImageDataUrl && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Your Image</CardTitle>
            <CardDescription>Select or drag an image file to begin.</CardDescription>
          </CardHeader>
          <CardContent>
            <FileUploadZone onFilesSelected={handleFileSelected} multiple={false} accept="image/*" />
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleRemoveBackground}
              disabled={!originalImageDataUrl || isProcessing}
              className="w-full"
              size="lg"
            >
              {isProcessing ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing...</>
              ) : (
                <><Wand2 className="mr-2 h-5 w-5" /> Remove Background</>
              )}
            </Button>
          </CardFooter>
        </Card>
      )}

      {error && !isProcessing && (
        <Alert variant="destructive">
          <Info className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {isProcessing && !resultImageDataUrl && (
         <div className="text-center p-8 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">AI is analyzing your image... this can take a moment.</p>
        </div>
      )}


      {resultImageDataUrl && originalImageDataUrl && (
        <Card>
          <CardHeader>
            <CardTitle>Result</CardTitle>
            <CardDescription>Your image with the background removed. Download it or start over.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Badge variant="secondary" className="mb-2">Original</Badge>
              <Image
                src={originalImageDataUrl}
                alt="Original image upload"
                width={500}
                height={500}
                className="rounded-md border object-contain aspect-square w-full"
              />
            </div>
            <div className="space-y-2">
              <Badge variant="default" className="mb-2">Result</Badge>
              <div 
                className="rounded-md border p-2"
                style={{
                    backgroundImage: `
                        linear-gradient(45deg, #eee 25%, transparent 25%), 
                        linear-gradient(-45deg, #eee 25%, transparent 25%),
                        linear-gradient(45deg, transparent 75%, #eee 75%),
                        linear-gradient(-45deg, transparent 75%, #eee 75%)`,
                    backgroundSize: '20px 20px',
                    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                }}
               >
                <Image
                  src={resultImageDataUrl}
                  alt="Image with background removed"
                  width={500}
                  height={500}
                  className="object-contain aspect-square w-full"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex-col sm:flex-row gap-4">
            <Button
              onClick={() => downloadDataUri(resultImageDataUrl, `${originalImageFile?.name.split('.')[0]}_no_bg.png`)}
              className="w-full"
              size="lg"
            >
              <Download className="mr-2 h-5 w-5" /> Download (PNG)
            </Button>
            <Button
              onClick={() => {
                setOriginalImageFile(null);
                setOriginalImageDataUrl(null);
                setResultImageDataUrl(null);
              }}
              className="w-full"
              variant="outline"
              size="lg"
            >
              <Upload className="mr-2 h-5 w-5" /> Start Over
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
