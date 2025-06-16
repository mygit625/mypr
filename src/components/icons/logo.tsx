
import type { SVGProps } from 'react';
import { Box } from 'lucide-react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <div className="flex items-center gap-2" aria-label="PDFBox Logo">
      <Box className="h-8 w-8 text-primary" {...props} />
      <span className="text-2xl font-bold text-primary">PDFBox</span>
    </div>
  );
}
