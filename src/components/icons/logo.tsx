import type { SVGProps } from 'react';
import { Box } from 'lucide-react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <div className="flex items-center gap-2" aria-label="PDFBox Logo">
      {/* Using text-primary will make the icon and text use the theme's primary color */}
      <Box className="h-8 w-8 text-primary" /> 
      <span className="text-2xl font-bold text-primary">PDFBox</span>
    </div>
  );
}
