
'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface Links {
  desktop: string;
  android: string;
  ios: string;
}

interface RedirectClientComponentProps {
  code: string;
  links: Links;
}

export default function RedirectClientComponent({ code, links }: RedirectClientComponentProps) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fire-and-forget call to the log-click API endpoint
    fetch('/api/log-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
      keepalive: true, // Important for requests that might outlive the page
    }).catch(console.error);

    try {
      const ua = navigator.userAgent.toLowerCase();
      let destinationUrl = '';

      if (/android/.test(ua)) {
        destinationUrl = links.android;
      } else if (/windows/.test(ua)) {
        destinationUrl = links.desktop;
      } else {
        destinationUrl = links.ios;
      }

      if (!destinationUrl) {
          destinationUrl = links.desktop || '';
      }

      if (destinationUrl) {
        window.location.href = destinationUrl;
      } else {
        setError("No valid destination URL could be determined for your device.");
      }
    } catch (e: any) {
      console.error("Redirection error on client:", e);
      setError(e.message || "An unexpected client-side error occurred.");
    }
  }, [code, links]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      {error ? (
        <div className="text-destructive">
          <h1 className="text-2xl font-bold mb-2">Redirection Failed</h1>
          <p className="mb-4">{error}</p>
        </div>
      ) : (
        <div className="space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <h1 className="text-2xl font-bold">Redirecting...</h1>
          <p className="text-muted-foreground">Please wait while we send you to the correct destination.</p>
        </div>
      )}

      <div className="mt-8 p-4 border rounded-lg bg-muted/50 text-sm">
        <p className="font-semibold mb-2">If you are not redirected, please use one of the links below:</p>
        <ul className="space-y-1 list-disc list-inside">
          {links.desktop && <li><a href={links.desktop} className="text-primary hover:underline">Desktop Link</a></li>}
          {links.android && <li><a href={links.android} className="text-primary hover:underline">Android Link</a></li>}
          {links.ios && <li><a href={links.ios} className="text-primary hover:underline">iOS Link</a></li>}
        </ul>
      </div>
    </div>
  );
}
