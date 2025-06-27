"use client";

import { useState, useEffect, useRef } from 'react';
import { Presentation, Rocket, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function PowerPointToPdfPage() {
  const { toast } = useToast();
  const [isWidgetVisible, setIsWidgetVisible] = useState(false);
  const widgetLoaded = useRef(false);

  useEffect(() => {
    if (!isWidgetVisible || widgetLoaded.current) {
      return;
    }

    const loadScript = (src: string, id: string, async: boolean = true): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (document.getElementById(id)) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.id = id;
        script.async = async;
        script.type = 'text/javascript';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
        document.body.appendChild(script);
      });
    };

    loadScript('https://avepdf.com/api/js/embedwidgets.js', 'avepdf-embed-script')
      .then(() => {
        if (typeof (window as any).loadAvePDFWidget === 'function') {
          (window as any).loadAvePDFWidget('d9263667-adce-41ec-880e-26b4371a4fb0', 'auto', 'pptx-to-pdf', 'avepdf-container-id');
          widgetLoaded.current = true;
        } else {
          throw new Error('AvePDF widget function not found after script load.');
        }
      })
      .catch((error) => {
        console.error(error);
        toast({
          title: "Error Loading Widget",
          description: "The conversion widget could not be loaded. Please check your internet connection and try again.",
          variant: "destructive",
        });
        setIsWidgetVisible(false);
      });
  }, [isWidgetVisible, toast]);

  return (
    <div className="max-w-full mx-auto space-y-8">
      <header className="text-center py-8">
        <Presentation className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-bold tracking-tight">PowerPoint to PDF</h1>
        <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
          Convert your PPTX or PPT files to PDF. This feature is provided by an embedded third-party widget.
        </p>
      </header>

      <div className="flex justify-center">
        {!isWidgetVisible ? (
          <Card className="w-full max-w-2xl text-center shadow-lg">
            <CardHeader>
              <CardTitle>Launch Converter</CardTitle>
              <CardDescription>Click the button below to open the conversion tool.</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Third-Party Widget</AlertTitle>
                <AlertDescription>
                  This feature uses an embedded widget from AvePDF to provide reliable conversions. You will be interacting with their service.
                </AlertDescription>
              </Alert>
            </CardContent>
            <CardFooter>
              <Button size="lg" className="w-full" onClick={() => setIsWidgetVisible(true)}>
                <Rocket className="mr-2 h-5 w-5" />
                Launch PowerPoint to PDF Converter
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <div id="avepdf-container-id" className="w-full max-w-4xl min-h-[500px] shadow-lg rounded-lg overflow-hidden border">
             {/* The AvePDF widget will be loaded here by the script */}
          </div>
        )}
      </div>
    </div>
  );
}
