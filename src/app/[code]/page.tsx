
'use client';

import { useEffect } from 'react';
import { getLink } from '@/lib/url-shortener-db';
import { Loader2 } from 'lucide-react';

interface RedirectPageProps {
  params: { code: string };
}

interface Links {
  desktop: string;
  android: string;
  ios: string;
}

export default function RedirectPage({ params }: RedirectPageProps) {
  const [links, setLinks] = React.useState<Links | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  
  useEffect(() => {
    async function fetchAndRedirect() {
      try {
        const linkDoc = await getLink(params.code);

        if (!linkDoc) {
          setError(`No link found for code: ${params.code}`);
          return;
        }

        const fetchedLinks = linkDoc.links;
        setLinks(fetchedLinks);
        
        const ua = navigator.userAgent.toLowerCase();
        let destinationUrl = fetchedLinks.desktop || '';

        if (/iphone|ipad|ipod/.test(ua) && fetchedLinks.ios) {
            destinationUrl = fetchedLinks.ios;
        } else if (/android/.test(ua) && fetchedLinks.android) {
            destinationUrl = fetchedLinks.android;
        }

        if (destinationUrl) {
            window.location.href = destinationUrl;
        } else {
             setError("No valid destination URL could be determined for your device.");
        }
      } catch (e: any) {
        console.error("Redirection error:", e);
        setError(e.message || "An unexpected error occurred.");
      }
    }
    
    fetchAndRedirect();
  }, [params.code]);

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

      {links && (
        <div className="mt-8 p-4 border rounded-lg bg-muted/50 text-sm">
          <p className="font-semibold mb-2">If you are not redirected, please use one of the links below:</p>
          <ul className="space-y-1 list-disc list-inside">
            {links.desktop && <li><a href={links.desktop} className="text-primary hover:underline">Desktop Link</a></li>}
            {links.android && <li><a href={links.android} className="text-primary hover:underline">Android Link</a></li>}
            {links.ios && <li><a href={links.ios} className="text-primary hover:underline">iOS Link</a></li>}
          </ul>
        </div>
      )}
    </div>
  );
}
