
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';

interface FeatureCardProps {
  title: string;
  description: string;
  href: string;
  Icon: LucideIcon;
  iconColor?: string; // Optional prop for icon color class e.g. text-red-500
}

export function FeatureCard({ title, description, href, Icon, iconColor = 'text-primary' }: FeatureCardProps) {
  return (
    <Link href={href} passHref legacyBehavior>
      <a className="block hover:no-underline">
        <Card className="flex flex-col h-full shadow-sm hover:shadow-xl transition-all duration-300 ease-out cursor-pointer overflow-hidden group hover:-translate-y-1.5">
          <CardHeader className="pb-3 pt-5 px-5">
            <div className="flex items-center gap-3">
              <Icon className={`h-8 w-8 ${iconColor} transition-colors duration-300 group-hover:text-accent`} />
              <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors duration-300">
                {title}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex-grow px-5 pb-5">
            <CardDescription className="text-sm text-muted-foreground leading-relaxed">
              {description}
            </CardDescription>
          </CardContent>
        </Card>
      </a>
    </Link>
  );
}
