
"use client";

import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { Suspense } from 'react';

function ErrorLogContent() {
  const searchParams = useSearchParams();

  const errorDetails = {
    error: searchParams.get('error') || 'No error message provided.',
    code: searchParams.get('code'),
    detectedDevice: searchParams.get('detectedDevice'),
    attemptedUrl: searchParams.get('attemptedUrl'),
    desktopUrl: searchParams.get('desktopUrl'),
    androidUrl: searchParams.get('androidUrl'),
    iosUrl: searchParams.get('iosUrl'),
    errorMessage: searchParams.get('errorMessage'),
    stack: searchParams.get('stack'),
  };

  return (
    <div className="max-w-3xl mx-auto py-10">
      <Card className="border-destructive">
        <CardHeader className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
          <CardTitle className="text-2xl text-destructive">Redirection Problem Detected</CardTitle>
          <CardDescription>
            There was an issue processing the short link. Please provide the following diagnostic information to help resolve the problem.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-4 rounded-lg space-y-2 text-sm font-mono break-words">
            <p>
              <span className="font-semibold text-foreground">Time:</span> {new Date().toISOString()}
            </p>
            <p>
              <span className="font-semibold text-foreground">Main Issue:</span> <span className="text-destructive">{errorDetails.error}</span>
            </p>
            {errorDetails.code && (
              <p><span className="font-semibold text-foreground">Short Code:</span> {errorDetails.code}</p>
            )}
            {errorDetails.detectedDevice && (
              <p><span className="font-semibold text-foreground">Detected Device:</span> {errorDetails.detectedDevice}</p>
            )}
            {errorDetails.attemptedUrl !== null && (
                 <p><span className="font-semibold text-foreground">Attempted URL:</span> {errorDetails.attemptedUrl || '"" (Empty String)'}</p>
            )}
             <div className="pt-2">
                <p className="font-semibold text-foreground">URLs in Database:</p>
                {errorDetails.desktopUrl && <p className="pl-4"><span className="font-medium">Desktop:</span> {errorDetails.desktopUrl}</p>}
                {errorDetails.androidUrl && <p className="pl-4"><span className="font-medium">Android:</span> {errorDetails.androidUrl}</p>}
                {errorDetails.iosUrl && <p className="pl-4"><span className="font-medium">iOS:</span> {errorDetails.iosUrl}</p>}
            </div>
            {errorDetails.errorMessage && (
              <p><span className="font-semibold text-foreground">Server Error:</span> {errorDetails.errorMessage}</p>
            )}
            {errorDetails.stack && (
              <details className="pt-2">
                <summary className="cursor-pointer font-semibold text-foreground">Show Error Stack</summary>
                <pre className="mt-2 text-xs whitespace-pre-wrap">{errorDetails.stack}</pre>
              </details>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ErrorLogPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ErrorLogContent />
    </Suspense>
  )
}
