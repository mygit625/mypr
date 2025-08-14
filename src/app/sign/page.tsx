
import { PenTool } from 'lucide-react';

export default function SignPdfPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center">
      <PenTool className="h-16 w-16 text-primary mb-4" />
      <h1 className="text-3xl font-bold tracking-tight">Feature Coming Soon</h1>
      <p className="mt-2 text-muted-foreground">
        The PDF Signing tool is currently under construction. Please check back later!
      </p>
    </div>
  );
}
