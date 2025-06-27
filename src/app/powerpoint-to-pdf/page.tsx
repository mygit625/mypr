
"use client";

import { useEffect, useRef } from 'react';
import { Presentation } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function PowerPointToPdfPage() {
  const { toast } = useToast();
  const widgetLoaded = useRef(false);

  useEffect(() => {
    // Prevent the script from being loaded multiple times on re-render
    if (widgetLoaded.current) {
      return;
    }

    // Function to load a script dynamically
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

    // Load the widget
    loadScript('https://avepdf.com/api/js/embedwidgets.js', 'avepdf-embed-script')
      .then(() => {
        // The script has loaded, now we can call its function.
        // We need to check if the function exists on the window object.
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
          description: "The PowerPoint to PDF conversion widget could not be loaded. Please check your internet connection and try again.",
          variant: "destructive",
        });
      });

    // Cleanup function to remove scripts when the component unmounts
    return () => {
      const mainScript = document.getElementById('avepdf-embed-script');
      if (mainScript) {
        mainScript.remove();
      }
      // The widget might inject its own scripts/iframes, which we'll leave for it to manage.
      widgetLoaded.current = false;
    };
  }, [toast]);

  return (
    <div className="max-w-full mx-auto space-y-8">
      <header className="text-center py-8">
        <Presentation className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-bold tracking-tight">PowerPoint to PDF</h1>
        <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
          Convert your PPTX or PPT files to PDF using the widget below. Upload multiple files, and they will be converted for you.
        </p>
      </header>

      <div className="flex justify-center">
        <div id="avepdf-container-id" className="w-full max-w-4xl min-h-[500px] shadow-lg rounded-lg overflow-hidden border">
           {/* The AvePDF widget will be loaded here by the script */}
        </div>
      </div>
    </div>
  );
}
