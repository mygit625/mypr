
import { PenTool } from 'lucide-react';

export default function SignPdfPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <PenTool className="mx-auto h-16 w-16 text-primary mb-4" />
      <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Sign PDF</h1>
      <p className="mt-4 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
        This feature is currently under construction and will be available soon.
      </p>
    </div>
  );
}
