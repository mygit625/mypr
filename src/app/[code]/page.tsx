
import { getLink } from '@/lib/url-shortener-db';
import { headers } from 'next/headers';
import RedirectClientComponent from './RedirectClientComponent';

interface RedirectPageProps {
  params: { code: string };
}

// This is now a Server Component responsible for fetching data
export default async function RedirectPage({ params }: RedirectPageProps) {
  const headersList = headers();
  const userAgent = headersList.get('user-agent') || '';
  
  // Quick check for bots on the server side to avoid unnecessary Firestore reads
  if (userAgent.match(/bot|spider|crawler|preview/i)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h1 className="text-2xl font-bold">Bot Detected</h1>
        <p className="text-muted-foreground">This content is for users.</p>
      </div>
    );
  }

  const linkDoc = await getLink(params.code);

  if (!linkDoc) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center text-destructive">
        <h1 className="text-2xl font-bold mb-2">Link Not Found</h1>
        <p className="mb-4">No link was found for the code: <span className="font-mono bg-muted p-1 rounded">{params.code}</span></p>
      </div>
    );
  }

  // Pass the fetched links and code to the client component for redirection and logging
  return <RedirectClientComponent code={params.code} links={linkDoc.links} />;
}
