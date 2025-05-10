import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight } from 'lucide-react';

interface FeatureCardProps {
  title: string;
  description: string;
  href: string;
  Icon: LucideIcon;
}

export function FeatureCard({ title, description, href, Icon }: FeatureCardProps) {
  return (
    <Card className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center gap-4 pb-4">
        <Icon className="h-10 w-10 text-primary" />
        <div>
          <CardTitle className="text-xl">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <CardDescription>{description}</CardDescription>
      </CardContent>
      <CardContent className="pt-0">
        <Button asChild variant="default" className="w-full group">
          <Link href={href}>
            Go to {title}
            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
