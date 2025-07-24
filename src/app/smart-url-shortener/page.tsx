
'use client';

import { useActionState, useEffect, useState, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { createDynamicLinkAction, getLinksAction, getClickStatsAction, type CreateLinkState, type ClickStats } from './actions';
import { type DynamicLink } from '@/lib/url-shortener-db';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Link as LinkIcon, Copy, Loader2, CheckCircle, AlertCircle, Smartphone, Apple, Laptop, Download, BarChart2, UserPlus, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { QRCodeCanvas } from 'qrcode.react';
import { downloadDataUri } from '@/lib/download-utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import Link from 'next/link';


function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" size="lg" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Creating Link...
        </>
      ) : (
        <>
          <LinkIcon className="mr-2 h-4 w-4" />
          Create Dynamic Link
        </>
      )}
    </Button>
  );
}

function StatsDialog({ linkId, initialClickCount }: { linkId: string, initialClickCount: number }) {
    const [stats, setStats] = useState<ClickStats | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFetchStats = async () => {
        setIsLoading(true);
        setError(null);
        const result = await getClickStatsAction(linkId);
        if ('error' in result) {
            setError(result.error);
        } else {
            setStats(result);
        }
        setIsLoading(false);
    };
    
    return (
        <Dialog onOpenChange={(open) => { if(open) handleFetchStats() }}>
            <DialogTrigger asChild>
                 <Button variant="outline" size="sm" className="font-mono">
                    {initialClickCount ?? 0} Clicks
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Click Statistics for /{linkId}</DialogTitle>
                    <DialogDescription>
                        A summary of clicks by detected device type.
                    </DialogDescription>
                </DialogHeader>
                <div className="mt-4">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-48">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : error ? (
                         <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    ) : stats ? (
                        <div className="space-y-4">
                             <div className="flex justify-between items-center text-lg font-bold p-4 bg-muted rounded-lg">
                                <span>Total Clicks</span>
                                <span>{stats.total}</span>
                            </div>
                            <div className="space-y-2 text-base">
                                <div className="flex justify-between items-center p-3 border rounded-md">
                                    <div className="flex items-center gap-2">
                                        <Laptop className="h-5 w-5 text-muted-foreground" />
                                        <span>Desktop</span>
                                    </div>
                                    <span className="font-semibold">{stats.desktop}</span>
                                </div>
                                 <div className="flex justify-between items-center p-3 border rounded-md">
                                    <div className="flex items-center gap-2">
                                        <Smartphone className="h-5 w-5 text-muted-foreground" />
                                        <span>Android</span>
                                    </div>
                                    <span className="font-semibold">{stats.android}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 border rounded-md">
                                    <div className="flex items-center gap-2">
                                        <Apple className="h-5 w-5 text-muted-foreground" />
                                        <span>iOS</span>
                                    </div>
                                    <span className="font-semibold">{stats.ios}</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-center text-muted-foreground py-12">No statistics available for this link yet.</p>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default function UrlShortenerPage() {
  const initialState: CreateLinkState = { message: null, shortUrl: null, error: null };
  const [state, formAction] = useActionState(createDynamicLinkAction, initialState);
  const [recentLinks, setRecentLinks] = useState<DynamicLink[]>([]);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [baseUrl, setBaseUrl] = useState('');

  useEffect(() => {
    // Set base URL on the client-side to ensure it's available for display
    const currentBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;
    setBaseUrl(currentBaseUrl.replace(/\/$/, '')); // Remove trailing slash if present

    const handleWindowFocus = () => {
        getLinksAction().then(setRecentLinks).catch(err => {
            console.error("Failed to fetch recent links on focus:", err);
        });
    };
    window.addEventListener('focus', handleWindowFocus);
    return () => {
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied to Clipboard!',
      description: 'The short URL has been copied.',
    });
  };

  const downloadQrCode = () => {
    const canvas = document.getElementById('qr-code-canvas') as HTMLCanvasElement;
    if (canvas) {
      const pngUrl = canvas
        .toDataURL("image/png")
        .replace("image/png", "image/octet-stream");
      downloadDataUri(pngUrl, 'shortlink-qrcode.png');
       toast({
        title: 'QR Code Downloaded!',
        description: 'The QR code has been saved as a PNG.',
      });
    }
  };

  useEffect(() => {
    const fetchLinks = () => {
        getLinksAction().then(setRecentLinks).catch(err => {
            console.error("Failed to fetch recent links:", err);
            toast({ title: 'Error', description: 'Could not fetch recent links.', variant: 'destructive' });
        });
    };
    fetchLinks();

    if(state.shortUrl) {
      formRef.current?.reset();
    }
    
  }, [state.shortUrl, toast]);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="text-center">
        <LinkIcon className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-bold tracking-tight">Multi-direction URL Shortener</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
          Forward your visitors to multiple directions based on their devices with one shortlink.
        </p>
      </header>

      <Alert>
          <UserPlus className="h-4 w-4" />
          <AlertTitle>Want to save and manage your links?</AlertTitle>
          <AlertDescription>
              Sign up for a free account to keep track of all your created shortlinks, view detailed analytics, and manage them from a central dashboard.
              <Button variant="link" asChild className="p-0 h-auto ml-1">
                <Link href="#">Get started!</Link>
              </Button>
          </AlertDescription>
      </Alert>

      <Card>
        <form action={formAction} ref={formRef}>
          <CardHeader>
            <CardTitle>Enter Destination URLs</CardTitle>
            <CardDescription>
              Provide URLs for different device types. The desktop URL will be used as a fallback. At least one URL is required.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="desktopUrl" className="flex items-center gap-2">
                <Laptop className="h-4 w-4" /> Desktop URL
              </Label>
              <Input
                id="desktopUrl"
                name="desktopUrl"
                type="url"
                placeholder="https://example.com/desktop-version"
              />
               <p className="text-xs text-muted-foreground">Destination URL if device is Desktop.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="androidUrl" className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" /> Android URL
              </Label>
              <Input
                id="androidUrl"
                name="androidUrl"
                type="url"
                placeholder="https://play.google.com/store/apps/details?id=..."
              />
              <p className="text-xs text-muted-foreground">Destination URL if device is Android.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="iosUrl" className="flex items-center gap-2">
                <Apple className="h-4 w-4" /> iOS URL
              </Label>
              <Input
                id="iosUrl"
                name="iosUrl"
                type="url"
                placeholder="https://apps.apple.com/us/app/..."
              />
               <p className="text-xs text-muted-foreground">Destination URL if device is iOS.</p>
            </div>
          </CardContent>
          <CardFooter>
            <SubmitButton />
          </CardFooter>
        </form>
      </Card>

      {state.error && (
         <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      {state.shortUrl && (
        <Alert variant="default" className="border-green-500 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-700">Dynamic Link Created!</AlertTitle>
            <AlertDescription>
                <div className="flex flex-col sm:flex-row items-center justify-between mt-2 gap-4">
                    <div className="flex-grow">
                      <a href={state.shortUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-green-800 hover:underline break-all">
                          {state.shortUrl}
                      </a>
                      <Button variant="ghost" size="sm" onClick={() => copyToClipboard(state.shortUrl!)} className="w-full sm:w-auto mt-2 sm:mt-0 justify-start">
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Link
                      </Button>
                    </div>
                    <div className="flex-shrink-0 flex flex-col items-center gap-2">
                      <div className="bg-white p-2 rounded-md border">
                        <QRCodeCanvas
                          id="qr-code-canvas"
                          value={state.shortUrl}
                          size={128}
                          level={"H"}
                        />
                      </div>
                      <Button onClick={downloadQrCode} variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Download QR
                      </Button>
                    </div>
                </div>
            </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Real-time Statistics</CardTitle>
          <CardDescription>
            Here are the last 10 links you've created and their click stats.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Short URL</TableHead>
                <TableHead>Destinations</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Statistics</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentLinks.length === 0 && (
                <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No links created yet. Your links will appear here.
                    </TableCell>
                </TableRow>
              )}
              {recentLinks.map((link) => (
                <TableRow key={link.id}>
                  <TableCell>
                    <a href={`${baseUrl}/${link.id}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-mono">
                      {baseUrl.replace(/https?:\/\//, '')}/{link.id}
                    </a>
                  </TableCell>
                  <TableCell className="max-w-xs space-y-1.5">
                    {link.links.desktop && (
                      <div className="flex items-center gap-2 text-xs truncate">
                        <Laptop className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                        <span className="truncate" title={link.links.desktop}>{link.links.desktop}</span>
                      </div>
                    )}
                     {link.links.android && (
                      <div className="flex items-center gap-2 text-xs truncate">
                        <Smartphone className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                        <span className="truncate" title={link.links.android}>{link.links.android}</span>
                      </div>
                    )}
                     {link.links.ios && (
                      <div className="flex items-center gap-2 text-xs truncate">
                        <Apple className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                        <span className="truncate" title={link.links.ios}>{link.links.ios}</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {link.createdAt ? formatDistanceToNow(link.createdAt, { addSuffix: true }) : 'Just now'}
                  </TableCell>
                  <TableCell className="text-right">
                    <StatsDialog linkId={link.id} initialClickCount={link.clickCount ?? 0} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <section className="max-w-4xl mx-auto py-12 px-4">
        <h2 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-1">
            <AccordionTrigger>What is a multi-direction or device-aware URL shortener?</AccordionTrigger>
            <AccordionContent>
              A multi-direction URL shortener allows you to create a single, short link that intelligently redirects users to different destination URLs based on their device. For example, you can send iOS users to the Apple App Store, Android users to the Google Play Store, and all other users (like those on desktop) to your main website, all from one link.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>Why is a dynamic link useful for my app or business?</AccordionTrigger>
            <AccordionContent>
              Dynamic links are incredibly powerful for marketing and user acquisition. They provide a seamless user experience, ensuring that every user lands on the most appropriate page for their device. This is crucial for app download campaigns, where you want to direct mobile users straight to the correct app store, improving conversion rates and eliminating friction.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-3">
            <AccordionTrigger>How do you detect the user's device?</AccordionTrigger>
            <AccordionContent>
              Our system analyzes the `User-Agent` string sent by the user's browser with every request. This string contains information about the device's operating system (like iOS or Android) and browser. Based on this information, we perform the device-based redirect to the URL you've specified for that category.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-4">
            <AccordionTrigger>Do I need to provide a URL for all three devices?</AccordionTrigger>
            <AccordionContent>
              No, you only need to provide at least one URL. The Desktop URL serves as a fallback; if a user is not on Android or iOS, or if you leave the Android/iOS fields blank, they will be sent to the Desktop URL. This makes the system flexible for any use case.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-5">
            <AccordionTrigger>Can I track how many people click my short links?</AccordionTrigger>
            <AccordionContent>
              Yes! Our real-time statistics table shows you the total click count for each short link you create. You can also view the raw data for the last few clicks, including device type and HTTP headers, giving you deeper insight into your audience.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-6">
            <AccordionTrigger>Are the QR Codes generated for my short links also free?</AccordionTrigger>
            <AccordionContent>
              Absolutely. Every time you create a short link, we automatically generate a QR code for it, completely free of charge. You can download the QR code in PNG format for use in your print materials, presentations, or any other offline marketing channel to seamlessly bridge the gap to your online content.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>
    </div>
  );
}
