import type { SVGProps } from 'react';
import { Files } from 'lucide-react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <div className="flex items-center gap-2" aria-label="DocuEase Logo">
      {/* Using text-primary will make the icon and text use the theme's primary color */}
      <Files className="h-8 w-8 text-primary" /> 
      <span className="text-2xl font-bold text-primary">DocuEase</span>
    </div>
  );
}
