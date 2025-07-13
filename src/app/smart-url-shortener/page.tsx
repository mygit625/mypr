
'use client';

import { useActionState, useEffect, useState, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { createDynamicLinkAction, getLinksAction, getClicksForLinkAction, type CreateLinkState } from './actions';
import { type DynamicLink, type ClickData } from '@/lib/url-shortener-db';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Link as LinkIcon, Copy, Loader2, CheckCircle, AlertCircle, Smartphone, Apple, Laptop, MoreVertical, Download, MousePointerClick, TrendingUp, Target, UserCheck, Eye, BarChart2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { QRCodeCanvas } from 'qrcode.react';
import { downloadDataUri } from '@/lib/download-utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';


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

function ViewClicksButton({ linkId }: { linkId: string }) {
    const [clicks, setClicks] = useState<ClickData[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const handleFetchClicks = async () => {
        setIsLoading(true);
        const fetchedClicks = await getClicksForLinkAction(linkId);
        setClicks(fetchedClicks);
        setIsLoading(false);
    };
    
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" className="w-full justify-start" size="sm" onClick={handleFetchClicks}>
                    <Eye className="h-4 w-4 mr-2" /> View Clicks
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Recent Clicks for /{linkId}</DialogTitle>
                    <DialogDescription>
                        Showing the last 5 clicks with full raw data.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] mt-4">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-48">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : clicks.length > 0 ? (
                        <div className="space-y-4 pr-6">
                            {clicks.map((click, index) => (
                                <Accordion type="single" collapsible key={index}>
                                    <AccordionItem value={`click-${index}`}>
                                        <AccordionTrigger>
                                            <div className="flex items-center gap-2 text-sm">
                                                {click.deviceType === 'Desktop' ? <Laptop className="h-4 w-4" /> : click.deviceType === 'Android' ? <Smartphone className="h-4 w-4" /> : <Apple className="h-4 w-4" />}
                                                <span>{click.deviceType} Click</span>
                                                <span className="text-xs text-muted-foreground ml-2">{formatDistanceToNow(click.timestamp, { addSuffix: true })}</span>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
                                                {JSON.stringify(click.rawData, null, 2)}
                                            </pre>
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-muted-foreground py-12">No click data available for this link yet.</p>
                    )}
                </ScrollArea>
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
                <TableHead>Clicks & Raw Data</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentLinks.length === 0 && (
                <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
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
                  <TableCell>
                    <div className="flex items-center gap-2">
                        <BarChart2 className="h-4 w-4 text-muted-foreground"/>
                        <span className="font-mono text-sm">{link.clickCount ?? 0}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {link.createdAt ? formatDistanceToNow(link.createdAt, { addSuffix: true }) : 'Just now'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                         <div className="p-2 space-y-1">
                           <Button variant="ghost" className="w-full justify-start" size="sm" onClick={() => copyToClipboard(`${baseUrl}/${link.id}`)}>
                             <Copy className="h-4 w-4 mr-2" /> Copy Link
                           </Button>
                           <ViewClicksButton linkId={link.id} />
                         </div>
                      </PopoverContent>
                    </Popover>
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

      <section className="max-w-4xl mx-auto py-12 px-4">
        <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight">Maximize Your Reach with Smart, Device-Aware Links</h2>
            <p className="text-lg text-muted-foreground mt-3 max-w-3xl mx-auto">
                Go beyond simple redirection. Understand the advantages of using a multi-direction URL shortener to create smarter, more effective campaigns.
            </p>
        </div>
        <div className="grid md:grid-cols-1 gap-10">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <div className="flex-shrink-0 flex items-center justify-center h-14 w-14 rounded-full bg-primary/10 text-primary">
                    <UserCheck className="h-7 w-7" />
                </div>
                <div>
                    <h3 className="text-xl font-semibold mb-2">Provide a Seamless User Experience</h3>
                    <p className="text-muted-foreground">
                        Stop sending your mobile users to a desktop website. By automatically routing visitors to the correct app store or a mobile-optimized page, you reduce friction and eliminate confusion. A happy user is more likely to engage, purchase, or download.
                    </p>
                </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <div className="flex-shrink-0 flex items-center justify-center h-14 w-14 rounded-full bg-primary/10 text-primary">
                    <TrendingUp className="h-7 w-7" />
                </div>
                <div>
                    <h3 className="text-xl font-semibold mb-2">Boost App Downloads & Conversions</h3>
                    <p className="text-muted-foreground">
                        For businesses with mobile apps, device-aware links are essential. A single link in your marketing email or social media bio can direct iOS users straight to the Apple App Store and Android users to the Google Play Store, significantly increasing download conversion rates.
                    </p>
                </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <div className="flex-shrink-0 flex items-center justify-center h-14 w-14 rounded-full bg-primary/10 text-primary">
                    <Target className="h-7 w-7" />
                </div>
                <div>
                    <h3 className="text-xl font-semibold mb-2">Unify Your Marketing Campaigns</h3>
                    <p className="text-muted-foreground">
                        Use one short link and one QR code across all your marketing materials—from physical flyers to digital ads. This simplifies campaign management, provides cleaner analytics, and ensures a consistent call-to-action for your entire audience, no matter how they access your content.
                    </p>
                </div>
            </div>
        </div>
      </section>
    </div>
  );
}
