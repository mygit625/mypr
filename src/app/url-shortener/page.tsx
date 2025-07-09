'use client';

import { useActionState, useEffect, useState, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { createUrlAction, getUrlsAction, CreateUrlState } from './actions';
import { ShortUrl } from '@/lib/url-shortener-db';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Link as LinkIcon, Copy, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" size="lg" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Shortening...
        </>
      ) : (
        <>
          <LinkIcon className="mr-2 h-4 w-4" />
          Shorten URL
        </>
      )}
    </Button>
  );
}

export default function UrlShortenerPage() {
  const initialState: CreateUrlState = { message: null, shortUrl: null, error: null };
  const [state, formAction] = useActionState(createUrlAction, initialState);
  const [recentUrls, setRecentUrls] = useState<ShortUrl[]>([]);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied to Clipboard!',
      description: 'The short URL has been copied.',
    });
  };

  useEffect(() => {
    if (state.message && state.shortUrl) {
      formRef.current?.reset(); // Clear the form input on success
    }
    // Fetch initial recent URLs
    getUrlsAction().then(setRecentUrls);
  }, [state]);

  // Refetch URLs when the component mounts or when a new URL is created
  useEffect(() => {
    getUrlsAction().then(setRecentUrls);
  }, [state.shortUrl]); // Depend on shortUrl to refetch after creation

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="text-center">
        <LinkIcon className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-3xl font-bold tracking-tight">URL Shortener</h1>
        <p className="text-muted-foreground mt-2">
          Create short, memorable links from long URLs.
        </p>
      </header>

      <Card>
        <form action={formAction} ref={formRef}>
          <CardHeader>
            <CardTitle>Enter a long URL to shorten</CardTitle>
          </CardHeader>
          <CardContent>
            <Label htmlFor="longUrl" className="sr-only">
              Long URL
            </Label>
            <Input
              id="longUrl"
              name="longUrl"
              type="url"
              placeholder="https://example.com/very/long/path/to/page"
              required
              className="text-lg h-12"
            />
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
            <AlertTitle className="text-green-700">URL Shortened!</AlertTitle>
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
          <CardTitle>Recently Shortened URLs</CardTitle>
          <CardDescription>
            Here are the last 10 URLs that have been created.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Short URL</TableHead>
                <TableHead>Original URL</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentUrls.map((url) => (
                <TableRow key={url.id}>
                  <TableCell>
                    <a href={`/${url.id}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      /{url.id}
                    </a>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    <span title={url.longUrl}>{url.longUrl}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {formatDistanceToNow(url.createdAt, { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/${url.id}`)}>
                      <Copy className="h-4 w-4" />
                    </Button>
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
