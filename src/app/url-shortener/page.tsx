'use client';

import { useActionState, useEffect, useState, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { createDynamicLinkAction, getLinksAction, type CreateLinkState } from './actions';
import { type DynamicLink } from '@/lib/url-shortener-db';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Link as LinkIcon, Copy, Loader2, CheckCircle, AlertCircle, Smartphone, Apple, Laptop, MoreVertical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

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

export default function DeviceAwareLinksPage() {
  const initialState: CreateLinkState = { message: null, shortUrl: null, error: null };
  const [state, formAction] = useActionState(createDynamicLinkAction, initialState);
  const [recentLinks, setRecentLinks] = useState<DynamicLink[]>([]);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [baseUrl, setBaseUrl] = useState('');

  useEffect(() => {
    // Set base URL on the client-side to ensure it's available for display
    setBaseUrl(process.env.NEXT_PUBLIC_BASE_URL || window.location.origin);
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied to Clipboard!',
      description: 'The short URL has been copied.',
    });
  };

  useEffect(() => {
    if (state.message && state.shortUrl) {
      formRef.current?.reset();
    }
    getLinksAction().then(setRecentLinks);
  }, [state]);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="text-center">
        <LinkIcon className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-bold tracking-tight">Device-Aware Links</h1>
        <p className="text-muted-foreground mt-2">
          Create one short link that sends users to different destinations based on their device.
        </p>
      </header>

      <Card>
        <form action={formAction} ref={formRef}>
          <CardHeader>
            <CardTitle>Enter Destination URLs</CardTitle>
            <CardDescription>
              Provide URLs for different device types. At least one is required. The desktop URL will be used as a fallback.
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
                <div className="flex items-center justify-between mt-2">
                    <a href={state.shortUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-green-800 hover:underline">
                        {state.shortUrl}
                    </a>
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(state.shortUrl!)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                    </Button>
                </div>
            </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recently Created Links</CardTitle>
          <CardDescription>
            Here are the last 10 links that have been created.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Short URL</TableHead>
                <TableHead>Primary Destination (Desktop)</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentLinks.map((link) => (
                <TableRow key={link.id}>
                  <TableCell>
                    <a href={`${baseUrl}/${link.id}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-mono">
                      {baseUrl.replace(/https?:\/\//, '')}/{link.id}
                    </a>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    <span title={link.links.desktop}>{link.links.desktop || link.links.android || link.links.ios}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {formatDistanceToNow(link.createdAt, { addSuffix: true })}
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
    </div>
  );
}
